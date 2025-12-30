import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, Image, ActivityIndicator,
    TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { marketApi } from '../api/market';
import {
    Search, Plus, MapPin, Tag,
    Filter, ArrowRight, Truck,
    Package, TrendingUp, ShoppingBag
} from 'lucide-react-native';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';

const CATEGORIES = ['', 'Plastics', 'Metals', 'Paper', 'Glass', 'Electronics'];

export default function HomeScreen({ navigation }) {
    const { userRole, signOut } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchListings();
    }, []);

    // Refresh when screen comes into focus (after creating listing)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchListings();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const data = await marketApi.getListings();
            const items = Array.isArray(data) ? data : (data.results || []);
            setListings(items);
        } catch (error) {
            console.error("Fetch Listings Error:", error);
            Toast.show("Failed to load marketplace", { backgroundColor: '#E74C3C' });
        } finally {
            setLoading(false);
        }
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

    const renderCategory = (item) => (
        <TouchableOpacity
            key={item}
            style={[styles.catBtn, filter === item && styles.catBtnActive]}
            onPress={() => setFilter(item)}
        >
            <Text style={[styles.catText, filter === item && styles.catTextActive]}>
                {item || 'All'}
            </Text>
        </TouchableOpacity>
    );

    const renderListing = ({ item }) => (
        <TouchableOpacity
            style={styles.listingCard}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
        >
            <View style={styles.imageBox}>
                {item.image ? (
                    <Image source={{ uri: resolveImageUrl(item.image) }} style={styles.image} />
                ) : (
                    <Package size={30} color="#ccc" />
                )}
                <div style={styles.priceBadge}>
                    <Text style={styles.priceText}>
                        {item.is_free ? 'FREE' : `₵${item.price}`}
                    </Text>
                </div>
            </View>
            <View style={styles.listingContent}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.listingSpec}>{item.material_type} • {item.quantity}</Text>
                <div style={styles.locationRow}>
                    <MapPin size={12} color="#888" />
                    <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                </div>
            </View>
        </TouchableOpacity>
    );

    const CollectorDashboard = () => (
        <FlatList
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
            onRefresh={fetchListings}
            refreshing={loading}
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
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>ReVesta Market</Text>
                    <TouchableOpacity
                        style={styles.sellBtn}
                        onPress={() => navigation.navigate('CreateListing')}
                    >
                        <Plus size={20} color="#fff" />
                        <Text style={styles.sellBtnText}>Sell</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBar}>
                    <Search size={20} color="#888" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search materials..."
                        value={search}
                        onChangeText={setSearch}
                    />
                    <Filter size={20} color="#2E7D32" />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                    {CATEGORIES.map(renderCategory)}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                </View>
            ) : (
                <FlatList
                    data={filteredListings}
                    renderItem={renderListing}
                    keyExtractor={item => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.columnWrapper}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <ShoppingBag size={50} color="#eee" />
                            <Text style={styles.emptyText}>No listings found</Text>
                        </View>
                    }
                    onRefresh={fetchListings}
                    refreshing={loading}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { padding: 20, paddingBottom: 10 },
    marketHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 15 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a' },
    sellBtn: {
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 5
    },
    sellBtnText: { color: '#fff', fontWeight: 'bold' },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5',
        borderRadius: 15,
        paddingHorizontal: 15,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 15
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    catRow: { marginBottom: 10 },
    catBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        marginRight: 10
    },
    catBtnActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    catText: { fontSize: 14, color: '#666', fontWeight: '500' },
    catTextActive: { color: '#fff' },

    list: { padding: 15 },
    columnWrapper: { justifyContent: 'space-between' },
    listingCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        overflow: 'hidden'
    },
    imageBox: { height: 130, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },
    priceBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    priceText: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32' },
    listingContent: { padding: 12 },
    listingTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
    listingSpec: { fontSize: 12, color: '#888', marginTop: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
    locationText: { fontSize: 11, color: '#999', flex: 1 },

    collectorContainer: { flex: 1, padding: 20 },
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
    },
    statsVal: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    statsLab: { fontSize: 12, color: '#888', marginTop: 4 },
    mapAction: {
        backgroundColor: '#2E7D32',
        borderRadius: 25,
        height: 180,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        marginBottom: 30
    },
    mapActionContent: { flex: 1, padding: 25, justifyContent: 'center' },
    mapActionTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    mapActionSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5, marginBottom: 20 },
    mapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
        gap: 8
    },
    mapBtnText: { color: '#fff', fontWeight: 'bold' },
    mapIconBox: { position: 'absolute', right: -20, bottom: -20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 15 },
    emptyActivity: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        backgroundColor: '#fcfcfc',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1f1f1',
        borderStyle: 'dashed'
    },
    emptyActivityText: { color: '#aaa', marginTop: 10, fontSize: 14 },
    emptyBox: { flex: 1, alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#999', fontSize: 16, marginTop: 10 },
});
