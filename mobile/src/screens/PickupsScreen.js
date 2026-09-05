import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Modal, TextInput, ScrollView, StatusBar,
    ActivityIndicator, FlatList, Platform, Linking, KeyboardAvoidingView, Alert, AppState
} from 'react-native';
import { logisticsApi } from '../api/logistics';
import { authApi } from '../api/auth';
import { placesApi } from '../api/places';
import { GOOGLE_MAPS_API_KEY } from '../constants/googleMaps';
import { useAuth } from '../context/AuthContext';
import { useLogisticsSocket } from '../hooks/useLogisticsSocket';
import { startCollectorLocationTracking, stopCollectorLocationTracking } from '../utils/collectorTracking';
import { getOnlinePreference } from '../utils/collectorPresence';
import { useRecentPickupLocations } from '../hooks/useRecentPickupLocations';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../api/client';
import { getMaterialImage } from './HomeScreen';
import {
    Truck, MapPin, Navigation, Menu, Bell,
    CircleCheck, CircleAlert, Info, Clock, Search, X, ArrowLeft, ArrowRight, Plus, Calendar,
    ChevronRight, Activity, Upload, Package, Image as LucideImage, Globe, ShieldAlert,
    User, LocateFixed, ShieldCheck, Leaf
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { usePickups } from '../hooks/usePickups';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { marketApi } from '../api/market';
import CollectorBottomSheet from '../components/CollectorBottomSheet';
import ActiveJobBottomSheet from '../components/ActiveJobBottomSheet';
import SearchingCollectorCard from '../components/SearchingCollectorCard';
import RatingModal from '../components/RatingModal';
import AnimatedButton from '../components/AnimatedButton';
import PageLoader from '../components/PageLoader';

import MapView, { Marker, Polyline } from 'react-native-maps';

const ActiveMap = MapView;
const ActiveMarker = Marker;
import MapViewDirections from 'react-native-maps-directions';
import { useTheme, makeStyles } from '../theme/ThemeContext';
import { usePricing } from '../context/PricingContext';
const { width, height } = Dimensions.get('window');

const MATERIALS = ['Plastics', 'Metals', 'Paper', 'Electronics', 'Glass', 'Mixed'];
const QUANTITIES = ['1-2 Bags', '3-5 Bags', 'Tricycle Load', 'Pickup Truck Load'];

const BRAND_GREEN = '#34D399';  // module scope - no theme here

const VEHICLES = [
    { id: 'tricycle', label: 'Tricycle', capacity: '1-5 bags', image: require('../../assets/tricycle.jpg') },
    { id: 'pickup', label: 'Pickup Truck', capacity: 'Bulk loads', image: require('../../assets/pickup.jpg') }
];


const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
    return `${BASE_URL}${cleanPath}`;
};

const contactNameOf = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username || 'User';

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
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const { pricingEnabled } = usePricing();
    const navigation = useNavigation();
    const { userRole, user } = useAuth();

    // Recyclers run pickups exactly like collectors do, but most of this screen
    // only ever checked for COLLECTOR - which left recyclers with the disposer's
    // map behaviour and a reversed route label on their own job.
    const isCollectorRole = userRole === 'COLLECTOR' || userRole === 'RECYCLER';

    // Check for params from ListingDetail
    const pickupData = route?.params?.pickupData;
    // Check for a recent-location chip tapped on Home
    const prefillLocation = route?.params?.prefillLocation;

    const [location, setLocation] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Navigation Tracking UI
    const [navigatingJob, setNavigatingJob] = useState(null);
    const [routeEta, setRouteEta] = useState({ duration: 0, distance: 0 });

    const [hasLocationPermission, setHasLocationPermission] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const { data: jobs = [], isLoading: jobsLoading, error: apiError, isError, refetch } = usePickups(location);

    const mapRef = useRef(null);
    // `location` doubles as the chosen pickup point and is overwritten when the
    // disposer picks a spot on the map or from search, so keep the last real
    // device fix separately - otherwise "use my current location" has nothing
    // to go back to.
    const deviceLocationRef = useRef(null);
    const locationRef = useRef(location);
    useEffect(() => { locationRef.current = location; }, [location]);

    // Live collector positions pushed over the websocket, keyed by pickup id.
    // Takes priority over the polled `current_lat`/`current_lon` snapshot.
    const [liveCollectorLocations, setLiveCollectorLocations] = useState({});

    const [refreshing, setRefreshing] = useState(false);

    const centerToUserLocation = () => {
        if (mapRef.current && location) {
            mapRef.current.animateCamera({
                center: location,
                zoom: 16
            }, { duration: 500 });
        }
    };

    const [requestLoading, setRequestLoading] = useState(false);
    // Only opened for the pre-filled listing flow now (see the pickupData
    // effect below) - direct booking submits from the vehicle-select sheet
    // instead of popping a second confirm step that re-asks what was just set.
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestForm, setRequestForm] = useState({
        material_type: pickupData?.material_type || 'Plastics',
        quantity_estimate: pickupData?.quantity_estimate || '1-2 Bags',
        delivery_fee: null,
        waste_value: pickupData?.waste_price ? parseFloat(pickupData.waste_price).toFixed(2) : null,
        distance_km: null,
        duration_min: null,
        payment_method: 'CASH',
        listing_id: pickupData?.listing_id || null,
        track_type: pickupData?.track_type || 'A',
        image: null
    });
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [customAddress, setCustomAddress] = useState('');
    const { recentLocations, addRecentLocation } = useRecentPickupLocations();
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);


    const [uiState, setUiState] = useState('IDLE');
    const [selectedVehicle, setSelectedVehicle] = useState('tricycle');

    // Cancel request state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelJobId, setCancelJobId] = useState(null);
    const [selectedCancelReason, setSelectedCancelReason] = useState(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    // Rating Modal
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [jobToRate, setJobToRate] = useState(null);

    // Waste confirmation modal for collectors
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmingJob, setConfirmingJob] = useState(null);

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
    const [locationSubscription, setLocationSubscription] = useState(null);

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

    const loading = jobsLoading && (!isCollectorRole || !!location);

    useEffect(() => {
        (async () => {
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                setHasLocationPermission(true);
                let loc = await Location.getCurrentPositionAsync({});
                deviceLocationRef.current = loc.coords;
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
            deviceLocationRef.current = loc.coords;
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
                    payment_method: 'CASH'
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

    // Land on the booking sheet with pickup already filled in when arriving
    // via a recent-location chip - only the destination is left to pick.
    useEffect(() => {
        if (prefillLocation?.address) {
            setCustomAddress(prefillLocation.address);
            setUseCurrentLocation(false);

            if (prefillLocation.latitude && prefillLocation.longitude) {
                setLocation({ latitude: prefillLocation.latitude, longitude: prefillLocation.longitude });
                setMapRegion({
                    latitude: prefillLocation.latitude,
                    longitude: prefillLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            }

            navigation.setParams({ prefillLocation: null });
        }
    }, [prefillLocation]);

    const startMapSelection = () => {
        setShowRequestModal(false);
        setShowSearchModal(false);
        setIsSelectingLocation(true);

        // Stop tracking if active
        if (locationSubscription) {
            locationSubscription.remove();
            setLocationSubscription(null);
        }
        
        // Reset camera
        if (location) {
            mapRef.current?.animateToRegion({
                latitude: location.coords?.latitude || location.latitude,
                longitude: location.coords?.longitude || location.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }, 1000);
        }
    };

    // Live push/pull wiring for tracking. The websocket delivers instant
    // status changes and collector positions; polling is kept as a slow
    // fallback in case the socket is mid-reconnect.
    const handleSocketMessage = useCallback((msg) => {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'collector_location': {
                if (msg.request_id == null || typeof msg.lat !== 'number' || typeof msg.lon !== 'number') return;
                setLiveCollectorLocations(prev => ({
                    ...prev,
                    [msg.request_id]: { lat: msg.lat, lon: msg.lon, heading: msg.heading, timestamp: msg.timestamp }
                }));
                break;
            }
            case 'new_request':
                if (isCollectorRole) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    Toast.show({ type: 'info', text1: 'New Pickup Nearby', text2: msg.material_type ? `${msg.material_type} pickup available` : 'A new request just came in.' });
                    refetch();
                }
                break;
            case 'job_accepted':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({ type: 'success', text1: 'Collector Accepted!', text2: 'Your collector is on the way.' });
                refetch();
                break;
            case 'driver_arrived':
                Toast.show({ type: 'info', text1: 'Collector Arrived', text2: 'Your collector has arrived at the pickup location.' });
                refetch();
                break;
            case 'job_completed':
            case 'job_cancelled_by_provider':
            case 'job_cancelled_by_collector':
                refetch();
                break;
            default:
                break;
        }
    }, [userRole, refetch]);

    useLogisticsSocket(handleSocketMessage);

    // Slow fallback poll - covers a dropped/reconnecting socket, or a missed
    // push notification. This used to be gated to non-collectors and to rely
    // on `refetch` for its dependency array; `refetch` from usePickups was a
    // brand new function every render, so this interval was cleared and
    // recreated on nearly every render and in practice almost never survived
    // long enough to fire. usePickups now returns a stable `refetch`, and
    // this runs for every role - collectors/recyclers previously had no
    // fallback at all and depended entirely on the 'new_request' push
    // arriving while this screen happened to be mounted.
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 25000);
        return () => clearInterval(interval);
    }, [refetch]);

    // Catch up immediately when this tab regains focus, rather than waiting
    // on the next poll tick or a push that may have been missed while the
    // screen was in the background.
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Disposer camera following - prefers the live websocket position over the polled snapshot
    useEffect(() => {
        if (isCollectorRole || !navigatingJob || !mapRef.current) return;

        const live = liveCollectorLocations[navigatingJob.id];
        const activeLiveJob = jobs.find(j => j.id === navigatingJob.id);
        const lat = live?.lat ?? activeLiveJob?.current_lat;
        const lon = live?.lon ?? activeLiveJob?.current_lon;

        if (lat && lon) {
            mapRef.current.animateCamera({
                center: { latitude: lat, longitude: lon },
                pitch: 45,
                zoom: 17
            }, { duration: 1000 });
        }
    }, [jobs, navigatingJob, userRole, liveCollectorLocations]);

    // Collector/recycler: keep background GPS streaming to the server for as
    // long as there's an active job, independent of which screen is mounted
    // or whether the app is foregrounded. Driven by job status, not
    // navigation UI. Was gated to 'COLLECTOR' only, so a recycler's accepted
    // job never started background tracking at all - the disposer would see
    // no live position for the entire job.
    useEffect(() => {
        if (!isCollectorRole) return;

        const activeJob = jobs.find(j => j.status === 'ACCEPTED' || j.status === 'ARRIVED');
        if (activeJob) {
            startCollectorLocationTracking(activeJob.id);
        } else {
            stopCollectorLocationTracking();
        }
    }, [isCollectorRole, jobs]);

    // Collector presence heartbeat: marks the collector online with a
    // position so the backend can find them when matching new requests.
    // Respects the online/offline toggle on Home - this just keeps the
    // preference re-affirmed with a fresh position while the preference is on.
    // Was gated to 'COLLECTOR' only, so a RECYCLER's location/online status
    // never reached the backend at all - they'd never be found "nearby" for
    // a new request no matter how the matching query itself was scoped.
    useEffect(() => {
        if (!isCollectorRole) return;

        const coordsOf = (loc) => (loc?.coords ? loc.coords : loc);
        const pushPresence = async (wantsOnline) => {
            const coords = coordsOf(locationRef.current);
            if (!coords?.latitude || !coords?.longitude) return;
            const isOnline = wantsOnline ? await getOnlinePreference() : false;
            try {
                await authApi.updateMyLocation({ latitude: coords.latitude, longitude: coords.longitude, is_online: isOnline });
            } catch (e) {
                console.warn('Failed to update collector presence:', e?.message);
            }
        };

        pushPresence(true);
        const interval = setInterval(() => pushPresence(true), 30000);
        const appStateSub = AppState.addEventListener('change', (state) => pushPresence(state === 'active'));

        return () => {
            clearInterval(interval);
            appStateSub.remove();
            pushPresence(false);
        };
    }, [isCollectorRole]);

    // Collector/recycler camera following while actively navigating (foreground
    // UX only - location reporting to the server is handled by the background
    // task above).
    useEffect(() => {
        if (!isCollectorRole || !navigatingJob) {
            if (locationSubscription) {
                locationSubscription.remove();
                setLocationSubscription(null);
            }
            return;
        }

        let sub = null;
        let cancelled = false;
        (async () => {
            const watcher = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10,
                    timeInterval: 5000,
                },
                (loc) => {
                    setLocation(loc);
                    if (mapRef.current) {
                        mapRef.current.animateCamera({
                            center: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
                            pitch: 45,
                            heading: loc.coords.heading || 0,
                            zoom: 18
                        }, { duration: 1000 });
                    }
                }
            );
            if (cancelled) {
                watcher.remove();
            } else {
                sub = watcher;
                setLocationSubscription(watcher);
            }
        })();

        return () => {
            cancelled = true;
            if (sub) sub.remove();
        };
    }, [isCollectorRole, navigatingJob]);

    const confirmMapSelection = async () => {
        setIsSelectingLocation(false);
        if (mapRegion) {
            const address = await reverseGeocode(mapRegion.latitude, mapRegion.longitude);
            setLocation({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });
            setCustomAddress(address);
            setUseCurrentLocation(false);
            setShowRequestModal(false);
        }
    };

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
            const isListingFlow = !!requestForm.listing_id;

            // Booking with "Current Location" (no typed/picked address) never
            // set pickup_address at all, so every such job showed up as
            // "Disposer • Unknown Location" on the collector's card - not a
            // display bug, the address genuinely was never captured. Resolve
            // it from the GPS fix now so there's always a real address on
            // the job, the same way map-pin selection already does.
            const resolvedPickupAddress = customAddress.trim()
                || await reverseGeocode(location.latitude, location.longitude);
            // Track A (direct booking, no listing): the platform doesn't quote or
            // collect a fee for this - the disposer just picks a vehicle size for
            // their waste, and pays the collector directly once the job's done.
            // So it's CASH with no price, on purpose. The listing flow (Track B/C)
            // is a real marketplace transaction against a seller's actual listing
            // price, and keeps its existing digital pricing/escrow behavior.
            const requestData = {
                material_type: requestForm.material_type || 'General Waste',
                quantity_estimate: isListingFlow
                    ? (requestForm.quantity_estimate || 'Standard')
                    : (`${VEHICLES.find(v => v.id === selectedVehicle)?.label || 'Standard'} Load`),
                vehicle_type: selectedVehicle,
                track_type: isListingFlow ? 'B' : 'A',
                payment_method: 'CASH',
                estimated_price: requestForm.delivery_fee || '0.00',                waste_price: isListingFlow ? (requestForm.waste_value || '0.00') : '0.00',
                delivery_fee: isListingFlow ? (requestForm.delivery_fee || '0.00') : '0.00',
                // Was computed by fetchEstimate() and shown on the route
                // summary card, but never actually sent - the trip's
                // distance/duration were silently dropped on every request.
                distance_km: requestForm.distance_km || null,
                duration_min: requestForm.duration_min || null,
                latitude: location.latitude,
                longitude: location.longitude,
                pickup_address: resolvedPickupAddress || null,
            };

            if (requestForm.listing_id) {
                requestData.listing = parseInt(requestForm.listing_id);
            }

            // Only a manually chosen address belongs in "recent locations" -
            // a GPS reverse-geocode isn't something the disposer picked and
            // would just be noise in that list.
            if (customAddress.trim()) {
                addRecentLocation({
                    address: customAddress.trim(),
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                });
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
            setUiState('IDLE');
            setCustomAddress('');
            refetch();
        } catch (error) {
            console.log("Create Request Error:", error.response?.data || error.message);
            const errorData = error.response?.data;

            const isInsufficientFunds = errorData?.detail === 'Insufficient funds' 
                || errorData?.code === 'insufficient_funds' 
                || errorData?.code === 'escrow_failed'
                || (typeof errorData?.detail === 'string' && errorData.detail.includes('Insufficient funds'));

            if (isInsufficientFunds) {
                const required = errorData?.required || (parseFloat(requestForm.waste_value || 0) + parseFloat(requestForm.delivery_fee || 0));

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

    // Custom Location Debounced Search
    useEffect(() => {
        let isMounted = true;
        
        const fetchSearchResults = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }
            
            setIsSearchingLocation(true);
            try {
                const results = await placesApi.searchPlaces(
                    searchQuery, 
                    location?.latitude, 
                    location?.longitude
                );
                if (isMounted) setSearchResults(results);
            } catch (err) {
                console.log('Search Error', err);
            } finally {
                if (isMounted) setIsSearchingLocation(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchSearchResults();
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [searchQuery, location]);

    const handleSelectSearchedLocation = (place) => {
        setCustomAddress(place.name);
        setLocation({ latitude: place.lat, longitude: place.lon });
        setUseCurrentLocation(false);

        addRecentLocation({ address: place.name, latitude: place.lat, longitude: place.lon });

        setSearchQuery('');
        setShowSearchModal(false);

        // Optional: center map on new location
        if (mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: place.lat, longitude: place.lon },
                pitch: 45,
                zoom: 15
            });
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
        setIsCollapsed(true);
        setNavigatingJob(job);
        const { latitude, longitude } = job;
        if (mapRef.current && location) {
            mapRef.current.fitToCoordinates([
                { latitude: location.latitude, longitude: location.longitude },
                { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
            ], {
                edgePadding: { top: 150, right: 50, bottom: 100, left: 50 },
                animated: true,
            });
        }
    };

    const handleCompleteJob = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (job) {
            setConfirmingJob(job);
            setShowConfirmModal(true);
        }
    };

    const confirmAndCompleteJob = async () => {
        if (!confirmingJob) return;

        try {
            await logisticsApi.updateStatus(confirmingJob.id, 'COMPLETED');
            Toast.show({ type: 'success', text1: 'Completed', text2: 'Job marked as completed.' });
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

        const isNavigatingThis = navigatingJob?.id === job.id;
        const live = liveCollectorLocations[job.id];

        // Where the route should start from.
        //
        // This used to be `live?.lat ?? job.current_lat ?? job.latitude`, and
        // that last fallback is the *pickup* coordinate - i.e. the route's own
        // destination. Before the collector had broadcast a position (or if
        // job.current_lat was simply null) origin and destination were the same
        // point, so Directions returned a zero-length route and no line was
        // ever drawn. That's why collectors couldn't follow the map.
        //
        // A collector already knows where they are without a server round-trip,
        // so use the device's own fix for them. Disposers can only rely on what
        // the collector has broadcast - and if that isn't known yet, we draw no
        // route rather than a degenerate one.
        const myLat = location?.coords?.latitude ?? location?.latitude;
        const myLon = location?.coords?.longitude ?? location?.longitude;

        const originLat = isCollectorRole ? myLat : (live?.lat ?? job.current_lat);
        const originLon = isCollectorRole ? myLon : (live?.lon ?? job.current_lon);

        // Kept separate: the truck marker shown to the disposer still tracks the
        // collector's broadcast position, not the viewer's own.
        const collectorLat = live?.lat ?? job.current_lat;
        const collectorLon = live?.lon ?? job.current_lon;

        if (isNavigatingThis || job.status === 'PENDING') {
            markers.push(
                <ActiveMarker
                    key={`pickup-${job.id}`}
                    coordinate={{ latitude: lat, longitude: lon }}
                    anchor={{ x: 0.5, y: 1 }}
                >
                    <View style={{ alignItems: 'center' }}>
                        <View style={styles.destinationPin}>
                            <View style={styles.destinationPinInner} />
                        </View>
                        <View style={styles.compactMarkerLabel}>
                            <Text style={styles.compactMarkerText}>
                                {job.status === 'ARRIVED' ? 'Arrived' : (routeEta.duration ? `${Math.ceil(routeEta.duration)} min` : 'Dropoff')}
                            </Text>
                        </View>
                    </View>
                </ActiveMarker>
            );
        } else {
            markers.push(
                <ActiveMarker
                    key={`pickup-${job.id}`}
                    coordinate={{ latitude: lat, longitude: lon }}
                    title={job.material_type}
                    description={`Pickup: ${job.status}`}
                >
                    <View style={[
                        styles.markerContainer,
                        job.status === 'COMPLETED' && { borderColor: colors.textMuted },
                        job.status === 'ACCEPTED' && { borderColor: colors.text }
                    ]}>
                        <MapPin size={24} color={job.status === 'PENDING' ? colors.text : (job.status === 'ACCEPTED' ? colors.text : colors.textMuted)} />
                    </View>
                </ActiveMarker>
            );
        }

        if (job.status === 'ACCEPTED' || job.status === 'ARRIVED') {
            const cLat = parseFloat(collectorLat);
            const cLon = parseFloat(collectorLon);

            // Show the collector's truck to the disposer, only once we actually
            // know where they are.
            if (!isCollectorRole && !isNaN(cLat) && !isNaN(cLon)) {
                markers.push(
                        <ActiveMarker
                            key={`collector-${job.id}`}
                            coordinate={{ latitude: cLat, longitude: cLon }}
                            title="Collector"
                            description={job.collector_name || "En route"}
                        >
                            {isNavigatingThis ? (
                                <View style={styles.bubbleDotContainer}>
                                    <View style={[styles.customMapBubble, { backgroundColor: colors.text, padding: 8, borderRadius: 20 }]}>
                                        <Truck size={20} color={colors.onPrimary} />
                                    </View>
                                    <View style={[styles.customMapBubbleTriangle, { borderBottomColor: colors.text }]} />
                                </View>
                            ) : (
                                <View style={[styles.markerContainer, { borderColor: colors.text }]}>
                                    <View style={{ transform: [{ rotate: `${live?.heading || 0}deg` }] }}>
                                        <Truck size={24} color={colors.text} />
                                    </View>
                                </View>
                            )}
                        </ActiveMarker>
                );
            }

            const oLat = parseFloat(originLat);
            const oLon = parseFloat(originLon);
            // No origin means we genuinely don't know where the collector is;
            // drawing a route from the destination to itself is what produced
            // the blank map.
            if (!isNaN(oLat) && !isNaN(oLon)) {
                routes.push(
                    <MapViewDirections
                        key={`route-${job.id}`}
                        origin={{ latitude: oLat, longitude: oLon }}
                        destination={{ latitude: lat, longitude: lon }}
                        apikey={GOOGLE_MAPS_API_KEY}
                        strokeWidth={4}
                        strokeColor={"#059669"} /* on the always-dark map, not the app surface */
                        optimizeWaypoints={true}
                        onError={(errorMessage) => {
                            console.warn("MapViewDirections Error:", errorMessage);
                            if (isNavigatingThis) {
                                Toast.show({
                                    type: 'error',
                                    text1: 'Route Error',
                                    text2: 'Could not load route. ' + errorMessage
                                });
                            }
                        }}
                        onReady={(result) => {
                            if (isNavigatingThis) {
                                setRouteEta({
                                    distance: result.distance,
                                    duration: result.duration
                                });
                            }
                        }}
                    />
                );
            }
        }

        return [...markers, ...routes];
    };

    // `location` matters now that a collector's route starts from their own
    // device fix - without it the route would be computed once and never
    // follow them as they drive.
    const memoizedMarkers = useMemo(() => {
        return jobs.flatMap(renderJobMarker);
    }, [jobs, navigatingJob, routeEta, liveCollectorLocations, location, isCollectorRole]);

    const sortedJobs = useMemo(() => {
        if (!isCollectorRole) return jobs;
        const activeJobs = jobs.filter(j => j.status === 'ACCEPTED' || j.status === 'ARRIVED');
        const pendingJobs = jobs.filter(j => j.status === 'PENDING');
        return [...activeJobs, ...pendingJobs];
    }, [jobs, userRole]);

    const activeSellerJob = useMemo(() => {
        if (userRole !== 'SELLER') return null;
        return jobs.find(j => ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(j.status));
    }, [jobs, userRole]);

    // Fallback "collector found" celebration in case the websocket push was
    // missed (reconnecting) - fires once per PENDING -> ACCEPTED transition
    // detected via the polled job list.
    const prevSellerJobStatus = useRef(null);
    useEffect(() => {
        const prevStatus = prevSellerJobStatus.current;
        const nextStatus = activeSellerJob?.status ?? null;
        if (prevStatus === 'PENDING' && nextStatus === 'ACCEPTED') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        prevSellerJobStatus.current = nextStatus;
    }, [activeSellerJob?.status]);

    useEffect(() => {
        if (userRole === 'SELLER') {
            const completedUnratedJob = jobs.find(j => j.status === 'COMPLETED' && !j.is_rated);
            if (completedUnratedJob && !showRatingModal && jobToRate?.id !== completedUnratedJob.id) {
                setJobToRate(completedUnratedJob);
                setShowRatingModal(true);
            }
        }
    }, [jobs, userRole]);

    const handleRatingSubmit = async (rating, feedback) => {
        try {
            // await logisticsApi.submitRating(jobToRate.id, rating, feedback);
            Toast.show({ type: 'success', text1: 'Thank you!', text2: 'Your feedback has been submitted.' });
            // Ideally we should refetch or update local state to mark as rated
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to submit rating' });
        }
    };

    if (hasLocationPermission === false) {
        return (
            <SafeAreaView style={styles.permissionContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{position: 'absolute', top: 50, left: 20}}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.permissionContent}>
                    <View style={styles.globeIconContainer}>
                        <Globe size={80} color={colors.success} />
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
        return <PageLoader label="Finding your location..." />;
    }

    return (
        <View style={styles.container}>
            <ActiveMap
                ref={mapRef}
                style={styles.map}
                initialRegion={location ? {
                    latitude: location.coords?.latitude || location.latitude,
                    longitude: location.coords?.longitude || location.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                } : null}
                showsUserLocation={true}
                showsMyLocationButton={false}
                followsUserLocation={!!navigatingJob && isCollectorRole}
                userInterfaceStyle="dark"
                customMapStyle={darkMapStyle}
            >
                {memoizedMarkers}

                {/* Bolt-style pickup pin + ETA bubble while confirming - the map
                    stays "alive" behind the vehicle-select sheet instead of going
                    blank, the way it does on Bolt/Uber's own confirm screen. */}
                {userRole === 'SELLER' && (uiState === 'VEHICLE_SELECT' || uiState === 'CONFIRM') && location && (
                    <ActiveMarker
                        coordinate={{
                            latitude: location.coords?.latitude ?? location.latitude,
                            longitude: location.coords?.longitude ?? location.longitude,
                        }}
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <View style={{ alignItems: 'center' }}>
                            <View style={styles.pickupEtaBubble}>
                                <Text style={styles.pickupEtaBubbleText}>
                                    Pickup{requestForm.duration_min ? ` · ${Math.round(requestForm.duration_min)} min` : ''}
                                </Text>
                            </View>
                            <View style={styles.destinationPin}>
                                <View style={styles.destinationPinInner} />
                            </View>
                        </View>
                    </ActiveMarker>
                )}

                {isSelectingLocation && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -32 }}>
                        <MapPin size={32} color={colors.text} fill={colors.text} />
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

            {!isSelectingLocation && !navigatingJob && (
                <View style={styles.floatingTopBarUbride}>
                    {uiState === 'VEHICLE_SELECT' ? (
                        <TouchableOpacity style={[styles.menuBtn, { backgroundColor: colors.onPrimary, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }]} onPress={() => setUiState('IDLE')}>
                            <ArrowLeft size={20} color={colors.text} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Profile')}>
                            <Menu size={20} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }} />
                    {uiState !== 'VEHICLE_SELECT' && (
                        <TouchableOpacity style={styles.menuBtn} onPress={centerToUserLocation}>
                            <LocateFixed size={20} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {navigatingJob && (
                <View style={[styles.navTopBarContainer, { paddingTop: 40 }]} pointerEvents="box-none">
                    <View style={styles.navTopBar} pointerEvents="auto">
                        <TouchableOpacity style={styles.navCloseBtn} onPress={() => { setNavigatingJob(null); setIsCollapsed(false); }}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.navAddresses}
                            onPress={() => {
                                const lat = navigatingJob.pickup_latitude || navigatingJob.latitude;
                                const lon = navigatingJob.pickup_longitude || navigatingJob.longitude;
                                if (lat && lon) {
                                    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
                                    const latLng = `${lat},${lon}`;
                                    const label = 'Pickup Location';
                                    const url = Platform.select({
                                        ios: `${scheme}${label}@${latLng}`,
                                        android: `${scheme}${latLng}(${label})`
                                    });
                                    Linking.openURL(url);
                                }
                            }}
                        >
                            <Text style={styles.navAddressText} numberOfLines={1}>
                                {isCollectorRole ? 'My Location' : 'Collector'}
                            </Text>
                            <ArrowRight size={16} color={colors.textSecondary} style={{ marginHorizontal: 8 }} />
                            <Text style={styles.navAddressText} numberOfLines={1}>
                                {isCollectorRole ? (navigatingJob.pickup_address || 'Pickup point') : 'My Location'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navAddBtn}>
                            <Plus size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {!isSelectingLocation && userRole === 'SELLER' && uiState === 'IDLE' && !activeSellerJob && (
                <View style={styles.bottomSheetUbride}>
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>
                    <View style={styles.locationInputBox}>
                        <Text style={styles.sheetTitle}>Request a pickup</Text>
                        <Text style={styles.sheetSubtitle}>We'll match you with a nearby collector</Text>

                        {/* Just the pickup point - there's no destination for the
                            disposer to set here. Where the waste physically ends up
                            (landfill, transfer station, recycling facility) is the
                            collector's own logistics decision, not something Track A
                            pricing, routing, or the collector's job screen ever reads;
                            asking the disposer for it was a Bolt/Uber pattern that
                            didn't actually fit a "come collect my waste" service. */}
                        <TouchableOpacity style={styles.pickupFieldRow} onPress={() => { setShowSearchModal(true); }}>
                            <View style={styles.pickupIconBox}>
                                <MapPin size={18} color={colors.accent} />
                            </View>
                            <View style={styles.pickupFieldTextCol}>
                                <Text style={styles.pickupFieldLabel}>Pickup from</Text>
                                <Text style={styles.pickupFieldValue} numberOfLines={1}>
                                    {customAddress || 'Current Location'}
                                </Text>
                            </View>
                            <ChevronRight size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        {(useCurrentLocation ? !!location : !!customAddress) && (
                            <AnimatedButton
                                style={styles.continueBtnWrap}
                                haptic
                                disabled={requestLoading}
                                onPress={async () => {
                                    if (!requestForm.delivery_fee) {
                                        await fetchEstimate();
                                    }
                                    setUiState('VEHICLE_SELECT');
                                }}
                            >
                                <LinearGradient
                                    colors={['#1F2937', '#0B0B0B']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.continueBtnUbride}
                                >
                                    {requestLoading ? (
                                        <ActivityIndicator color={colors.onPrimary} />
                                    ) : (
                                        <>
                                            <Text style={styles.continueBtnTextUbride}>Continue to Book</Text>
                                            <View style={styles.continueBtnIconBubble}>
                                                <ArrowRight size={16} color={colors.text} />
                                            </View>
                                        </>
                                    )}
                                </LinearGradient>
                            </AnimatedButton>
                        )}
                    </View>
                </View>
            )}

            {!isSelectingLocation && userRole === 'SELLER' && uiState === 'VEHICLE_SELECT' && (
                <View style={[styles.bottomSheetUbrideVehicles, { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 }]}>
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>

                    <Text style={{ marginTop: 12, fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Choose vehicle</Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>Select the vehicle that fits your waste</Text>

                    <View style={{ marginBottom: 24 }}>
                        {VEHICLES.map(v => {
                            const isSelected = selectedVehicle === v.id;
                            return (
                                <TouchableOpacity
                                    key={v.id}
                                    style={[
                                        {
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 16,
                                            borderWidth: 1.5,
                                            borderColor: isSelected ? colors.warning : colors.border,
                                            borderRadius: 12,
                                            marginBottom: 12,
                                            backgroundColor: colors.onPrimary,
                                            shadowColor: colors.text,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 3,
                                            elevation: 2
                                        }
                                    ]}
                                    onPress={() => setSelectedVehicle(v.id)}
                                >
                                    <View style={{ 
                                        width: 24, 
                                        height: 24, 
                                        borderRadius: 12, 
                                        borderWidth: 2, 
                                        borderColor: isSelected ? colors.warning : colors.textMuted,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 16
                                    }}>
                                        {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.warning }} />}
                                    </View>

                                    <View style={{ width: 60, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                                        <Image source={v.image} style={{ width: 60, height: 40, resizeMode: 'cover', borderRadius: 6 }} />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{v.label}</Text>
                                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>{v.capacity}</Text>
                                    </View>
                                    
                                    {requestForm.duration_min && requestForm.distance_km && (
                                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                <Clock size={14} color={colors.text} style={{ marginRight: 4 }} />
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                                                    ~{Math.round(requestForm.duration_min)} min
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 2 }} />
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                    {parseFloat(requestForm.distance_km).toFixed(1)} km
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    
                    <Text style={{ textAlign: 'center', fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>Payment is arranged directly with your collector.</Text>
<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSunken, padding: 16, borderRadius: 12, marginBottom: 24 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Text style={{ color: colors.onPrimary, fontSize: 12, fontWeight: '700', fontStyle: 'italic' }}>i</Text>
                        </View>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>Make sure your waste is ready for pickup</Text>
                    </View>

                    {/* Advances to the confirm step rather than firing the request
                        straight off - the request only goes out from the CONFIRM
                        sheet below. */}
                    <AnimatedButton 
                        style={{ backgroundColor: colors.text, paddingVertical: 18, borderRadius: 12, alignItems: 'center' }} 
                        haptic 
                        onPress={() => setUiState('CONFIRM')}
                    >
                        <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '600' }}>Continue</Text>
                    </AnimatedButton>
                </View>            )}

            {!isSelectingLocation && userRole === 'SELLER' && uiState === 'CONFIRM' && (
                <>
                    <View style={styles.floatingTopBar}>
                        <TouchableOpacity style={styles.floatingBackBtnDark} onPress={() => setUiState('VEHICLE_SELECT')}>
                            <ArrowLeft size={22} color={colors.surfaceSunken} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.confirmSheet}>
                        <View style={styles.confirmHandleWrap}>
                            <View style={styles.confirmHandle} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                            <View style={styles.confirmTitleRow}>
                                <View style={styles.confirmLogoBox}>
                                    <Leaf size={22} color={BRAND_GREEN} />
                                </View>
                                <Text style={styles.confirmTitle}>Confirm Pickup</Text>
                            </View>
                            <Text style={styles.confirmSubtitle}>
                                We'll find a nearby collector to pick up your waste.
                            </Text>

                            <View style={styles.confirmCard}>
                                <View style={styles.confirmCardRow}>
                                    <View style={styles.confirmIconBoxGreen}>
                                        <MapPin size={20} color={BRAND_GREEN} />
                                    </View>
                                    <View style={styles.confirmCardTextCol}>
                                        <Text style={styles.confirmCardLabel}>Pickup location</Text>
                                        <Text style={styles.confirmCardValue} numberOfLines={2}>
                                            {customAddress || 'Current location'}
                                        </Text>
                                        <Text style={styles.confirmCardSub} numberOfLines={1}>
                                            {customAddress
                                                ? (user?.city || 'Selected on map')
                                                : 'Using your device location'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.confirmChangeBtn} onPress={() => setUiState('IDLE')}>
                                        <Text style={styles.confirmChangeText}>Change</Text>
                                        <ChevronRight size={14} color={BRAND_GREEN} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.confirmCardDivider} />

                                {/* The vehicle was chosen a step back, so it gets
                                    confirmed here too - otherwise the last thing you
                                    see before committing hides half the request. */}
                                <View style={styles.confirmCardRow}>
                                    <View style={styles.confirmIconBoxNeutral}>
                                        <Truck size={20} color={colors.textMuted} />
                                    </View>
                                    <View style={styles.confirmCardTextCol}>
                                        <Text style={styles.confirmCardLabel}>Vehicle</Text>
                                        <Text style={styles.confirmCardValue}>
                                            {VEHICLES.find(v => v.id === selectedVehicle)?.label || 'Tricycle'}
                                        </Text>
                                        <Text style={styles.confirmCardSub}>
                                            {VEHICLES.find(v => v.id === selectedVehicle)?.capacity || ''}
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.confirmChangeBtn} onPress={() => setUiState('VEHICLE_SELECT')}>
                                        <Text style={styles.confirmChangeText}>Change</Text>
                                        <ChevronRight size={14} color={BRAND_GREEN} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.confirmCard}>
                                <View style={styles.confirmCardRow}>
                                    <View style={styles.confirmIconBoxNeutral}>
                                        <Clock size={20} color={colors.textMuted} />
                                    </View>
                                    <View style={styles.confirmCardTextCol}>
                                        <Text style={styles.confirmInfoTitle}>What happens next?</Text>
                                        <Text style={styles.confirmInfoBody}>
                                            We'll match you with a nearby waste collector.
                                            You'll be notified once they accept.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Deliberately not the mockup's "you'll be charged after
                                the service is completed" - Revesta takes nothing at
                                all right now, so promising a later charge would be
                                telling the disposer something untrue. */}
                            <View style={styles.confirmCard}>
                                <View style={styles.confirmCardRow}>
                                    <View style={styles.confirmIconBoxGreen}>
                                        <ShieldCheck size={20} color={BRAND_GREEN} />
                                    </View>
                                    <View style={styles.confirmCardTextCol}>
                                        <Text style={styles.confirmInfoTitle}>No payment through Revesta</Text>
                                        <Text style={styles.confirmInfoBody}>
                                            You and your collector agree the price between yourselves
                                            and settle it directly. Revesta doesn't charge you anything.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <AnimatedButton
                            style={styles.confirmCtaBtn}
                            haptic
                            onPress={handleCreateRequest}
                            disabled={requestLoading}
                        >
                            {requestLoading ? (
                                <ActivityIndicator color="#052E1B" />
                            ) : (
                                <>
                                    <Text style={styles.confirmCtaText}>Confirm Request</Text>
                                    <ArrowRight size={20} color="#052E1B" style={styles.confirmCtaIcon} />
                                </>
                            )}
                        </AnimatedButton>
                    </View>
                </>
            )}


            {!isSelectingLocation && isCollectorRole && sortedJobs.length > 0 && (
                <View style={[styles.collectorBottomSheetUbride, { bottom: 0 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width} decelerationRate="fast" pagingEnabled>
                        {sortedJobs.map(item => (
                            <View key={item.id} style={{ width }}>
                                <ActiveJobBottomSheet
                                    job={item}
                                    onChatPress={() => {
                                        if (!item.provider?.id) return;
                                        navigation.navigate('ChatDetail', {
                                            contactId: item.provider.id,
                                            contactName: contactNameOf(item.provider),
                                            contactImage: resolveImageUrl(item.provider.profile_picture_url),
                                            contactIsOnline: item.provider.is_online,
                                        });
                                    }}
                                    onCallPress={() => {
                                        if (item.provider?.phone) {
                                            import('react-native').then(({ Linking }) => {
                                                Linking.openURL(`tel:${item.provider.phone}`);
                                            });
                                        } else {
                                            Toast.show({ type: 'error', text1: 'No Phone Number', text2: 'Disposer phone number not available.' });
                                        }
                                    }} 
                                    onNavigate={openNavigation}
                                    onArrive={handleArriveJob}
                                    onComplete={handleCompleteJob}
                                    onAccept={handleAcceptJob}
                                    requestLoading={requestLoading}
                                    isCollapsed={isCollapsed}
                                    onToggleCollapse={() => setIsCollapsed(prev => !prev)}
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Confirm Listing Pickup Modal - only path left into this modal is the
                pickupData effect (arriving from a marketplace listing). Everything
                here is fixed by the listing: the pickup point is the seller's
                address, not the requester's GPS, so there's no "Current/Custom"
                choice to make - showing one, defaulting to "Current", was actively
                misleading (it labelled the seller's pinned address as "your current
                GPS coordinates"), and letting someone switch it to a searched
                address would detach the request from where the material actually is. */}
            <Modal
                visible={showRequestModal && !showSearchModal}
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
                            <Text style={styles.modalTitle}>Confirm Request</Text>
                            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                            <View style={styles.summaryCard}>
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryIconBox}>
                                        <Package size={16} color={colors.text} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.summaryLabel}>Material</Text>
                                        <Text style={styles.summaryValue}>
                                            {requestForm.material_type} · {requestForm.quantity_estimate}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.summaryDivider} />

                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryIconBox}>
                                        <MapPin size={16} color={colors.text} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.summaryLabel}>Pickup Location</Text>
                                        <Text style={styles.summaryValue} numberOfLines={2}>
                                            {customAddress || 'Seller location'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.summaryDivider} />

                                <View style={styles.summaryRow}>
                                    {pricingEnabled ? (
                                        <>
                                            <Text style={styles.summaryLabel}>
                                                {requestForm.track_type === 'A' ? 'Amount to pay' : "You'll earn"}
                                            </Text>
                                            <Text style={[styles.summaryPrice, { color: requestForm.track_type === 'A' ? colors.text : colors.accent }]}>
                                                ₵{(parseFloat(requestForm.waste_value || 0) + parseFloat(requestForm.delivery_fee || 0)).toFixed(2)}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.summaryLabel}>Payment</Text>
                                            <Text style={styles.summaryPrice}>Arranged directly</Text>
                                        </>
                                    )}
                                </View>
                            </View>

                            <AnimatedButton
                                style={styles.modalConfirmBtn}
                                onPress={handleCreateRequest}
                                disabled={requestLoading}
                            >
                                {requestLoading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.modalConfirmText}>Confirm Request</Text>}
                            </AnimatedButton>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Location Search Modal */}
            <Modal
                visible={showSearchModal}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setShowSearchModal(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.onPrimary }}>
                    <StatusBar barStyle="dark-content" />
                    
                    {/* Search Header */}
                    <View style={styles.searchHeader}>
                        <TouchableOpacity onPress={() => setShowSearchModal(false)} style={styles.searchCloseBtn}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.searchTitle}>Choose Pickup Location</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Search Input */}
                    <View style={styles.searchInputContainer}>
                        <Search size={20} color={colors.textSecondary} />
                        <TextInput
                            style={styles.searchTextInput}
                            placeholder="Search for a location..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={true}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Always-available fallback to the full-screen map pin picker,
                        for an address search can't find. */}
                    <TouchableOpacity
                        style={styles.searchResultItem}
                        onPress={() => startMapSelection()}
                    >
                        <View style={[styles.searchResultIcon, { backgroundColor: colors.surfaceSunken }]}>
                            <MapPin size={20} color={colors.text} />
                        </View>
                        <View style={styles.searchResultText}>
                            <Text style={styles.searchResultName}>Pin on map</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Search Results */}
                    {isSearchingLocation ? (
                        <View style={styles.searchCenterContent}>
                            <ActivityIndicator size="small" color={colors.accent} />
                            <Text style={styles.searchHintText}>Searching...</Text>
                        </View>
                    ) : searchQuery.length > 0 ? (
                        searchResults.length > 0 ? (
                            <ScrollView style={styles.searchResultsContainer} keyboardShouldPersistTaps="handled">
                                {searchResults.map((item, index) => (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={styles.searchResultItem}
                                        onPress={() => handleSelectSearchedLocation(item)}
                                    >
                                        <View style={styles.searchResultIcon}>
                                            <MapPin size={20} color={colors.textSecondary} />
                                        </View>
                                        <View style={styles.searchResultText}>
                                            <Text style={styles.searchResultName}>{item.name}</Text>
                                            <Text style={styles.searchResultAddress} numberOfLines={1}>
                                                {[item.address, item.city, item.region].filter(Boolean).join(', ')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.searchCenterContent}>
                                <Text style={styles.searchHintText}>No locations found</Text>
                            </View>
                        )
                    ) : (
                        <ScrollView style={styles.searchResultsContainer} keyboardShouldPersistTaps="handled">
                            {deviceLocationRef.current && (
                                <>
                                    <Text style={styles.searchSectionTitle}>NEARBY</Text>
                                    <TouchableOpacity
                                        style={styles.searchResultItem}
                                        onPress={() => {
                                            // `location` gets overwritten by whatever pickup point
                                            // was last chosen (map pin or search result), so
                                            // "use current location" has to restore the real GPS
                                            // fix explicitly - toggling the flag alone left `location`
                                            // pointed at the stale custom address while the UI
                                            // claimed "Current Location".
                                            setLocation(deviceLocationRef.current);
                                            setCustomAddress('');
                                            setUseCurrentLocation(true);
                                            setShowSearchModal(false);
                                        }}
                                    >
                                        <View style={[styles.searchResultIcon, { backgroundColor: colors.accentSoft }]}>
                                            <Navigation size={20} color={colors.accent} />
                                        </View>
                                        <View style={styles.searchResultText}>
                                            <Text style={[styles.searchResultName, { color: colors.accent }]}>Use my current location</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            {recentLocations.length > 0 && (
                                <>
                                    <Text style={styles.searchSectionTitle}>RECENT</Text>
                                    {recentLocations.map((item, index) => (
                                        <TouchableOpacity
                                            key={`recent-${index}`}
                                            style={styles.searchResultItem}
                                            onPress={() => handleSelectSearchedLocation({ name: item.address, lat: item.latitude, lon: item.longitude })}
                                        >
                                            <View style={styles.searchResultIcon}>
                                                <Clock size={20} color={colors.textSecondary} />
                                            </View>
                                            <View style={styles.searchResultText}>
                                                <Text style={styles.searchResultName} numberOfLines={1}>{item.address}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </ScrollView>
                    )}
                </SafeAreaView>
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
                                <X size={24} color={colors.textSecondary} />
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
                                        <CircleCheck size={20} color={colors.danger} />
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
                                    !selectedCancelReason && { backgroundColor: colors.textMuted }
                                ]}
                                onPress={handleCancelRequest}
                                disabled={cancelLoading || !selectedCancelReason}
                            >
                                {cancelLoading ? (
                                    <ActivityIndicator color={colors.onPrimary} size="small" />
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
                                    <Package size={16} color={colors.textSecondary} />
                                    <Text style={styles.jobDetailText}>
                                        {confirmingJob.material_type} ({confirmingJob.quantity_estimate})
                                    </Text>
                                </View>

                                <View style={styles.trackBadgeContainer}>
                                    <View style={[
                                        styles.trackTag,
                                        { backgroundColor: confirmingJob.track_type === 'A' ? colors.dangerSoft : colors.accentSoft }
                                    ]}>
                                        <Text style={[
                                            styles.trackTagText,
                                            { color: confirmingJob.track_type === 'A' ? colors.text : colors.accent }
                                        ]}>
                                            {confirmingJob.track_type === 'A' ? 'Safe Disposal (Pay to Clear)' : 'Sell Recyclables (Earn Cash)'}
                                        </Text>
                                    </View>
                                </View>

                                {/* The scale-photo + AI weight check used to be a hard
                                    gate here. It existed to stop a collector inflating
                                    the weight to inflate their payout - with no payout
                                    there's nothing to game, and a failed check just
                                    stranded the job with the button permanently
                                    disabled. Removed along with the payout itself. */}
                            </View>
                        )}

                        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 20 }}>
                            Mark this job as completed? You and the disposer settle the price
                            between yourselves - Revesta doesn't charge or pay anything.
                        </Text>

                        <View style={styles.cancelModalButtons}>
                            <TouchableOpacity
                                style={styles.cancelModalKeepBtn}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.cancelModalKeepText}>Go Back</Text>
                            </TouchableOpacity>

                            <AnimatedButton
                                style={[styles.modalConfirmBtn, { flex: 1, marginTop: 0, paddingHorizontal: 5 }]}
                                onPress={confirmAndCompleteJob}
                            >
                                <Text style={[styles.cancelModalConfirmText, { fontSize: 13, textAlign: 'center' }]}>Complete Job</Text>
                            </AnimatedButton>
                        </View>
                    </View>
                </View>
            </Modal>

            <RatingModal
                visible={showRatingModal}
                job={jobToRate}
                onClose={() => setShowRatingModal(false)}
                onSubmit={handleRatingSubmit}
            />

            {activeSellerJob && uiState === 'IDLE' && !isSelectingLocation && (
                <View style={{ position: 'absolute', bottom: 120, left: 16, right: 16, zIndex: 50 }}>
                    {activeSellerJob.status === 'PENDING' ? (
                        <SearchingCollectorCard 
                            onCancel={() => openCancelModal(activeSellerJob.id)} 
                            vehicleType={activeSellerJob.vehicle_type}
                        />
                    ) : (
                        <CollectorBottomSheet
                            job={activeSellerJob}
                            // The list endpoint now actually serializes collector
                            // as a real user object (was a bare id, silently
                            // breaking this whole card and the Chat/Call buttons
                            // below) - a fake "Driver / Truck" filler object is
                            // no longer needed once collector is genuinely assigned.
                            collector={activeSellerJob.collector}
                            onChatPress={() => {
                                if (!activeSellerJob.collector?.id) return;
                                navigation.navigate('ChatDetail', {
                                    contactId: activeSellerJob.collector.id,
                                    contactName: contactNameOf(activeSellerJob.collector),
                                    contactImage: resolveImageUrl(activeSellerJob.collector.profile_picture_url),
                                    contactIsOnline: activeSellerJob.collector.is_online,
                                });
                            }}
                            onCallPress={() => {
                                if (activeSellerJob.collector?.phone) {
                                    Toast.show({ type: 'info', text1: 'Calling...', text2: `Dialing ${activeSellerJob.collector.phone}` });
                                } else {
                                    Toast.show({ type: 'error', text1: 'No Phone Number', text2: 'Collector phone number not available.' });
                                }
                            }}
                            onCancel={() => openCancelModal(activeSellerJob.id)}
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
    },
    searchCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: c.text,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceAlt,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
    },
    searchTextInput: {
        flex: 1,
        height: '100%',
        marginLeft: 12,
        fontSize: 16,
        color: c.text,
    },
    searchResultsContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    searchSectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: c.textMuted,
        letterSpacing: 1.2,
        marginTop: 24,
        marginBottom: 12,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
    },
    searchResultIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    searchResultText: {
        flex: 1,
    },
    searchResultName: {
        fontSize: 16,
        fontWeight: '600',
        color: c.text,
        marginBottom: 4,
    },
    searchResultAddress: {
        fontSize: 14,
        color: c.textSecondary,
    },
    searchCenterContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchHintText: {
        marginTop: 12,
        fontSize: 15,
        color: c.textSecondary,
        fontWeight: '500',
    },
    // Ubride Styles
    floatingTopBarUbride: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    menuBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    bellBtnUbride: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    
    bottomSheetUbride: { position: 'absolute', bottom: 120, left: 16, right: 16, backgroundColor: c.surface, borderRadius: 24, padding: 20, shadowColor: c.shadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12 },
    dragHandleContainer: { alignItems: 'center', marginBottom: 20 },
    dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.surfaceSunken },
    locationInputBox: { },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 2 },
    sheetSubtitle: { fontSize: 13, color: c.textMuted, marginBottom: 16 },
    pickupFieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: c.surfaceAlt,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    // Tinted icon box, matching the card-with-tinted-icon pattern used across
    // the rest of the app (nav rows, job cards) instead of a bare dot.
    pickupIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    pickupFieldTextCol: { flex: 1 },
    pickupFieldLabel: { fontSize: 11, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    pickupFieldValue: { fontSize: 15, fontWeight: '700', color: c.text },
    continueBtnWrap: {
        marginTop: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },
    continueBtnUbride: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20 },
    continueBtnTextUbride: { color: c.onPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    continueBtnIconBubble: { position: 'absolute', right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },

    destinationPin: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: c.border, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    destinationPinInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.surface },
    pickupEtaBubble: { backgroundColor: c.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginBottom: 6, shadowColor: c.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
    pickupEtaBubbleText: { fontSize: 13, fontWeight: '700', color: c.onPrimary },
    compactMarkerLabel: { backgroundColor: c.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    compactMarkerText: { fontSize: 11, fontWeight: '700', color: c.text },

    bottomSheetUbrideVehicles: { position: 'absolute', bottom: 120, left: 16, right: 16, backgroundColor: c.surface, borderRadius: 30, padding: 20, shadowColor: c.shadow, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
    dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.surfaceSunken },
    chooseVehicleTitle: { fontSize: 22, fontWeight: '800', color: c.text, marginBottom: 4 },
    chooseVehicleSubtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 18 },
    vehicleRowGroup: { gap: 12, marginBottom: 16 },
    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1.5,
        borderColor: c.borderSubtle,
        borderRadius: 16,
        padding: 14,
    },
    vehicleRowActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
    radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    radioOuterActive: { borderColor: c.accent },
    radioInner: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: c.accent },
    vehicleArtBox: { width: 60, height: 60, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    vehicleArtBoxActive: { backgroundColor: c.accentSoft },
    vehicleRowName: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 2 },
    vehicleRowCapacity: { fontSize: 13, color: c.textMuted },
    paymentNote: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginBottom: 12 },
    readyNoticeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 16 },
    readyNoticeText: { fontSize: 13, color: c.textSecondary, flex: 1 },
    bookRideBtn: { backgroundColor: c.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    bookRideBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

    // --- Confirm Pickup sheet (dark) ---
    // The map underneath is already dark, so this step goes near-black rather
    // than white: the sheet reads as part of the map instead of a lightbox
    // stapled over it. Green carries the CTA and the accents because black on
    // black would disappear - the surface is what's black here, not the button.
    floatingBackBtnDark: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(28,28,30,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
    },
    confirmSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0D0D0F',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        maxHeight: Dimensions.get('window').height * 0.78,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    confirmHandleWrap: { alignItems: 'center', paddingVertical: 8 },
    confirmHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
    confirmTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 8 },
    confirmLogoBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(52,211,153,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmTitle: { fontSize: 24, fontWeight: '800', color: '#F7F7F8', letterSpacing: -0.3 },
    confirmSubtitle: { fontSize: 14.5, color: '#9BA1A6', marginBottom: 18, lineHeight: 20 },
    confirmCard: {
        backgroundColor: '#17181B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 12,
    },
    confirmCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    confirmCardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
    confirmIconBoxGreen: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(52,211,153,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmIconBoxNeutral: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmCardTextCol: { flex: 1 },
    confirmCardLabel: { fontSize: 12.5, color: '#8B9096', marginBottom: 3 },
    confirmCardValue: { fontSize: 16, fontWeight: '700', color: '#F2F3F4', marginBottom: 2 },
    confirmCardSub: { fontSize: 13, color: '#7C8288' },
    confirmChangeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(52,211,153,0.10)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
    },
    confirmChangeText: { fontSize: 13.5, fontWeight: '600', color: BRAND_GREEN },
    confirmInfoTitle: { fontSize: 15.5, fontWeight: '700', color: '#F2F3F4', marginBottom: 5 },
    confirmInfoBody: { fontSize: 13.5, color: '#9BA1A6', lineHeight: 19.5 },
    confirmCtaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#22C55E',
        borderRadius: 16,
        paddingVertical: 18,
        marginTop: 8,
    },
    // Deep green rather than white so the label keeps its contrast on the
    // bright CTA instead of glaring against it.
    confirmCtaText: { fontSize: 16.5, fontWeight: '800', color: '#052E1B' },
    confirmCtaIcon: { marginLeft: 10 },

    collectorBottomSheetUbride: { position: 'absolute', bottom: 110, left: 0, right: 0 },
    collectorJobCardUbride: { width: Dimensions.get('window').width * 0.9, marginHorizontal: Dimensions.get('window').width * 0.05, backgroundColor: c.surface, borderRadius: 24, padding: 20, shadowColor: c.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    collectorJobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    jobInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surfaceSunken, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexShrink: 1, marginRight: 10 },
    jobInfoText: { fontSize: 13, fontWeight: 'bold', color: c.text, flexShrink: 1 },
    jobTimeText: { fontSize: 13, color: c.success, fontWeight: '600' },
    jobRouteBox: { backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 15, flexDirection: 'row', marginBottom: 20 },
    routeDots: { alignItems: 'center', marginRight: 15, paddingVertical: 10 },
    routeLine: { width: 2, flex: 1, backgroundColor: c.surfaceSunken, marginVertical: 4 },
    routeTexts: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
    addressContainer: { justifyContent: 'center', marginBottom: 12 },
    routeLabel: { fontSize: 10, color: c.textMuted, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    routeAddressText: { fontSize: 15, color: c.text, fontWeight: '600' },

    // Permission Styles
    permissionContainer: { flex: 1, backgroundColor: c.surface },
    permissionContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    globeIconContainer: { marginBottom: 30 },
    permissionTitle: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 12, textAlign: 'center' },
    permissionDesc: { fontSize: 16, color: c.textSecondary, textAlign: 'center', lineHeight: 22 },
    permissionFooter: { paddingHorizontal: 20, paddingBottom: 110 },
    privacyText: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
    allowButton: { backgroundColor: c.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    allowButtonText: { color: c.onPrimary, fontSize: 16, fontWeight: '700' },

    // Floating Map UI
    floatingTopBar: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    floatingBackBtn: { width: 44, height: 44, backgroundColor: c.surface, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: c.shadow, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    floatingSearchBar: { flex: 1, height: 44, backgroundColor: c.surface, borderRadius: 22, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, shadowColor: c.shadow, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    floatingSearchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: c.text },
    floatingTargetBtn: { width: 44, height: 44, backgroundColor: c.surface, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: c.shadow, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },

    // Map Markers
    blackCircleMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center', shadowColor: c.shadow, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
    blackCircleText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 14 },

    kycBanner: {
        position: 'absolute',
        top: 80,
        left: 16,
        right: 16,
        backgroundColor: c.primary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: c.shadow,
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
    kycBannerTitle: { fontSize: 14, fontWeight: '700', color: c.onPrimary, marginBottom: 2 },
    kycBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    jobListContainerAbsolute: { position: 'absolute', bottom: 100, left: 0, right: 0 },

    container: { flex: 1 },
    map: { width: width, height: height },

    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: c.surface,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
        paddingHorizontal: 20,
        shadowColor: c.shadow,
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
        backgroundColor: c.surfaceSunken,
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
        color: c.text,
    },
    headerSubText: {
        fontSize: 12,
        color: c.textMuted,
        marginTop: 2,
    },
    historyBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceSunken,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingActionRow: {
        marginTop: 20,
    },
    requestButton: {
        backgroundColor: c.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    requestButtonText: {
        color: c.onPrimary,
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
        backgroundColor: c.surface,
        width: width * 0.85,
        marginHorizontal: 10,
        borderRadius: 28,
        padding: 20,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: c.borderSubtle,
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
        color: c.text,
    },
    jobQty: {
        fontSize: 13,
        color: c.textSecondary,
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
        backgroundColor: c.surfaceSunken,
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
        color: c.textSecondary,
        flex: 1,
    },
    actionRow: {
        marginTop: 10,
    },
    acceptBtn: {
        backgroundColor: c.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    acceptBtnText: {
        color: c.onPrimary,
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
    navBtn: { backgroundColor: c.primary },
    arriveBtn: { backgroundColor: c.primary },
    actionBtnText: {
        color: c.onPrimary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    trackingContainer: {
        backgroundColor: c.surfaceSunken,
        padding: 15,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: c.primary,
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
        color: c.text,
    },
    trackingDetail: {
        fontSize: 12,
        color: c.textSecondary,
    },
    cancelRequestBtn: {
        alignItems: 'center',
        marginTop: 15,
    },
    cancelText: {
        fontSize: 13,
        color: c.danger,
        fontWeight: '600',
    },
    imageUploadText: {
        fontSize: 14,
        color: c.textSecondary,
        fontWeight: '500',
    },
    navTopBarContainer: {
        position: 'absolute',
        top: 0,
        width: '100%',
        paddingHorizontal: 20,
        zIndex: 50,
    },
    navTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface,
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 12,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
        marginTop: 10,
    },
    navCloseBtn: {
        padding: 5,
    },
    navAddresses: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    navAddressText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: c.text,
        maxWidth: 100,
    },
    navAddBtn: {
        padding: 5,
    },
    customMapBubble: {
        backgroundColor: c.accent,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: 'column',
        alignItems: 'center',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    customMapBubbleText: {
        color: c.onPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    customMapBubbleTime: {
        color: c.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    customMapBubbleTriangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: c.accent,
        transform: [{ rotate: '180deg' }],
        marginTop: -1, // Overlap slightly to fix gaps
    },
    bubbleDotContainer: {
        alignItems: 'center',
        marginTop: 2,
    },
    bubbleDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: c.primary,
        borderWidth: 2,
        borderColor: c.border,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },

    markerContainer: {
        backgroundColor: c.surface,
        padding: 5,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: c.primary,
        shadowColor: c.shadow,
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
        backgroundColor: c.surface,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    selectionHeader: { alignItems: 'center', marginBottom: 15 },
    selectionTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
    selectionSubtitle: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
    confirmLocationBtn: {
        backgroundColor: c.primary,
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 15,
        width: '100%',
        alignItems: 'center',
    },
    confirmLocationText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 15 },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: c.surface,
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
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: c.text },
    modalBody: {},
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
        borderColor: c.border,
        backgroundColor: c.surfaceAlt,
    },
    pickerItemActive: {
        backgroundColor: c.primary,
        borderColor: c.primary,
    },
    pickerItemText: { color: c.textSecondary, fontSize: 13, fontWeight: '500' },
    pickerItemTextActive: { color: c.onPrimary, fontWeight: 'bold' },

    summaryCard: {
        backgroundColor: c.surfaceAlt,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        padding: 16,
        marginBottom: 20,
        gap: 14,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    summaryIconBox: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: c.surface,
        justifyContent: 'center', alignItems: 'center',
    },
    summaryLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600', marginBottom: 2 },
    summaryValue: { fontSize: 14, color: c.text, fontWeight: '600' },
    summaryPrice: { fontSize: 20, fontWeight: '800' },
    summaryDivider: { height: 1, backgroundColor: c.borderSubtle },

    estimateContainer: {
        marginBottom: 20,
    },
    estimateLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 15,
    },
    estimateLoadingText: { color: c.textSecondary, fontSize: 13 },
    estimateBox: {
        backgroundColor: c.surfaceAlt,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.border,
    },
    estimateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    estimateLabel: { fontSize: 14, color: c.textSecondary },
    estimateValue: { fontSize: 14, fontWeight: 'bold', color: c.text },
    divider: {
        height: 1,
        backgroundColor: c.surfaceSunken,
        marginVertical: 12,
    },
    estimateTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    estimateTotalLabel: { fontSize: 16, fontWeight: 'bold', color: c.text },
    estimateTotalValue: { fontSize: 18, fontWeight: 'bold', color: c.text },
    estimateNote: {
        fontSize: 11,
        color: c.textMuted,
        fontStyle: 'italic',
        lineHeight: 16,
    },
    submitRequestBtn: {
        backgroundColor: c.primary,
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    submitRequestBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: 'bold' },

    cancelModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    cancelModalContent: {
        backgroundColor: c.surface,
        borderRadius: 30,
        padding: 24,
    },
    cancelModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalConfirmBtn: {
        backgroundColor: c.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    modalConfirmText: {
        color: c.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelModalTitle: { fontSize: 20, fontWeight: 'bold', color: c.text },
    cancelModalSubtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 20 },
    cancelReasonsList: { maxHeight: 300, marginBottom: 20 },
    cancelReasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        marginBottom: 10,
    },
    cancelReasonItemActive: {
        borderColor: c.dangerSoft,
        backgroundColor: c.dangerSoft,
    },
    cancelReasonIcon: { fontSize: 20, marginRight: 12 },
    cancelReasonText: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    cancelReasonTextActive: { color: c.danger, fontWeight: 'bold' },
    cancelModalClose: { padding: 4 },
    cancelModalButtons: { flexDirection: 'row', gap: 12 },
    cancelModalKeepBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 15,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
    },
    cancelModalConfirmBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 15,
        backgroundColor: c.danger,
        alignItems: 'center',
    },
    cancelModalKeepText: { color: c.textSecondary, fontWeight: 'bold' },
    cancelModalConfirmText: { color: c.onPrimary, fontWeight: 'bold' },

    errorBox: {
        position: 'absolute',
        top: 150,
        left: 20,
        right: 20,
        backgroundColor: c.dangerSoft,
        padding: 15,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 20,
        borderWidth: 1,
        borderColor: c.dangerSoft,
    },
    errorText: { color: c.danger, fontSize: 13, fontWeight: '500' },
    emptyState: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        backgroundColor: c.surface,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        elevation: 3,
    },
    emptyText: { color: c.textSecondary, fontSize: 13, fontWeight: '500' },
    jobSeparator: {
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    separatorText: { fontSize: 12, fontWeight: 'bold', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

    // Verification Styles
    jobDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    jobDetailText: {
        fontSize: 15,
        color: c.text,
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
    imageUploadBtn: {
        width: '100%',
        height: 120,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1.5,
        borderColor: c.border,
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
        color: c.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    uploadedImagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
}));
