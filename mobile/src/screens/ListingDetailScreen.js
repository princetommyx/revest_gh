import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ActivityIndicator, ScrollView, Linking, Alert, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, User, MessageSquare, Phone, ShieldCheck, AlertTriangle, Truck, Share2, Info } from 'lucide-react-native';
import { marketApi } from '../api/market';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
    const { listingId } = route.params;
    const { user } = useAuth();
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

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2E7D32" />
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
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header with Image and Curve */}
                <View style={styles.imageHeader}>
                    {listing.image ? (
                        <Image
                            source={{ uri: resolveImageUrl(listing.image) }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Image source={require('../../assets/icon.png')} style={{ width: 80, height: 80, opacity: 0.1 }} />
                        </View>
                    )}

                    {/* Overlay for transparency/contrast */}
                    <View style={styles.imageOverlay} />

                    {/* Floating Back Button */}
                    <SafeAreaView edges={['top']} style={styles.floatingHeader}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
                            <ArrowLeft size={24} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.roundBtn}>
                            <Share2 size={20} color="#333" />
                        </TouchableOpacity>
                    </SafeAreaView>

                    {/* Organic Curve at the bottom of the image */}
                    <View style={styles.imageCurve} />
                </View>

                {/* Overlapping Content Card */}
                <View style={styles.contentCard}>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{listing.is_free ? 'GIVEAWAY' : `₵${listing.price}`}</Text>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{listing.material_type}</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{listing.title}</Text>

                    <View style={styles.locationRow}>
                        <MapPin size={16} color="#2E7D32" />
                        <Text style={styles.locationText}>{listing.location}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.timeText}>{new Date(listing.created_at).toLocaleDateString()}</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Info size={18} color="#2E7D32" />
                            <View>
                                <Text style={styles.statLabel}>Quantity</Text>
                                <Text style={styles.statValue}>{listing.quantity}</Text>
                            </View>
                        </View>
                        <View style={styles.statItem}>
                            <ShieldCheck size={18} color="#2E7D32" />
                            <View>
                                <Text style={styles.statLabel}>Condition</Text>
                                <Text style={styles.statValue}>Recyclable</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{listing.description}</Text>

                    <View style={styles.divider} />

                    {/* Seller Card */}
                    <View style={styles.sellerCard}>
                        <View style={styles.sellerHeader}>
                            <View style={styles.sellerAvatar}>
                                <User size={26} color="#fff" />
                            </View>
                            <View style={styles.sellerInfo}>
                                <View style={styles.sellerNameRow}>
                                    <Text style={styles.sellerName}>{listing.seller_name}</Text>
                                    {listing.seller?.is_verified && <ShieldCheck size={16} color="#2E7D32" style={{ marginLeft: 6 }} />}
                                </View>
                                <Text style={styles.sellerMemberText}>Verified Seller</Text>
                            </View>
                        </View>
                    </View>

                    {/* Safety Notice */}
                    <View style={styles.safetyCard}>
                        <AlertTriangle size={20} color="#EF4444" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.safetyTitle}>Safety First</Text>
                            <Text style={styles.safetyText}>Always meet in public places and inspect items carefully before any payment.</Text>
                        </View>
                    </View>

                    <View style={{ height: 20 }} />
                </View>
            </ScrollView>

            {/* Bottom Sticky Actions */}
            <SafeAreaView edges={['bottom']} style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.mainActionBtn}
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
                                waste_price: listing.price,
                                listing_id: listing.id
                            }
                        }
                    })}
                >
                    <Truck size={22} color="#fff" />
                    <Text style={styles.mainActionText}>Request Pickup</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleContactSeller}>
                    <MessageSquare size={22} color="#2E7D32" />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    imageHeader: {
        width: width,
        height: 350,
        position: 'relative',
        backgroundColor: '#f5f5f5',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    placeholderImage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    roundBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imageCurve: {
        position: 'absolute',
        bottom: 0,
        width: width,
        height: 30,
        backgroundColor: '#fff',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
    },
    contentCard: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 25,
        marginTop: -5,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    price: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    categoryBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    categoryText: {
        color: '#2E7D32',
        fontWeight: 'bold',
        fontSize: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    locationText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 6,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ccc',
        marginHorizontal: 10,
    },
    timeText: {
        fontSize: 14,
        color: '#999',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 25,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FBF9',
        padding: 15,
        borderRadius: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: '#F0F4F0',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    descriptionText: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
    },
    sellerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 20,
    },
    sellerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    sellerAvatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#2E7D32',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sellerInfo: {
        flex: 1,
    },
    sellerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sellerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    sellerMemberText: {
        fontSize: 13,
        color: '#2E7D32',
        fontWeight: '600',
        marginTop: 2,
    },
    safetyCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF5F5',
        padding: 15,
        borderRadius: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: '#FFEAEA',
    },
    safetyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#EF4444',
        marginBottom: 2,
    },
    safetyText: {
        fontSize: 12,
        color: '#777',
        lineHeight: 18,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 30,
        flexDirection: 'row',
        gap: 15,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    mainActionBtn: {
        flex: 1,
        height: 56,
        backgroundColor: '#2E7D32',
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    mainActionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryActionBtn: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#999',
    },
});
