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
    Search, MapPin, Package, ShoppingCart
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../api/client';
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

    // Handle incoming navigation parameters (from Home Screen)
    useEffect(() => {
        if (route.params?.category !== undefined) {
            setFilter(route.params.category);
        }
        if (route.params?.searchQuery !== undefined) {
            setSearch(route.params.searchQuery);
        }
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

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>Marketplace</Text>
                <Text style={styles.headerSubtitle}>Find waste materials for supply</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#888" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search materials..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#999"
                    />
                </View>
            </View>

            <View style={styles.stickyFilters}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.catContent}
                >
                    {CATEGORIES.map(renderCategory)}
                </ScrollView>

                <View style={styles.locationFilterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locScrollContent}>
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
            </View>

            {isLoading ? (
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
                    data={listings}
                    renderItem={renderListing}
                    keyExtractor={item => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.columnWrapper}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <ShoppingCart size={50} color="#eee" />
                            <Text style={styles.emptyText}>No materials found in this category or region.</Text>
                            <TouchableOpacity style={styles.resetBtn} onPress={() => { setFilter(''); setLocationFilter(''); setSearch(''); }}>
                                <Text style={styles.resetBtnText}>Clear All Filters</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 20,
        paddingBottom: 55,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    searchContainer: {
        paddingHorizontal: 20,
        marginTop: -28,
        marginBottom: 10,
        zIndex: 1,
    },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#333' },
    stickyFilters: { backgroundColor: '#F2F2F7', paddingTop: 10 },
    catContent: { paddingHorizontal: 20, paddingBottom: 15 },
    catBtn: { alignItems: 'center', marginRight: 16, width: 70 },
    catIconBox: {
        width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
        marginBottom: 8, backgroundColor: '#fff', elevation: 2, shadowColor: '#000',
        shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
        borderWidth: 1, borderColor: '#f0f0f0',
    },
    catIconBoxActive: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9', borderWidth: 2 },
    catText: { fontSize: 12, color: '#666', textAlign: 'center', fontWeight: '500' },
    catTextActive: { color: '#2E7D32', fontWeight: 'bold' },
    locationFilterContainer: { marginBottom: 15 },
    locScrollContent: { paddingHorizontal: 20 },
    locChip: {
        paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff',
        borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#eee',
    },
    locChipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    locChipText: { fontSize: 13, color: '#666', fontWeight: '500' },
    locChipTextActive: { color: '#fff', fontWeight: 'bold' },
    list: { paddingHorizontal: 12, paddingBottom: 20 },
    columnWrapper: { justifyContent: 'space-between' },
    listingCard: {
        width: '48.5%', backgroundColor: '#fff', borderRadius: 16,
        marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 5, overflow: 'hidden',
    },
    imageBox: { height: 140, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },
    freeBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#E74C3C', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    freeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    verifiedBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#2E7D32', borderRadius: 12, padding: 4 },
    listingContent: { padding: 12 },
    listingTitle: { fontSize: 14, color: '#1A1A1A', marginBottom: 6, fontWeight: '600', height: 36 },
    listingPrice: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 8 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    locationBox: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    locationText: { fontSize: 11, color: '#888', flex: 1 },
    timeText: { fontSize: 10, color: '#BBB', fontWeight: '500' },
    emptyBox: { flex: 1, alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
    emptyText: { color: '#999', fontSize: 15, marginTop: 16, marginBottom: 20, textAlign: 'center' },
    resetBtn: { backgroundColor: '#2E7D32', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    resetBtnText: { color: '#fff', fontWeight: 'bold' },
});
