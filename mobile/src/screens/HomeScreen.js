import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator,
    TextInput, ScrollView, RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, MapPin, ArrowRight, Truck,
    Package, ShoppingCart, User
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient, { BASE_URL } from '../api/client';
import * as Location from 'expo-location';
import { usePickups } from '../hooks/usePickups';
import { useListings } from '../hooks/useListings';
import { SkeletonCard } from '../components/Skeleton';

const CATEGORIES = [
    { id: '', name: 'All', icon: 'grid-outline', color: '#455A64', bg: '#fff' },
    { id: 'Plastics', name: 'Plastics', icon: 'cube-outline', color: '#2E7D32', bg: '#fff' },
    { id: 'Metals', name: 'Metals', icon: 'hammer-outline', color: '#5D4037', bg: '#fff' },
    { id: 'Paper', name: 'Paper', icon: 'document-text-outline', color: '#FBC02D', bg: '#fff' },
    { id: 'Glass', name: 'Glass', icon: 'wine-outline', color: '#00796B', bg: '#fff' },
    { id: 'Electronics', name: 'E-Waste', icon: 'phone-portrait-outline', color: '#7B1FA2', bg: '#fff' }
];

export default function HomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { userRole, user } = useAuth();
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [location, setLocation] = useState(null);

    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    // Fetch Location
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permission to access location was denied');
                    return;
                }

                let loc = await Location.getCurrentPositionAsync({});
                setLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            } catch (error) {
                console.log("Error fetching location:", error);
            }
        })();
    }, []);

    // For collectors: Use pickup jobs
    const { data: pickupJobs = [], isLoading: pickupsLoading, refetch: refetchPickups, isRefetching: isRefetchingPickups } = usePickups(location);

    // For sellers/recyclers: Use marketplace listings with server-side search & filtering
    const [locationFilter, setLocationFilter] = useState('');
    const { data: listings = [], isLoading: loading, refetch, isRefetching } = useListings({
        search: debouncedSearch,
        material_type: filter,
        location: locationFilter // Add location filter
    });

    // Server now handles filtering
    const filteredListings = listings;

    // 16 Regions of Ghana
    const AVAILABLE_LOCATIONS = [
        'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
        'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
        'Upper East', 'Upper West', 'Volta', 'Western', 'Western North'
    ];

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

    const renderCategory = (item) => {
        const isActive = filter === item.id;
        return (
            <TouchableOpacity
                key={item.id}
                style={styles.catBtn}
                onPress={() => {
                    if (userRole === 'RECYCLER') {
                        navigation.navigate('Pickups', { category: item.id });
                    } else {
                        setFilter(item.id);
                    }
                }}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.catIconBox,
                    isActive && styles.catIconBoxActive
                ]}>
                    <Ionicons
                        name={item.icon}
                        size={26}
                        color={isActive ? '#2E7D32' : item.color}
                    />
                </View>
                <Text style={[styles.catText, isActive && styles.catTextActive]}>
                    {item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 3600) return 'Just now';
        if (diff < 86400) return 'Today';
        if (diff < 172800) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const [promos, setPromos] = useState([]);
    const [promosLoading, setPromosLoading] = useState(false);

    const fetchPromos = useCallback(async () => {
        if (!userRole) {
            console.log("[HomeScreen] Skipping fetchPromos: userRole is null");
            return;
        }
        console.log(`[HomeScreen] Attempting to fetch promos for role: ${userRole}`);
        setPromosLoading(true);
        try {
            const response = await apiClient.get(`admin/promos/public/?role=${userRole}`);
            const data = response.data;

            // Debug log
            console.log(`[HomeScreen] Promos fetch success! Count:`, Array.isArray(data) ? data.length : (data?.results?.length || 0));

            const items = Array.isArray(data) ? data : (data?.results || []);
            setPromos(items);
        } catch (error) {
            console.error("[HomeScreen] Error fetching promos:", error.response?.data || error.message);
            // We keep the old promos on error so they don't "vanish"
        } finally {
            setPromosLoading(false);
        }
    }, [userRole]);

    useEffect(() => {
        fetchPromos();
    }, [fetchPromos]);

    const handleRefresh = async () => {
        console.log("[HomeScreen] Refreshing both listings and promos...");
        await Promise.all([
            refetch(),
            fetchPromos()
        ]);
    };

    const PromoCarousel = () => {
        // Hide promo cards when searching
        if (search.length > 0) return null;
        if (promosLoading) return <ActivityIndicator size="large" color="#2E7D32" style={{ marginVertical: 20 }} />;
        if (promos.length === 0) return null;

        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promoContainer}
                decelerationRate="fast"
                snapToInterval={315} // card width + margin
            >
                {promos.map((promo) => (
                    <TouchableOpacity
                        key={promo.id}
                        style={styles.promoCard}
                        onPress={() => {
                            if (promo.action_type === 'NAVIGATE') {
                                // Check if screen exists in state to avoid crash
                                const state = navigation.getState();
                                const screenExists = state?.routeNames?.includes(promo.action_value) ||
                                    navigation.getParent()?.getState()?.routeNames?.includes(promo.action_value);

                                if (screenExists) {
                                    navigation.navigate(promo.action_value);
                                } else {
                                    console.warn(`[Promo] Screen "${promo.action_value}" not found in navigator`);
                                }
                            } else if (promo.action_type === 'URL') {
                                // Linking would require import, keeping it simple
                                console.log("Open URL:", promo.action_value);
                            }
                        }}
                        activeOpacity={0.9}
                    >
                        <Image
                            source={{ uri: resolveImageUrl(promo.image) }}
                            style={styles.promoBgImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={500}
                        />
                        <View style={styles.promoOverlay} />
                        <View style={styles.promoContent}>
                            {promo.badge_text ? (
                                <View style={[styles.promoBadge, { backgroundColor: promo.badge_color || '#2E7D32' }]}>
                                    <Text style={styles.promoBadgeText}>{promo.badge_text}</Text>
                                </View>
                            ) : null}
                            <Text style={styles.promoTitle}>{promo.title}</Text>
                            <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderListing = ({ item }) => (
        <TouchableOpacity
            style={styles.listingCard}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            activeOpacity={0.9}
        >
            <View style={styles.imageBox}>
                {item.image ? (
                    <Image
                        source={{ uri: resolveImageUrl(item.image) }}
                        style={styles.image}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                ) : (
                    <Package size={30} color="#ccc" />
                )}
                {item.is_free && (
                    <View style={styles.freeBadge}>
                        <Text style={styles.freeText}>FREE</Text>
                    </View>
                )}
                {item.seller?.is_verified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    </View>
                )}
            </View>
            <View style={styles.listingContent}>
                <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.listingPrice}>
                    {item.is_free ? 'Contact for details' : `₵${item.price}`}
                </Text>
                <View style={styles.metaRow}>
                    <View style={styles.locationBox}>
                        <MapPin size={11} color="#888" />
                        <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // --- COLLECTOR DASHBOARD ---
    const CollectorDashboard = () => (
        <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefetchingPickups} onRefresh={refetchPickups} />
                }
            >
                {/* Green Header Background */}
                <View style={styles.greenHeaderContainer}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.headerTopRow}>
                            <TouchableOpacity
                                style={styles.profileAvatarBtn}
                                onPress={() => navigation.navigate('Profile')}
                            >
                                {user?.profile_photo ? (
                                    <Image
                                        source={{ uri: resolveImageUrl(user.profile_photo) }}
                                        style={styles.avatarImage}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <User size={20} color="#2E7D32" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View style={styles.greetingBox}>
                                <Text style={styles.greetingTextWhite}>
                                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
                                </Text>
                                <Text style={styles.userNameWhite}>
                                    {user?.first_name || user?.username || 'Collector'}
                                </Text>
                            </View>
                            <View style={styles.headerRightActions}>
                                <View style={styles.statusBadgeWhite}>
                                    <View style={styles.activeDot} />
                                    <Text style={styles.statusTextWhite}>Online</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Overlapping Stats Card */}
                <View style={styles.overlappingCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Pickups Today</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>₵0.00</Text>
                            <Text style={styles.statLabel}>Earnings Today</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('Pickups')}
                    >
                        <Text style={styles.actionButtonText}>Go Online Now</Text>
                        <ArrowRight size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Available Pickups Section */}
                <View style={styles.availableSection}>
                    <View style={styles.sectionHeaderRow}>
                        <ShoppingCart size={20} color="#2E7D32" />
                        <Text style={styles.sectionTitle}>Available for Pickup</Text>
                    </View>

                    {pickupJobs.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Truck size={50} color="#ddd" />
                            <Text style={styles.emptyText}>No active pickups right now</Text>
                            <Text style={styles.emptySubtext}>New jobs will appear here when available</Text>
                        </View>
                    ) : (
                        <View style={styles.pickupsGrid}>
                            {pickupJobs.map((job) => (
                                <TouchableOpacity
                                    key={job.id}
                                    style={styles.jobCard}
                                    onPress={() => navigation.navigate('Pickups')}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.jobCardHeader}>
                                        <View style={[styles.jobStatusBadge, { backgroundColor: job.status === 'PENDING' ? '#E8F5E9' : '#FFF3E0' }]}>
                                            <Text style={[styles.jobStatusText, { color: job.status === 'PENDING' ? '#2E7D32' : '#E67E22' }]}>
                                                {job.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.jobTitle} numberOfLines={1}>{job.material_type}</Text>
                                    <Text style={styles.jobQuantity}>{job.quantity_estimate}</Text>
                                    <View style={styles.jobFooter}>
                                        <View style={styles.jobLocation}>
                                            <MapPin size={12} color="#888" />
                                            <Text style={styles.jobLocationText} numberOfLines={1}>
                                                {job.pickup_address || job.city || 'Nearby'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.jobPrice}>₵{job.estimated_price || '0.00'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );

    if (userRole === 'COLLECTOR') {
        return <CollectorDashboard />;
    }

    // --- SELLER DASHBOARD ---
    return (
        <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
            {/* Green Header */}
            <View style={styles.greenHeaderContainer}>
                <SafeAreaView edges={['top', 'left', 'right']}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerInfo}>
                            <TouchableOpacity
                                style={styles.profileAvatarBtn}
                                onPress={() => navigation.navigate('Profile')}
                            >
                                {user?.profile_photo ? (
                                    <Image
                                        source={{ uri: resolveImageUrl(user.profile_photo) }}
                                        style={styles.avatarImage}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <User size={20} color="#2E7D32" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View style={styles.greetingBox}>
                                <Text style={styles.greetingTextWhite}>
                                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
                                </Text>
                                <Text style={styles.userNameWhite}>{user?.first_name || user?.username || (userRole === 'RECYCLER' ? 'Recycler' : 'Seller')}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.notificationBtn}
                            onPress={() => navigation.navigate('Chat', { tab: 'Notifications' })}
                        >
                            <View style={styles.notificationBadge} />
                            <Ionicons name="notifications-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* Overlapping Card: Stats & Action */}
            <View style={styles.overlappingCard}>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>₵{user?.wallet_balance || '0.00'}</Text>
                        <Text style={styles.statLabel}>{userRole === 'RECYCLER' ? 'Wallet Balance' : 'Total Earnings'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0kg</Text>
                        <Text style={styles.statLabel}>CO₂ Saved</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate(userRole === 'RECYCLER' ? 'Pickups' : 'CreateListing')}
                >
                    {userRole === 'RECYCLER' ? (
                        <Truck size={20} color="#fff" style={{ marginRight: 8 }} />
                    ) : (
                        <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
                    )}
                    <Text style={styles.actionButtonText}>
                        {userRole === 'RECYCLER' ? 'Request for Pickup' : 'Sell Waste Now'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Main Content: Search & Listings */}
            <View style={{ flex: 1 }}>
                <View style={styles.floatingSearchContainer}>
                    <View style={styles.floatingSearchBar}>
                        <Search size={20} color="#888" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search waste materials..."
                            value={search}
                            onChangeText={(text) => {
                                if (userRole === 'RECYCLER') {
                                    navigation.navigate('Pickups', { searchQuery: text });
                                } else {
                                    setSearch(text);
                                }
                            }}
                            onFocus={() => {
                                if (userRole === 'RECYCLER') {
                                    navigation.navigate('Pickups');
                                }
                            }}
                            placeholderTextColor="#999"
                        />
                    </View>
                </View>

                {/* Location Filter Chips */}
                {/* Location Filter Chips - Only show when searching or filtering */}
                {(search.length > 0 || filter !== '') && (
                    <View style={styles.locationFilterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                            <TouchableOpacity
                                style={[styles.locChip, locationFilter === '' && styles.locChipActive]}
                                onPress={() => setLocationFilter('')}
                            >
                                <Text style={[styles.locChipText, locationFilter === '' && styles.locChipTextActive]}>All Regions</Text>
                            </TouchableOpacity>
                            {AVAILABLE_LOCATIONS.map(loc => (
                                <TouchableOpacity
                                    key={loc}
                                    style={[styles.locChip, locationFilter === loc && styles.locChipActive]}
                                    onPress={() => setLocationFilter(loc)}
                                >
                                    <Text style={[styles.locChipText, locationFilter === loc && styles.locChipTextActive]}>{loc}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {loading ? (
                    <FlatList
                        data={Array(6).fill({})}
                        renderItem={() => <SkeletonCard />}
                        keyExtractor={(_, index) => `skeleton-${index}`}
                        numColumns={2}
                        contentContainerStyle={styles.list}
                        columnWrapperStyle={styles.columnWrapper}
                        ListHeaderComponent={<View style={{ height: insets.top + (search.length > 0 || filter !== '' ? 120 : 60) }} />}
                    />
                ) : (
                    <FlatList
                        data={userRole === 'RECYCLER' ? [] : filteredListings}
                        renderItem={renderListing}
                        keyExtractor={item => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={styles.list}
                        columnWrapperStyle={styles.columnWrapper}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        initialNumToRender={6}
                        windowSize={5}
                        updateCellsBatchingPeriod={50}
                        ListHeaderComponent={() => (
                            <View>
                                {userRole !== 'RECYCLER' && (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.catRow}
                                        contentContainerStyle={styles.catContent}
                                    >
                                        {CATEGORIES.map(renderCategory)}
                                    </ScrollView>
                                )}

                                <PromoCarousel />

                                {userRole === 'RECYCLER' && (
                                    <>
                                        <View style={[styles.listHeader, { marginTop: 0 }]}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={styles.listHeaderTitle}>Category</Text>
                                                <TouchableOpacity onPress={() => navigation.navigate('Pickups')}>
                                                    <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>See All</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.catRow}
                                            contentContainerStyle={styles.catContent}
                                        >
                                            {CATEGORIES.map(renderCategory)}
                                        </ScrollView>

                                        <View style={styles.listHeader}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={styles.listHeaderTitle}>Flash Sale</Text>
                                                    <Text style={{ marginLeft: 10, color: '#888', fontSize: 12 }}>Closing in: <Text style={{ color: '#F39C12' }}>02:12:56</Text></Text>
                                                </View>
                                                <TouchableOpacity onPress={() => navigation.navigate('Pickups')}>
                                                    <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>See All</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={{ paddingLeft: 20 }}
                                            contentContainerStyle={{ paddingRight: 20, paddingBottom: 20 }}
                                        >
                                            {listings.slice(0, 5).map((item) => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[styles.listingCard, { width: 160, marginRight: 15, marginBottom: 0 }]}
                                                    onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                                                >
                                                    <View style={[styles.imageBox, { height: 120 }]}>
                                                        {item.image ? (
                                                            <Image
                                                                source={{ uri: resolveImageUrl(item.image) }}
                                                                style={styles.image}
                                                                contentFit="cover"
                                                                cachePolicy="memory-disk"
                                                            />
                                                        ) : (
                                                            <Package size={24} color="#ccc" />
                                                        )}
                                                        <View style={[styles.freeBadge, { backgroundColor: '#F39C12', paddingHorizontal: 6, paddingVertical: 2 }]}>
                                                            <Text style={[styles.freeText, { fontSize: 9 }]}>{Math.floor(Math.random() * 50) + 10}% OFF</Text>
                                                        </View>
                                                    </View>
                                                    <View style={[styles.listingContent, { padding: 8 }]}>
                                                        <Text style={[styles.listingTitle, { fontSize: 13 }]} numberOfLines={1}>{item.title}</Text>
                                                        <Text style={[styles.listingPrice, { fontSize: 14, color: '#2E7D32' }]}>₵{item.price}</Text>
                                                        <View style={[styles.locationBox, { marginTop: 4 }]}>
                                                            <MapPin size={10} color="#888" />
                                                            <Text style={[styles.locationText, { fontSize: 10 }]} numberOfLines={1}>{item.location}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </>
                                )}
                            </View>
                        )}
                        ListEmptyComponent={
                            userRole === 'RECYCLER' ? null : (
                                <View style={styles.emptyBox}>
                                    <ShoppingCart size={50} color="#eee" />
                                    <Text style={styles.emptyText}>No listings found</Text>
                                    <TouchableOpacity style={styles.postBtnEmpty} onPress={() => navigation.navigate('CreateListing')}>
                                        <Text style={styles.postBtnText}>Post Your First Ad</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        }
                        onRefresh={handleRefresh}
                        refreshing={isRefetching}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Header & Overlapping Card Styles
    greenHeaderContainer: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 20,
        paddingBottom: 80, // Space for overlap
        paddingTop: 10,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 0,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileAvatarBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
    },
    greetingBox: {
        flexDirection: 'column',
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingTextWhite: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    userNameWhite: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusBadgeWhite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusTextWhite: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    notificationBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 8,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        zIndex: 1,
        borderWidth: 1.5,
        borderColor: '#2E7D32',
    },
    overlappingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -60, // Negative margin to overlap
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 20, // push content down
        zIndex: 10,
    },

    // Standard Styles
    statsRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#f0f0f0',
        height: '100%',
        marginHorizontal: 10,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A', // Dark text on white card
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
    },

    // Action Button
    actionButton: {
        backgroundColor: '#F39C12', // Orange for contrast/action
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#F39C12',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50', // Bright green dot
        borderWidth: 1.5,
        borderColor: '#fff'
    },

    // Search Bar
    floatingSearchContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    floatingSearchBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#333',
    },

    // Location Filter
    locationFilterContainer: {
        marginBottom: 10,
    },
    locChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    locChipActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32',
    },
    locChipText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    locChipTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },

    // Promo Cards
    promoContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    promoCard: {
        width: 300,
        height: 160,
        borderRadius: 24,
        marginRight: 15,
        overflow: 'hidden',
        position: 'relative',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        backgroundColor: '#eee', // placeholder
    },
    promoBgImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    promoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)', // Darken image for text readability
    },
    promoContent: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 20,
        zIndex: 2,
    },
    promoBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    promoBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    promoTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    promoSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.95)',
        lineHeight: 18,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    // Category Pills
    catRow: {
        paddingBottom: 15,
        paddingLeft: 20,
    },
    catContent: { paddingRight: 20 },
    catBtn: {
        alignItems: 'center',
        marginRight: 16,
        width: 70,
    },
    catIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    catIconBoxActive: {
        borderColor: '#2E7D32',
        backgroundColor: '#E8F5E9',
        borderWidth: 2,
    },
    catText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    catTextActive: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },

    // List Headers
    listHeader: {
        paddingHorizontal: 20,
        marginBottom: 16,
        marginTop: 5,
    },
    listHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    listHeaderSubtitle: {
        fontSize: 13,
        color: '#888',
    },

    // Listings
    list: { paddingHorizontal: 12, paddingBottom: 20 },
    columnWrapper: { justifyContent: 'space-between' },

    listingCard: {
        width: '48.5%',
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        overflow: 'hidden',
    },
    imageBox: {
        height: 150,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: { width: '100%', height: '100%' },
    freeBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#E74C3C',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    freeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: '#2E7D32',
        borderRadius: 12,
        padding: 4,
    },

    listingContent: { padding: 12 },
    listingTitle: {
        fontSize: 14,
        color: '#1A1A1A',
        marginBottom: 6,
        fontWeight: '600',
        lineHeight: 18,
        height: 36,
    },
    listingPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    locationText: {
        fontSize: 11,
        color: '#888',
        flex: 1,
    },
    timeText: {
        fontSize: 10,
        color: '#BBB',
        fontWeight: '500',
    },

    // Empty State
    emptyBox: {
        flex: 1,
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    postBtnEmpty: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
    },
    postBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },

    // Collector Specific
    availableSection: {
        paddingHorizontal: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    pickupsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    emptySubtext: {
        fontSize: 13,
        color: '#bbb',
        marginTop: 8,
        textAlign: 'center',
    },
    jobCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#f9f9f9',
    },
    jobCardHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    jobStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    jobStatusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    jobTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    jobQuantity: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
    },
    jobFooter: {
        marginBottom: 8,
    },
    jobLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    jobLocationText: {
        fontSize: 11,
        color: '#888',
        flex: 1,
    },
    jobPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
    },

    // Recycler Info Card
    recyclerInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        marginTop: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginTop: 16,
        marginBottom: 8,
    },
    infoSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    browseBtn: {
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
    },
    browseBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    promoBtnInline: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    promoBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    promoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    promoCardGrid: {
        width: '48%',
        height: 160,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    promoContentSmall: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 12,
        zIndex: 2,
    },
    promoBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    promoBadgeTextSmall: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    promoTitleSmall: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
