import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ScrollView, Dimensions, StatusBar, Alert, FlatList,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    ArrowLeft, Clock, ShoppingCart, Info, BadgeCheck, Heart, 
    Weight, MapPin, Trash, Pencil, MessageCircle, Package, 
    ShieldAlert, Monitor, ChevronDown, ChevronUp, Briefcase, Flag
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { marketApi } from '../api/market';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import PageLoader from '../components/PageLoader';
import ReportSheet from '../components/ReportSheet';
import { formatRelativeTime } from '../utils/dateFormat';
import { haversineDistanceKm } from '../utils/geo';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const { listingId } = route.params;
    const { user, userRole } = useAuth();
    const insets = useSafeAreaInsets();
    const [listing, setListing] = useState(null);
    const [similarListings, setSimilarListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myLocation, setMyLocation] = useState(null);
    const [showFullDesc, setShowFullDesc] = useState(false);
    // Must sit with the other hooks, above the early returns below - placing it
    // after them makes the hook order change once loading finishes.
    const [reportVisible, setReportVisible] = useState(false);

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
                // Distance stat just won't render
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

    const handleAcceptJob = () => {
        navigation.navigate('Main', {
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
        });
    };

    if (loading) return <PageLoader label="Loading listing..." />;

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

    const isOwner = user?.id === listing?.seller?.id;
    const formattedDate = new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            
            {/* Header Overlay */}
            <View style={[styles.headerToolbar, { paddingTop: Math.max(insets.top, 20) }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{listing.title}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Hero Image Section */}
                <View style={styles.heroSection}>
                    {listing.image ? (
                        <Image source={{ uri: resolveImageUrl(listing.image) }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroImage, styles.heroPlaceholder]}>
                            <Package size={48} color={colors.textMuted} />
                        </View>
                    )}
                </View>

                {/* Main Content Sheet */}
                <View style={styles.detailsContainer}>
                    {/* Badges Row */}
                    <View style={styles.badgeRow}>
                        <View style={styles.catBadge}>
                            <Monitor size={14} color={colors.accent} />
                            <Text style={styles.catBadgeText}>{listing.material_type || 'Waste'}</Text>
                        </View>
                        <View style={styles.dateBadge}>
                            <Clock size={14} color={colors.textSecondary} />
                            <Text style={styles.dateBadgeText}>{formattedDate}</Text>
                        </View>
                    </View>

                    <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
                    <Text style={styles.price}>{listing.is_free ? 'FREE' : `₵${listing.price}`}</Text>

                    {/* Stats Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statColumn}>
                            <View style={[styles.statIconWrap, { backgroundColor: colors.accentSoft }]}>
                                <Weight size={18} color={colors.accent} />
                            </View>
                            <Text style={styles.statValue}>{listing.quantity || '—'}</Text>
                            <Text style={styles.statLabel}>Weight</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statColumn}>
                            <View style={[styles.statIconWrap, { backgroundColor: colors.warningSoft }]}>
                                {listing.seller?.is_verified ? (
                                    <BadgeCheck size={18} color={colors.warning} />
                                ) : (
                                    <ShieldAlert size={18} color={colors.warning} />
                                )}
                            </View>
                            <Text style={styles.statValue}>{listing.seller?.is_verified ? 'Verified' : 'Unverified'}</Text>
                            <Text style={styles.statLabel}>Seller</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statColumn}>
                            <View style={[styles.statIconWrap, { backgroundColor: colors.accentSoft }]}>
                                <MapPin size={18} color={colors.accent} />
                            </View>
                            <Text style={styles.statValue}>{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</Text>
                            <Text style={styles.statLabel}>Distance</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText} numberOfLines={showFullDesc ? undefined : 3}>
                        {listing.description || 'No description provided.'}
                    </Text>
                    {listing.description?.length > 100 && (
                        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowFullDesc(!showFullDesc)}>
                            <Text style={styles.showMoreText}>Show {showFullDesc ? 'less' : 'more'}</Text>
                            {showFullDesc ? <ChevronUp size={16} color={colors.accent} /> : <ChevronDown size={16} color={colors.accent} />}
                        </TouchableOpacity>
                    )}

                    {/* Seller Profile Card (Only for collectors/buyers) */}
                    {!isOwner && listing.seller && (
                        <View style={styles.sellerCard}>
                            <View style={styles.sellerAvatar}>
                                <Text style={styles.sellerAvatarText}>
                                    {listing.seller.first_name ? listing.seller.first_name[0].toUpperCase() : 'S'}
                                </Text>
                            </View>
                            <View style={styles.sellerInfo}>
                                <Text style={styles.sellerName}>
                                    {[listing.seller.first_name, listing.seller.last_name].filter(Boolean).join(' ') || listing.seller.username}
                                </Text>
                                <View style={styles.sellerStatusRow}>
                                    <View style={[styles.statusDot, { backgroundColor: listing.seller.is_verified ? colors.success : colors.warning }]} />
                                    <Text style={[styles.sellerStatusText, { color: listing.seller.is_verified ? colors.success : colors.warning }]}>
                                        {listing.seller.is_verified ? 'Verified seller' : 'Unverified seller'}
                                    </Text>
                                </View>
                                <Text style={styles.sellerMetaText}>Active {listing.seller.is_online ? 'now' : 'recently'}</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.messageBtn}
                                onPress={() => navigation.navigate('ChatDetail', {
                                    contactId: listing.seller.id,
                                    contactName: [listing.seller.first_name, listing.seller.last_name].filter(Boolean).join(' ') || listing.seller.username,
                                    contactImage: listing.seller.profile_picture_url ? resolveImageUrl(listing.seller.profile_picture_url) : null,
                                    contactIsOnline: listing.seller.is_online,
                                })}
                            >
                                <MessageCircle size={16} color={colors.text} style={{ marginRight: 6 }} />
                                <Text style={styles.messageBtnText}>Message</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Reporting has to sit on the content itself, so this
                        stays with the listing rather than hiding in a menu. */}
                    {!isOwner && listing.seller && (
                        <TouchableOpacity style={styles.reportLink} onPress={() => setReportVisible(true)}>
                            <Flag size={14} color={colors.textMuted} />
                            <Text style={styles.reportLinkText}>Report this listing</Text>
                        </TouchableOpacity>
                    )}

                    {/* Similar Waste */}
                    {similarListings.length > 0 && (
                        <View style={styles.similarSection}>
                            <View style={styles.similarHeader}>
                                <Text style={styles.similarSectionTitle}>Similar Waste</Text>
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
                                                <Image source={{ uri: resolveImageUrl(item.image) }} style={styles.similarImage} resizeMode="cover" />
                                            ) : (
                                                <View style={styles.placeholderImg}>
                                                    <Package size={24} color={colors.border} />
                                                </View>
                                            )}
                                            <TouchableOpacity style={styles.floatingHeart}>
                                                <Heart size={14} color={item.is_liked ? colors.danger : colors.text} fill={item.is_liked ? colors.danger : 'transparent'} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.similarDetails}>
                                            <Text style={styles.similarTitle} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.similarPrice}>₵ {item.price}</Text>
                                            <View style={styles.similarLocRow}>
                                                <MapPin size={12} color={colors.accent} />
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

            {/* Bottom Fixed Actions */}
            <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {isOwner ? (
                    <View style={styles.disposerActionRow}>
                        <TouchableOpacity style={[styles.outlineActionBtn, { borderColor: colors.border }]} onPress={() => navigation.navigate('CreateListing', { editListing: listing })}>
                            <Pencil size={18} color={colors.text} style={{ marginRight: 6 }} />
                            <Text style={[styles.outlineActionBtnText, { color: colors.text }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.outlineActionBtn, { borderColor: colors.danger }]} onPress={handleDelete}>
                            <Trash size={18} color={colors.danger} style={{ marginRight: 6 }} />
                            <Text style={[styles.outlineActionBtnText, { color: colors.danger }]}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.solidPrimaryBtn} onPress={handleAcceptJob}>
                            <Briefcase size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                            <Text style={styles.solidPrimaryBtnText}>Request Pickup</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.collectorActionCol}>
                        <View style={styles.actionTopRow}>
                            <TouchableOpacity style={styles.outlineActionBtn}>
                                <Pencil size={18} color={colors.accent} style={{ marginRight: 6 }} />
                                <Text style={styles.outlineActionBtnText}>Make an offer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.outlineActionBtn, { borderColor: colors.border }]}>
                                <Info size={18} color={colors.text} style={{ marginRight: 6 }} />
                                <Text style={[styles.outlineActionBtnText, { color: colors.text }]}>Ask a question</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.actionBottomRow}>
                            <TouchableOpacity 
                                style={styles.squareIconBtn}
                                onPress={() => navigation.navigate('ChatDetail', {
                                    contactId: listing.seller.id,
                                    contactName: [listing.seller.first_name, listing.seller.last_name].filter(Boolean).join(' ') || listing.seller.username,
                                    contactImage: listing.seller.profile_picture_url ? resolveImageUrl(listing.seller.profile_picture_url) : null,
                                    contactIsOnline: listing.seller.is_online,
                                })}
                            >
                                <MessageCircle size={24} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.solidPrimaryBtn, { flex: 1 }]} onPress={handleAcceptJob}>
                                <Briefcase size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                                <Text style={styles.solidPrimaryBtnText}>Accept Job</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <ReportSheet
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                targetType="LISTING"
                targetId={listing?.id}
                targetLabel="this listing"
            />
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    reportLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        marginTop: 4,
    },
    reportLinkText: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
    container: { flex: 1, backgroundColor: c.surface },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface },
    errorText: { fontSize: 16, color: c.text, marginBottom: 12 },
    backButtonFallback: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.surfaceSunken, borderRadius: 20 },
    backButtonText: { color: c.text, fontWeight: '600' },
    
    headerToolbar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.surface },
    headerTitle: { fontSize: 18, fontWeight: '800', color: c.text, flex: 1, marginLeft: 16 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    iconButton: { padding: 8 },

    scrollContent: { paddingTop: 90, paddingBottom: 220 }, // Ensure it clears header and bottom actions
    
    heroSection: { width: width, height: 280, position: 'relative' },
    heroImage: { width: '100%', height: '100%' },
    heroPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
    
    detailsContainer: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 24, paddingHorizontal: 20 },
    
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    catBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
    catBadgeText: { color: c.accent, fontSize: 13, fontWeight: '700' },
    dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: c.border, gap: 6 },
    dateBadgeText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    
    title: { fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4, lineHeight: 34 },
    price: { fontSize: 32, fontWeight: '900', color: c.text, marginBottom: 24 },
    
    statsCard: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.borderSubtle, paddingVertical: 16, marginBottom: 32, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
    statColumn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statDivider: { width: 1, backgroundColor: c.surfaceSunken },
    statIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statValue: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 2, textAlign: 'center' },
    statLabel: { fontSize: 12, color: c.textSecondary, fontWeight: '500', textAlign: 'center' },
    
    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 12 },
    descriptionText: { fontSize: 15, color: c.textSecondary, lineHeight: 24 },
    showMoreBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
    showMoreText: { fontSize: 14, color: c.accent, fontWeight: '700' },
    
    sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.borderSubtle, padding: 16, marginTop: 24, shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    sellerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.accentSoft, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    sellerAvatarText: { fontSize: 20, fontWeight: '800', color: c.accent },
    sellerInfo: { flex: 1 },
    sellerName: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 2 },
    sellerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    sellerStatusText: { fontSize: 12, fontWeight: '600' },
    sellerMetaText: { fontSize: 12, color: c.textMuted, fontWeight: '500' },
    messageBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    messageBtnText: { fontSize: 13, fontWeight: '700', color: c.text },

    similarSection: { marginTop: 32, borderTopWidth: 1, borderTopColor: c.borderSubtle, paddingTop: 24 },
    similarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    similarSectionTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    seeAllText: { fontSize: 14, color: c.accent, fontWeight: '700' },
    similarCard: { width: 160, marginRight: 16, backgroundColor: c.surfaceAlt, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.borderSubtle },
    imageBox: { width: '100%', height: 110, backgroundColor: c.surfaceSunken, position: 'relative' },
    similarImage: { width: '100%', height: '100%' },
    placeholderImg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    floatingHeart: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    similarDetails: { padding: 12 },
    similarTitle: { fontSize: 13, fontWeight: '800', color: c.text, marginBottom: 4 },
    similarPrice: { fontSize: 14, fontWeight: '900', color: c.text, marginBottom: 6 },
    similarLocRow: { flexDirection: 'row', alignItems: 'center' },
    similarLoc: { fontSize: 11, color: c.textSecondary, marginLeft: 4, flex: 1, fontWeight: '500' },
    
    bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.borderSubtle, shadowColor: c.shadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 16, elevation: 15 },
    
    disposerActionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    
    collectorActionCol: { flexDirection: 'column', gap: 12 },
    actionTopRow: { flexDirection: 'row', gap: 12 },
    actionBottomRow: { flexDirection: 'row', gap: 12 },
    
    outlineActionBtn: { flex: 0.8, flexDirection: 'row', height: 52, borderRadius: 12, borderWidth: 1, borderColor: c.accent, justifyContent: 'center', alignItems: 'center' },
    outlineActionBtnText: { color: c.accent, fontSize: 13, fontWeight: '700' },
    
    squareIconBtn: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
    
    solidPrimaryBtn: { flex: 1.6, backgroundColor: c.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 52, borderRadius: 12 },
    solidPrimaryBtnText: { color: c.onPrimary, fontSize: 14, fontWeight: '800' }
}));
