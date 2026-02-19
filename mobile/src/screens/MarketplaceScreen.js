import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator,
    TextInput, ScrollView, RefreshControl, Dimensions, StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    Search, MapPin, Package, ShoppingCart, Filter, Grid, List, ChevronRight
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../api/client';
import { useListings } from '../hooks/useListings';
import { SkeletonCard } from '../components/Skeleton';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: '', name: 'All', icon: 'grid', color: '#455A64', bg: '#fff' },
    { id: 'Plastics', name: 'Plastics', icon: 'cube-outline', color: '#2E7D32', bg: '#fff' },
    { id: 'Metals', name: 'Metals', icon: 'hammer-outline', color: '#5D4037', bg: '#fff' },
    { id: 'Paper', name: 'Paper', icon: 'document-text-outline', color: '#FBC02D', bg: '#fff' },
    { id: 'Glass', name: 'Glass', icon: 'wine-outline', color: '#00796B', bg: '#fff' },
    { id: 'Electronics', name: 'E-Waste', icon: 'phone-portrait-outline', color: '#7B1FA2', bg: '#fff' }
];

const AVAILABLE_LOCATIONS = [
    'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
    'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
    'Upper East', 'Upper West', 'Volta', 'Western', 'Western North'
];

export default function MarketplaceScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { userRole, user } = useAuth();
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Handle incoming navigation parameters
    useEffect(() => {
        if (route.params?.category !== undefined) setFilter(route.params.category);
        if (route.params?.searchQuery !== undefined) setSearch(route.params.searchQuery);
    }, [route.params]);

    const { data: listings = [], isLoading, refetch, isRefetching } = useListings({
        search: debouncedSearch,
        material_type: filter,
        location: locationFilter
    });

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        let cleanPath = path.startsWith('/') ? path : `/${path}`;
        if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
        return `${BASE_URL}${cleanPath}`;
    };

    const renderCategory = (item) => {
        const isActive = filter === item.id;
        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => setFilter(item.id)}
                activeOpacity={0.7}
            >
                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                    {item.name}
                </Text>
            </TouchableOpacity>
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
                    />
                ) : (
                    <View style={styles.placeholderImg}>
                        <Package size={30} color="#E0E0E0" />
                    </View>
                )}
                {item.is_free && (
                    <View style={styles.freeBadge}>
                        <Text style={styles.freeText}>FREE</Text>
                    </View>
                )}
            </View>
            <View style={styles.listingDetails}>
                <View style={styles.priceRowMain}>
                    <Text style={styles.listingPrice}>
                        {item.is_free ? 'Free' : `₵${item.price}`}
                    </Text>
                    <View style={[
                        styles.trackBadgeMini,
                        { backgroundColor: item.track === 'B' ? '#DCFCE7' : '#FEE2E2' }
                    ]}>
                        <Text style={[
                            styles.trackTextMini,
                            { color: item.track === 'B' ? '#166534' : '#DC2626' }
                        ]}>
                            {item.track === 'B' ? 'B' : 'A'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.listingMeta}>
                    <MapPin size={12} color="#999" />
                    <Text style={styles.listingLoc} numberOfLines={1}>{item.location}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Organic Curved Header */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerTitle}>Marketplace</Text>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Filter size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerSub}>Find quality recyclable materials</Text>
                </SafeAreaView>
            </View>

            {/* Sticky Search & Filters */}
            <View style={styles.overlayContainer}>
                {/* Search Bar */}
                <View style={styles.searchBarWrapper}>
                    <Search size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="What are you looking for?"
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#999"
                    />
                </View>

                {/* Categories Scroll */}
                <View style={styles.filterSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
                        {CATEGORIES.map(renderCategory)}
                    </ScrollView>
                </View>

                {/* Locations Scroll */}
                <View style={styles.locationSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locList}>
                        <TouchableOpacity
                            style={[styles.locChip, locationFilter === '' && styles.locChipActive]}
                            onPress={() => setLocationFilter('')}
                        >
                            <Text style={[styles.locChipText, locationFilter === '' && styles.locChipTextActive]}>All Ghana</Text>
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
            </View>

            {/* Results Grid */}
            <View style={styles.resultsContainer}>
                {isLoading ? (
                    <FlatList
                        data={Array(6).fill({})}
                        renderItem={() => <SkeletonCard />}
                        keyExtractor={(_, index) => `skeleton-${index}`}
                        numColumns={2}
                        contentContainerStyle={styles.gridContent}
                        columnWrapperStyle={styles.columnWrapper}
                    />
                ) : (
                    <FlatList
                        data={listings}
                        renderItem={renderListing}
                        keyExtractor={item => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={styles.gridContent}
                        columnWrapperStyle={styles.columnWrapper}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2E7D32" />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <ShoppingCart size={60} color="#E0E7E0" />
                                <Text style={styles.emptyTitle}>No items found</Text>
                                <Text style={styles.emptyText}>Try adjusting your filters or search terms.</Text>
                                <TouchableOpacity style={styles.resetBtn} onPress={() => { setFilter(''); setLocationFilter(''); setSearch(''); }}>
                                    <Text style={styles.resetBtnText}>Reset Filters</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerBackground: {
        height: 180,
        backgroundColor: '#2E7D32',
        position: 'relative',
        overflow: 'hidden',
    },
    curvedShape: {
        position: 'absolute',
        bottom: -80,
        left: -width * 0.25,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        backgroundColor: '#388E3C',
        opacity: 0.3,
    },
    headerContent: {
        paddingHorizontal: 25,
        paddingTop: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
        fontWeight: '500',
    },
    overlayContainer: {
        marginTop: -30,
        backgroundColor: '#fff',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingTop: 25,
        zIndex: 5,
    },
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 25,
        backgroundColor: '#F3F4F6',
        borderRadius: 18,
        paddingHorizontal: 15,
        height: 56,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
    },
    filterSection: {
        marginBottom: 15,
    },
    catList: {
        paddingHorizontal: 25,
        gap: 10,
    },
    catChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    catChipActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32',
    },
    catChipText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
    },
    catChipTextActive: {
        color: '#fff',
    },
    locationSection: {
        marginBottom: 10,
    },
    locList: {
        paddingHorizontal: 25,
        gap: 8,
    },
    locChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    locChipActive: {
        backgroundColor: '#E8F5E9',
        borderColor: '#2E7D32',
    },
    locChipText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    locChipTextActive: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    resultsContainer: {
        flex: 1,
    },
    gridContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    listingCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 22,
        marginBottom: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    imageBox: {
        height: 150,
        backgroundColor: '#F9FBF9',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImg: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    freeBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#2E7D32',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    freeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    listingDetails: {
        padding: 12,
    },
    listingPrice: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    priceRowMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    trackBadgeMini: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    trackTextMini: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    listingTitle: {
        fontSize: 14,
        color: '#1A1A1A',
        fontWeight: '600',
        marginBottom: 6,
    },
    listingMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    listingLoc: {
        fontSize: 11,
        color: '#999',
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginTop: 15,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    resetBtn: {
        marginTop: 20,
        paddingHorizontal: 25,
        paddingVertical: 12,
        backgroundColor: '#2E7D32',
        borderRadius: 18,
    },
    resetBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
