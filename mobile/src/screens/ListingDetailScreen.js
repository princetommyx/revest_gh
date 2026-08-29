import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ScrollView, Dimensions, StatusBar, Alert, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, ShoppingCart, Info, BadgeCheck, Heart, Weight, MapPin, Trash, Pencil, MessageCircle, Package } from 'lucide-react-native';
import * as Location from 'expo-location';
import { marketApi } from '../api/market';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import PageLoader from '../components/PageLoader';
import { formatRelativeTime } from '../utils/dateFormat';
import { haversineDistanceKm } from '../utils/geo';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
    const { listingId } = route.params;
    const { user, userRole } = useAuth();
    const insets = useSafeAreaInsets();
    const [listing, setListing] = useState(null);
    const [similarListings, setSimilarListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myLocation, setMyLocation] = useState(null);

    useEffect(() => {
        fetchListing();
    }, [listingId]);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({});
                setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            } catch (e) {
                // Distance stat just won't render - not worth prompting for permission here.
            }
        })();
    }, []);

    const distanceKm = (myLocation && listing?.latitude && listing?.longitude)
        ? haversineDistanceKm(myLocation.latitude, myLocation.longitude, listing.latitude, listing.longitude)
        : null;

    const fetchListing = async () => {
        try {
            const data = await marketApi.getListing(listingId);
            setListing(data);
            
            try {
                const similarData = await marketApi.getListings({ material_type: data.material_type });
                const similar = similarData.results?.filter(l => l.id !== listingId).slice(0, 5) || [];
                setSimilarListings(similar);
            } catch(e) {}
            
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

    const handleDelete = () => {
        Alert.alert(
            "Delete Waste Listing",
            "Are you sure you want to delete this listing? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await marketApi.deleteListing(listing.id);
                            Toast.show({ type: 'success', text1: 'Listing deleted successfully' });
                            navigation.goBack();
                        } catch (error) {
                            console.error("Delete Listing Error:", error);
                            Toast.show({ type: 'error', text1: 'Failed to delete listing' });
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return <PageLoader label="Loading listing..." />;
    }

    if (!listing) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Waste listing not found</Text>
                <TouchableOpacity style={styles.backButtonFallback} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    {listing.image ? (
                        <Image source={{ uri: resolveImageUrl(listing.image) }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroImage, styles.heroPlaceholder]}>
                            <Info size={48} color="#ccc" />
                        </View>
                    )}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.0)']}
                        style={styles.heroGradient}
                    />
                    
                    <View style={[styles.headerOverlay, { top: Math.max(insets.top, 20) }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBlurBtn}>
                            <ArrowLeft size={20} color="#111" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.detailsContainer}>
                    <View style={styles.badgeRow}>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{listing.material_type || 'Waste'}</Text>
                        </View>
                        <View style={styles.timeBadge}>
                            <Clock size={12} color="#F59E0B" />
                            <Text style={styles.timeBadgeText}>{formatRelativeTime(listing.created_at)}</Text>
                        </View>
                    </View>

                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{listing.is_free ? 'FREE' : `₵${listing.price}`}</Text>
                        <Text style={styles.priceUnit}>/ {listing.quantity || 'unit'}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Stats Row */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <View style={[styles.statIconWrapper, { backgroundColor: '#EEF2FF' }]}>
                                <Weight size={18} color="#4F46E5" />
                            </View>
                            <Text style={styles.statLabel}>Est. Weight</Text>
                            <Text style={styles.statValue}>{listing.quantity || '—'}</Text>
                        </View>

                        {user?.id === listing?.seller?.id ? (
                            <>
                                <View style={styles.statBox}>
                                    <View style={[styles.statIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                                        <Clock size={18} color="#D97706" />
                                    </View>
                                    <Text style={styles.statLabel}>Posted</Text>
                                    <Text style={styles.statValue}>{formatRelativeTime(listing.created_at)}</Text>
                                </View>

                                <View style={styles.statBox}>
                                    <View style={[styles.statIconWrapper, { backgroundColor: '#ECFDF5' }]}>
                                        <Info size={18} color="#059669" />
                                    </View>
                                    <Text style={styles.statLabel}>Likes</Text>
                                    <Text style={styles.statValue}>{listing.total_likes ?? 0}</Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.statBox}>
                                    <View style={[styles.statIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                                        <BadgeCheck size={18} color="#D97706" fill={listing.seller?.is_verified ? '#D97706' : 'transparent'} />
                                    </View>
                                    <Text style={styles.statLabel}>Seller</Text>
                                    <Text style={styles.statValue}>{listing.seller?.is_verified ? 'Verified' : 'Unverified'}</Text>
                                </View>

                                <View style={styles.statBox}>
                                    <View style={[styles.statIconWrapper, { backgroundColor: '#ECFDF5' }]}>
                                        <MapPin size={18} color="#059669" />
                                    </View>
                                    <Text style={styles.statLabel}>Distance</Text>
                                    <Text style={styles.statValue}>{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</Text>
                                </View>
                            </>
                        )}
                    </View>

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>
                        {listing.description || 'No description provided by the seller.'}
                    </Text>

                    {similarListings.length > 0 && (
                        <View style={styles.similarSection}>
                            <View style={styles.similarHeader}>
                                <Text style={styles.similarSectionTitle}>Similar listings</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Marketplace' })}>
                                    <Text style={styles.seeAllText}>See all</Text>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={similarListings}
                                keyExtractor={item => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.similarCard}
                                        onPress={() => navigation.push('ListingDetail', { listingId: item.id })}
                                        activeOpacity={0.9}
                                    >
                                        <View style={styles.imageBox}>
                                            {item.image ? (
                                                <Image
                                                    source={{ uri: resolveImageUrl(item.image) }}
                                                    style={styles.similarImage}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={styles.placeholderImg}>
                                                    <Package size={24} color="#E0E0E0" />
                                                </View>
                                            )}
                                            <TouchableOpacity style={styles.floatingHeart}>
                                                <Heart size={14} color={item.is_liked ? '#EF4444' : '#111'} fill={item.is_liked ? '#EF4444' : 'transparent'} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.similarDetails}>
                                            <Text style={styles.similarTitle} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.similarPrice}>₵ {item.price}</Text>
                                            <View style={styles.similarLocRow}>
                                                <MapPin size={12} color="#059669" />
                                                <Text style={styles.similarLoc} numberOfLines={1}>{item.location}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            />
                        </View>
                    )}

                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {user?.id === listing?.seller?.id ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => navigation.navigate('CreateListing', { editListing: listing })}
                        >
                            <Pencil size={20} color="#374151" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={handleDelete}
                        >
                            <Trash size={20} color="#EF4444" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { flex: 1 }]}
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
                            <Text style={styles.primaryBtnText}>Request Pickup</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => navigation.navigate('ChatDetail', {
                                contactId: listing.seller.id,
                                contactName: [listing.seller.first_name, listing.seller.last_name].filter(Boolean).join(' ') || listing.seller.username,
                                contactImage: listing.seller.profile_picture_url ? resolveImageUrl(listing.seller.profile_picture_url) : null,
                                contactIsOnline: listing.seller.is_online,
                            })}
                        >
                            <MessageCircle size={20} color="#374151" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { flex: 1 }]}
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
                            <Text style={styles.primaryBtnText}>{(userRole === 'COLLECTOR' || userRole === 'RECYCLER') ? 'Accept Job' : 'Request Pickup'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    errorText: { fontSize: 16, color: '#111', marginBottom: 12 },
    backButtonFallback: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 20 },
    backButtonText: { color: '#111', fontWeight: '600' },
    
    scrollContent: { paddingBottom: 140 },
    
    heroSection: { width: width, height: 320, position: 'relative', backgroundColor: '#f5f5f5' },
    heroImage: { width: '100%', height: '100%' },
    heroPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
    
    headerOverlay: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
    roundBlurBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    
    detailsContainer: { paddingHorizontal: 24, paddingTop: 24, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32 },
    
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    typeBadge: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    typeBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
    timeBadgeText: { color: '#D97706', fontSize: 12, fontWeight: '700' },
    
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: '#111', flex: 1, lineHeight: 32 },
    
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
    price: { fontSize: 28, fontWeight: '900', color: '#111' },
    priceUnit: { fontSize: 16, color: '#6B7280', fontWeight: '500', marginLeft: 4 },
    
    divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 24 },
    
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    statBox: { alignItems: 'center', flex: 1 },
    statIconWrapper: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
    statValue: { fontSize: 15, color: '#111', fontWeight: '700' },
    
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 12 },
    descriptionText: { fontSize: 15, color: '#4B5563', lineHeight: 24, letterSpacing: 0.2 },
    
    similarSection: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 24 },
    similarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    similarSectionTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
    seeAllText: { fontSize: 14, color: '#059669', fontWeight: '600' },
    similarCard: { width: 160, marginRight: 16, backgroundColor: '#F9FAFB', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
    imageBox: { width: '100%', height: 110, backgroundColor: '#F3F4F6', position: 'relative' },
    similarImage: { width: '100%', height: '100%' },
    placeholderImg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    floatingHeart: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    similarDetails: { padding: 12 },
    similarTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 4 },
    similarPrice: { fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 6 },
    similarLocRow: { flexDirection: 'row', alignItems: 'center' },
    similarLoc: { fontSize: 11, color: '#6B7280', marginLeft: 4, flex: 1 },
    
    
    bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10 },
    actionRow: { flexDirection: 'row', gap: 12 },
    secondaryBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    deleteBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    primaryBtn: { backgroundColor: '#111', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 56, borderRadius: 16 },
    primaryBtnFull: { backgroundColor: '#111', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 56, borderRadius: 16, width: '100%' },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
