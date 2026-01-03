import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Dimensions, FlatList, Modal,
    ScrollView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';
import {
    Truck, MapPin, Navigation,
    CheckCircle2, AlertCircle, Info
} from 'lucide-react-native';
import Toast from 'react-native-root-toast';

const { width, height } = Dimensions.get('window');

export default function PickupsScreen() {
    const { userRole, user } = useAuth();
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeJob, setActiveJob] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestForm, setRequestForm] = useState({
        material_type: 'Plastics',
        quantity_estimate: '1-2 Bags'
    });
    const mapRef = useRef(null);

    useEffect(() => {
        loadCache();

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
            setLoading(false);

            if (userRole === 'COLLECTOR') {
                fetchAvailableJobs(loc.coords);
            } else {
                fetchMyRequests();
            }
        })();
    }, [userRole]);

    const loadCache = async () => {
        try {
            const cached = await AsyncStorage.getItem('cache_jobs');
            if (cached) {
                setJobs(JSON.parse(cached));
                setLoading(false);
            }
        } catch (e) {
            console.log("Cache error:", e);
        }
    };

    const fetchAvailableJobs = async (coords) => {
        if (jobs.length === 0) setLoading(true);

        try {
            const data = await logisticsApi.getPickupRequests({
                lat: coords.latitude,
                lon: coords.longitude,
                status: 'PENDING'
            });
            const items = Array.isArray(data) ? data : (data.results || []);
            setJobs(items);
            await AsyncStorage.setItem('cache_jobs', JSON.stringify(items));
        } catch (error) {
            console.error("Fetch Available Jobs Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyRequests = async () => {
        if (jobs.length === 0) setLoading(true);

        try {
            const data = await logisticsApi.getPickupRequests();
            const items = Array.isArray(data) ? data : (data.results || []);
            setJobs(items);
            await AsyncStorage.setItem('cache_jobs', JSON.stringify(items));
        } catch (error) {
            console.error("Fetch My Requests Error:", error);
        } finally {
            setLoading(false);
        }
    };

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

    const handleCreateRequest = async () => {
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
            await logisticsApi.createPickupRequest({
                ...requestForm,
                latitude: location.latitude,
                longitude: location.longitude
            });
            Toast.show("Pickup request created!", { backgroundColor: '#2E7D32' });
            setShowRequestModal(false);
            fetchMyRequests();
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
            if (userRole === 'COLLECTOR') {
                fetchAvailableJobs(location);
            } else {
                fetchMyRequests();
            }
        } catch (error) {
            Toast.show("Failed to accept job", { backgroundColor: '#E74C3C' });
        }
    };

    const renderJobMarker = (job) => {
        const markers = [];

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
        }

        return markers;
    };

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
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
            >
                {jobs.map(renderJobMarker)}
            </MapView>

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {userRole === 'COLLECTOR' ? 'Available Pickups' : 'Your Pickups'}
                    </Text>
                    {userRole !== 'COLLECTOR' && (
                        <TouchableOpacity
                            style={styles.requestButton}
                            onPress={() => setShowRequestModal(true)}
                        >
                            <Navigation size={18} color="#fff" />
                            <Text style={styles.requestButtonText}>Request Pickup</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {jobs.length > 0 && (
                    <View style={styles.jobListContainer}>
                        <FlatList
                            data={jobs}
                            keyExtractor={item => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={styles.jobCard}>
                                    <View style={styles.jobHeader}>
                                        <Truck size={20} color={item.status === 'PENDING' ? '#2E7D32' : '#F39C12'} />
                                        <Text style={styles.jobType}>{item.material_type}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: item.status === 'PENDING' ? '#E8F5E9' : '#FFF3E0' }]}>
                                            <Text style={[styles.statusText, { color: item.status === 'PENDING' ? '#2E7D32' : '#E67E22' }]}>{item.status}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.jobInfo}>{item.quantity_estimate}</Text>
                                    <Text style={styles.jobLoc} numberOfLines={1}>{item.pickup_address}</Text>

                                    {userRole === 'COLLECTOR' && item.status === 'PENDING' && (
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            onPress={() => handleAcceptJob(item.id)}
                                        >
                                            <Text style={styles.acceptBtnText}>Accept Job</Text>
                                        </TouchableOpacity>
                                    )}

                                    {item.status !== 'PENDING' && item.collector_name && (
                                        <View style={styles.collectorInfo}>
                                            <Info size={14} color="#666" />
                                            <Text style={styles.collectorName}>Collector: {item.collector_name}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
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
            </View>

            {/* Request Pickup Modal */}
            <Modal
                visible={showRequestModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRequestModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Pickup</Text>
                            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                                <ActivityIndicator animating={false} />
                                {/* Placeholder for an X icon if needed, or just text */}
                                <Text style={{ color: '#666', fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.label}>Material Type</Text>
                            <View style={styles.pickerContainer}>
                                {['Plastics', 'Metals', 'Paper', 'Mixed'].map(type => (
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
                                ))}
                            </View>

                            <Text style={styles.label}>Estimated Quantity</Text>
                            <View style={styles.pickerContainer}>
                                {['1-2 Bags', '3-5 Bags', 'Pickup Truck Load', 'Tricycle Load'].map(qty => (
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
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: width, height: height },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
    header: {
        padding: 50, // Higher for safe area + inset
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
    acceptBtn: { backgroundColor: '#2E7D32', padding: 12, borderRadius: 12, alignItems: 'center' },
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
    requestButton: {
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        marginTop: 10,
        alignSelf: 'center'
    },
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
    submitRequestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
