import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator,
    TextInput, ScrollView, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image'; // ✅ Faster than react-native Image
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { marketApi } from '../api/market';
import {
    Search, Plus, MapPin, Tag,
    Filter, ArrowRight, Truck,
    Package, TrendingUp, ShoppingCart
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';
import * as Location from 'expo-location';
import { usePickups } from '../hooks/usePickups';

const CATEGORIES = [
    { id: '', name: 'All', icon: 'grid-outline', color: '#455A64', bg: '#fff' },
    { id: 'Plastics', name: 'Plastics', icon: 'cube-outline', color: '#2E7D32', bg: '#fff' },
    { id: 'Metals', name: 'Metals', icon: 'hammer-outline', color: '#5D4037', bg: '#fff' },
    { id: 'Paper', name: 'Paper', icon: 'document-text-outline', color: '#FBC02D', bg: '#fff' },
    { id: 'Glass', name: 'Glass', icon: 'wine-outline', color: '#00796B', bg: '#fff' },
    { id: 'Electronics', name: 'E-Waste', icon: 'phone-portrait-outline', color: '#7B1FA2', bg: '#fff' }
];

import { useListings } from '../hooks/useListings';
import { SkeletonCard } from '../components/Skeleton';

export default function HomeScreen({ navigation }) {
    const { userRole, signOut, user } = useAuth();
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

    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

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
        const diff = (now - date) / 1000; // seconds

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

    const CollectorDashboard = () => (
        <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetchingPickups}
                        onRefresh={refetchPickups}
                    />
                }
            >
                {/* Hero Section - Gradient Background (Unified Design) */}
                <LinearGradient
                    colors={['#1B5E20', '#388E3C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroGradient}
                >
                    {/* Header Content */}
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greetingTextLight}>{getGreeting()},</Text>
                            <Text style={styles.userNameLight}>Collector</Text>
                        </View>
                        <View style={[styles.statusBadge, {
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderColor: 'rgba(255,255,255,0.3)',
                            borderWidth: 1
                        }]}>
                            <View style={[styles.activeDot, { backgroundColor: '#4CAF50' }]} />
                            <Text style={[styles.statusText, { color: '#fff' }]}>Active</Text>
                        </View>
                    </View>

                    {/* Stats Display - Glassmorphism */}
                    <View style={styles.heroStatsContainer}>
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatValue}>0</Text>
                            <Text style={styles.heroStatLabel}>Pickups Today</Text>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatValue}>₵0.00</Text>
                            <Text style={styles.heroStatLabel}>Earnings Today</Text>
                        </View>
                    </View>

                    {/* Floating "Go Online" Button */}
                    <TouchableOpacity
                        style={styles.floatingSellBtn}
                        onPress={() => navigation.navigate('Pickups')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#FF9800', '#F57C00']}
                            style={styles.sellBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Truck size={24} color="#fff" />
                            <Text style={styles.sellBtnText}>Go Online</Text>
                            <ArrowRight size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </LinearGradient>


                {/* Available Pickups Section */}
                <View style={[styles.availableSection, { marginTop: -20, paddingHorizontal: 20 }]}>
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
        return (
            <SafeAreaView style={styles.container}>
                <CollectorDashboard />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['right', 'left']}>
            {/* Hero Section - Gradient Background */}
            <LinearGradient
                colors={['#1B5E20', '#388E3C']} // Deep Green to Vibrant Green
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
            >
                {/* Header Content */}
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greetingTextLight}>{getGreeting()},</Text>
                        <Text style={styles.userNameLight}>{user?.username || 'Seller'}</Text>
                    </View>
                </View>

                {/* Main Stats Display */}
                <View style={styles.heroStatsContainer}>
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatValue}>₵0.00</Text>
                        <Text style={styles.heroStatLabel}>Total Earnings</Text>
                    </View>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatValue}>0kg</Text>
                        <Text style={styles.heroStatLabel}>CO₂ Saved</Text>
                    </View>
                </View>

                {/* Floating "Sell Waste" Button */}
                <TouchableOpacity
                    style={styles.floatingSellBtn}
                    onPress={() => navigation.navigate('CreateListing')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#FF9800', '#F57C00']}
                        style={styles.sellBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Plus size={24} color="#fff" />
                        <Text style={styles.sellBtnText}>Sell Waste Now</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>

            {/* Overlapping Search Bar */}
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
                // Skeleton loading - no spinner!
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
                    // ✅ Performance optimizations
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Hero Section Styles
    heroGradient: {
        paddingTop: 60, // more padding for status bar
        paddingHorizontal: 20,
        paddingBottom: 40, // space for floating elements
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: 25, // space for overlap
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerIconBg: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 12,
        backdropFilter: 'blur(10px)',
    },
    headerLogo: {
        width: 24,
        height: 24,
        tintColor: '#fff',
    },
    greetingTextLight: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 2,
    },
    userNameLight: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
    },

    // Modern Stats Display
    heroStatsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    heroStat: {
        flex: 1,
        alignItems: 'center',
    },
    heroStatValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    heroStatLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
    },
    heroStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 10,
    },

    // Floating Sell Button
    floatingSellBtn: {
        marginBottom: 10,
        elevation: 8,
        shadowColor: '#F57C00',
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
    },
    sellBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 20,
        gap: 10,
    },
    sellBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    // Floating Search Bar
    floatingSearchContainer: {
        marginTop: -35, // Negative margin to overlap
        paddingHorizontal: 20,
        marginBottom: 10,
        zIndex: 10,
    },
    floatingSearchBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },

    // Legacy Hero Section (Collector Dashboard)
    heroSection: {
        backgroundColor: '#fff',
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },

    greetingCard: {
        marginBottom: 20,
    },
    greetingContent: {},
    greetingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    greetingText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 14,
        color: '#888',
        fontStyle: 'italic',
    },

    // Quick Stats Card
    statsCardCompact: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 8,
    },

    // Primary CTA Button
    primaryCTA: {
        backgroundColor: '#FF9800',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 20,
        gap: 10,
        elevation: 6,
        shadowColor: '#FF9800',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    ctaText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    // Search Bar
    searchContainer: {
        marginTop: 4,
    },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#333',
    },

    // Category Pills
    catRow: {
        paddingVertical: 20,
        paddingLeft: 20,
        backgroundColor: '#F8F9FA',
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
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 2,
        borderColor: '#F0F0F0',
    },
    catIconBoxActive: {
        borderColor: '#2E7D32',
        backgroundColor: '#E8F5E9',
        elevation: 5,
        shadowOpacity: 0.15,
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

    // List Header
    listHeader: {
        paddingHorizontal: 20,
        marginBottom: 16,
        marginTop: 8,
    },
    listHeaderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    listHeaderSubtitle: {
        fontSize: 13,
        color: '#888',
    },

    // Listings Grid
    list: { paddingHorizontal: 12, paddingBottom: 20 },
    columnWrapper: { justifyContent: 'space-between' },

    // Listing Cards
    listingCard: {
        width: '48.5%',
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    imageBox: {
        height: 160,
        backgroundColor: '#F0F0F0',
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
        lineHeight: 19,
        height: 38,
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
        marginTop: 4,
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
        marginTop: 100,
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

    // Collector Dashboard Styles
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#27AE60',
        marginRight: 6,
    },
    statusText: { fontSize: 12, color: '#27AE60', fontWeight: 'bold' },
    availableSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    pickupsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    emptySubtext: {
        fontSize: 13,
        color: '#bbb',
        marginTop: 8,
        textAlign: 'center',
    },

    // Job Card Styles for Collectors
    jobCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    jobQuantity: {
        fontSize: 13,
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
        fontSize: 12,
        color: '#888',
        flex: 1,
    },
    jobPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginTop: 4,
    },
});
