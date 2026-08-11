import re

with open('mobile/src/screens/PickupsScreen.js', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("Image as LucideImage\n} from 'lucide-react-native';", "Image as LucideImage, Globe\n} from 'lucide-react-native';")

# 2. Add hasLocationPermission state
content = re.sub(
    r"const \[location, setLocation\] = useState\(null\);\n",
    "const [location, setLocation] = useState(null);\n    const [hasLocationPermission, setHasLocationPermission] = useState(null);\n",
    content
)

# 3. Modify useEffect for location
old_use_effect = """    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);

            setMapRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        })();
    }, []);"""

new_use_effect = """    useEffect(() => {
        (async () => {
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                setHasLocationPermission(true);
                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
                setMapRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            } else {
                setHasLocationPermission(false);
            }
        })();
    }, []);

    const requestLocationAccess = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            setHasLocationPermission(true);
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
            setMapRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        } else {
            setErrorMsg('Permission to access location was denied');
        }
    };"""

content = content.replace(old_use_effect, new_use_effect)

# 4. Modify renderJobMarker to use black circle
old_marker = """                <ActiveMarker
                    key={`job-${job.id}`}
                    coordinate={{ latitude: parseFloat(job.latitude), longitude: parseFloat(job.longitude) }}
                    title={job.material_type}
                    description={`${job.quantity_estimate} - ${job.status}`}
                >
                    <View style={[
                        styles.markerContainer,
                        job.status === 'ACCEPTED' ? { borderColor: '#F59E0B' } : {},
                        job.status === 'ARRIVED' ? { borderColor: '#10B981' } : {}
                    ]}>
                        <MapPin size={24} color={
                            job.status === 'ACCEPTED' ? '#F59E0B' :
                            job.status === 'ARRIVED' ? '#10B981' : '#111'
                        } />
                    </View>
                </ActiveMarker>"""

new_marker = """                <ActiveMarker
                    key={`job-${job.id}`}
                    coordinate={{ latitude: parseFloat(job.latitude), longitude: parseFloat(job.longitude) }}
                    title={job.material_type}
                    description={`${job.quantity_estimate} - ${job.status}`}
                >
                    <View style={styles.blackCircleMarker}>
                        <Text style={styles.blackCircleText}>{job.quantity_estimate.replace(/[^0-9]/g, '').slice(-2) || '1'}</Text>
                    </View>
                </ActiveMarker>"""

content = content.replace(old_marker, new_marker)

# 5. Modify the main return statement (Render structure)
# Finding the block from `if (loading) {` up to `<FlatList`
start_render = content.find("    if (loading) {")
end_render = content.find("                        data={sortedJobs}")
if start_render != -1 and end_render != -1:
    new_render = """    if (hasLocationPermission === false) {
        return (
            <SafeAreaView style={styles.permissionContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{position: 'absolute', top: 50, left: 20}}>
                    <ArrowLeft size={24} color="#111" />
                </TouchableOpacity>
                <View style={styles.permissionContent}>
                    <View style={styles.globeIconContainer}>
                        <Globe size={80} color="#27AE60" />
                    </View>
                    <Text style={styles.permissionTitle}>Allow location access</Text>
                    <Text style={styles.permissionDesc}>
                        We use this to show nearby stores. You can edit access in your phone's settings.
                    </Text>
                </View>
                <View style={styles.permissionFooter}>
                    <Text style={styles.privacyText}>
                        By allowing access, you consent to share your personal info with Google Maps as stated in the <Text style={{textDecorationLine: 'underline'}}>Privacy Policy</Text>
                    </Text>
                    <TouchableOpacity style={styles.allowButton} onPress={requestLocationAccess}>
                        <Text style={styles.allowButtonText}>Allow access</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#111" /></View>;
    }

    return (
        <View style={styles.container}>
            <ActiveMap
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: location?.latitude || 5.6037,
                    longitude: location?.longitude || -0.1870,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
                onRegionChangeComplete={setMapRegion}
                showsUserLocation={true}
            >
                {memoizedMarkers}

                {isSelectingLocation && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -32 }}>
                        <MapPin size={32} color="#E74C3C" fill="#fff" />
                    </View>
                )}
            </ActiveMap>

            {isSelectingLocation && (
                <View style={styles.selectionOverlay}>
                    <View style={styles.selectionHeader}>
                        <Text style={styles.selectionTitle}>Pick Location</Text>
                        <Text style={styles.selectionSubtitle}>Drag map to position pin</Text>
                    </View>
                    <TouchableOpacity style={styles.confirmLocationBtn} onPress={confirmMapSelection}>
                        <Text style={styles.confirmLocationText}>Confirm Location</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isSelectingLocation && (
                <View style={styles.floatingTopBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatingBackBtn}>
                        <ArrowLeft size={20} color="#111" />
                    </TouchableOpacity>
                    <View style={styles.floatingSearchBar}>
                        <Search size={18} color="#999" style={{marginLeft: 10}} />
                        <TextInput placeholder="Search area..." style={styles.floatingSearchInput} placeholderTextColor="#999" />
                    </View>
                    <TouchableOpacity style={styles.floatingTargetBtn} onPress={() => {
                        if (location && mapRef.current) {
                            mapRef.current.animateToRegion({
                                latitude: location.latitude,
                                longitude: location.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }, 1000);
                        }
                    }}>
                        <Navigation size={20} color="#111" />
                    </TouchableOpacity>
                </View>
            )}

            {!isSelectingLocation && sortedJobs.length > 0 && (
                <View style={styles.jobListContainerAbsolute}>
                    <FlatList
"""
    content = content[:start_render] + new_render + content[end_render:]

# 6. Add styles
styles_to_add = """
    // Permission Styles
    permissionContainer: { flex: 1, backgroundColor: '#FFF' },
    permissionContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    globeIconContainer: { marginBottom: 30 },
    permissionTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 12, textAlign: 'center' },
    permissionDesc: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
    permissionFooter: { paddingHorizontal: 20, paddingBottom: 40 },
    privacyText: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
    allowButton: { backgroundColor: '#111', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    allowButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // Floating Map UI
    floatingTopBar: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    floatingBackBtn: { width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    floatingSearchBar: { flex: 1, height: 44, backgroundColor: '#FFF', borderRadius: 22, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    floatingSearchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#111' },
    floatingTargetBtn: { width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },

    // Map Markers
    blackCircleMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
    blackCircleText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

    jobListContainerAbsolute: { position: 'absolute', bottom: 100, left: 0, right: 0 },
"""

content = content.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({" + styles_to_add)

with open('mobile/src/screens/PickupsScreen.js', 'w') as f:
    f.write(content)

print("Done")
