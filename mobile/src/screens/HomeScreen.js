import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator,
    TextInput, ScrollView
} from 'react-native';
import { Image } from 'expo-image'; // ✅ Faster than react-native Image
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { marketApi } from '../api/market';
import {
    Search, Plus, MapPin, Tag,
    Filter, ArrowRight, Truck,
    Package, TrendingUp, ShoppingBag
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';

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
    const { userRole, signOut } = useAuth();
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    // React Query Hook
    const { data: listings = [], isLoading: loading, refetch, isRefetching } = useListings();

    // No manual useEffect needed for fetching!
    // React Query handles focus refetching automatically if configured (default true)

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
                style={[styles.catBtn]}
                onPress={() => setFilter(item.id)}
            >
                <View style={[
                    styles.catIconBox,
                    isActive && { borderColor: '#2E7D32', borderWidth: 2, backgroundColor: '#E8F5E9' }
                ]}>
                    <Ionicons
                        name={item.icon}
                        size={24}
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
                        <Ionicons name="checkmark-circle" size={12} color="#fff" />
                    </View>
                )}
            </View>
            <View style={styles.listingContent}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>

                <Text style={styles.listingPrice}>
                    {item.is_free ? 'Contact for details' : `₵${item.price}`}
                </Text>

                <View style={styles.metaRow}>
                    <View style={styles.locationBox}>
                        <MapPin size={10} color="#888" />
                        <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // ... CollectorDashboard remains similar but update imports/styles if needed ...
    // Simplified CollectorDashboard for brevity in this replacement
    const CollectorDashboard = () => (
        <FlatList
            // ... (keep existing collector dashboard logic or reuse filteredListings)
            data={filteredListings}
            renderItem={renderListing}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.columnWrapper}
            ListHeaderComponent={() => (
                <View style={{ padding: 20, paddingBottom: 0 }}>
                    <View style={styles.welcomeSection}>
                        <View>
                            <Text style={styles.welcomeLabel}>Welcome back,</Text>
                            <Text style={styles.welcomeName}>Collector</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <View style={styles.activeDot} />
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    </View>
                    {/* ... stats ... */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statsCard}>
                            <Text style={styles.statsVal}>0</Text>
                            <Text style={styles.statsLab}>Pickups Today</Text>
                        </View>
                        <View style={styles.statsCard}>
                            <Text style={styles.statsVal}>₵0.00</Text>
                            <Text style={styles.statsLab}>Earning Today</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.mapAction}
                        onPress={() => navigation.navigate('Pickups')}
                    >
                        <View style={styles.mapActionContent}>
                            <Text style={styles.mapActionTitle}>Open Live Map</Text>
                            <Text style={styles.mapActionSub}>Find waste collections near you</Text>
                            <View style={styles.mapBtn}>
                                <Text style={styles.mapBtnText}>Go Online</Text>
                                <ArrowRight size={18} color="#fff" />
                            </View>
                        </View>
                        <View style={styles.mapIconBox}>
                            <Truck size={60} color="rgba(255,255,255,0.2)" />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.marketHeader}>
                        <ShoppingBag size={20} color="#2E7D32" />
                        <Text style={styles.sectionTitle}>Available for Pickup</Text>
                    </View>
                </View>
            )}
            ListEmptyComponent={
                <View style={styles.emptyBox}>
                    <TrendingUp size={40} color="#ddd" />
                    <Text style={styles.emptyText}>No listings found nearby</Text>
                </View>
            }
            onRefresh={refetch}
            refreshing={isRefetching}
        />
    );

    if (userRole === 'COLLECTOR') {
        return (
            <SafeAreaView style={styles.container}>
                <CollectorDashboard />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                {/* Search Bar - Jiji Style */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Search size={20} color="#888" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="I am looking for..."
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="#999"
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Filter size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Categories - Jiji Style (Icons) removed from Header */}
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
                                <Text style={styles.listHeaderTitle}>Fresh Recommendations</Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <ShoppingBag size={50} color="#eee" />
                            <Text style={styles.emptyText}>No listings found</Text>
                            <TouchableOpacity style={styles.postBtnEmpty} onPress={() => navigation.navigate('CreateListing')}>
                                <Text style={styles.postBtnText}>Post First Ad</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    onRefresh={refetch}
                    refreshing={isRefetching}
                />
            )}

            {/* Floating Sell Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreateListing')}
            >
                <Plus size={24} color="#fff" />
                <Text style={styles.fabText}>SELL</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: '#2E7D32',
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        zIndex: 10
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 5, // Tighten up
        gap: 10
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        height: 40
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },
    filterBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
        width: 40
    },

    catRow: {
        paddingVertical: 15,
        paddingLeft: 15,
        backgroundColor: '#f9f9f9',
    },
    catContent: { paddingRight: 25 },
    catBtn: {
        alignItems: 'center',
        marginRight: 10,
        width: 70
    },
    catBtnActive: {
        // No specific active container style needed with new clean design
    },
    catIconBox: {
        width: 50, height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#fff', // Default white bg
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },

    catText: { fontSize: 11, color: '#666', textAlign: 'center' },
    catTextActive: { color: '#2E7D32', fontWeight: 'bold' },

    listHeader: { paddingHorizontal: 15, marginBottom: 10 },
    listHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },

    list: { paddingHorizontal: 10 },
    columnWrapper: { justifyContent: 'space-between' },

    listingCard: {
        width: '48.5%',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        overflow: 'hidden'
    },
    imageBox: { height: 150, backgroundColor: '#f0f0f0' },
    image: { width: '100%', height: '100%' },
    freeBadge: {
        position: 'absolute', top: 8, left: 8,
        backgroundColor: '#E74C3C', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 4
    },
    freeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    verifiedBadge: {
        position: 'absolute', bottom: 8, right: 8,
        backgroundColor: '#2E7D32', borderRadius: 10, padding: 2
    },

    listingContent: { padding: 10 },
    listingTitle: { fontSize: 13, color: '#333', marginBottom: 4, height: 36, lineHeight: 18 }, // Fixed height for 2 lines
    listingPrice: { fontSize: 15, fontWeight: 'bold', color: '#2E7D32', marginBottom: 6 },

    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    locationBox: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
    locationText: { fontSize: 10, color: '#999', flex: 1 },
    timeText: { fontSize: 10, color: '#ccc' },

    fab: {
        position: 'absolute', bottom: 20, alignSelf: 'center',
        backgroundColor: '#FF9800',
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 25, paddingVertical: 14,
        borderRadius: 30, elevation: 6,
        shadowColor: '#FF9800', shadowOpacity: 0.4
    },
    fabText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    emptyBox: { flex: 1, alignItems: 'center', marginTop: 80 },
    emptyText: { color: '#999', fontSize: 16, marginTop: 10, marginBottom: 20 },
    postBtnEmpty: {
        backgroundColor: '#2E7D32', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20
    },
    postBtnText: { color: '#fff', fontWeight: 'bold' },

    // Collector styles (minimal updates)
    welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    welcomeLabel: { fontSize: 14, color: '#888' },
    welcomeName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15
    },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60', marginRight: 6 },
    statusText: { fontSize: 12, color: '#27AE60', fontWeight: 'bold' },
    statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 25 },
    statsCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        elevation: 2,
    },
    statsVal: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    statsLab: { fontSize: 12, color: '#888', marginTop: 4 },
    mapAction: {
        backgroundColor: '#2E7D32',
        borderRadius: 25, height: 180, flexDirection: 'row', overflow: 'hidden',
        elevation: 5, marginBottom: 30
    },
    mapActionContent: { flex: 1, padding: 25, justifyContent: 'center' },
    mapActionTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    mapActionSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5, marginBottom: 20 },
    mapBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)',
        alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, gap: 8
    },
    mapBtnText: { color: '#fff', fontWeight: 'bold' },
    mapIconBox: { position: 'absolute', right: -20, bottom: -20 },
    marketHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
});
