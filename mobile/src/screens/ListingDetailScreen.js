import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ActivityIndicator, ScrollView, Linking, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, User, MessageSquare, Phone, ShieldCheck, AlertTriangle, Truck } from 'lucide-react-native';
import { marketApi } from '../api/market';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';

export default function ListingDetailScreen({ route, navigation }) {
    const { listingId } = route.params;
    const { user } = useAuth();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [revealPhone, setRevealPhone] = useState(false);

    useEffect(() => {
        fetchListing();
    }, [listingId]);

    const fetchListing = async () => {
        console.log("Fetching listing with ID:", listingId);
        try {
            const data = await marketApi.getListing(listingId);
            console.log("Listing data received:", data ? "Found" : "Null");
            setListing(data);
        } catch (error) {
            console.error("Fetch Listing Error:", error);
            Toast.show("Failed to load listing", { backgroundColor: '#E74C3C' });
        } finally {
            setLoading(false);
        }
    };

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        // Ensure path starts with /
        let cleanPath = path.startsWith('/') ? path : `/${path}`;

        // Add /media prefix if missing
        if (!cleanPath.startsWith('/media/')) {
            cleanPath = `/media${cleanPath}`;
        }

        return `${BASE_URL}${cleanPath}`;
    };

    const handleContactSeller = () => {
        navigation.navigate('ChatDetail', {
            contactId: listing.seller.id,
            contactName: listing.seller_name
        });
    };

    const handleCallSeller = () => {
        if (!listing.seller_phone) {
            Alert.alert("No Phone Number", "This seller hasn't provided a phone number.");
            return;
        }

        if (!revealPhone) {
            setRevealPhone(true);
            return;
        }

        Linking.openURL(`tel:${listing.seller_phone}`);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                </View>
            </SafeAreaView>
        );
    }

    if (!listing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>Listing not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Image */}
                <View style={styles.imageContainer}>
                    {listing.image ? (
                        <Image
                            source={{ uri: resolveImageUrl(listing.image) }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Image source={require('../../assets/icon.png')} style={{ width: 60, height: 60, opacity: 0.2 }} />
                        </View>
                    )}
                    <View style={styles.imgCountBadge}>
                        <Text style={styles.imgCountText}>1/1</Text>
                    </View>
                </View>

                {/* Main Details */}
                <View style={styles.detailsContainer}>
                    <Text style={styles.title}>{listing.title}</Text>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>
                            {listing.is_free ? 'FREE' : `₵${listing.price}`}
                        </Text>
                    </View>

                    {/* Meta Data */}
                    <View style={styles.metaBox}>
                        <View style={styles.metaItem}>
                            <MapPin size={16} color="#666" />
                            <Text style={styles.metaText}>{listing.location}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Posted:</Text>
                            <Text style={styles.metaText}>{new Date(listing.created_at).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Specs */}
                    <View style={styles.specsGrid}>
                        <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Material</Text>
                            <Text style={styles.specValue}>{listing.material_type}</Text>
                        </View>
                        <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Quantity</Text>
                            <Text style={styles.specValue}>{listing.quantity}</Text>
                        </View>
                        <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Condition</Text>
                            <Text style={styles.specValue}>Recyclable</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Description */}
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{listing.description}</Text>

                    <View style={styles.divider} />

                    {/* Seller Profile */}
                    <View style={styles.sellerSection}>
                        <View style={styles.sellerHeader}>
                            <View style={styles.sellerAvatar}>
                                <User size={24} color="#fff" />
                            </View>
                            <View style={styles.sellerInfo}>
                                <View style={styles.sellerNameRow}>
                                    <Text style={styles.sellerName}>{listing.seller_name}</Text>
                                    {listing.seller?.is_verified && (
                                        <ShieldCheck size={16} color="#2E7D32" style={{ marginLeft: 5 }} />
                                    )}
                                </View>
                                <Text style={styles.sellerRole}>Member since {new Date(listing.seller?.date_joined || Date.now()).getFullYear()}</Text>
                            </View>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.callBtn]}
                                onPress={() => navigation.navigate('Main', {
                                    screen: 'Pickups',
                                    params: {
                                        pickupData: {
                                            material_type: listing.material_type,
                                            quantity_estimate: listing.quantity,
                                            seller_location: {
                                                latitude: listing.latitude,
                                                longitude: listing.longitude,
                                                address: listing.location
                                            },
                                            waste_price: listing.price, // Pass the price as waste value
                                            listing_id: listing.id
                                        }
                                    }
                                })}
                            >
                                <Truck size={20} color="#fff" />
                                <Text style={styles.actionBtnText}>Request Pickup</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, styles.chatBtn]}
                                onPress={handleContactSeller}
                            >
                                <MessageSquare size={20} color="#2E7D32" />
                                <Text style={[styles.actionBtnText, styles.chatBtnText]}>Chat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Safety Tips */}
                    <View style={styles.safetyBox}>
                        <View style={styles.safetyHeader}>
                            <AlertTriangle size={18} color="#F57C00" />
                            <Text style={styles.safetyTitle}>Safety Tips</Text>
                        </View>
                        <View style={styles.safetyList}>
                            <Text style={styles.safetyItem}>• Do not pay in advance even for delivery.</Text>
                            <Text style={styles.safetyItem}>• Try to meet at a safe, public location.</Text>
                            <Text style={styles.safetyItem}>• Inspect the item before paying.</Text>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    headerTitle: { fontSize: 16, fontWeight: 'bold' },
    backButton: { padding: 5 },

    scrollContent: { paddingBottom: 40 },

    imageContainer: { width: '100%', height: 300, backgroundColor: '#eee' },
    image: { width: '100%', height: '100%' },
    placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imgCountBadge: {
        position: 'absolute', bottom: 15, right: 15,
        backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12
    },
    imgCountText: { color: '#fff', fontSize: 12 },

    detailsContainer: { padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },

    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    price: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
    negotiable: { fontSize: 12, color: '#2E7D32', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },

    metaBox: { flexDirection: 'row', gap: 20, marginBottom: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaLabel: { color: '#888', fontSize: 12 },
    metaText: { color: '#555', fontSize: 13 },

    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },

    specsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    specItem: { flex: 1 },
    specLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    specValue: { fontSize: 14, fontWeight: '600', color: '#333' },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    descriptionText: { fontSize: 15, color: '#555', lineHeight: 22 },

    sellerSection: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
    sellerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
    sellerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
    sellerInfo: { flex: 1 },
    sellerNameRow: { flexDirection: 'row', alignItems: 'center' },
    sellerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    sellerRole: { fontSize: 12, color: '#888' },

    actionButtons: { flexDirection: 'row', gap: 12 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 8, gap: 8
    },
    callBtn: { backgroundColor: '#2E7D32' },
    chatBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2E7D32' },
    actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    chatBtnText: { color: '#2E7D32' },

    safetyBox: {
        marginTop: 25, padding: 15, borderRadius: 8,
        backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFE0B2'
    },
    safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    safetyTitle: { fontSize: 14, fontWeight: 'bold', color: '#F57C00' },
    safetyList: { gap: 5 },
    safetyItem: { fontSize: 12, color: '#666' },

    errorText: { fontSize: 16, color: '#999' }
});
