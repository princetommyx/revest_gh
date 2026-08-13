import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, TextInput, ScrollView, RefreshControl, Dimensions, StatusBar, Modal
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    Search, MapPin, Package, ShoppingCart, SlidersHorizontal, ChevronLeft, Heart, ChevronDown
} from 'lucide-react-native';
import { BASE_URL } from '../api/client';
import { useListings } from '../hooks/useListings';
import { SkeletonCard } from '../components/Skeleton';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: '', name: 'All' },
    { id: 'Plastics', name: 'Plastics' },
    { id: 'Metals', name: 'Metals' },
    { id: 'Paper', name: 'Paper' },
    { id: 'Glass', name: 'Glass' },
    { id: 'Electronics', name: 'E-Waste' }
];

const AVAILABLE_LOCATIONS = [
    'All Ghana', 'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
    'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
    'Upper East', 'Upper West', 'Volta', 'Western', 'Western North'
];

const SORT_OPTIONS = [
    { id: '', label: 'Default' },
    { id: 'price_asc', label: 'Price: Low to High' },
    { id: 'price_desc', label: 'Price: High to Low' },
    { id: 'newest', label: 'Newest First' }
];

export default function MarketplaceScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { userRole, user } = useAuth();
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

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

    // Filter if regular user (Disposer)
    let visibleListings = listings;
    if (userRole === 'SELLER' && user) {
        // Disposers only see their own waste listings
        visibleListings = visibleListings.filter(item => 
            item.seller?.id === user.id || item.seller === user.id || item.seller_name === user.username
        );
    }
    // COLLECTOR and RECYCLER roles see all listings

    // Apply local sorting
    const sortedListings = [...visibleListings].sort((a, b) => {
        if (sortBy === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
        if (sortBy === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
        if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        return 0; // Default
    });

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
                
                {/* Floating Tags */}
                <View style={styles.floatingTag}>
                    <Text style={styles.floatingTagText}>{item.is_free ? 'Free' : 'Available'}</Text>
                </View>

                {/* Floating Heart Button */}
                <TouchableOpacity style={styles.floatingHeart}>
                    <Heart size={16} color="#111" />
                </TouchableOpacity>
            </View>
            <View style={styles.listingDetails}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.listingSubRow}>
                    <Text style={styles.listingLoc} numberOfLines={1}>{item.location}</Text>
                    {item.quantity && (
                        <Text style={[styles.listingLoc, { fontWeight: '600' }]} numberOfLines={1}>{item.quantity}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}>
                    <ChevronLeft size={24} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{(userRole === 'COLLECTOR' || userRole === 'RECYCLER') ? 'All Waste' : 'My Waste'}</Text>
                <TouchableOpacity style={styles.iconBtn}>
                    <SlidersHorizontal size={20} color="#111" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Search Bar */}
            <View style={styles.searchBarWrapper}>
                <Search size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="#999"
                />
            </View>

            {/* Filter Pills Row */}
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
                    {CATEGORIES.map(item => {
                        const isActive = filter === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.catChip, isActive && styles.catChipActive]}
                                onPress={() => setFilter(item.id)}
                            >
                                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    
                    {/* Location Dropdown Pill Fake */}
                    <TouchableOpacity style={styles.dropdownChip} onPress={() => setShowLocationModal(true)}>
                        <Text style={styles.catChipText}>{locationFilter ? (locationFilter.length > 8 ? locationFilter.substring(0,8)+'...' : locationFilter) : 'Location'}</Text>
                        <ChevronDown size={14} color="#666" style={{marginLeft: 4}} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownChip} onPress={() => setShowSortModal(true)}>
                        <Text style={styles.catChipText}>{sortBy ? SORT_OPTIONS.find(o => o.id === sortBy)?.label.split(':')[0] : 'Sort by'}</Text>
                        <ChevronDown size={14} color="#666" style={{marginLeft: 4}} />
                    </TouchableOpacity>
                </ScrollView>
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
                        data={sortedListings}
                        renderItem={renderListing}
                        keyExtractor={item => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={styles.gridContent}
                        columnWrapperStyle={styles.columnWrapper}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#111" />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <ShoppingCart size={60} color="#E0E7E0" />
                                <Text style={styles.emptyTitle}>{userRole === 'RECYCLER' ? 'No items found' : 'No waste posted yet'}</Text>
                                <Text style={styles.emptyText}>{userRole === 'RECYCLER' ? 'Try adjusting your filters or search terms.' : 'Request a pickup and it will appear here.'}</Text>
                                <TouchableOpacity style={styles.resetBtn} onPress={() => { setFilter(''); setLocationFilter(''); setSearch(''); setSortBy(''); }}>
                                    <Text style={styles.resetBtnText}>Reset Filters</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Request Pickup FAB for Disposers */}
            {userRole !== 'RECYCLER' && (
                <TouchableOpacity 
                    style={styles.fab} 
                    onPress={() => navigation.navigate('CreateListing')}
                >
                    <Text style={styles.fabText}>+ Request Pickup</Text>
                </TouchableOpacity>
            )}

            {/* Location Selection Modal */}
            <Modal visible={showLocationModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Location</Text>
                            <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.closeModalBtn}>
                                <Text style={styles.closeModalText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={AVAILABLE_LOCATIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalOption, locationFilter === (item === 'All Ghana' ? '' : item) && styles.modalOptionActive]}
                                    onPress={() => {
                                        setLocationFilter(item === 'All Ghana' ? '' : item);
                                        setShowLocationModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalOptionText, locationFilter === (item === 'All Ghana' ? '' : item) && styles.modalOptionTextActive]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Sort By Modal */}
            <Modal visible={showSortModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sort By</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)} style={styles.closeModalBtn}>
                                <Text style={styles.closeModalText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        {SORT_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                style={[styles.modalOption, sortBy === option.id && styles.modalOptionActive]}
                                onPress={() => {
                                    setSortBy(option.id);
                                    setShowSortModal(false);
                                }}
                            >
                                <Text style={[styles.modalOptionText, sortBy === option.id && styles.modalOptionTextActive]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
    },
    iconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        paddingHorizontal: 20,
        height: 52,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#111',
    },
    filterSection: {
        marginBottom: 20,
    },
    catList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    catChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#fff',
    },
    catChipActive: {
        backgroundColor: '#111',
    },
    dropdownChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
    },
    catChipText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    catChipTextActive: {
        color: '#fff',
    },
    resultsContainer: {
        flex: 1,
    },
    gridContent: {
        paddingHorizontal: 20,
        paddingBottom: 120, // Pad for bottom nav
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    listingCard: {
        width: (width - 55) / 2,
        backgroundColor: '#fff',
        marginBottom: 25,
    },
    imageBox: {
        width: '100%',
        height: 160,
        borderRadius: 24,
        backgroundColor: '#F9FBF9',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12,
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
    floatingTag: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: '#E5F6EE', // Soft pastel green
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    floatingTagText: {
        color: '#059669', // Darker green
        fontSize: 11,
        fontWeight: 'bold',
    },
    floatingHeart: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    listingDetails: {
        paddingHorizontal: 4,
    },
    listingTitle: {
        fontSize: 16,
        color: '#111',
        fontWeight: 'bold',
        marginBottom: 6,
    },
    listingSubRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    listingLoc: {
        flex: 1,
        fontSize: 12,
        color: '#888',
        marginRight: 10,
    },
    listingPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: '#111',
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
        backgroundColor: '#111',
        borderRadius: 18,
    },
    resetBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 25,
        paddingTop: 30,
        paddingBottom: 50,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111',
    },
    closeModalBtn: {
        padding: 5,
    },
    closeModalText: {
        fontSize: 15,
        color: '#999',
        fontWeight: '600',
    },
    modalOption: {
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalOptionActive: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingHorizontal: 15,
        borderBottomWidth: 0,
        marginVertical: 4,
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
    },
    modalOptionTextActive: {
        color: '#111',
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: '#111',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 10,
    },
    fabText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
