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
    Truck, MapPin, Navigation, Menu, Bell,
    CircleCheck, CircleAlert, Info, Clock, Search, X, ArrowLeft, Calendar,
    ChevronRight, Activity, Camera, Upload, Package, Image as LucideImage, Globe, ShieldAlert,
    User
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { usePickups } from '../hooks/usePickups';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Image } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MapView, { Marker, Polyline } from 'react-native-maps';

const ActiveMap = MapView;
const ActiveMarker = Marker;
const ActivePolyline = Polyline;

const { width, height } = Dimensions.get('window');

const MATERIALS = ['Plastics', 'Metals', 'Paper', 'Electronics', 'Glass', 'Mixed'];
const QUANTITIES = ['1-2 Bags', '3-5 Bags', 'Tricycle Load', 'Pickup Truck Load'];

const VEHICLES = [
    { id: 'tricycle', label: 'Tricycle', time: '5 min', icon: Truck },
    { id: 'pickup', label: 'Pickup', time: '12 min', icon: Truck }
];


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

const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];

export default function PickupsScreen({ route }) {
    const navigation = useNavigation();
    const { userRole, user } = useAuth();

    // Check for params from ListingDetail
    const pickupData = route?.params?.pickupData;

    const [location, setLocation] = useState(null);
    const [hasLocationPermission, setHasLocationPermission] = useState(null);
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
    const [uiState, setUiState] = useState('IDLE');
    const [selectedVehicle, setSelectedVehicle] = useState('tricycle');

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
    };

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

            setTimeout(() => {
                navigation.setParams({ pickupData: null });
            }, 500);
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

        setRequestLoading(true);
        try {
            const requestData = {
                material_type: requestForm.material_type || 'General Waste',
                quantity_estimate: requestForm.quantity_estimate || 'Standard',
                estimated_price: '0.00',
                waste_price: '0.00',
                delivery_fee: '0.00',
                latitude: location.latitude,
                longitude: location.longitude,
                destination_address: destinationAddress,
                destination_latitude: destinationLocation?.latitude,
                destination_longitude: destinationLocation?.longitude
            };

            if (requestForm.listing_id) {
                requestData.listing = parseInt(requestForm.listing_id);
            }

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
            const errorData = error?.response?.data;
            const errorMsg = errorData?.error || errorData?.detail || 'Failed to accept job';
            const status = error?.response?.status;

            if (status === 403 && errorMsg.toLowerCase().includes('kyc')) {
                Alert.alert(
                    'Identity Verification Required',
                    'You must complete KYC verification before accepting jobs. Would you like to do that now?',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Verify Now', onPress: () => navigation.navigate('KYCVerification') }
                    ]
                );
            } else if (status === 400) {
                Toast.show({ type: 'warning', text1: 'Cannot Accept', text2: errorMsg });
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: errorMsg });
            }
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

        if (!job.latitude || !job.longitude) return [];
        const lat = parseFloat(job.latitude);
        const lon = parseFloat(job.longitude);
        if (isNaN(lat) || isNaN(lon)) return [];

        markers.push(
            <ActiveMarker
                key={`pickup-${job.id}`}
                coordinate={{ latitude: lat, longitude: lon }}
                title={job.material_type}
                description={`Pickup: ${job.status}`}
            >
                <View style={[
                    styles.markerContainer,
                    job.status === 'COMPLETED' && { borderColor: '#999' },
                    job.status === 'ACCEPTED' && { borderColor: '#111' }
                ]}>
                    <MapPin size={24} color={job.status === 'PENDING' ? '#111' : (job.status === 'ACCEPTED' ? '#111' : '#999')} />
                </View>
            </ActiveMarker>
        );

        if (job.status === 'ACCEPTED' && job.current_lat && job.current_lon) {
            const currentLat = parseFloat(job.current_lat);
            const currentLon = parseFloat(job.current_lon);
            
            if (!isNaN(currentLat) && !isNaN(currentLon)) {
                markers.push(
                    <ActiveMarker
                        key={`collector-${job.id}`}
                        coordinate={{ latitude: currentLat, longitude: currentLon }}
                        title="Collector"
                        description={job.collector_name || "En route"}
                    >
                    <View style={[styles.markerContainer, { borderColor: '#111' }]}>
                        <Truck size={24} color="#111" />
                    </View>
                </ActiveMarker>
            );

                routes.push(
                    <ActivePolyline
                        key={`route-${job.id}`}
                        coordinates={[
                            { latitude: currentLat, longitude: currentLon },
                            { latitude: lat, longitude: lon }
                        ]}
                        strokeColor="#111"
                        strokeWidth={3}
                        lineDashPattern={[5, 5]}
                    />
                );
            }
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

    if (hasLocationPermission === false) {
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
                userInterfaceStyle="dark"
                customMapStyle={darkMapStyle}
            >
                {memoizedMarkers}

                {isSelectingLocation && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -32 }}>
                        <MapPin size={32} color="#111" fill="#111" />
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
                <View style={styles.floatingTopBarUbride}>
                    <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Profile')}>
                        <User size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.ubrideLogo}>Revesta</Text>
                    <TouchableOpacity style={styles.bellBtnUbride} onPress={() => navigation.navigate('PickupHistory')}>
                        <Clock size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {!isSelectingLocation && userRole === 'SELLER' && uiState === 'IDLE' && (
                <View style={styles.bottomSheetUbride}>
                    <View style={styles.locationInputBox}>
                        <Text style={styles.locationInputLabel}>PICKUP</Text>
                        <TouchableOpacity style={styles.locationInputRow} onPress={() => startMapSelection('PICKUP')}>
                            <View style={styles.locationInputIconBox}>
                                <View style={styles.dotIndicatorPickup} />
                            </View>
                            <Text style={styles.locationInputText} numberOfLines={1}>
                                {customAddress || 'Current Location'}
                            </Text>
                            <ChevronRight size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.locationInputRow, { marginTop: 15, backgroundColor: '#111', padding: 15, borderRadius: 12 }]} onPress={() => startMapSelection('DESTINATION')}>
                            <View style={styles.locationInputIconBox}>
                                <View style={styles.dotIndicatorDest} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>Enter your Destination</Text>
                                <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>{destinationAddress || 'Please tell us your drop location!'}</Text>
                            </View>
                            <X size={16} color="#999" onPress={() => setDestinationAddress('')} />
                        </TouchableOpacity>
                        
                        {(customAddress || location) && destinationAddress && (
                            <TouchableOpacity style={styles.continueBtnUbride} onPress={() => setUiState('VEHICLE_SELECT')}>
                                <Text style={styles.continueBtnTextUbride}>Continue</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {!isSelectingLocation && userRole === 'SELLER' && uiState === 'VEHICLE_SELECT' && (
                <View style={styles.bottomSheetUbrideVehicles}>
                    <TouchableOpacity style={styles.backVehicleBtn} onPress={() => setUiState('IDLE')}>
                        <View style={styles.dragHandle} />
                    </TouchableOpacity>
                    <View style={styles.vehicleCategories}>
                        <Text style={[styles.vehicleCatText, selectedVehicle === 'Economy' && styles.vehicleCatTextActive]}>Economy</Text>
                        <Text style={[styles.vehicleCatText, selectedVehicle === 'Premium' && styles.vehicleCatTextActive]}>Premium</Text>
                        <Text style={[styles.vehicleCatText, selectedVehicle === 'Extras' && styles.vehicleCatTextActive]}>Extras</Text>
                    </View>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroll}>
                        {VEHICLES.map(v => {
                            const Icon = v.icon;
                            return (
                                <TouchableOpacity 
                                    key={v.id} 
                                    style={[styles.vehicleCard, selectedVehicle === v.id && styles.vehicleCardActive]}
                                    onPress={() => setSelectedVehicle(v.id)}
                                >
                                    <Icon size={40} color={selectedVehicle === v.id ? '#111' : '#666'} style={{ marginBottom: 10 }} />
                                    <Text style={[styles.vehicleName, selectedVehicle === v.id && styles.vehicleNameActive]}>{v.label}</Text>
                                    <Text style={[styles.vehicleTime, selectedVehicle === v.id && styles.vehicleTimeActive]}>{v.time}</Text>
                                    {selectedVehicle === v.id && (
                                        <View style={styles.vehicleCheckBadge}>
                                            <CircleCheck size={12} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity style={styles.bookRideBtn} onPress={() => setShowRequestModal(true)} disabled={requestLoading}>
                        {requestLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookRideBtnText}>REQUEST PICKUP</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {!isSelectingLocation && (userRole === 'COLLECTOR' || userRole === 'RECYCLER') && sortedJobs.length > 0 && (
                <View style={styles.collectorBottomSheetUbride}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width * 0.9} decelerationRate="fast">
                        {sortedJobs.map(item => (
                            <View key={item.id} style={styles.collectorJobCardUbride}>
                                <View style={styles.collectorJobHeader}>
                                    <View style={styles.jobInfoBadge}>
                                        <Package size={16} color="#111" />
                                        <Text style={styles.jobInfoText} numberOfLines={1}>{item.material_type} ({item.quantity_estimate})</Text>
                                    </View>
                                    <Text style={styles.jobTimeText}>2 mins away</Text>
                                </View>

                                <View style={styles.jobRouteBox}>
                                    <View style={styles.routeDots}>
                                        <View style={styles.dotIndicatorPickup} />
                                        <View style={styles.routeLine} />
                                        <View style={styles.dotIndicatorDest} />
                                    </View>
                                    <View style={styles.routeTexts}>
                                        <View style={styles.addressContainer}>
                                            <Text style={styles.routeLabel}>PICKUP</Text>
                                            <Text style={styles.routeAddressText} numberOfLines={1}>{item.pickup_address || item.listing?.location || item.location || 'Unknown Location'}</Text>
                                        </View>
                                        <View style={styles.addressContainer}>
                                            <Text style={styles.routeLabel}>DROP-OFF</Text>
                                            <Text style={styles.routeAddressText} numberOfLines={1}>{item.destination_address || 'Recycling Center'}</Text>
                                        </View>
                                    </View>
                                </View>

                                {item.status === 'PENDING' && (
                                    <TouchableOpacity style={styles.bookRideBtn} onPress={() => handleAcceptJob(item.id)}>
                                        <Text style={styles.bookRideBtnText}>ACCEPT JOB</Text>
                                    </TouchableOpacity>
                                )}
                                {item.status === 'ACCEPTED' && (
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity style={[styles.bookRideBtn, { flex: 1, backgroundColor: '#333' }]} onPress={() => openNavigation(item)}>
                                            <Text style={styles.bookRideBtnText}>NAVIGATE</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.bookRideBtn, { flex: 1, backgroundColor: '#111' }]} onPress={() => handleArriveJob(item.id)}>
                                            <Text style={styles.bookRideBtnText}>ARRIVED</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {item.status === 'ARRIVED' && (
                                    <TouchableOpacity style={styles.bookRideBtn} onPress={() => handleCompleteJob(item.id)}>
                                        <Text style={styles.bookRideBtnText}>COMPLETE JOB</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </ScrollView>
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
                                    <Navigation size={16} color="#111" />
                                    <Text style={{ flex: 1, color: '#111', fontSize: 13, fontWeight: '500' }}>
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
                                        <MapPin size={14} color="#111" />
                                        <Text style={styles.mapSelectText}>Map</Text>
                                    </TouchableOpacity>
                                </View>
                            )}


                            <TouchableOpacity
                                style={styles.submitRequestBtn}
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
                                        <CircleCheck size={20} color="#E74C3C" />
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
                                            { color: confirmingJob.track_type === 'A' ? '#111' : '#166534' }
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
                                                style={[styles.verifyIconButton, verificationPhoto && { backgroundColor: '#F3F4F6' }]}
                                                onPress={pickVerificationImage}
                                            >
                                                <Camera size={20} color={verificationPhoto ? '#111' : '#666'} />
                                            </TouchableOpacity>
                                        </View>

                                        {verificationPhoto && (
                                            <View style={styles.photoPreviewRow}>
                                                <Image source={{ uri: verificationPhoto.uri }} style={styles.photoPreviewSmall} />
                                                <TouchableOpacity
                                                    style={[
                                                        styles.aiVerifyBtn,
                                                        verificationResult?.is_verified && { backgroundColor: '#111' }
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
                                    { backgroundColor: '#111' },
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
    // Ubride Styles
    floatingTopBarUbride: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    menuBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(17,17,17,0.8)', justifyContent: 'center', alignItems: 'center' },
    ubrideLogo: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
    bellBtnUbride: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(17,17,17,0.8)', justifyContent: 'center', alignItems: 'center' },
    
    bottomSheetUbride: { position: 'absolute', bottom: 110, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    locationInputBox: { },
    locationInputLabel: { fontSize: 12, fontWeight: 'bold', color: '#111', marginBottom: 10, letterSpacing: 1 },
    locationInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    locationInputIconBox: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    dotIndicatorPickup: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' },
    dotIndicatorDest: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#60A5FA' },
    locationInputText: { flex: 1, fontSize: 15, color: '#111', fontWeight: '500' },
    continueBtnUbride: { marginTop: 20, backgroundColor: '#34D399', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    continueBtnTextUbride: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    bottomSheetUbrideVehicles: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
    backVehicleBtn: { alignItems: 'center', marginBottom: 20, paddingVertical: 10 },
    dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' },
    vehicleCategories: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    vehicleCatText: { fontSize: 15, color: '#999', fontWeight: '500' },
    vehicleCatTextActive: { color: '#111', fontWeight: 'bold' },
    vehicleScroll: { gap: 15, paddingBottom: 20 },
    vehicleCard: { width: 110, height: 130, borderRadius: 16, borderWidth: 2, borderColor: '#F3F4F6', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 10 },
    vehicleCardActive: { borderColor: '#34D399', backgroundColor: '#F0FDF4' },
    vehicleName: { fontSize: 14, fontWeight: 'bold', color: '#666' },
    vehicleNameActive: { color: '#111' },
    vehicleTime: { fontSize: 11, color: '#999', marginTop: 4 },
    vehicleTimeActive: { color: '#34D399' },
    vehicleCheckBadge: { position: 'absolute', bottom: -6, backgroundColor: '#34D399', borderRadius: 10, padding: 2 },
    bookRideBtn: { backgroundColor: '#34D399', paddingVertical: 18, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
    bookRideBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

    collectorBottomSheetUbride: { position: 'absolute', bottom: 110, left: 0, right: 0 },
    collectorJobCardUbride: { width: Dimensions.get('window').width * 0.9, marginHorizontal: Dimensions.get('window').width * 0.05, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    collectorJobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    jobInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexShrink: 1, marginRight: 10 },
    jobInfoText: { fontSize: 13, fontWeight: 'bold', color: '#111', flexShrink: 1 },
    jobTimeText: { fontSize: 13, color: '#34D399', fontWeight: '600' },
    jobRouteBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 15, flexDirection: 'row', marginBottom: 20 },
    routeDots: { alignItems: 'center', marginRight: 15, paddingVertical: 10 },
    routeLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
    routeTexts: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
    addressContainer: { justifyContent: 'center', marginBottom: 12 },
    routeLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    routeAddressText: { fontSize: 15, color: '#111', fontWeight: '600' },

    // Permission Styles
    permissionContainer: { flex: 1, backgroundColor: '#FFF' },
    permissionContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    globeIconContainer: { marginBottom: 30 },
    permissionTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 12, textAlign: 'center' },
    permissionDesc: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
    permissionFooter: { paddingHorizontal: 20, paddingBottom: 110 },
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

    kycBanner: {
        position: 'absolute',
        top: 80,
        left: 16,
        right: 16,
        backgroundColor: '#111',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        zIndex: 20,
    },
    kycBannerIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    kycBannerText: { flex: 1 },
    kycBannerTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
    kycBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    jobListContainerAbsolute: { position: 'absolute', bottom: 100, left: 0, right: 0 },

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
        backgroundColor: '#111',
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
        backgroundColor: '#111',
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
    navBtn: { backgroundColor: '#111' },
    arriveBtn: { backgroundColor: '#333' },
    actionBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    trackingContainer: {
        backgroundColor: '#F3F4F6',
        padding: 15,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#111',
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
        color: '#111',
    },
    trackingDetail: {
        fontSize: 12,
        color: '#6B7280',
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
        borderColor: '#111',
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
        backgroundColor: '#111',
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
        backgroundColor: '#111',
        borderColor: '#111',
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
        backgroundColor: '#111',
        borderColor: '#111',
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
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    mapSelectText: { fontSize: 12, color: '#111', fontWeight: 'bold' },

    currentLocationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F3F4F6',
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
    estimateTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    estimateNote: {
        fontSize: 11,
        color: '#9CA3AF',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    submitRequestBtn: {
        backgroundColor: '#111',
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#111',
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
        backgroundColor: '#111',
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
        color: '#111',
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
