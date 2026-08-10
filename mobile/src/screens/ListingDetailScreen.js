import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ActivityIndicator, ScrollView, Linking, Alert, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, User, MessageSquare, Phone, ShieldCheck, AlertTriangle, Truck, Share2, Info, Star, Heart } from 'lucide-react-native';
import { marketApi } from '../api/market';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';


const { width } = Dimensions.get('window');


export default function ListingDetailScreen({ route, navigation }) {
    const { listingId } = route.params;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchListing();
    }, [listingId]);

    const fetchListing = async () => {
        try {
            const data = await marketApi.getListing(listingId);
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
        let cleanPath = path.startsWith('/') ? path : `/${path}`;
        if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
        return `${BASE_URL}${cleanPath}`;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#111" />
            </View>
        );
    }

    if (!listing) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Listing not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
                    <ArrowLeft size={20} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Waste Details</Text>
                <TouchableOpacity style={styles.roundBtn}>
                    <Share2 size={18} color="#111" />
                </TouchableOpacity>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    {listing.image ? (
                        <Image source={{ uri: resolveImageUrl(listing.image) }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                            <Info size={40} color="#ccc" />
                        </View>
                    )}
                    <View style={styles.heroBadgeTop}>
                        <View style={styles.trackBadge}>
                            <Text style={styles.trackBadgeText}>Track {listing.track || 'A'}</Text>
                        </View>
                        <View style={styles.heartBtn}>
                            <Heart size={20} color="#EF4444" fill="#EF4444" />
                        </View>
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
                        <Text style={styles.price}>{listing.is_free ? 'FREE' : `₵${listing.price}`}</Text>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.locationBox}>
                            <MapPin size={14} color="#888" />
                            <Text style={styles.locationText}>{listing.location}</Text>
                        </View>
                        <View style={styles.ratingBox}>
                            <Star size={14} color="#F39C12" fill="#F39C12" />
                            <Text style={styles.ratingText}>4.5</Text>
                            <Text style={styles.ratingSubtext}>(23 Reviews)</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>What you will get</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Info size={20} color="#111" style={{ marginBottom: 4 }} />
                            <Text style={styles.statBoxVal}>{listing.quantity}</Text>
                            <Text style={styles.statBoxLabel}>Quantity</Text>
                        </View>
                        <View style={styles.statBox}>
                            <ShieldCheck size={20} color="#111" style={{ marginBottom: 4 }} />
                            <Text style={styles.statBoxVal}>Verified</Text>
                            <Text style={styles.statBoxLabel}>Seller</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Truck size={20} color="#111" style={{ marginBottom: 4 }} />
                            <Text style={styles.statBoxVal}>Track {listing.track || 'A'}</Text>
                            <Text style={styles.statBoxLabel}>Type</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Info size={20} color="#111" style={{ marginBottom: 4 }} />
                            <Text style={styles.statBoxVal}>{listing.material_type}</Text>
                            <Text style={styles.statBoxLabel}>Material</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{listing.description}</Text>

                    <Text style={styles.sectionTitle}>Seller Info</Text>
                    <View style={styles.sellerCard}>
                        <View style={styles.sellerAvatar}><User size={24} color="#fff" /></View>
                        <View style={styles.sellerInfo}>
                            <Text style={styles.sellerName}>{listing.seller_name}</Text>
                            <Text style={styles.sellerSubtext}>Verified Member</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={styles.mainActionBtn}
                    onPress={() => navigation.navigate('Main', {
                        screen: 'Pickups',
                        params: {
                            pickupData: {
                                material_type: listing.material_type,
                                quantity_estimate: listing.quantity,
                                pickup_address: listing.location,
                                listing_id: listing.id
                            }
                        }
                    })}
                >
                    <Text style={styles.mainActionText}>Request Pickup Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    errorText: { fontSize: 16, color: '#111' },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: '#fff' },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    
    scrollContent: { paddingBottom: 100 },
    
    heroCard: { marginHorizontal: 20, marginTop: 10, height: 260, borderRadius: 24, overflow: 'hidden', position: 'relative' },
    heroImage: { width: '100%', height: '100%' },
    heroBadgeTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
    trackBadge: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    trackBadgeText: { fontSize: 13, fontWeight: 'bold', color: '#111' },
    heartBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
    
    detailsContainer: { paddingHorizontal: 20, paddingTop: 20 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111', flex: 1, marginRight: 10, lineHeight: 30 },
    price: { fontSize: 22, fontWeight: 'bold', color: '#111' },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    locationBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 20 },
    locationText: { fontSize: 14, color: '#666' },
    ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 14, fontWeight: 'bold', color: '#111' },
    ratingSubtext: { fontSize: 13, color: '#888' },
    
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 16, marginTop: 10 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    statBox: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 12, marginHorizontal: 4, borderWidth: 1, borderColor: '#eee' },
    statBoxVal: { fontSize: 13, fontWeight: 'bold', color: '#111', marginBottom: 2 },
    statBoxLabel: { fontSize: 11, color: '#888' },
    
    descriptionText: { fontSize: 15, color: '#666', lineHeight: 24, marginBottom: 24 },
    
    sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
    sellerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    sellerInfo: { flex: 1 },
    sellerName: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 4 },
    sellerSubtext: { fontSize: 13, color: '#888' },
    
    bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
    mainActionBtn: { backgroundColor: '#111', paddingVertical: 16, borderRadius: 30, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    mainActionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

