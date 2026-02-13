import React, { useState, useEffect } from 'react';
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
    Package, ShoppingCart
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../api/client';
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

    // For collectors: Use pickup jobs instead of marketplace listings
    const { data: pickupJobs = [], isLoading: pickupsLoading, refetch: refetchPickups, isRefetching: isRefetchingPickups } = usePickups(location);

    // For sellers/recyclers: Use marketplace listings
    const { data: listings = [], isLoading: loading, refetch, isRefetching } = useListings();

    // Get location for collectors
    useEffect(() => {
        if (userRole === 'COLLECTOR') {
            (async () => {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
            })();
        }
    }, [userRole]);

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const filteredListings = listings.filter(l =>
        (!filter || l.material_type === filter) &&
        (!search || l.title.toLowerCase().includes(search.toLowerCase()))
    );

    const renderCategory = (item) => {
        const isActive = filter === item.id;
        return (
            <TouchableOpacity
                key={item.id}
                style={styles.catBtn}
                onPress={() => setFilter(item.id)}
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
                        <View style={styles.headerContent}>
                            <View>
                                <Text style={styles.greetingTextWhite}>
                                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
                                </Text>
                                <Text style={styles.userNameWhite}>
                                    {user?.first_name || user?.username || 'Collector'}
                                </Text>
                            </View>
                            <View style={styles.statusBadgeWhite}>
                                <View style={styles.activeDot} />
                                <Text style={styles.statusTextWhite}>Online</Text>
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
                        <View>
                            <Text style={styles.greetingTextWhite}>
                                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
                            </Text>
                            <Text style={styles.userNameWhite}>{user?.username || 'Seller'}</Text>
                        </View>
                        {/* Notification Icon could go here */}
                    </View>
                </SafeAreaView>
            </View>

            {/* Overlapping Card: Stats & Action */}
            <View style={styles.overlappingCard}>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>₵0.00</Text>
                        <Text style={styles.statLabel}>Total Earnings</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0kg</Text>
                        <Text style={styles.statLabel}>CO₂ Saved</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('CreateListing')}
                >
                    <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>Sell Waste Now</Text>
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
                            onChangeText={setSearch}
                            placeholderTextColor="#999"
                        />
                    </View>
                </View>

                {loading ? (
                    <FlatList
                        data={Array(6).fill({})}
                        renderItem={() => <SkeletonCard />}
                        keyExtractor={(_, index) => `skeleton-${index}`}
                        numColumns={2}
                        contentContainerStyle={styles.list}
                        columnWrapperStyle={styles.columnWrapper}
                    />
                ) : (
                    <FlatList
                        data={filteredListings}
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
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.catRow}
                                    contentContainerStyle={styles.catContent}
                                >
                                    {CATEGORIES.map(renderCategory)}
                                </ScrollView>

                                <View style={styles.listHeader}>
                                    <Text style={styles.listHeaderTitle}>Available Near You</Text>
                                    <Text style={styles.listHeaderSubtitle}>Fresh listings from your area</Text>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <ShoppingCart size={50} color="#eee" />
                                <Text style={styles.emptyText}>No listings found</Text>
                                <TouchableOpacity style={styles.postBtnEmpty} onPress={() => navigation.navigate('CreateListing')}>
                                    <Text style={styles.postBtnText}>Post Your First Ad</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        onRefresh={refetch}
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
        alignItems: 'flex-start',
        marginBottom: 10,
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
});
