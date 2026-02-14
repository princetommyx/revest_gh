import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, Modal, TextInput, ScrollView,
    ActivityIndicator, FlatList, Platform, Linking, KeyboardAvoidingView
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { usePickups } from '../hooks/usePickups';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';
import {
    Truck, MapPin, Navigation,
    CheckCircle2, AlertCircle, Info, Clock, Search, X
} from 'lucide-react-native';
import Toast from 'react-native-root-toast';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

import { useNavigation } from '@react-navigation/native';

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
    const queryClient = useQueryClient();

    // Check for params from ListingDetail
    const pickupData = route?.params?.pickupData;

    // ... rest of checking logic can go in useEffect
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const { data: jobs = [], isLoading: jobsLoading, error: apiError, isError, refetch } = usePickups(location);

    // Missing state declarations
    const mapRef = useRef(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestForm, setRequestForm] = useState({
        material_type: 'Plastics',
        quantity_estimate: '1-2 Bags',
        estimated_price: null,
        distance_km: null,
        duration_min: null,
        payment_method: 'CASH'
    });
    const [useCustomLocation, setUseCustomLocation] = useState(false);
    const [customAddress, setCustomAddress] = useState('');
    const [recentLocations, setRecentLocations] = useState([]);

    // Cancel request state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelJobId, setCancelJobId] = useState(null);
    const [selectedCancelReason, setSelectedCancelReason] = useState(null);
    const [cancelLoading, setCancelLoading] = useState(false);

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

    // Load recent locations on mount
    useEffect(() => {
        loadRecentLocations();
    }, []);

    // Reverse Geocode Function
    const reverseGeocode = async (lat, lon) => {
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (address) {
                // Format: "Madina Market, Accra"
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
            // Add to beginning, remove duplicates, keep max 5
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
    // but typically map shows up first then pins drop.
    // If location is required for collector, we might want to wait.

    // We can derive "loading" state:
    const loading = jobsLoading && (userRole !== 'COLLECTOR' || !!location); // simplified

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);

            // Set initial map region
            setMapRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        })();
    }, []);

    // Handle incoming pickup request from listing
    useEffect(() => {
        if (pickupData) {
            setRequestForm(prev => ({
                ...prev,
                material_type: pickupData.material_type || prev.material_type,
                quantity_estimate: pickupData.quantity_estimate || prev.quantity_estimate
            }));
            setShowRequestModal(true);

            // Clear params to prevent reopening on generic refresh (optional, but good practice)
            navigation.setParams({ pickupData: null });
        }
    }, [pickupData]);

    // Handle "Set on Map" Flow
    const startMapSelection = () => {
        setShowRequestModal(false);
        setIsSelectingLocation(true);
        // Ensure map is centered on current location or last known
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
        // Get center of map (managed by onRegionChangeComplete)
        if (mapRegion) {
            // Update location state
            setLocation({ latitude: mapRegion.latitude, longitude: mapRegion.longitude });

            // Reverse geocode
            const address = await reverseGeocode(mapRegion.latitude, mapRegion.longitude);
            setCustomAddress(address);

            // Re-open modal
            setShowRequestModal(true);
        }
    };

    // Location tracking for collectors during active jobs
    useEffect(() => {
        if (userRole !== 'COLLECTOR' || !location) return;
        // ... (existing tracking logic)
        // Find if collector has any ACCEPTED jobs
        const activeJob = jobs.find(j => j.status === 'ACCEPTED' && j.collector?.id === user?.id);

        if (!activeJob) return; // No active job, don't track

        // Send location update every 10 seconds
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
        }, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, [userRole, location, jobs, user]);

    // React Query handles focus refetch


    const fetchEstimate = async () => {
        if (!location) {
            Toast.show("Location missing. Cannot calculate estimate.", { backgroundColor: '#E74C3C' });
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
                estimated_price: estimate.estimated_price,
                distance_km: estimate.distance_km,
                duration_min: estimate.duration_min
            }));
        } catch (error) {
            console.error("Estimate Error:", error);
            Toast.show("Failed to get estimate", { backgroundColor: '#E74C3C' });
        } finally {
            setRequestLoading(false);
        }
    };

    // AI Value Estimator
    useEffect(() => {
        calculateWasteValue();
    }, [requestForm.material_type, requestForm.quantity_estimate]);

    const calculateWasteValue = () => {
        const { material_type, quantity_estimate } = requestForm;
        if (!material_type || !quantity_estimate) return;

        // Base rates per kg (GHS)
        const rates = {
            'Plastics': 1.5,
            'Metals': 4.0,
            'Paper': 0.8,
            'Electronics': 8.0,
            'Glass': 0.5,
            'Mixed': 1.0
        };

        // Estimated weights (kg)
        const weights = {
            '1-2 Bags': 10,
            '3-5 Bags': 25,
            'Tricycle Load': 100,
            'Pickup Truck Load': 300
        };

        const rate = rates[material_type] || 1.0;
        const weight = weights[quantity_estimate] || 10; // Default to small qty

        // Calculate estimated value logic
        const baseValue = rate * weight;
        const commission = 0.20; // 20% platform fee
        const estimatedValue = baseValue * (1 - commission);

        // Update form with AI estimate if not manually set
        // We set a range or a specific value. specific for now.
        setRequestForm(prev => ({
            ...prev,
            estimated_price: estimatedValue.toFixed(2)
        }));
    };

    const handleCreateRequest = async () => {
        // ... (existing logic)
        if (!location) {
            Toast.show("Location not available", { backgroundColor: '#E74C3C' });
            return;
        }

        // Ensure price is calculated
        if (!requestForm.estimated_price) {
            fetchEstimate();
            return;
        }

        setRequestLoading(true);
        try {
            const requestData = {
                ...requestForm,
                latitude: location.latitude,
                longitude: location.longitude
            };

            // Add custom address if provided
            if (customAddress.trim()) {
                requestData.pickup_address = customAddress.trim();
                // Save to recent locations
                saveRecentLocation(customAddress.trim());
            }

            await logisticsApi.createPickupRequest(requestData);

            Toast.show("Pickup request created!", { backgroundColor: '#2E7D32' });
            setShowRequestModal(false);
            setCustomAddress('');
            refetch();
        } catch (error) {
            console.error("Create Request Error:", error);
            Toast.show("Failed to create request", { backgroundColor: '#E74C3C' });
        } finally {
            setRequestLoading(false);
        }
    };

    const handleAcceptJob = async (jobId) => {
        try {
            await logisticsApi.acceptRequest(jobId);
            Toast.show("Job accepted! Start navigating.", { backgroundColor: '#2E7D32' });
            // Refresh
            refetch();
        } catch (error) {
            Toast.show("Failed to accept job", { backgroundColor: '#E74C3C' });
        }
    };

    const handleArriveJob = async (jobId) => {
        try {
            await logisticsApi.updateStatus(jobId, 'ARRIVED');
            Toast.show("Marked as Arrived!", { backgroundColor: '#2E7D32' });
            refetch();
        } catch (error) {
            Toast.show("Failed to update status", { backgroundColor: '#E74C3C' });
        }
    };

    const openNavigation = (job) => {
        const { latitude, longitude, pickup_address } = job;
        const label = encodeURIComponent(pickup_address || 'Pickup Location');

        // Use platform-specific maps URL
        const scheme = Platform.select({
            ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
            android: `geo:0,0?q=${latitude},${longitude}(${label})`
        });

        // Fallback to Google Maps web if app not installed
        const url = Platform.select({
            ios: scheme,
            android: scheme
        });

        Linking.openURL(url).catch(() => {
            // Fallback to Google Maps web
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            Linking.openURL(webUrl);
        });
    };

    const handleCompleteJob = async (jobId) => {
        // Find the job first to show confirmation
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
            Toast.show("Job Completed! Funds processed.", { backgroundColor: '#2E7D32' });
            setShowConfirmModal(false);
            setConfirmingJob(null);
            refetch();
            // Refresh wallet too as balance changed
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
        } catch (error) {
            Toast.show("Failed to complete job", { backgroundColor: '#E74C3C' });
        }
    };

    const openCancelModal = (jobId) => {
        setCancelJobId(jobId);
        setSelectedCancelReason(null);
        setShowCancelModal(true);
    };

    const handleCancelRequest = async () => {
        if (!selectedCancelReason) {
            Toast.show("Please select a reason", { backgroundColor: '#E74C3C' });
            return;
        }

        setCancelLoading(true);
        try {
            await logisticsApi.cancelRequest(cancelJobId, selectedCancelReason);
            Toast.show("Request cancelled", { backgroundColor: '#2E7D32' });
            setShowCancelModal(false);
            setCancelJobId(null);
            setSelectedCancelReason(null);
            // Refresh pickups list and invalidate history cache
            refetch();
            queryClient.invalidateQueries({ queryKey: ['pickup-history'] });
        } catch (error) {
            console.error("Cancel Error:", error);
            Toast.show("Failed to cancel request", { backgroundColor: '#E74C3C' });
        } finally {
            setCancelLoading(false);
        }
    };

    const renderJobMarker = (job) => {
        const markers = [];
        const routes = [];

        // Pickup Location
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

        // Collector Live Location (if job is accepted and tracking is active)
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

            // Add route line from collector to pickup
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

    // Memoize markers to prevent re-rendering on every state change
    const memoizedMarkers = useMemo(() => {
        return jobs.flatMap(renderJobMarker);
    }, [jobs]);

    // Sort jobs: Active jobs (ACCEPTED/ARRIVED) first, then PENDING
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
                    latitude: location?.latitude || 5.6037, // Default Accra
                    longitude: location?.longitude || -0.1870,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
                onRegionChangeComplete={setMapRegion}
                showsUserLocation={true}
            >
                {memoizedMarkers}

                {/* Center Pin for Location Selection */}
                {isSelectingLocation && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -32 }}>
                        <MapPin size={32} color="#E74C3C" fill="#fff" />
                    </View>
                )}
            </MapView>

            {/* Map Selection Overlay */}
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
                <View style={styles.overlay}>
                    <View style={styles.header}>
                        <View style={styles.headerRow}>
                            <Text style={styles.headerTitle}>
                                {userRole === 'COLLECTOR' ? 'Available Pickups' : 'Your Pickups'}
                            </Text>
                        </View>
                        {userRole !== 'COLLECTOR' && (
                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    style={styles.requestButton}
                                    onPress={() => setShowRequestModal(true)}
                                >
                                    <Navigation size={18} color="#fff" />
                                    <Text style={styles.requestButtonText}>Request Pickup</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.historyBtn}
                                    onPress={() => navigation.navigate('PickupHistory')}
                                >
                                    <Clock size={20} color="#666" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {sortedJobs.length > 0 && (
                <View style={styles.jobListContainer}>
                    <FlatList
                        data={sortedJobs}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item, index }) => {
                            // Check if this is the first PENDING job after active jobs
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
                                        {/* Show "ACTIVE JOB" label for accepted/arrived jobs */}
                                        {(item.status === 'ACCEPTED' || item.status === 'ARRIVED') && (
                                            <View style={styles.activeJobBanner}>
                                                <Truck size={16} color="#fff" />
                                                <Text style={styles.activeJobText}>ACTIVE JOB</Text>
                                            </View>
                                        )}
                                        <View style={styles.jobHeader}>
                                            <Truck size={20} color={item.status === 'PENDING' ? '#2E7D32' : '#F39C12'} />
                                            <Text style={styles.jobType}>{item.material_type}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: item.status === 'PENDING' ? '#E8F5E9' : '#FFF3E0' }]}>
                                                <Text style={[styles.statusText, { color: item.status === 'PENDING' ? '#2E7D32' : '#E67E22' }]}>{item.status}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.jobInfo}>{item.quantity_estimate}</Text>
                                        <Text style={styles.jobLoc} numberOfLines={1}>{item.pickup_address}</Text>

                                        {userRole === 'COLLECTOR' && (
                                            <>
                                                {item.status === 'PENDING' && (
                                                    <TouchableOpacity
                                                        style={styles.acceptBtn}
                                                        onPress={() => handleAcceptJob(item.id)}
                                                    >
                                                        <Text style={styles.acceptBtnText}>Accept Job</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {item.status === 'ACCEPTED' && (
                                                    <>
                                                        <TouchableOpacity
                                                            style={[styles.acceptBtn, { backgroundColor: '#3498DB', marginBottom: 10 }]}
                                                            onPress={() => openNavigation(item)}
                                                        >
                                                            <Navigation size={18} color="#fff" />
                                                            <Text style={[styles.acceptBtnText, { marginLeft: 8 }]}>Navigate to Pickup</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={[styles.acceptBtn, { backgroundColor: '#F39C12' }]}
                                                            onPress={() => handleArriveJob(item.id)}
                                                        >
                                                            <Text style={styles.acceptBtnText}>I have Arrived</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}

                                                {item.status === 'ARRIVED' && (
                                                    <TouchableOpacity
                                                        style={[styles.acceptBtn, { backgroundColor: '#27AE60' }]}
                                                        onPress={() => handleCompleteJob(item.id)}
                                                    >
                                                        <Text style={styles.acceptBtnText}>Complete Job</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        )}

                                        {item.status !== 'PENDING' && item.collector_name && (
                                            <View style={styles.collectorInfo}>
                                                <Info size={14} color="#666" />
                                                <Text style={styles.collectorName}>Collector: {item.collector_name}</Text>
                                            </View>
                                        )}

                                        {/* Tracking Info for Sellers - Bolt-style */}
                                        {userRole === 'SELLER' && item.status === 'ACCEPTED' && item.current_lat && item.current_lon && (
                                            <View style={styles.trackingInfo}>
                                                <View style={styles.trackingRow}>
                                                    <Navigation size={16} color="#3498DB" />
                                                    <Text style={styles.trackingText}>
                                                        {(() => {
                                                            const distance = calculateDistance(
                                                                parseFloat(item.current_lat),
                                                                parseFloat(item.current_lon),
                                                                parseFloat(item.latitude),
                                                                parseFloat(item.longitude)
                                                            );
                                                            const eta = Math.ceil((distance / 40) * 60); // Assuming 40km/h avg speed
                                                            return `${distance.toFixed(1)} km away • ETA ${eta} min`;
                                                        })()}
                                                    </Text>
                                                </View>
                                                <Text style={styles.trackingSubtext}>🚛 {item.collector_name} is on the way</Text>
                                            </View>
                                        )}

                                        {/* Cancel Button for Sellers */}
                                        {userRole === 'SELLER' && (item.status === 'PENDING' || item.status === 'ACCEPTED') && (
                                            <TouchableOpacity
                                                style={styles.cancelBtn}
                                                onPress={() => openCancelModal(item.id)}
                                            >
                                                <X size={16} color="#E74C3C" />
                                                <Text style={styles.cancelBtnText}>Cancel Request</Text>
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
                                <Text style={{ color: '#666', fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Pickup Location Section */}
                            <Text style={styles.label}>Pickup Location</Text>

                            {/* Address Input */}
                            <TextInput
                                style={styles.addressInput}
                                placeholder="Enter pickup address (e.g., Madina Market, Accra)"
                                placeholderTextColor="#999"
                                value={customAddress}
                                onChangeText={setCustomAddress}
                            />

                            {/* Recent Locations List */}
                            {recentLocations.length > 0 && (
                                <View style={styles.recentLocationsContainer}>
                                    <Text style={styles.recentLocationsTitle}>Recent Locations</Text>
                                    {recentLocations.map((loc, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.recentLocationItem}
                                            onPress={() => setCustomAddress(loc.address)}
                                        >
                                            <View style={styles.recentLocationIcon}>
                                                <Clock size={18} color="#666" />
                                            </View>
                                            <View style={styles.recentLocationInfo}>
                                                <Text style={styles.recentLocationName} numberOfLines={1}>
                                                    {loc.address.split(',')[0]}
                                                </Text>
                                                <Text style={styles.recentLocationArea} numberOfLines={1}>
                                                    {loc.address.split(',').slice(1).join(',').trim() || 'Ghana'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Current Location Info */}
                            {!customAddress && location && (
                                <View style={styles.currentLocationBox}>
                                    <MapPin size={16} color="#2E7D32" />
                                    <Text style={styles.currentLocationText}>
                                        Leave empty to use your current GPS location
                                    </Text>
                                </View>
                            )}

                            <Text style={styles.label}>Material Type</Text>
                            <View style={styles.pickerContainer}>
                                {(() => {
                                    const defaultTypes = ['Plastics', 'Metals', 'Paper', 'Mixed'];
                                    // If current type is not in defaults, add it
                                    const types2 = requestForm.material_type && !defaultTypes.includes(requestForm.material_type)
                                        ? [...defaultTypes, requestForm.material_type]
                                        : defaultTypes;

                                    return types2.map(type => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.pickerItem,
                                                requestForm.material_type === type && styles.pickerItemActive
                                            ]}
                                            onPress={() => setRequestForm({ ...requestForm, material_type: type })}
                                        >
                                            <Text style={[
                                                styles.pickerItemText,
                                                requestForm.material_type === type && styles.pickerItemTextActive
                                            ]}>{type}</Text>
                                        </TouchableOpacity>
                                    ));
                                })()}
                            </View>

                            <Text style={styles.label}>Estimated Quantity</Text>
                            <View style={styles.pickerContainer}>
                                {(() => {
                                    const defaultQtys = ['1-2 Bags', '3-5 Bags', 'Pickup Truck Load', 'Tricycle Load'];
                                    // If current qty is not in defaults, add it
                                    const qtys2 = requestForm.quantity_estimate && !defaultQtys.includes(requestForm.quantity_estimate)
                                        ? [requestForm.quantity_estimate, ...defaultQtys]
                                        : defaultQtys;

                                    return qtys2.map(qty => (
                                        <TouchableOpacity
                                            key={qty}
                                            style={[
                                                styles.pickerItem,
                                                requestForm.quantity_estimate === qty && styles.pickerItemActive
                                            ]}
                                            onPress={() => setRequestForm({ ...requestForm, quantity_estimate: qty })}
                                        >
                                            <Text style={[
                                                styles.pickerItemText,
                                                requestForm.quantity_estimate === qty && styles.pickerItemTextActive
                                            ]}>{qty}</Text>
                                        </TouchableOpacity>
                                    ));
                                })()}
                            </View>


                            {/* AI Estimate Display */}
                            {requestForm.estimated_price && (
                                <View style={styles.aiEstimateBox}>
                                    <View style={styles.aiHeader}>
                                        <Text style={styles.aiLabel}>✨ Revesta AI Valuation</Text>
                                    </View>
                                    <Text style={styles.aiValue}>
                                        Est. Earn: ₵{requestForm.estimated_price}
                                    </Text>
                                    <Text style={styles.aiSubtext}>
                                        Based on real-time market rates for {requestForm.material_type}
                                    </Text>
                                </View>
                            )}

                            <Text style={styles.label}>Payment Method</Text>
                            <View style={styles.pickerContainer}>
                                {[
                                    { id: 'CASH', label: 'Cash' },
                                    { id: 'DIGITAL', label: 'Digital Wallet' }
                                ].map(method => (
                                    <TouchableOpacity
                                        key={method.id}
                                        style={[
                                            styles.pickerItem,
                                            requestForm.payment_method === method.id && styles.pickerItemActive
                                        ]}
                                        onPress={() => setRequestForm({ ...requestForm, payment_method: method.id })}
                                    >
                                        <Text style={[
                                            styles.pickerItemText,
                                            requestForm.payment_method === method.id && styles.pickerItemTextActive
                                        ]}>{method.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Price Estimate Section */}
                            <View style={styles.estimateContainer}>
                                <Text style={styles.label}>Fare Estimate</Text>
                                {requestLoading ? (
                                    <View style={styles.estimateLoading}>
                                        <ActivityIndicator size="small" color="#2E7D32" />
                                        <Text style={styles.estimateLoadingText}>Calculating fare...</Text>
                                    </View>
                                ) : requestForm.estimated_price ? (
                                    <View style={styles.estimateBox}>
                                        <View style={styles.estimateRow}>
                                            <Text style={styles.estimateLabel}>Base Price</Text>
                                            <Text style={styles.estimateValue}>₵10.00</Text>
                                        </View>
                                        <View style={styles.estimateRow}>
                                            <Text style={styles.estimateLabel}>Distance ({requestForm.distance_km}km)</Text>
                                            <Text style={styles.estimateValue}>₵{(requestForm.distance_km * 2.5).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.estimateRow}>
                                            <Text style={styles.estimateLabel}>Time Estimate ({Math.round(requestForm.duration_min)} min)</Text>
                                            <Text style={styles.estimateValue}>₵{(requestForm.duration_min * 0.5).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.divider} />
                                        <View style={styles.estimateTotalRow}>
                                            <Text style={styles.estimateTotalLabel}>Total Estimated Price</Text>
                                            <Text style={styles.estimateTotalValue}>₵{requestForm.estimated_price}</Text>
                                        </View>
                                        <Text style={styles.estimateNote}>
                                            *Final price may vary slightly based on traffic.
                                        </Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.calcBtn} onPress={fetchEstimate}>
                                        <Text style={styles.calcBtnText}>Calculate Estimate</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.submitRequestBtn, !requestForm.estimated_price && { backgroundColor: '#ccc' }]}
                                onPress={handleCreateRequest}
                                disabled={requestLoading || !requestForm.estimated_price}
                            >
                                {requestLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitRequestBtnText}>Confirm Request</Text>
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
                            <View style={{ marginVertical: 20 }}>
                                <Text style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>
                                    Job Details:
                                </Text>
                                <Text style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>
                                    • Material: {confirmingJob.material_type}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>
                                    • Quantity: {confirmingJob.quantity_estimate}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#333', marginBottom: 12 }}>
                                    • Location: {confirmingJob.pickup_address || confirmingJob.city}
                                </Text>
                                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#2E7D32', marginTop: 8 }}>
                                    Earnings: ₵{confirmingJob.estimated_price || '0.00'}
                                </Text>
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
                                style={[styles.cancelModalConfirmBtn, { backgroundColor: '#2E7D32' }]}
                                onPress={confirmAndCompleteJob}
                            >
                                <Text style={styles.cancelModalConfirmText}>Complete Job</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: width, height: height },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center' },
    jobListContainer: { position: 'absolute', bottom: 40, left: 0, right: 0 },
    jobCard: {
        backgroundColor: '#fff',
        width: width * 0.8,
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    jobHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    jobType: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    jobInfo: { fontSize: 14, color: '#666', marginBottom: 5 },
    jobLoc: { fontSize: 12, color: '#999', marginBottom: 15 },
    acceptBtn: {
        backgroundColor: '#2E7D32',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6
    },
    acceptBtnText: { color: '#fff', fontWeight: 'bold' },
    markerContainer: { backgroundColor: '#fff', padding: 5, borderRadius: 10, borderWidth: 2, borderColor: '#2E7D32' },
    errorBox: {
        position: 'absolute',
        top: 150,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 15,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    errorText: { color: '#E74C3C', fontSize: 14, fontWeight: '500' },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 'auto'
    },
    statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    collectorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 8
    },
    collectorName: { fontSize: 12, color: '#666', fontWeight: '500' },
    trackingInfo: {
        marginTop: 10,
        backgroundColor: '#E3F2FD',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#3498DB'
    },
    trackingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
    },
    trackingText: {
        fontSize: 14,
        color: '#1976D2',
        fontWeight: 'bold'
    },
    trackingSubtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 4
    },
    activeJobBanner: {
        backgroundColor: '#FF9800',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        marginBottom: 10,
        gap: 6,
    },
    activeJobText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    jobSeparator: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    separatorText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        textAlign: 'center',
    },
    emptyState: {
        position: 'absolute',
        bottom: Dimensions.get('window').height * 0.2,
        alignSelf: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#eee'
    },
    emptyText: { color: '#666', fontSize: 14, fontWeight: '600' },
    requestButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        minHeight: height * 0.6,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    historyBtn: {
        padding: 10,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#E8E8E8'
    },
    requestButton: {
        flex: 1,
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 15,
        gap: 8,
        elevation: 3,
        shadowColor: '#2E7D32',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 }
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
    modalBody: { flex: 1 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 12, textTransform: 'uppercase' },
    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    pickerItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#f8f9fa'
    },
    pickerItemActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    pickerItemText: { color: '#666', fontWeight: '500' },
    pickerItemTextActive: { color: '#fff', fontWeight: 'bold' },

    estimateContainer: { marginBottom: 30 },
    estimateLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20 },
    estimateLoadingText: { color: '#666' },
    estimateBox: {
        backgroundColor: '#f8f9fa', padding: 20, borderRadius: 16,
        borderWidth: 1, borderColor: '#eee'
    },
    estimateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    estimateLabel: { fontSize: 14, color: '#666' },
    estimateValue: { fontSize: 14, fontWeight: '600', color: '#333' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    estimateTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    estimateTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
    estimateTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
    estimateNote: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 5 },
    calcBtn: {
        padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#2E7D32',
        alignItems: 'center', borderStyle: 'dashed'
    },
    calcBtnText: { color: '#2E7D32', fontWeight: 'bold' },

    submitRequestBtn: {
        backgroundColor: '#2E7D32',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    submitRequestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Location selector styles
    locationToggleRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15
    },
    locationToggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#f8f9fa'
    },
    locationToggleBtnActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32'
    },
    locationToggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666'
    },
    locationToggleTextActive: {
        color: '#fff'
    },
    addressInput: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 15,
        fontSize: 15,
        color: '#333',
        marginBottom: 20
    },
    currentLocationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20
    },
    currentLocationText: {
        fontSize: 13,
        color: '#2E7D32',
        fontWeight: '500'
    },

    // Bolt-style "Where to?" and Recent Locations
    whereToBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        gap: 12
    },
    whereToInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        fontWeight: '500'
    },
    recentLocationsContainer: {
        marginBottom: 20
    },
    recentLocationsTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
        textTransform: 'uppercase',
        marginBottom: 12,
        letterSpacing: 0.5
    },
    recentLocationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    recentLocationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    recentLocationInfo: {
        flex: 1
    },
    recentLocationName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2
    },
    recentLocationArea: {
        fontSize: 13,
        color: '#999'
    },

    // Cancel button and modal styles
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E74C3C',
        borderRadius: 8,
        backgroundColor: '#FEF2F2'
    },
    cancelBtnText: {
        color: '#E74C3C',
        fontSize: 13,
        fontWeight: '600'
    },
    cancelModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    cancelModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: height * 0.7
    },
    cancelModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    aiEstimateBox: {
        backgroundColor: '#E8F5E9',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#C8E6C9',
        alignItems: 'center'
    },
    aiHeader: {
        marginBottom: 5,
    },
    aiLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2E7D32',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    aiValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1B5E20',
        marginBottom: 2
    },
    aiSubtext: {
        fontSize: 11,
        color: '#66bb6a',
        fontStyle: 'italic'
    },
    cancelModalClose: {
        padding: 4
    },
    cancelModalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20
    },
    cancelReasonsList: {
        marginBottom: 20
    },
    cancelReasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 10,
        backgroundColor: '#f9f9f9'
    },
    cancelReasonItemActive: {
        borderColor: '#E74C3C',
        backgroundColor: '#FEF2F2'
    },
    cancelReasonIcon: {
        fontSize: 20,
        marginRight: 12
    },
    cancelReasonText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500'
    },
    cancelReasonTextActive: {
        color: '#E74C3C',
        fontWeight: '600'
    },
    cancelModalButtons: {
        flexDirection: 'row',
        gap: 12
    },
    cancelModalKeepBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center'
    },
    cancelModalKeepText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666'
    },
    cancelModalConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#E74C3C',
        alignItems: 'center'
    },
    cancelModalConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff'
    }
});
