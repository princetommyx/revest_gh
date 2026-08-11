import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ActivityIndicator, ScrollView, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, ShoppingCart, Info, Star, Heart, Weight, Minus, Plus, MessageSquare } from 'lucide-react-native';
import { marketApi } from '../api/market';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../api/client';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
    const { listingId } = route.params;
    const { user, userRole } = useAuth();
    const insets = useSafeAreaInsets();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);

    useEffect(() => {
        fetchListing();
    }, [listingId]);

    const fetchListing = async () => {
        try {
            const data = await marketApi.getListing(listingId);
            setListing(data);
        } catch (error) {
            console.error("Fetch Listing Error:", error);
            Toast.show({ type: 'error', text1: 'Failed to load listing' });
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
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
                    <ArrowLeft size={20} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Waste Details</Text>
                <TouchableOpacity style={styles.roundBtn} onPress={() => navigation.navigate('Main', { screen: 'Pickups' })}>
                    <ShoppingCart size={18} color="#111" />
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
                </View>
                
                <View style={styles.dotsRow}>
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
                        <TouchableOpacity style={styles.heartBtnSmall}>
                            <Heart size={20} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{listing.is_free ? 'FREE' : `₵${listing.price}`} <Text style={styles.priceUnit}>/ {listing.quantity || 'bag'}</Text></Text>
                        
                        <View style={styles.qtySelector}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                                <Minus size={16} color="#111" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{qty}</Text>
                            <TouchableOpacity style={styles.qtyBtnActive} onPress={() => setQty(qty + 1)}>
                                <Plus size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaBox}>
                            <Clock size={14} color="#888" />
                            <Text style={styles.metaText}>12 min</Text>
                        </View>
                        <View style={styles.metaBox}>
                            <Weight size={14} color="#888" />
                            <Text style={styles.metaText}>{listing.quantity || '10kg'}</Text>
                        </View>
                        <View style={styles.metaBox}>
                            <Star size={14} color="#F39C12" fill="#F39C12" />
                            <Text style={styles.metaText}>4.5 Rating</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{listing.description || 'Verified waste ready for pickup. Ensure you have the appropriate vehicle for collection.'}</Text>
                </View>
            </ScrollView>

            <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>

                <TouchableOpacity
                    style={[styles.mainActionBtn, { flex: 1 }]}
                    onPress={() => navigation.navigate('Main', {
                        screen: 'Pickups',
                        params: {
                            pickupData: {
                                material_type: listing.material_type,
                                quantity_estimate: listing.quantity,
                                pickup_address: listing.location,
                                listing_id: listing.id,
                                waste_price: listing.price,
                                track_type: listing.track,
                                seller_location: {
                                    latitude: listing.latitude,
                                    longitude: listing.longitude,
                                    address: listing.location
                                }
                            }
                        },
                        merge: true
                    })}
                >
                    <ShoppingCart size={18} color="#fff" style={{marginRight: 8}} />
                    <Text style={styles.mainActionText}>{(userRole === 'COLLECTOR' || userRole === 'RECYCLER') ? 'Accept Job' : 'Request Pickup'}</Text>
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
    roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    
    scrollContent: { paddingBottom: 120 },
    
    heroCard: { marginHorizontal: 20, marginTop: 10, height: 260, borderRadius: 24, overflow: 'hidden', backgroundColor: '#f5f5f5', marginBottom: 12 },
    heroImage: { width: '100%', height: '100%' },
    
    dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
    dotActive: { width: 16, backgroundColor: '#111' },
    
    detailsContainer: { paddingHorizontal: 20 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#111', flex: 1, marginRight: 10 },
    heartBtnSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    price: { fontSize: 20, fontWeight: 'bold', color: '#111' },
    priceUnit: { fontSize: 14, color: '#888', fontWeight: 'normal' },
    
    qtySelector: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    qtyBtnActive: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    qtyText: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    metaBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 13, color: '#666', fontWeight: '500' },
    
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 12 },
    descriptionText: { fontSize: 15, color: '#666', lineHeight: 24, marginBottom: 24 },
    
    bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 16, borderRadius: 24, flex: 0.4, borderWidth: 1, borderColor: '#eee' },
    chatBtnText: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    mainActionBtn: { flex: 0.6, backgroundColor: '#111', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 24 },
    mainActionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
