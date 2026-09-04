import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, TextInput, ScrollView, RefreshControl, Dimensions, StatusBar, Modal
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    Search, MapPin, Package, ShoppingCart, ChevronLeft, ChevronRight, Heart, ChevronDown, SlidersHorizontal, LayoutGrid, Droplet, Magnet, FileText, Blocks
} from 'lucide-react-native';
import { BASE_URL } from '../api/client';
import { marketApi } from '../api/market';
import { useListings } from '../hooks/useListings';
import { SkeletonCard } from '../components/Skeleton';
import * as Haptics from 'expo-haptics';
import { MATERIAL_PLACEHOLDER, IMAGE_TRANSITION_MS } from '../constants/images';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: '', name: 'All', icon: LayoutGrid },
    { id: 'Plastics', name: 'Plastics', icon: Droplet },
    { id: 'Metals', name: 'Metals', icon: Magnet },
    { id: 'Paper', name: 'Paper', icon: FileText },
    { id: 'Glass', name: 'Glass', icon: Droplet },
    { id: 'Electronics', name: 'E-Waste', icon: Blocks }
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
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { userRole, user } = useAuth();
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    // Optimistic overrides for the like button so taps feel instant instead
    // of waiting on a refetch; keyed by listing id, cleared on unmount.
    const [likeOverrides, setLikeOverrides] = useState({});

    const handleToggleLike = async (item) => {
        const nextLiked = !(likeOverrides[item.id] ?? item.is_liked);
        setLikeOverrides(prev => ({ ...prev, [item.id]: nextLiked }));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await marketApi.toggleLike(item.id);
        } catch (e) {
            // Revert on failure
            setLikeOverrides(prev => ({ ...prev, [item.id]: !nextLiked }));
            console.warn('Failed to toggle like:', e?.message);
        }
    };

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
        if (sortBy === 'price_asc') {
            const priceA = a.is_free ? 0 : parseFloat(a.price || 0);
            const priceB = b.is_free ? 0 : parseFloat(b.price || 0);
            return priceA - priceB;
        }
        if (sortBy === 'price_desc') {
            const priceA = a.is_free ? 0 : parseFloat(a.price || 0);
            const priceB = b.is_free ? 0 : parseFloat(b.price || 0);
            return priceB - priceA;
        }
        if (sortBy === 'newest') {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        }
        return 0; // Default
    });

    const renderListing = ({ item }) => {
        const liked = likeOverrides[item.id] ?? item.is_liked;
        const materialObj = CATEGORIES.find(c => c.id.toLowerCase() === item.material_type?.toLowerCase()) || CATEGORIES[1];
        const MaterialIcon = materialObj.icon;
        
        return (
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
                        placeholder={MATERIAL_PLACEHOLDER}
                        transition={IMAGE_TRANSITION_MS}
                    />
                ) : (
                    <View style={styles.placeholderImg}>
                        <Package size={30} color={colors.textMuted} />
                    </View>
                )}

                {/* Floating Tags */}
                <View style={styles.floatingTag}>
                    <Text style={styles.floatingTagText}>{item.is_free ? 'Free' : 'Available'}</Text>
                </View>

                {/* Floating Heart Button */}
                <TouchableOpacity
                    style={styles.floatingHeart}
                    onPress={() => handleToggleLike(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Heart size={16} color={liked ? colors.danger : colors.text} fill={liked ? colors.danger : 'transparent'} />
                </TouchableOpacity>
            </View>
            <View style={styles.listingDetails}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>

                <View style={styles.iconRow}>
                    <MaterialIcon size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.listingLoc, { flexShrink: 3 }]} numberOfLines={1}>{materialObj.name}</Text>
                    <Text style={styles.metaDot}>{'·'}</Text>
                    <Text style={[styles.listingLoc, { flexShrink: 2 }]} numberOfLines={1}>{item.quantity || '1 Bag'}</Text>
                </View>

                <View style={styles.iconRow}>
                    <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.listingLoc, { flexShrink: 1 }]} numberOfLines={1}>{item.location?.split(',')[0] || item.location || 'Accra'}</Text>
                    <Text style={styles.distanceText}> • 1.8 km</Text>
                </View>

                <View style={styles.priceRow}>
                    <Text style={styles.listingPrice} numberOfLines={1}>{item.is_free ? 'Free' : `GH₵ ${parseFloat(item.price || 0).toFixed(0)}`}</Text>
                    <View style={styles.viewDetailsBtn}>
                        <ChevronRight size={16} color={colors.onAccent} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('House')}>
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{(userRole === 'COLLECTOR' || userRole === 'RECYCLER') ? 'All Waste' : 'My Waste'}</Text>
                <TouchableOpacity style={styles.iconBtnRound} onPress={() => setShowLocationModal(true)}>
                    <SlidersHorizontal size={20} color={colors.text} />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Search Bar */}
            <View style={styles.searchBarWrapper}>
                <Search size={20} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search waste materials..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity style={styles.searchBtn}>
                    <Search size={18} color={colors.onPrimary} />
                </TouchableOpacity>
            </View>

            {/* Filter Pills Row */}
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
                    {CATEGORIES.map(item => {
                        const isActive = filter === item.id;
                        const IconComp = item.icon;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.catChip, isActive && styles.catChipActive]}
                                onPress={() => setFilter(item.id)}
                            >
                                {IconComp && isActive && item.id === '' && <IconComp size={16} color={colors.onPrimary} style={{ marginRight: 6 }} />}
                                {IconComp && !isActive && <IconComp size={16} color={colors.text} style={{ marginRight: 6 }} />}
                                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity style={styles.catChip}>
                        <LayoutGrid size={16} color={colors.text} style={{ marginRight: 6 }} />
                        <Text style={styles.catChipText}>More</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Near You Header */}
            <View style={styles.nearYouRow}>
                {(userRole === 'COLLECTOR' || userRole === 'RECYCLER') ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MapPin size={16} color={colors.accent} />
                        <Text style={styles.showingText}>Showing waste </Text>
                        <Text style={styles.nearYouText}>near you</Text>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Package size={16} color={colors.accent} />
                        <Text style={styles.showingText}>Showing your </Text>
                        <Text style={styles.nearYouText}>recent waste</Text>
                    </View>
                )}
                <TouchableOpacity style={styles.dropdownChip} onPress={() => setShowSortModal(true)}>
                    <Text style={styles.dropdownText}>{sortBy ? SORT_OPTIONS.find(o => o.id === sortBy)?.label.split(':')[0] : 'Recently added'}</Text>
                    <ChevronDown size={14} color={colors.text} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
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
                            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.text} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <ShoppingCart size={60} color={colors.border} />
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

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.surface,
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
        color: c.text,
    },
    iconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBtnRound: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        backgroundColor: c.surfaceAlt,
        borderRadius: 28,
        paddingLeft: 20,
        paddingRight: 6,
        height: 56,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: c.text,
    },
    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: c.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: c.text,
    },
    filterSection: {
        marginBottom: 20,
    },
    catList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    catChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        flexDirection: 'row',
        alignItems: 'center',
    },
    catChipActive: {
        backgroundColor: c.primary,
        borderColor: c.primary,
    },
    dropdownChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 13,
        color: c.text,
        fontWeight: '500',
    },
    catChipText: {
        fontSize: 14,
        color: c.text,
        fontWeight: '600',
    },
    catChipTextActive: {
        color: c.onPrimary,
    },
    nearYouRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    showingText: {
        fontSize: 15,
        color: c.text,
        marginLeft: 8,
    },
    nearYouText: {
        fontSize: 15,
        color: c.accent,
        fontWeight: '600',
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
        backgroundColor: c.surface,
        marginBottom: 25,
    },
    imageBox: {
        width: '100%',
        height: 160,
        borderRadius: 24,
        backgroundColor: c.surfaceAlt,
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
        backgroundColor: c.accent,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    floatingTagText: {
        color: c.onPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    floatingHeart: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: c.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: c.shadow,
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
        color: c.text,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    listingLoc: {
        fontSize: 12,
        color: c.textSecondary,
    },
    metaDot: {
        fontSize: 12,
        color: c.textMuted,
        marginHorizontal: 4,
    },
    distanceText: {
        fontSize: 12,
        color: c.accent,
        fontWeight: '500',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    listingPrice: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: 'bold',
        color: c.text,
    },
    viewDetailsBtn: {
        flexShrink: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: c.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: c.text,
        marginTop: 15,
    },
    emptyText: {
        fontSize: 14,
        color: c.textMuted,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    resetBtn: {
        marginTop: 20,
        paddingHorizontal: 25,
        paddingVertical: 12,
        backgroundColor: c.primary,
        borderRadius: 18,
    },
    resetBtnText: {
        color: c.onPrimary,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: c.surface,
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
        color: c.text,
    },
    closeModalBtn: {
        padding: 5,
    },
    closeModalText: {
        fontSize: 15,
        color: c.textMuted,
        fontWeight: '600',
    },
    modalOption: {
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
    },
    modalOptionActive: {
        backgroundColor: c.surfaceAlt,
        borderRadius: 16,
        paddingHorizontal: 15,
        borderBottomWidth: 0,
        marginVertical: 4,
    },
    modalOptionText: {
        fontSize: 16,
        color: c.text,
    },
    modalOptionTextActive: {
        color: c.text,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: c.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 10,
    },
    fabText: {
        color: c.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    }
}));
