import re

with open('mobile/src/screens/HomeScreen.js', 'r') as f:
    content = f.read()

# I will write the new imports and component logic.
new_imports = """import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator,
    TextInput, ScrollView, RefreshControl, Dimensions, StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, MapPin, ArrowRight, Truck,
    Package, ShoppingCart, User, Bell, SlidersHorizontal, Heart, Star, ChevronDown, ArrowUpRight
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient, { BASE_URL } from '../api/client';
import * as Location from 'expo-location';
import { usePickups } from '../hooks/usePickups';
import { useListings } from '../hooks/useListings';
import { SkeletonCard } from '../components/Skeleton';
"""

# Replace imports
content = re.sub(r'import React.*?from \'../components/Skeleton\';', new_imports, content, flags=re.DOTALL)

component = """export default function HomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { userRole, user } = useAuth();
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [location, setLocation] = useState(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedSearch(search); }, 500);
        return () => { clearTimeout(handler); };
    }, [search]);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                let loc = await Location.getCurrentPositionAsync({});
                setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            } catch (error) { console.log(error); }
        })();
    }, []);

    const { data: pickupJobs = [], isLoading: pickupsLoading, refetch: refetchPickups, isRefetching: isRefetchingPickups } = usePickups(location);
    const [locationFilter, setLocationFilter] = useState('');
    const { data: listings = [], isLoading: loading, refetch, isRefetching } = useListings({
        search: debouncedSearch,
        material_type: filter,
        location: locationFilter
    });

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 3600) return 'Just now';
        if (diff < 86400) return 'Today';
        if (diff < 172800) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const handleRefresh = async () => {
        if (userRole === 'RECYCLER') await refetchPickups();
        else await refetch();
    };

    const dataList = userRole === 'RECYCLER' ? pickupJobs : listings;
    const featuredData = dataList.slice(0, 5);
    const recentData = dataList.slice(5);

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        let cleanPath = path.startsWith('/') ? path : `/${path}`;
        if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
        return `${BASE_URL}${cleanPath}`;
    };

    const renderCategory = (item) => {
        const isActive = filter === item.id;
        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.catBtn, isActive && styles.catBtnActive]}
                onPress={() => {
                    if (userRole === 'RECYCLER') navigation.navigate('Pickups', { category: item.id });
                    else setFilter(item.id);
                }}
            >
                {isActive ? null : <Ionicons name={item.icon} size={16} color="#111" style={{ marginRight: 6 }} />}
                <Text style={[styles.catText, isActive && styles.catTextActive]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const renderFeaturedCard = (item) => {
        const imageUri = userRole === 'RECYCLER' 
            ? (item.listing_image ? resolveImageUrl(item.listing_image) : getMaterialImage(item.material_type))
            : (item.image ? resolveImageUrl(item.image) : null);
        
        const title = userRole === 'RECYCLER' ? item.material_type : item.title;
        const price = userRole === 'RECYCLER' ? item.estimated_price : item.price;
        const loc = userRole === 'RECYCLER' ? (item.pickup_address || item.city || 'Nearby') : item.location;
        const track = userRole === 'RECYCLER' ? item.track_type : item.track;
        const isFree = userRole === 'RECYCLER' ? false : item.is_free;
        const navTarget = userRole === 'RECYCLER' ? 'Pickups' : 'ListingDetail';
        const navParams = userRole === 'RECYCLER' ? {} : { listingId: item.id };

        return (
            <TouchableOpacity 
                key={item.id} 
                style={styles.featuredCard}
                onPress={() => navigation.navigate(navTarget, navParams)}
                activeOpacity={0.9}
            >
                <View style={styles.featuredImageContainer}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.featuredImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.featuredImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                            <Package size={40} color="#ccc" />
                        </View>
                    )}
                    <View style={styles.featuredBadgesTop}>
                        <View style={styles.trackBadge}>
                            <Text style={styles.trackBadgeText}>Track {track || 'A'}</Text>
                        </View>
                        <View style={styles.heartBtn}>
                            <Heart size={16} color="#111" />
                        </View>
                    </View>
                </View>
                <View style={styles.featuredInfo}>
                    <View style={styles.featuredTitleRow}>
                        <Text style={styles.featuredTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.featuredPrice}>
                            {isFree ? 'FREE' : `₵${price || '0.00'}`}
                        </Text>
                    </View>
                    <View style={styles.featuredMetaRow}>
                        <View style={styles.featuredLocBox}>
                            <MapPin size={12} color="#888" />
                            <Text style={styles.featuredLocText} numberOfLines={1}>{loc}</Text>
                        </View>
                        <View style={styles.featuredLocBox}>
                            <Star size={12} color="#F39C12" fill="#F39C12" />
                            <Text style={styles.featuredLocText}>4.5</Text>
                            <Text style={styles.featuredLocSubtext}> (12)</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderRecentCard = ({ item }) => {
        const imageUri = userRole === 'RECYCLER' 
            ? (item.listing_image ? resolveImageUrl(item.listing_image) : getMaterialImage(item.material_type))
            : (item.image ? resolveImageUrl(item.image) : null);
        
        const title = userRole === 'RECYCLER' ? item.material_type : item.title;
        const qty = userRole === 'RECYCLER' ? item.quantity_estimate : item.quantity;
        const navTarget = userRole === 'RECYCLER' ? 'Pickups' : 'ListingDetail';
        const navParams = userRole === 'RECYCLER' ? {} : { listingId: item.id };

        return (
            <TouchableOpacity 
                style={styles.recentCard}
                onPress={() => navigation.navigate(navTarget, navParams)}
                activeOpacity={0.8}
            >
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.recentImage} contentFit="cover" />
                ) : (
                    <View style={[styles.recentImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Package size={20} color="#ccc" />
                    </View>
                )}
                <View style={styles.recentInfo}>
                    <Text style={styles.recentTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.recentSubtitle}>{qty || 'Variable'} • {formatTime(item.created_at)}</Text>
                </View>
                <View style={styles.recentAction}>
                    <ArrowUpRight size={18} color="#111" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <FlatList
                data={recentData}
                renderItem={renderRecentCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading || pickupsLoading} onRefresh={handleRefresh} />}
                ListHeaderComponent={<>
                    <SafeAreaView edges={['top']} style={styles.header}>
                        <View style={styles.headerTop}>
                            <View style={styles.userInfoBox}>
                                {user?.profile_photo ? (
                                    <Image source={{ uri: resolveImageUrl(user.profile_photo) }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}><User size={20} color="#111" /></View>
                                )}
                                <View style={styles.userInfoText}>
                                    <Text style={styles.greetingText}>{user?.first_name || user?.username || 'User'}</Text>
                                    <View style={styles.locationDropdown}>
                                        <Text style={styles.locationTextHeader}>Ghana, West Africa</Text>
                                        <ChevronDown size={14} color="#888" />
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Chat', { tab: 'Notifications' })}>
                                <Bell size={22} color="#111" />
                                <View style={styles.bellBadge} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.searchRow}>
                            <View style={styles.searchBar}>
                                <Search size={20} color="#999" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search waste materials..."
                                    placeholderTextColor="#999"
                                    value={search}
                                    onChangeText={setSearch}
                                />
                            </View>
                            <TouchableOpacity style={styles.filterBtn}>
                                <SlidersHorizontal size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingRight: 20 }}>
                            {CATEGORIES.map(renderCategory)}
                        </ScrollView>
                    </SafeAreaView>

                    {featuredData.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{userRole === 'RECYCLER' ? 'Available Pickups' : 'Recommended for you'}</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Pickups')}><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                                {featuredData.map(renderFeaturedCard)}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.section}>
                        <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
                            <Text style={styles.sectionTitle}>{userRole === 'RECYCLER' ? 'Recent Jobs' : 'Popular Listings'}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Pickups')}><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
                        </View>
                    </View>
                </>}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ color: '#999' }}>No items found.</Text>
                    </View>
                }
            />
            
            {userRole !== 'RECYCLER' && (
                <TouchableOpacity style={styles.floatingFab} onPress={() => navigation.navigate('CreateListing')}>
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
}"""

styles = """const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#fff' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    userInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    userInfoText: { justifyContent: 'center' },
    greetingText: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 2 },
    locationDropdown: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationTextHeader: { fontSize: 13, color: '#888' },
    bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    bellBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    
    searchRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, height: 54, borderWidth: 1, borderColor: '#F3F4F6' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111' },
    filterBtn: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    
    catScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
    catBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
    catBtnActive: { backgroundColor: '#111', borderColor: '#111' },
    catText: { fontSize: 14, color: '#111', fontWeight: '500' },
    catTextActive: { color: '#fff' },
    
    section: { marginTop: 10 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    viewAllText: { fontSize: 13, color: '#888', fontWeight: '500' },
    
    featuredCard: { width: 280, backgroundColor: '#fff', borderRadius: 24, marginRight: 16, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    featuredImageContainer: { width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', position: 'relative', marginBottom: 12 },
    featuredImage: { width: '100%', height: '100%' },
    featuredBadgesTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
    trackBadge: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    trackBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#111' },
    heartBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
    
    featuredInfo: { paddingHorizontal: 4 },
    featuredTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    featuredTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', flex: 1 },
    featuredPrice: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    featuredMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featuredLocBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    featuredLocText: { fontSize: 12, color: '#888' },
    featuredLocSubtext: { fontSize: 12, color: '#bbb' },
    
    recentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    recentImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
    recentInfo: { flex: 1 },
    recentTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 4 },
    recentSubtitle: { fontSize: 13, color: '#888' },
    recentAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    
    floatingFab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }
});
"""

# Replace component and styles
content = re.sub(r'export default function HomeScreen.*?const styles = StyleSheet\.create\({.*?\);', component + '\n\n' + styles, content, flags=re.DOTALL)

with open('mobile/src/screens/HomeScreen.js', 'w') as f:
    f.write(content)

print("Done")
