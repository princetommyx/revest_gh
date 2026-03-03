import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Modal, TextInput, ScrollView,
    ActivityIndicator, FlatList, Platform, Linking, KeyboardAvoidingView, Alert
} from 'react-native';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../api/client';
import { getMaterialImage } from './HomeScreen';
import {
    Truck, MapPin, Navigation,
    CheckCircle2, AlertCircle, Info, Clock, Search, X, ArrowLeft, Calendar,
    ChevronRight, Activity, Camera, Upload, Package, Image as LucideImage
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { usePickups } from '../hooks/usePickups';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Image } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const MATERIALS = ['Plastics', 'Metals', 'Paper', 'Electronics', 'Glass', 'Mixed'];
const QUANTITIES = ['1-2 Bags', '3-5 Bags', 'Tricycle Load', 'Pickup Truck Load'];

// Helper: Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

export default function PickupsScreen({ route }) {
    const navigation = useNavigation();
    const { userRole, user } = useAuth();

    // Check for params from ListingDetail
    const pickupData = route?.params?.pickupData;

    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const { data: jobs = [], isLoading: jobsLoading, error: apiError, isError, refetch } = usePickups(location);

    const mapRef = useRef(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestForm, setRequestForm] = useState({
        material_type: pickupData?.material_type || 'Plastics',
        quantity_estimate: pickupData?.quantity_estimate || '1-2 Bags',
        delivery_fee: null,
        waste_value: pickupData?.waste_price ? parseFloat(pickupData.waste_price).toFixed(2) : null,
        distance_km: null,
        duration_min: null,
        payment_method: 'DIGITAL',
        listing_id: pickupData?.listing_id || null,
        track_type: pickupData?.track_type || 'A',
        image: null
    });
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [customAddress, setCustomAddress] = useState('');
    const [recentLocations, setRecentLocations] = useState([]);

    // Destination State
    const [destinationAddress, setDestinationAddress] = useState('');
    const [destinationLocation, setDestinationLocation] = useState(null);
    const [selectionMode, setSelectionMode] = useState('PICKUP'); // 'PICKUP' or 'DESTINATION'

    // Cancel request state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelJobId, setCancelJobId] = useState(null);
    const [selectedCancelReason, setSelectedCancelReason] = useState(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    // Waste confirmation modal for collectors
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmingJob, setConfirmingJob] = useState(null);
    const [manualWeight, setManualWeight] = useState('');
    const [verificationPhoto, setVerificationPhoto] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);

    const CANCEL_REASONS = [
        { id: 'long_wait', label: 'Long pickup time', icon: '⏱️' },
        { id: 'collector_not_moving', label: 'Collector is not moving', icon: '🚫' },
        { id: 'wrong_location', label: 'Wrong pickup location', icon: '📍' },
        { id: 'changed_mind', label: 'Changed my mind', icon: '🔄' },
        { id: 'price_too_high', label: 'Price too high', icon: '💰' },
        { id: 'other', label: 'Other reason', icon: '📝' }
    ];

    // Location Selection State
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [mapRegion, setMapRegion] = useState(null);

    // Load recent locations on mount
    useEffect(() => {
        loadRecentLocations();
    }, []);

    // Reverse Geocode Function
    const reverseGeocode = async (lat, lon) => {
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (address) {
                const street = address.street || address.name || '';
                const city = address.city || address.subregion || address.region || '';
                return `${street}, ${city}`.replace(/^, /, '').trim();
            }
        } catch (error) {
            console.log('Reverse geocode error:', error);
        }
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    };

    const loadRecentLocations = async () => {
        try {
            const saved = await AsyncStorage.getItem('recent_pickup_locations');
            if (saved) {
                setRecentLocations(JSON.parse(saved));
            }
        } catch (e) {
            console.log('Error loading recent locations:', e);
        }
    };

    const saveRecentLocation = async (address) => {
        try {
            const updated = [
                { address, timestamp: Date.now() },
                ...recentLocations.filter(loc => loc.address !== address)
            ].slice(0, 5);

            await AsyncStorage.setItem('recent_pickup_locations', JSON.stringify(updated));
            setRecentLocations(updated);
        } catch (e) {
            console.log('Error saving recent location:', e);
        }
    };

    const loading = jobsLoading && (userRole !== 'COLLECTOR' || !!location);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        if (pickupData) {
            // Re-sync if params changed while screen was already mounted
            setRequestForm(prev => {
                if (prev.listing_id === pickupData.listing_id && prev.waste_value === parseFloat(pickupData.waste_price).toFixed(2)) {
                    return prev;
                }
                return {
                    ...prev,
                    material_type: pickupData.material_type || prev.material_type,
                    quantity_estimate: pickupData.quantity_estimate || prev.quantity_estimate,
                    waste_value: pickupData.waste_price ? parseFloat(pickupData.waste_price).toFixed(2) : prev.waste_value,
                    listing_id: pickupData.listing_id || prev.listing_id,
                    track_type: pickupData.track_type || prev.track_type,
                    payment_method: 'DIGITAL'
                };
            });

            if (pickupData.seller_location) {
                const { latitude, longitude, address } = pickupData.seller_location;
                if (latitude && longitude) {
                    setLocation({
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude)
                    });
                    setCustomAddress(address || '');

                    setMapRegion({
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude),
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    });
                }
            }

            setShowRequestModal(true);

            // Automatically fetch estimate if location is available and we don't have a fee yet
            if (location && !requestForm.delivery_fee) {
                setTimeout(fetchEstimate, 500);
            }

            navigation.setParams({ pickupData: null });
        }
    }, [pickupData]);

    const startMapSelection = () => {
        setShowRequestModal(false);
        setIsSelectingLocation(true);
        if (mapRef.current && location) {
            mapRef.current.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    };

    const confirmMapSelection = async () => {
        setIsSelectingLocation(false);
        if (mapRegion) {
            const address = await reverseGeocode(mapRegion.latitude, mapRegion.longitude);

            if (selectionMode === 'PICKUP') {
                setLocation({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
                setCustomAddress(address);
                setUseCurrentLocation(false);
            } else {
                setDestinationLocation({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
                setDestinationAddress(address);
            }

            setShowRequestModal(true);
        }
    };

    useEffect(() => {
        if (userRole !== 'COLLECTOR' || !location) return;
        const activeJob = jobs.find(j => j.status === 'ACCEPTED' && j.collector?.id === user?.id);
        if (!activeJob) return;

        const interval = setInterval(async () => {
            try {
                const currentLocation = await Location.getCurrentPositionAsync({});
                await logisticsApi.updateLocation(
                    activeJob.id,
                    currentLocation.coords.latitude,
                    currentLocation.coords.longitude
                );
            } catch (error) {
                console.log('Location update error:', error);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [userRole, location, jobs, user]);

    const fetchEstimate = async () => {
        if (!location) {
            Toast.show({ type: 'error', text1: 'Location Error', text2: 'Location missing. Cannot calculate estimate.' });
            return;
        }

        setRequestLoading(true);
        try {
            const estimate = await logisticsApi.estimatePrice({
                latitude: location.latitude,
                longitude: location.longitude
            });

            setRequestForm(prev => ({
                ...prev,
                delivery_fee: estimate.estimated_price,
                distance_km: estimate.distance_km,
                duration_min: estimate.duration_min
            }));
        } catch (error) {
            console.error("Estimate Error:", error);
            Toast.show({ type: 'error', text1: 'Estimate Error', text2: 'Failed to get estimate' });
        } finally {
            setRequestLoading(false);
        }
    };

    useEffect(() => {
        // ONLY calculate waste value if we are NOT using a pre-analyzed listing
        if (!requestForm.listing_id) {
            calculateWasteValue();
        }
    }, [requestForm.material_type, requestForm.quantity_estimate, requestForm.listing_id]);

    const calculateWasteValue = () => {
        const { material_type, quantity_estimate, listing_id } = requestForm;
        if (!material_type || !quantity_estimate || listing_id) return;

        const rates = {
            'Plastics': 1.5,
            'Metals': 4.0,
            'Paper': 0.8,
            'Electronics': 8.0,
            'Glass': 0.5,
            'Mixed': 1.0
        };

        const weights = {
            '1-2 Bags': 10,
            '3-5 Bags': 25,
            'Tricycle Load': 100,
            'Pickup Truck Load': 300
        };

        const rate = rates[material_type] || 1.0;
        const weight = weights[quantity_estimate] || 10;

        const baseValue = rate * weight;
        const commission = 0.20;
        const estimatedValue = baseValue * (1 - commission);

        setRequestForm(prev => ({
            ...prev,
            waste_value: estimatedValue.toFixed(2)
        }));
    };

    const pickRequestImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Library access required' });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });
            if (!result.canceled) {
                setRequestForm({ ...requestForm, image: result.assets[0] });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Could not pick photo' });
        }
    };

    const handleCreateRequest = async () => {
        if (!location) {
            Toast.show({ type: 'error', text1: 'Location Error', text2: 'Location not available' });
            return;
        }

        if (!requestForm.delivery_fee) {
            fetchEstimate();
            return;
        }

        setRequestLoading(true);
        try {
            const requestData = {
                ...requestForm,
                estimated_price: (
                    parseFloat(requestForm.waste_value || 0) + 
                    parseFloat(requestForm.delivery_fee || 0) + 
                    (userRole === 'RECYCLER' ? 5.00 : 0)
                ).toFixed(2),
                waste_price: parseFloat(requestForm.waste_value || 0).toFixed(2),
                delivery_fee: parseFloat(requestForm.delivery_fee || 0).toFixed(2),
                listing: requestForm.listing_id ? parseInt(requestForm.listing_id) : null,
                latitude: location.latitude,
                longitude: location.longitude,
                destination_address: destinationAddress,
                destination_latitude: destinationLocation?.latitude,
                destination_longitude: destinationLocation?.longitude
            };

            if (customAddress.trim()) {
                requestData.pickup_address = customAddress.trim();
                saveRecentLocation(customAddress.trim());
            }

            let finalData = requestData;
            if (requestForm.image) {
                finalData = new FormData();
                for (const key in requestData) {
                    if (requestData[key] !== null && requestData[key] !== undefined) {
                        finalData.append(key, requestData[key]);
                    }
                }
                const uri = requestForm.image.uri;
                let name = requestForm.image.fileName || uri.split('/').pop();
                if (!name.includes('.')) name += '.jpg';
                let type = requestForm.image.mimeType || 'image/jpeg';
                finalData.append('image', { uri, name, type });
            }

            await logisticsApi.createPickupRequest(finalData);

            Toast.show({ type: 'success', text1: 'Success', text2: 'Pickup request created!' });
            setShowRequestModal(false);
            setCustomAddress('');
            setDestinationAddress('');
            setDestinationLocation(null);
            refetch();
        } catch (error) {
            console.error("Create Request Error:", error);
            const errorData = error.response?.data;

            if (errorData?.detail === 'Insufficient funds' || errorData?.code === 'insufficient_funds') {
                const required = errorData.required || (parseFloat(requestForm.waste_value || 0) + parseFloat(requestForm.delivery_fee || 0));

                Alert.alert(
                    "Insufficient Funds",
                    `This order costs ₵${required}. Please top up your wallet to proceed.`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Top Up Now",
                            onPress: () => {
                                setShowRequestModal(false);
                                navigation.navigate('TopUp');
                            }
                        }
                    ]
                );
            } else {
                Toast.show({ type: 'error', text1: 'Request Failed', text2: errorData?.detail || 'Unknown error' });
            }
        } finally {
            setRequestLoading(false);
        }
    };

    const handleAcceptJob = async (jobId) => {
        try {
            await logisticsApi.acceptRequest(jobId);
            Toast.show({ type: 'success', text1: 'Accepted', text2: 'Job accepted! Start navigating.' });
            refetch();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to accept job' });
        }
    };

    const handleArriveJob = async (jobId) => {
        try {
            await logisticsApi.updateStatus(jobId, 'ARRIVED');
            Toast.show({ type: 'success', text1: 'Arrived', text2: 'Marked as Arrived!' });
            refetch();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update status' });
        }
    };

    const openNavigation = (job) => {
        const { latitude, longitude, pickup_address } = job;
        const label = encodeURIComponent(pickup_address || 'Pickup Location');
        const scheme = Platform.select({
            ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
            android: `geo:0,0?q=${latitude},${longitude}(${label})`
        });

        Linking.openURL(scheme).catch(() => {
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            Linking.openURL(webUrl);
        });
    };

    const pickVerificationImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Camera access required' });
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });
            if (!result.canceled) {
                setVerificationPhoto(result.assets[0]);
                setVerificationResult(null); // Reset result if new photo
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Could not capture photo' });
        }
    };

    const handleVerifyWeight = async () => {
        if (!manualWeight || !verificationPhoto) {
            Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Please enter weight and take a photo' });
            return;
        }

        setIsVerifying(true);
        try {
            const data = new FormData();
            const uri = verificationPhoto.uri;
            let name = verificationPhoto.fileName || uri.split('/').pop();
            if (!name.includes('.')) name += '.jpg';
            let type = verificationPhoto.mimeType || 'image/jpeg';

            data.append('verification_photo', { uri, name, type });
            data.append('manual_weight', manualWeight);

            const result = await logisticsApi.verifyWeight(confirmingJob.id, data);
            setVerificationResult(result);

            if (result.is_verified) {
                Toast.show({ type: 'success', text1: 'Weight Verified ✓', text2: `AI Estimate: ${result.ai_weight_estimate}kg` });
            } else {
                Toast.show({ type: 'error', text1: 'Verification Failed', text2: result.reasoning });
            }
        } catch (error) {
            console.error("Verification Error:", error);
            Toast.show({ type: 'error', text1: 'Verification Error', text2: 'Failed to connect to AI server' });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCompleteJob = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (job) {
            setConfirmingJob(job);
            setManualWeight('');
            setVerificationPhoto(null);
            setVerificationResult(null);
            setShowConfirmModal(true);
        }
    };

    const confirmAndCompleteJob = async () => {
        if (!confirmingJob) return;

        // Force verification for Track B
        if (confirmingJob.track_type === 'B' && !verificationResult?.is_verified) {
            Toast.show({ type: 'error', text1: 'Verification Required', text2: 'Please verify the waste weight first' });
            return;
        }

        try {
            await logisticsApi.updateStatus(confirmingJob.id, 'COMPLETED');
            Toast.show({ type: 'success', text1: 'Completed', text2: 'Job Completed! Funds processed.' });
            setShowConfirmModal(false);
            setConfirmingJob(null);
            refetch();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to complete job' });
        }
    };

    const openCancelModal = (jobId) => {
        setCancelJobId(jobId);
        setSelectedCancelReason(null);
        setShowCancelModal(true);
    };

    const handleCancelRequest = async () => {
        if (!selectedCancelReason) {
            Toast.show({ type: 'info', text1: 'Selection Missing', text2: 'Please select a reason' });
            return;
        }

        setCancelLoading(true);
        try {
            await logisticsApi.cancelRequest(cancelJobId, selectedCancelReason);
            Toast.show({ type: 'success', text1: 'Cancelled', text2: 'Request cancelled' });
            setShowCancelModal(false);
            setCancelJobId(null);
            setSelectedCancelReason(null);
            refetch();
        } catch (error) {
            console.error("Cancel Error:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to cancel request' });
        } finally {
            setCancelLoading(false);
        }
    };

    const renderJobMarker = (job) => {
        const markers = [];
        const routes = [];

        markers.push(
            <Marker
                key={`pickup-${job.id}`}
                coordinate={{ latitude: parseFloat(job.latitude), longitude: parseFloat(job.longitude) }}
                title={job.material_type}
                description={`Pickup: ${job.status}`}
            >
                <View style={[
                    styles.markerContainer,
                    job.status === 'COMPLETED' && { borderColor: '#999' },
                    job.status === 'ACCEPTED' && { borderColor: '#F39C12' }
                ]}>
                    <MapPin size={24} color={job.status === 'PENDING' ? '#2E7D32' : (job.status === 'ACCEPTED' ? '#F39C12' : '#999')} />
                </View>
            </Marker>
        );

        if (job.status === 'ACCEPTED' && job.current_lat && job.current_lon) {
            markers.push(
                <Marker
                    key={`collector-${job.id}`}
                    coordinate={{ latitude: parseFloat(job.current_lat), longitude: parseFloat(job.current_lon) }}
                    title="Collector"
                    description={job.collector_name || "En route"}
                >
                    <View style={[styles.markerContainer, { borderColor: '#3498DB' }]}>
                        <Truck size={24} color="#3498DB" />
                    </View>
                </Marker>
            );

            routes.push(
                <Polyline
                    key={`route-${job.id}`}
                    coordinates={[
                        { latitude: parseFloat(job.current_lat), longitude: parseFloat(job.current_lon) },
                        { latitude: parseFloat(job.latitude), longitude: parseFloat(job.longitude) }
                    ]}
                    strokeColor="#3498DB"
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                />
            );
        }

        return [...markers, ...routes];
    };

    const memoizedMarkers = useMemo(() => {
        return jobs.flatMap(renderJobMarker);
    }, [jobs]);

    const sortedJobs = useMemo(() => {
        if (userRole !== 'COLLECTOR') return jobs;
        const activeJobs = jobs.filter(j => j.status === 'ACCEPTED' || j.status === 'ARRIVED');
        const pendingJobs = jobs.filter(j => j.status === 'PENDING');
        return [...activeJobs, ...pendingJobs];
    }, [jobs, userRole]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
    }

    return (
        <View style={styles.container}>
            <MapView
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
            </MapView>

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
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.headerTextCol}>
                            <Text style={styles.headerTitleMain}>
                                {userRole === 'COLLECTOR' ? 'Nearby Pickups' : 'My Pickups'}
                            </Text>
                            <Text style={styles.headerSubText}>
                                {userRole === 'COLLECTOR' ? 'Earn by recycling waste' : 'Track your waste collection'}
                            </Text>
                        </View>
                        {userRole !== 'COLLECTOR' ? (
                            <TouchableOpacity
                                style={styles.historyBtn}
                                onPress={() => navigation.navigate('PickupHistory')}
                            >
                                <Clock size={20} color="#333" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.historyBtn}
                                onPress={() => navigation.navigate('CollectorJobs')}
                            >
                                <Truck size={20} color="#333" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {userRole !== 'COLLECTOR' && (
                        <View style={styles.floatingActionRow}>
                            <TouchableOpacity
                                style={styles.requestButton}
                                onPress={() => setShowRequestModal(true)}
                            >
                                <MapPin size={20} color="#fff" />
                                <Text style={styles.requestButtonText}>Request Pickup</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {!isSelectingLocation && sortedJobs.length > 0 && (
                <View style={styles.jobListContainer}>
                    <FlatList
                        data={sortedJobs}
                        keyExtractor={(item) => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={width * 0.85 + 20}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingHorizontal: 10 }}
                        renderItem={({ item, index }) => {
                            const previousItem = index > 0 ? sortedJobs[index - 1] : null;
                            const showSeparator = previousItem &&
                                (previousItem.status === 'ACCEPTED' || previousItem.status === 'ARRIVED') &&
                                item.status === 'PENDING';

                            return (
                                <>
                                    {showSeparator && (
                                        <View style={styles.jobSeparator}>
                                            <Text style={styles.separatorText}>Available Jobs</Text>
                                        </View>
                                    )}
                                    <View style={styles.jobCard}>
                                        <View style={styles.cardHeader}>
                                            <Image
                                                source={{ uri: item.listing_image ? (item.listing_image.startsWith('http') ? item.listing_image : `${BASE_URL}${item.listing_image}`) : getMaterialImage(item.material_type) }}
                                                style={{ width: 44, height: 44, borderRadius: 14, marginRight: 12 }}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                            />
                                            <View style={styles.jobMainInfo}>
                                                <Text style={styles.jobType}>{item.material_type}</Text>
                                                <Text style={styles.jobQty}>{item.quantity_estimate}</Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: item.status === 'PENDING' ? '#ECFDF5' : '#FFFBEB' }]}>
                                                <Text style={[styles.statusText, { color: item.status === 'PENDING' ? '#10B981' : '#F59E0B' }]}>{item.status}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.jobDivider} />

                                        <View style={styles.jobLocationRow}>
                                            <MapPin size={16} color="#999" />
                                            <Text style={styles.jobLoc} numberOfLines={1}>{item.pickup_address}</Text>
                                        </View>

                                        {userRole === 'COLLECTOR' && (
                                            <View style={styles.actionRow}>
                                                {item.status === 'PENDING' && (
                                                    <TouchableOpacity
                                                        style={styles.acceptBtn}
                                                        onPress={() => handleAcceptJob(item.id)}
                                                    >
                                                        <Text style={styles.acceptBtnText}>Accept Order</Text>
                                                        <ChevronRight size={18} color="#fff" />
                                                    </TouchableOpacity>
                                                )}

                                                {item.status === 'ACCEPTED' && (
                                                    <View style={styles.collectorActions}>
                                                        <TouchableOpacity
                                                            style={[styles.actionBtn, styles.navBtn]}
                                                            onPress={() => openNavigation(item)}
                                                        >
                                                            <Navigation size={18} color="#fff" />
                                                            <Text style={styles.actionBtnText}>Navigate</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={[styles.actionBtn, styles.arriveBtn]}
                                                            onPress={() => handleArriveJob(item.id)}
                                                        >
                                                            <CheckCircle2 size={18} color="#fff" />
                                                            <Text style={styles.actionBtnText}>Arrived</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}

                                                {item.status === 'ARRIVED' && (
                                                    <TouchableOpacity
                                                        style={[styles.acceptBtn, { backgroundColor: '#2E7D32' }]}
                                                        onPress={() => handleCompleteJob(item.id)}
                                                    >
                                                        <Text style={styles.acceptBtnText}>Confirm Completion</Text>
                                                        <CheckCircle2 size={18} color="#fff" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}

                                        {userRole === 'SELLER' && item.status === 'ACCEPTED' && (
                                            <View style={styles.trackingContainer}>
                                                <View style={styles.trackingPulse}>
                                                    <Activity size={14} color="#3498DB" />
                                                    <Text style={styles.trackingTitle}>Collector En Route</Text>
                                                </View>
                                                <Text style={styles.trackingDetail}>
                                                    {item.collector_name || "Collector"} is picking up your waste.
                                                </Text>
                                            </View>
                                        )}

                                        {userRole === 'SELLER' && (item.status === 'PENDING' || item.status === 'ACCEPTED') && (
                                            <TouchableOpacity
                                                style={styles.cancelRequestBtn}
                                                onPress={() => openCancelModal(item.id)}
                                            >
                                                <Text style={styles.cancelText}>Cancel Pickup</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            );
                        }}
                    />
                </View>
            )}

            {jobs.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                        {userRole === 'COLLECTOR' ? 'No jobs available nearby' : 'You have no active pickups'}
                    </Text>
                </View>
            )}

            {errorMsg && (
                <View style={styles.errorBox}>
                    <AlertCircle size={20} color="#E74C3C" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            {isError && apiError && (
                <View style={styles.errorBox}>
                    <AlertCircle size={20} color="#E74C3C" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.errorText}>
                            {apiError.message?.includes('Network') || apiError.message?.includes('timeout')
                                ? 'Network error. Check your connection and try again.'
                                : 'Failed to load pickup requests'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => refetch()}
                            style={{ marginTop: 8, backgroundColor: '#E74C3C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' }}
                        >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Request Pickup Modal */}
            <Modal
                visible={showRequestModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRequestModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Pickup</Text>
                            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                                <X size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                            <Text style={styles.label}>Pickup Location</Text>
                            <View style={styles.locationToggleRow}>
                                <TouchableOpacity
                                    style={[styles.locationToggleBtn, useCurrentLocation && styles.locationToggleBtnActive]}
                                    onPress={() => setUseCurrentLocation(true)}
                                >
                                    <Navigation size={16} color={useCurrentLocation ? "#fff" : "#666"} />
                                    <Text style={[styles.locationToggleText, useCurrentLocation && styles.locationToggleTextActive]}>Current</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.locationToggleBtn, !useCurrentLocation && styles.locationToggleBtnActive]}
                                    onPress={() => setUseCurrentLocation(false)}
                                >
                                    <MapPin size={16} color={!useCurrentLocation ? "#fff" : "#666"} />
                                    <Text style={[styles.locationToggleText, !useCurrentLocation && styles.locationToggleTextActive]}>Custom</Text>
                                </TouchableOpacity>
                            </View>

                            {useCurrentLocation ? (
                                <View style={styles.currentLocationBox}>
                                    <Navigation size={16} color="#2E7D32" />
                                    <Text style={{ flex: 1, color: '#2E7D32', fontSize: 13, fontWeight: '500' }}>
                                        Using your current GPS coordinates to ensure faster pickup.
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ position: 'relative' }}>
                                    <TextInput
                                        style={styles.addressInput}
                                        placeholder="Enter landmark or street address"
                                        value={customAddress}
                                        onChangeText={setCustomAddress}
                                    />
                                    <TouchableOpacity
                                        style={styles.mapSelectBtn}
                                        onPress={startMapSelection}
                                    >
                                        <MapPin size={14} color="#2E7D32" />
                                        <Text style={styles.mapSelectText}>Map</Text>
                                    </TouchableOpacity>
                                </View>
                            )}


                            {/* Price Estimate Section */}
                            <View style={styles.estimateContainer}>
                                <Text style={styles.label}>Order Estimate</Text>
                                {requestLoading ? (
                                    <View style={styles.estimateLoading}>
                                        <ActivityIndicator size="small" color="#2E7D32" />
                                        <Text style={styles.estimateLoadingText}>Calculating costs...</Text>
                                    </View>
                                ) : (requestForm.waste_value) ? (
                                    <View style={styles.estimateBox}>
                                        <View style={styles.estimateRow}>
                                            <Text style={styles.estimateLabel}>Order Price (Waste)</Text>
                                            <Text style={styles.estimateValue}>₵{requestForm.waste_value}</Text>
                                        </View>

                                        {userRole === 'SELLER' && (
                                            <View style={styles.estimateRow}>
                                                <Text style={[styles.estimateLabel, { color: '#C62828' }]}>Platform Fee</Text>
                                                <Text style={[styles.estimateValue, { color: '#C62828' }]}>-₵2.00</Text>
                                            </View>
                                        )}

                                         {userRole !== 'SELLER' && (
                                            <>
                                                <View style={styles.estimateRow}>
                                                    <Text style={styles.estimateLabel}>Delivery Fee</Text>
                                                    <Text style={styles.estimateValue}>₵{requestForm.delivery_fee}</Text>
                                                </View>
                                                {userRole === 'RECYCLER' && (
                                                    <View style={styles.estimateRow}>
                                                        <Text style={styles.estimateLabel}>Service Fee</Text>
                                                        <Text style={styles.estimateValue}>₵5.00</Text>
                                                    </View>
                                                )}
                                            </>
                                        )}

                                        <View style={styles.divider} />
                                        
                                        <View style={styles.estimateTotalRow}>
                                            <Text style={styles.estimateTotalLabel}>
                                                {userRole === 'SELLER' ? 'Total Payout' : 'Total'}
                                            </Text>
                                            <Text style={[styles.estimateTotalValue, userRole === 'SELLER' && { color: '#2E7D32' }]}>
                                                ₵{userRole === 'SELLER'
                                                    ? (parseFloat(requestForm.waste_value) - 2.00).toFixed(2)
                                                    : (parseFloat(requestForm.waste_value) + parseFloat(requestForm.delivery_fee || 0) + (userRole === 'RECYCLER' ? 5.00 : 0)).toFixed(2)}
                                            </Text>
                                        </View>
                                         <Text style={styles.estimateNote}>
                                            {userRole === 'SELLER'
                                                ? "Revesta commission of ₵2.00 will be deducted from your payout."
                                                : (userRole === 'RECYCLER'
                                                    ? "Funds will be held in escrow and released to Seller & Collector upon arrival."
                                                    : "Includes waste cost & rider delivery fee")}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.estimateBox}>
                                        <Text style={{ color: '#999', textAlign: 'center' }}>
                                            Enter materials & location to see estimate
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.submitRequestBtn, !requestForm.waste_value && { backgroundColor: '#ccc' }]}
                                onPress={handleCreateRequest}
                                disabled={requestLoading}
                            >
                                {requestLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitRequestBtnText}>
                                        {userRole === 'RECYCLER' ? 'Confirm & Pay' : 'Confirm Request'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Cancel Request Modal */}
            <Modal
                visible={showCancelModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCancelModal(false)}
            >
                <View style={styles.cancelModalOverlay}>
                    <View style={styles.cancelModalContent}>
                        <View style={styles.cancelModalHeader}>
                            <Text style={styles.cancelModalTitle}>Cancel Pickup?</Text>
                            <TouchableOpacity
                                onPress={() => setShowCancelModal(false)}
                                style={styles.cancelModalClose}
                            >
                                <X size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.cancelModalSubtitle}>
                            Please tell us why you're cancelling
                        </Text>

                        <ScrollView style={styles.cancelReasonsList}>
                            {CANCEL_REASONS.map((reason) => (
                                <TouchableOpacity
                                    key={reason.id}
                                    style={[
                                        styles.cancelReasonItem,
                                        selectedCancelReason === reason.id && styles.cancelReasonItemActive
                                    ]}
                                    onPress={() => setSelectedCancelReason(reason.id)}
                                >
                                    <Text style={styles.cancelReasonIcon}>{reason.icon}</Text>
                                    <Text style={[
                                        styles.cancelReasonText,
                                        selectedCancelReason === reason.id && styles.cancelReasonTextActive
                                    ]}>{reason.label}</Text>
                                    {selectedCancelReason === reason.id && (
                                        <CheckCircle2 size={20} color="#E74C3C" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.cancelModalButtons}>
                            <TouchableOpacity
                                style={styles.cancelModalKeepBtn}
                                onPress={() => setShowCancelModal(false)}
                            >
                                <Text style={styles.cancelModalKeepText}>Keep Request</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.cancelModalConfirmBtn,
                                    !selectedCancelReason && { backgroundColor: '#ccc' }
                                ]}
                                onPress={handleCancelRequest}
                                disabled={cancelLoading || !selectedCancelReason}
                            >
                                {cancelLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.cancelModalConfirmText}>Cancel Request</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Completion Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.cancelModalContent}>
                        <Text style={styles.cancelModalTitle}>Complete Job</Text>

                        {confirmingJob && (
                            <View style={{ marginVertical: 15 }}>
                                <View style={styles.jobDetailRow}>
                                    <Package size={16} color="#666" />
                                    <Text style={styles.jobDetailText}>
                                        {confirmingJob.material_type} ({confirmingJob.quantity_estimate})
                                    </Text>
                                </View>

                                <View style={styles.trackBadgeContainer}>
                                    <View style={[
                                        styles.trackTag,
                                        { backgroundColor: confirmingJob.track_type === 'A' ? '#FEE2E2' : '#DCFCE7' }
                                    ]}>
                                        <Text style={[
                                            styles.trackTagText,
                                            { color: confirmingJob.track_type === 'A' ? '#2E7D32' : '#166534' }
                                        ]}>
                                            {confirmingJob.track_type === 'A' ? 'Safe Disposal (Pay to Clear)' : 'Sell Recyclables (Earn Cash)'}
                                        </Text>
                                    </View>
                                </View>

                                {confirmingJob.track_type === 'B' && (
                                    <View style={styles.verificationSection}>
                                        <Text style={styles.verificationLabel}>Scale Verification (Required)</Text>

                                        <View style={styles.weightInputRow}>
                                            <TextInput
                                                style={styles.manualWeightInput}
                                                placeholder="Actual Weight (kg)"
                                                keyboardType="numeric"
                                                value={manualWeight}
                                                onChangeText={setManualWeight}
                                            />
                                            <TouchableOpacity
                                                style={[styles.verifyIconButton, verificationPhoto && { backgroundColor: '#E8F5E9' }]}
                                                onPress={pickVerificationImage}
                                            >
                                                <Camera size={20} color={verificationPhoto ? '#2E7D32' : '#666'} />
                                            </TouchableOpacity>
                                        </View>

                                        {verificationPhoto && (
                                            <View style={styles.photoPreviewRow}>
                                                <Image source={{ uri: verificationPhoto.uri }} style={styles.photoPreviewSmall} />
                                                <TouchableOpacity
                                                    style={[
                                                        styles.aiVerifyBtn,
                                                        verificationResult?.is_verified && { backgroundColor: '#2E7D32' }
                                                    ]}
                                                    onPress={handleVerifyWeight}
                                                    disabled={isVerifying}
                                                >
                                                    {isVerifying ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <Text style={styles.aiVerifyBtnText}>
                                                            {verificationResult?.is_verified ? 'Verified ✓' : 'Run AI Verify'}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {verificationResult && !verificationResult.is_verified && (
                                            <Text style={styles.verificationErrorText}>
                                                {verificationResult.reasoning}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                <View style={styles.earningsSummary}>
                                    <Text style={styles.earningsLabel}>Your Logistics Share:</Text>
                                    <Text style={styles.earningsAmount}>
                                        ₵{(confirmingJob.track_type === 'A'
                                            ? (parseFloat(confirmingJob.actual_price || 0) * 0.8)
                                            : (parseFloat(confirmingJob.delivery_fee || 0) - 5.00)).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 }}>
                            Mark this job as completed? Funds will be processed to your wallet.
                        </Text>

                        <View style={styles.cancelModalButtons}>
                            <TouchableOpacity
                                style={styles.cancelModalKeepBtn}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.cancelModalKeepText}>Go Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.cancelModalConfirmBtn,
                                    { backgroundColor: '#2E7D32' },
                                    (confirmingJob?.track_type === 'B' && !verificationResult?.is_verified) && { backgroundColor: '#ccc' }
                                ]}
                                onPress={confirmAndCompleteJob}
                                disabled={confirmingJob?.track_type === 'B' && !verificationResult?.is_verified}
                            >
                                <Text style={styles.cancelModalConfirmText}>Complete & Get Paid</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: width, height: height },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextCol: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitleMain: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    headerSubText: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    historyBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingActionRow: {
        marginTop: 20,
    },
    requestButton: {
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    requestButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },

    jobListContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
    },
    jobCard: {
        backgroundColor: '#fff',
        width: width * 0.85,
        marginHorizontal: 10,
        borderRadius: 28,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    jobIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    jobMainInfo: {
        flex: 1,
    },
    jobType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    jobQty: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    jobDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 15,
    },
    jobLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    jobLoc: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    actionRow: {
        marginTop: 10,
    },
    acceptBtn: {
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    acceptBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    collectorActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    navBtn: { backgroundColor: '#3498DB' },
    arriveBtn: { backgroundColor: '#F39C12' },
    actionBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    trackingContainer: {
        backgroundColor: '#EBF5FB',
        padding: 15,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#3498DB',
    },
    trackingPulse: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    trackingTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2980B9',
    },
    trackingDetail: {
        fontSize: 12,
        color: '#5D6D7E',
    },
    cancelRequestBtn: {
        alignItems: 'center',
        marginTop: 15,
    },
    cancelText: {
        fontSize: 13,
        color: '#E74C3C',
        fontWeight: '600',
    },

    markerContainer: {
        backgroundColor: '#fff',
        padding: 5,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#2E7D32',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    selectionOverlay: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    selectionHeader: { alignItems: 'center', marginBottom: 15 },
    selectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    selectionSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
    confirmLocationBtn: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 15,
        width: '100%',
        alignItems: 'center',
    },
    confirmLocationText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: height * 0.9,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
    modalBody: {},
    label: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    pickerItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    pickerItemActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32',
    },
    pickerItemText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
    pickerItemTextActive: { color: '#fff', fontWeight: 'bold' },

    locationToggleRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 15,
    },
    locationToggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    locationToggleBtnActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32',
    },
    locationToggleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    locationToggleTextActive: { color: '#fff' },

    addressInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 15,
        fontSize: 14,
        color: '#1A1A1A',
        marginBottom: 20,
    },
    mapSelectBtn: {
        position: 'absolute',
        right: 12,
        top: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    mapSelectText: { fontSize: 12, color: '#059669', fontWeight: 'bold' },

    currentLocationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#ECFDF5',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
    },

    estimateContainer: {
        marginBottom: 20,
    },
    estimateLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 15,
    },
    estimateLoadingText: { color: '#6B7280', fontSize: 13 },
    estimateBox: {
        backgroundColor: '#F9FAFB',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    estimateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    estimateLabel: { fontSize: 14, color: '#6B7280' },
    estimateValue: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    estimateTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    estimateTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
    estimateTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
    estimateNote: {
        fontSize: 11,
        color: '#9CA3AF',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    submitRequestBtn: {
        backgroundColor: '#2E7D32',
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    submitRequestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    cancelModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    cancelModalContent: {
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 24,
    },
    cancelModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cancelModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
    cancelModalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
    cancelReasonsList: { maxHeight: 300, marginBottom: 20 },
    cancelReasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 10,
    },
    cancelReasonItemActive: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
    },
    cancelReasonIcon: { fontSize: 20, marginRight: 12 },
    cancelReasonText: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },
    cancelReasonTextActive: { color: '#EF4444', fontWeight: 'bold' },
    cancelModalClose: { padding: 4 },
    cancelModalButtons: { flexDirection: 'row', gap: 12 },
    cancelModalKeepBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelModalConfirmBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 15,
        backgroundColor: '#EF4444',
        alignItems: 'center',
    },
    cancelModalKeepText: { color: '#4B5563', fontWeight: 'bold' },
    cancelModalConfirmText: { color: '#fff', fontWeight: 'bold' },

    errorBox: {
        position: 'absolute',
        top: 150,
        left: 20,
        right: 20,
        backgroundColor: '#FEF2F2',
        padding: 15,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 20,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    errorText: { color: '#EF4444', fontSize: 13, fontWeight: '500' },
    emptyState: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        elevation: 3,
    },
    emptyText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
    jobSeparator: {
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    separatorText: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 },

    // Verification Styles
    jobDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    jobDetailText: {
        fontSize: 15,
        color: '#1A1A1A',
        fontWeight: '500',
    },
    trackBadgeContainer: {
        marginBottom: 15,
    },
    trackTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    trackTagText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    verificationSection: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 15,
    },
    verificationLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    weightInputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    manualWeightInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
    },
    verifyIconButton: {
        width: 44,
        height: 44,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
    },
    photoPreviewSmall: {
        width: 50,
        height: 50,
        borderRadius: 6,
    },
    aiVerifyBtn: {
        flex: 1,
        backgroundColor: '#3498DB',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    aiVerifyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    verificationErrorText: {
        fontSize: 11,
        color: '#DC2626',
        marginTop: 8,
    },
    earningsSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    earningsLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    earningsAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    imageUploadBtn: {
        width: '100%',
        height: 120,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        marginTop: 10,
    },
    imageUploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    imageUploadText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    uploadedImagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});
