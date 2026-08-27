import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator,
    TextInput, ScrollView, RefreshControl, Dimensions, StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, MapPin, ArrowRight, Truck,
    Package, ShoppingCart, User, Bell, SlidersHorizontal, Heart, Star, ChevronDown, ArrowUpRight,
    LayoutGrid, Droplet, Cog, FileText, Wine, Cpu, CupSoda, Anvil, Newspaper
} from 'lucide-react-native';
import apiClient, { BASE_URL } from '../api/client';
import { adminApi } from '../api/admin';
import * as Location from 'expo-location';
import { usePickups } from '../hooks/usePickups';
import { useListings } from '../hooks/useListings';
import { SkeletonCard } from '../components/Skeleton';
import AnimatedButton from '../components/AnimatedButton';
import ActivePickupBanner from '../components/ActivePickupBanner';
import OnlineToggleCard from '../components/OnlineToggleCard';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: '', name: 'All', icon: LayoutGrid, color: '#111', bg: '#F9FAFB' },
    { id: 'Plastics', name: 'Plastics', icon: CupSoda, color: '#111', bg: '#F9FAFB' },
    { id: 'Metals', name: 'Metals', icon: Anvil, color: '#111', bg: '#F9FAFB' },
    { id: 'Paper', name: 'Paper', icon: Newspaper, color: '#111', bg: '#F9FAFB' },
    { id: 'Glass', name: 'Glass', icon: Wine, color: '#111', bg: '#F9FAFB' },
    { id: 'Electronics', name: 'E-Waste', icon: Cpu, color: '#111', bg: '#F9FAFB' }
];

export const getMaterialImage = (materialType) => {
    switch (materialType?.toLowerCase()) {
        case 'plastics': return 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=400&q=80';
        case 'metals': return 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=400&q=80';
        case 'paper': return 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&q=80';
        case 'glass': return 'https://images.unsplash.com/photo-1605389445167-9d7a26fba893?w=400&q=80';
        case 'electronics': return 'https://images.unsplash.com/photo-1550005972-026115998dfc?w=400&q=80';
        case 'e-waste': return 'https://images.unsplash.com/photo-1550005972-026115998dfc?w=400&q=80';
        default: return 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=80';
    }
};

export default function HomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { userRole, user } = useAuth();
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [location, setLocation] = useState(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedSearch(search); }, 500);
        return () => { clearTimeout(handler); };
    }, [search]);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                let loc = await Location.getCurrentPositionAsync({});
                setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            } catch (error) { console.log(error); }
        })();
    }, []);

    const [promos, setPromos] = useState([]);

    const fetchPromos = useCallback(async () => {
        try {
            const data = await adminApi.getPromoCards(userRole);
            setPromos(data);
        } catch (e) {
            console.error('Failed to load promos', e);
        }
    }, [userRole]);

    useEffect(() => {
        fetchPromos();
    }, [fetchPromos]);

    const { data: pickupJobs = [], isLoading: pickupsLoading, refetch: refetchPickups } = usePickups(location);

    const isCollectorRole = userRole === 'COLLECTOR' || userRole === 'RECYCLER';
    const myActiveJob = isCollectorRole
        ? pickupJobs.find(j => j.collector === user?.id && ['ACCEPTED', 'ARRIVED'].includes(j.status))
        : pickupJobs.find(j => ['PENDING', 'ACCEPTED', 'ARRIVED'].includes(j.status));
    const [locationFilter, setLocationFilter] = useState('');
    const { data: listings = [], isLoading: loading, refetch } = useListings({
        search: debouncedSearch,
        material_type: filter,
        location: locationFilter
    });

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 3600) return 'Just now';
        if (diff < 86400) return 'Today';
        if (diff < 172800) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const handleRefresh = async () => {
        await fetchPromos();
        await refetch();
    };

    // All roles show listings on home — collectors see all listings, disposers see their own listings
    // (Pickup jobs belong in the Pickups tab, not home)
    let dataList = listings;
    if (userRole === 'SELLER' && user) {
        dataList = dataList.filter(item => 
            item?.seller?.id === user.id || item?.seller === user.id || item?.seller_name === user.username
        );
    }

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        let cleanPath = path.startsWith('/') ? path : `/${path}`;
        if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
        return `${BASE_URL}${cleanPath}`;
    };

    const renderPromoBanners = () => {
        if (!promos || promos.length === 0) {
            return (
                <View style={[styles.heroBanner, { backgroundColor: userRole === 'COLLECTOR' || userRole === 'RECYCLER' ? '#10B981' : '#111' }]}>
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTitle}>{userRole === 'COLLECTOR' || userRole === 'RECYCLER' ? 'Manage Pickups' : 'Recycle & Earn!'}</Text>
                        <Text style={styles.heroSubtitle}>{userRole === 'COLLECTOR' || userRole === 'RECYCLER' ? 'Collect waste and earn rewards efficiently.' : 'Join the movement for a cleaner planet today.'}</Text>
                        <AnimatedButton style={styles.heroBtn} onPress={() => navigation.navigate('Marketplace')}>
                            <Text style={styles.heroBtnText}>{userRole === 'COLLECTOR' || userRole === 'RECYCLER' ? 'Browse All Waste' : 'Start Now'}</Text>
                        </AnimatedButton>
                    </View>
                    {userRole === 'COLLECTOR' || userRole === 'RECYCLER' ? (
                        <Truck size={80} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', right: 10, bottom: 10 }} />
                    ) : (
                        <Image source={{ uri: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=80' }} style={styles.heroImage} contentFit="cover" />
                    )}
                </View>
            );
        }

        return (
            <View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    snapToInterval={width - 40 + 16} 
                    snapToAlignment="start"
                    decelerationRate="fast" 
                >
                    {promos.map((promo, idx) => (
                        <View key={promo.id || idx} style={[styles.heroBanner, { backgroundColor: promo.badge_color || '#10B981', width: width - 40, marginRight: idx === promos.length - 1 ? 0 : 16 }]}>
                            <View style={styles.heroContent}>
                                {promo.badge_text ? (
                                    <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 }}>
                                        <Text style={[styles.badgeText, { color: promo.badge_color || '#10B981', fontSize: 10, fontWeight: 'bold' }]}>{promo.badge_text}</Text>
                                    </View>
                                ) : null}
                                <Text style={styles.heroTitle}>{promo.title}</Text>
                                <Text style={styles.heroSubtitle}>{promo.subtitle}</Text>
                                <AnimatedButton style={styles.heroBtn} onPress={() => {
                                    if (promo.action_type === 'NAVIGATE' && promo.action_value) {
                                        const validScreens = ['Home', 'Marketplace', 'Pickups', 'Wallet', 'Profile', 'CreateListing', 'TopUp', 'SupportChat'];
                                        if (validScreens.includes(promo.action_value)) {
                                            navigation.navigate(promo.action_value);
                                        } else {
                                            // Fallback for dummy backend data
                                            navigation.navigate('Marketplace');
                                        }
                                    }
                                }}>
                                    <Text style={[styles.heroBtnText, { color: promo.badge_color || '#111' }]}>Start Now</Text>
                                </AnimatedButton>
                            </View>
                            {promo.image || promo.image_url ? (
                                <Image source={{ uri: promo.image ? resolveImageUrl(promo.image) : promo.image_url }} style={styles.heroImage} contentFit="cover" />
                            ) : (
                                <Truck size={80} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', right: 10, bottom: 10 }} />
                            )}
                        </View>
                    ))}
                </ScrollView>
                {promos.length > 1 && (
                    <View style={styles.dotsRow}>
                        {promos.map((_, i) => (
                            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const renderCategory = (item) => {
        const isActive = filter === item.id;
        const IconComp = item.icon;
        return (
            <TouchableOpacity
                key={item.id}
                style={styles.catWrap}
                onPress={() => {
                    if (userRole === 'COLLECTOR' || userRole === 'RECYCLER') navigation.navigate('Pickups', { category: item.id });
                    else setFilter(item.id);
                }}
            >
                <View style={[styles.catCircle, isActive && styles.catCircleActive]}>
                    <IconComp size={24} color={isActive ? "#fff" : "#111"} />
                </View>
                <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const renderGridCard = ({ item }) => {
        const imageUri = item.image ? resolveImageUrl(item.image) : null;
        const title = item.title;
        const price = item.price;
        const qty = item.quantity || '1 Bunch';
        const isFree = item.is_free;
        const navTarget = 'ListingDetail';
        const navParams = { listingId: item.id };

        return (
            <AnimatedButton 
                style={styles.gridCard}
                onPress={() => navigation.navigate(navTarget, navParams)}
                activeOpacity={1}
            >
                <View style={styles.gridImageContainer}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.gridImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.gridImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                            <Package size={30} color="#ccc" />
                        </View>
                    )}
                </View>
                <Text style={styles.gridTitle} numberOfLines={1}>{title}</Text>
                
                <View style={styles.gridBottomRow}>
                    <View>
                        <Text style={styles.gridSubtitle} numberOfLines={1}>{qty}</Text>
                    </View>
                </View>
            </AnimatedButton>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            
            <FlatList
                data={dataList}
                renderItem={renderGridCard}
                keyExtractor={item => item?.id?.toString() || Math.random().toString()}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading || pickupsLoading} onRefresh={handleRefresh} />}
                ListHeaderComponent={<>
                    <SafeAreaView edges={['top']} style={styles.header}>
                        <View style={styles.headerTop}>
                            <TouchableOpacity style={styles.locationDropdown} onPress={() => navigation.navigate('Profile')}>
                                {user?.profile_picture ? (
                                    <Image source={{ uri: resolveImageUrl(user.profile_picture) }} style={styles.headerAvatar} />
                                ) : (
                                    <View style={styles.headerAvatarPlaceholder}><User size={20} color="#111" /></View>
                                )}
                                <MapPin size={16} color="#111" style={{marginLeft: 4}} />
                                <Text style={styles.locationTextHeader}>{user?.city || 'Accra, Ghana'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Chat', { tab: 'Notifications' })}>
                                <Bell size={20} color="#111" />
                                <View style={styles.bellBadge} />
                            </TouchableOpacity>
                        </View>

                        {myActiveJob ? (
                            <ActivePickupBanner
                                job={myActiveJob}
                                role={userRole}
                                onPress={() => navigation.navigate('Pickups')}
                            />
                        ) : isCollectorRole ? (
                            <OnlineToggleCard location={location} />
                        ) : (
                            <AnimatedButton
                                style={styles.requestPickupCard}
                                haptic
                                onPress={() => navigation.navigate('Pickups')}
                            >
                                <View style={styles.requestPickupIconBox}>
                                    <Truck size={22} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.requestPickupTitle}>Request a Pickup</Text>
                                    <Text style={styles.requestPickupSubtitle}>Got waste to clear? Get a collector in minutes.</Text>
                                </View>
                                <ArrowRight size={20} color="#fff" />
                            </AnimatedButton>
                        )}

                        <View style={styles.searchRow}>
                            <View style={styles.searchBar}>
                                <Search size={20} color="#999" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search waste materials..."
                                    placeholderTextColor="#999"
                                    value={search}
                                    onChangeText={setSearch}
                                />
                            </View>
                            <TouchableOpacity style={styles.filterBtn}>
                                <SlidersHorizontal size={20} color="#111" />
                            </TouchableOpacity>
                        </View>

                        {renderPromoBanners()}

                        {!(userRole === 'COLLECTOR' || userRole === 'RECYCLER') && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Category</Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Marketplace')}><Text style={styles.viewAllText}>See all</Text></TouchableOpacity>
                                </View>
                                <View style={styles.categoriesGrid}>
                                    {CATEGORIES.slice(0, 4).map(renderCategory)}
                                </View>
                            </>
                        )}
                    </SafeAreaView>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{(userRole === 'COLLECTOR' || userRole === 'RECYCLER') ? 'Available Waste Near You' : 'My Deals'}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Marketplace')}><Text style={styles.viewAllText}>See all</Text></TouchableOpacity>
                    </View>
                </>}
                ListEmptyComponent={
                    loading || pickupsLoading ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 15 }}>
                            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ color: '#999' }}>No items found.</Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { paddingTop: 10, paddingBottom: 15 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    
    locationDropdown: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerAvatar: { width: 44, height: 44, borderRadius: 22 },
    headerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
    locationTextHeader: { fontSize: 16, fontWeight: '700', color: '#111' },
    
    bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
    bellBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    
    requestPickupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    requestPickupIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    requestPickupTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
    requestPickupSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

    searchRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#F3F4F6' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111', padding: 0, letterSpacing: 0, height: '100%' },
    filterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
    
    heroBanner: { backgroundColor: '#111', borderRadius: 24, padding: 20, flexDirection: 'row', height: 160, overflow: 'hidden', marginBottom: 12 },
    heroContent: { flex: 1, justifyContent: 'center', zIndex: 2 },
    heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
    heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 16, lineHeight: 18 },
    heroBtn: { backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    heroBtnText: { color: '#111', fontWeight: 'bold', fontSize: 13 },
    heroImage: { position: 'absolute', right: -20, bottom: -20, width: 140, height: 140, borderRadius: 70, opacity: 0.8 },
    
    dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
    dotActive: { width: 16, backgroundColor: '#111' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    viewAllText: { fontSize: 14, color: '#111', fontWeight: '600', textDecorationLine: 'underline' },
    
    categoriesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    catWrap: { alignItems: 'center', flex: 1 },
    catCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    catCircleActive: { backgroundColor: '#111' },
    catLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
    catLabelActive: { color: '#111', fontWeight: 'bold' },
    
    gridRow: { justifyContent: 'space-between' },
    gridCard: { width: (width - 55) / 2, backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    gridImageContainer: { width: '100%', height: 100, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    gridImage: { width: '100%', height: '100%' },
    gridTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 12 },
    
    gridBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    gridPrice: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
    gridSubtitle: { fontSize: 12, color: '#888' },
    gridAddBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    
    floatingFab: { position: 'absolute', bottom: 110, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }
});
