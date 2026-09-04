import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator,
    TextInput, ScrollView, RefreshControl, Dimensions, StatusBar, Linking
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, MapPin, ArrowRight, Truck,
    Package, User, Bell, SlidersHorizontal, Heart, Star, ChevronDown, ArrowUpRight,
    LayoutGrid, Droplet, Magnet, FileText, Blocks
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
import { useRecentPickupLocations } from '../hooks/useRecentPickupLocations';
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
    const styles = useStyles();
    const { colors, isDark } = useTheme();
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
    const [promoIndex, setPromoIndex] = useState(0);

    const fetchPromos = useCallback(async () => {
        try {
            const data = await adminApi.getPromoCards(userRole);
            setPromos(Array.isArray(data) ? data : (data?.results || []));
        } catch (e) {
            console.error('Failed to load promos', e);
        }
    }, [userRole]);

    // Refetch whenever Home comes back into focus, not just on mount. Promo
    // cards are edited in the admin dashboard and are expected to appear
    // without a restart; previously a running app kept showing the set it
    // loaded at launch until the user happened to pull-to-refresh.
    useFocusEffect(
        useCallback(() => {
            fetchPromos();
        }, [fetchPromos])
    );

    const { data: pickupJobs = [], isLoading: pickupsLoading, refetch: refetchPickups } = usePickups(location);

    const isCollectorRole = userRole === 'COLLECTOR' || userRole === 'RECYCLER';
    const myActiveJob = isCollectorRole
        // `collector` is now the serialized user object (see logistics
        // serializers), not a bare id - compare .id, not the object itself.
        ? pickupJobs.find(j => j.collector?.id === user?.id && ['ACCEPTED', 'ARRIVED'].includes(j.status))
        : pickupJobs.find(j => ['PENDING', 'ACCEPTED', 'ARRIVED'].includes(j.status));
    const { recentLocations } = useRecentPickupLocations();
    const [locationFilter, setLocationFilter] = useState('');
    const { data: listings = [], isLoading: loading, refetch } = useListings({
        search: debouncedSearch,
        material_type: filter,
        location: locationFilter
    });

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

    // Kept in sync with the destinations listed in the admin dashboard's promo
    // form (admin/src/pages/PromoCardsPage.jsx). The two lists had drifted:
    // the admin told operators "Chat" and "Help" were valid, but neither was
    // accepted here, so those promos silently sent users to Marketplace.
    const PROMO_SCREENS = [
        'Home', 'Marketplace', 'Pickups', 'Chat', 'Wallet', 'Profile',
        'Help', 'TopUp', 'CreateListing', 'SupportChat', 'SavedLocations',
    ];

    const handlePromoAction = async (promo) => {
        const value = promo.action_value;
        if (!value) return;

        // 'URL' is offered in the admin dashboard's Action Type dropdown but
        // was never handled here, so those promos had a dead button.
        if (promo.action_type === 'URL') {
            try {
                await Linking.openURL(value);
            } catch (e) {
                Toast.show({ type: 'error', text1: 'Could not open link' });
            }
            return;
        }

        if (PROMO_SCREENS.includes(value)) {
            navigation.navigate(value);
        } else {
            // Sending people somewhere unrelated hides the misconfiguration;
            // say nothing happened instead of silently going to Marketplace.
            console.warn(`Promo "${promo.title}" points at unknown screen "${value}"`);
            Toast.show({
                type: 'info',
                text1: 'Not available',
                text2: "This offer isn't available in your app version yet.",
            });
        }
    };

    const renderPromoBanners = () => {
        if (!promos || promos.length === 0) {
            return (
                <View style={[styles.heroBanner, { backgroundColor: userRole === 'COLLECTOR' || userRole === 'RECYCLER' ? colors.accent : colors.primary }]}>
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
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                        const page = Math.round(e.nativeEvent.contentOffset.x / (width - 40 + 16));
                        if (page !== promoIndex) setPromoIndex(page);
                    }}
                >
                    {promos.map((promo, idx) => (
                        <View key={promo.id || idx} style={[styles.heroBanner, { backgroundColor: promo.badge_color || colors.accent, width: width - 40, marginRight: idx === promos.length - 1 ? 0 : 16 }]}>
                            <View style={styles.heroContent}>
                                {promo.badge_text ? (
                                    <View style={{ alignSelf: 'flex-start', backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 }}>
                                        {/* styles.badgeText was never defined; the inline
                                            overrides below were carrying it. */}
                                        <Text style={{ color: promo.badge_color || colors.accent, fontSize: 10, fontWeight: 'bold' }}>{promo.badge_text}</Text>
                                    </View>
                                ) : null}
                                <Text style={styles.heroTitle}>{promo.title}</Text>
                                <Text style={styles.heroSubtitle}>{promo.subtitle}</Text>
                                <AnimatedButton style={styles.heroBtn} onPress={() => handlePromoAction(promo)}>
                                    <Text style={[styles.heroBtnText, { color: promo.badge_color || colors.primary }]}>Start Now</Text>
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
                            <View key={i} style={[styles.dot, i === promoIndex && styles.dotActive]} />
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
                    <IconComp size={24} color={isActive ? colors.onPrimary : colors.text} />
                </View>
                <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const renderCollectorCategory = (item) => {
        if (!item.id) return null; // Skip 'All'
        const IconComp = item.icon;
        return (
            <TouchableOpacity key={item.id} style={styles.collCatCard} onPress={() => navigation.navigate('Pickups', { category: item.id })}>
                <View style={styles.collCatIconBox}>
                    <IconComp size={24} color={colors.text} />
                </View>
                <Text style={styles.collCatText}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const renderCollectorCard = (item, isRecommended = false) => {
        const imageUri = item.image ? resolveImageUrl(item.image) : null;
        const title = item.title;
        const price = item.price;
        const qty = item.quantity || '1 Bunch';
        const loc = item.location?.address || 'Unknown';
        const isFree = item.is_free;
        const navTarget = 'ListingDetail';
        const navParams = { listingId: item.id };
        const materialObj = CATEGORIES.find(c => c.id.toLowerCase() === item.material_type?.toLowerCase()) || CATEGORIES[1];
        const MaterialIcon = materialObj.icon;

        return (
            <TouchableOpacity key={item.id} style={styles.collCard} onPress={() => navigation.navigate(navTarget, navParams)} activeOpacity={0.9}>
                <View style={styles.collCardImageBox}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.collCardImage} contentFit="cover" placeholder={MATERIAL_PLACEHOLDER} transition={IMAGE_TRANSITION_MS} />
                    ) : (
                        <View style={[styles.collCardImage, { backgroundColor: colors.surfaceSunken, justifyContent: 'center', alignItems: 'center' }]}>
                            <Package size={30} color={colors.textMuted} />
                        </View>
                    )}
                    <View style={styles.collCardHeart}>
                        <Heart size={16} color={colors.text} />
                    </View>
                </View>
                {!isRecommended && (
                    <View style={styles.collCardDistanceBadge}>
                        <Text style={styles.collCardDistanceText}>2.4 km away</Text>
                    </View>
                )}
                <Text style={styles.collCardTitle} numberOfLines={1}>{title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <MaterialIcon size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.collCardSubtitle}>{materialObj.name}</Text>
                    <Text style={styles.collCardSubtitle}> • {qty}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.collCardSubtitle} numberOfLines={1}>{loc}</Text>
                </View>
                <Text style={styles.collCardPrice}>{isFree ? 'Free' : `GH₵ ${Number(price).toFixed(2)}`}</Text>
                
                {!isRecommended && (
                    <TouchableOpacity style={styles.collCardBtn} onPress={() => navigation.navigate(navTarget, navParams)}>
                        <Text style={styles.collCardBtnText}>View pickup</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderCollectorHome = () => {
        // Just arbitrarily slicing for demo purposes, since we don't have separate endpoints yet
        const nearYouList = dataList.slice(0, 5);
        const recommendedList = dataList.slice(5, 10);

        return (
            <View style={styles.container}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
                <ScrollView 
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={loading || pickupsLoading} onRefresh={handleRefresh} />}
                >
                    <SafeAreaView edges={['top']} style={styles.header}>
                        <View style={styles.headerTop}>
                            <TouchableOpacity style={styles.locationDropdown} onPress={() => navigation.navigate('Profile')}>
                                {user?.profile_picture ? (
                                    <Image source={{ uri: resolveImageUrl(user.profile_picture) }} style={styles.headerAvatar} />
                                ) : (
                                    <View style={styles.headerAvatarPlaceholder}><User size={20} color={colors.text} /></View>
                                )}
                                <MapPin size={16} color={colors.text} style={{marginLeft: 4}} />
                                <Text style={styles.locationTextHeader}>{user?.city || 'Accra, Ghana'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Chat', { tab: 'Notifications' })}>
                                <Bell size={20} color={colors.text} />
                                <View style={styles.bellBadge} />
                            </TouchableOpacity>
                        </View>

                        {myActiveJob ? (
                            <ActivePickupBanner job={myActiveJob} role={userRole} onPress={() => navigation.navigate('Pickups')} />
                        ) : (
                            <OnlineToggleCard location={location} />
                        )}

                        <View style={styles.searchRow}>
                            <View style={styles.searchBar}>
                                <Search size={20} color={colors.textMuted} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search waste materials..."
                                    placeholderTextColor={colors.textMuted}
                                    value={search}
                                    onChangeText={setSearch}
                                />
                            </View>
                            <TouchableOpacity style={styles.filterBtn} onPress={() => navigation.navigate('Marketplace')}>
                                <SlidersHorizontal size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Category</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Marketplace')}><Text style={styles.viewAllText}>See all</Text></TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, overflow: 'visible' }}>
                            {CATEGORIES.map(renderCollectorCategory)}
                        </ScrollView>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pickup requests near you</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Pickups')}><Text style={styles.viewAllText}>See all</Text></TouchableOpacity>
                        </View>
                        {loading || pickupsLoading ? (
                            <View style={{ flexDirection: 'row' }}>
                                {[1, 2].map(i => <SkeletonCard key={i} />)}
                            </View>
                        ) : nearYouList.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, overflow: 'visible' }}>
                                {nearYouList.map(item => renderCollectorCard(item, false))}
                            </ScrollView>
                        ) : (
                            <Text style={{ color: colors.textMuted, marginBottom: 24 }}>No items found near you.</Text>
                        )}

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recommended for you</Text>
                        </View>
                        {loading || pickupsLoading ? (
                            <View style={{ flexDirection: 'row' }}>
                                {[1, 2].map(i => <SkeletonCard key={i} />)}
                            </View>
                        ) : recommendedList.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, overflow: 'visible' }}>
                                {recommendedList.map(item => renderCollectorCard(item, true))}
                            </ScrollView>
                        ) : (
                            <Text style={{ color: colors.textMuted, marginBottom: 10 }}>No recommendations found.</Text>
                        )}

                        <View style={styles.collBanner}>
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <Text style={styles.collBannerTitle}>Let's keep Accra clean</Text>
                                <TouchableOpacity style={styles.collBannerBtn}>
                                    <Text style={styles.collBannerBtnText}>Learn more →</Text>
                                </TouchableOpacity>
                            </View>
                            <Image 
                                source={{ uri: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=80' }} 
                                style={{ width: 80, height: 80, borderRadius: 40 }} 
                                contentFit="cover"
                            />
                        </View>
                    </SafeAreaView>
                </ScrollView>
            </View>
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
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.gridImage}
                            contentFit="cover"
                            // Marketplace already cached to disk; Home did not, so the
                            // same remote photos were refetched on every visit.
                            cachePolicy="memory-disk"
                            // Fade up from a neutral tone instead of flashing blank
                            // while the image comes down a slow connection.
                            placeholder={MATERIAL_PLACEHOLDER}
                            transition={IMAGE_TRANSITION_MS}
                        />
                    ) : (
                        <View style={[styles.gridImage, { backgroundColor: colors.surfaceSunken, justifyContent: 'center', alignItems: 'center' }]}>
                            <Package size={30} color={colors.textMuted} />
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

    if (isCollectorRole) {
        return renderCollectorHome();
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
            
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
                                    <View style={styles.headerAvatarPlaceholder}><User size={20} color={colors.text} /></View>
                                )}
                                <MapPin size={16} color={colors.text} style={{marginLeft: 4}} />
                                <Text style={styles.locationTextHeader}>{user?.city || 'Accra, Ghana'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Chat', { tab: 'Notifications' })}>
                                <Bell size={20} color={colors.text} />
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
                                    <Image 
                                        source={require('../../assets/pickup.jpg')} 
                                        style={{width: 44, height: 44, borderRadius: 8}} 
                                        contentFit="contain"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.requestPickupTitle}>Request a Pickup</Text>
                                    <Text style={styles.requestPickupSubtitle}>Got waste to clear? Get a collector in minutes.</Text>
                                </View>
                                <ArrowRight size={20} color={colors.onPrimary} />
                            </AnimatedButton>
                        )}

                        {!myActiveJob && !isCollectorRole && recentLocations.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recentChipsRow}
                            >
                                {recentLocations.slice(0, 2).map((loc, index) => (
                                    <TouchableOpacity
                                        key={`${loc.address}-${index}`}
                                        style={styles.recentChip}
                                        onPress={() => navigation.navigate('Pickups', {
                                            prefillLocation: { address: loc.address, latitude: loc.latitude, longitude: loc.longitude }
                                        })}
                                    >
                                        <MapPin size={13} color={colors.textSecondary} />
                                        <Text style={styles.recentChipText} numberOfLines={1}>{loc.address}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {isCollectorRole && (
                            <View style={styles.searchRow}>
                                <View style={styles.searchBar}>
                                    <Search size={20} color={colors.textMuted} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search waste materials..."
                                        placeholderTextColor={colors.textMuted}
                                        value={search}
                                        onChangeText={setSearch}
                                    />
                                </View>
                                <TouchableOpacity style={styles.filterBtn} onPress={() => navigation.navigate('Marketplace')}>
                                    <SlidersHorizontal size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        )}

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
                            <Text style={{ color: colors.textMuted, marginBottom: 16 }}>No items found.</Text>
                            {!isCollectorRole && (
                                <AnimatedButton 
                                    style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                                    onPress={() => navigation.navigate('CreateListing')}
                                >
                                    <Text style={{ color: colors.onPrimary, fontWeight: 'bold' }}>Post Waste</Text>
                                </AnimatedButton>
                            )}
                        </View>
                    )
                }
            />
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.surfaceAlt },
    header: { paddingTop: 10, paddingBottom: 15 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    
    locationDropdown: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerAvatar: { width: 44, height: 44, borderRadius: 22 },
    headerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.borderSubtle },
    locationTextHeader: { fontSize: 16, fontWeight: '700', color: c.text },
    
    bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.borderSubtle },
    bellBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: c.danger },

    requestPickupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.primary,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    requestPickupIconBox: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: c.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        overflow: 'hidden',
    },
    requestPickupTitle: { fontSize: 15, fontWeight: '700', color: c.onPrimary, marginBottom: 2 },
    requestPickupSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

    recentChipsRow: { gap: 8, paddingBottom: 16 },
    recentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: c.borderSubtle,
        maxWidth: 220,
    },
    recentChipText: { fontSize: 12, color: c.text, fontWeight: '500' },

    searchRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 24, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: c.borderSubtle },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: c.text, padding: 0, letterSpacing: 0, height: '100%' },
    filterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.borderSubtle },
    
    heroBanner: { backgroundColor: c.primary, borderRadius: 24, padding: 20, flexDirection: 'row', height: 160, overflow: 'hidden', marginBottom: 12 },
    heroContent: { flex: 1, justifyContent: 'center', zIndex: 2 },
    heroTitle: { color: c.onPrimary, fontSize: 22, fontWeight: '800', marginBottom: 6 },
    heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 16, lineHeight: 18 },
    heroBtn: { backgroundColor: c.surface, alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    heroBtnText: { color: c.text, fontWeight: 'bold', fontSize: 13 },
    heroImage: { position: 'absolute', right: -20, bottom: -20, width: 140, height: 140, borderRadius: 70, opacity: 0.8 },
    
    dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border },
    dotActive: { width: 16, backgroundColor: c.primary },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
    viewAllText: { fontSize: 14, color: c.text, fontWeight: '600', textDecorationLine: 'underline' },
    
    categoriesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    catWrap: { alignItems: 'center', flex: 1 },
    catCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: c.shadow, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    catCircleActive: { backgroundColor: c.primary },
    catLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    catLabelActive: { color: c.text, fontWeight: 'bold' },
    
    gridRow: { justifyContent: 'space-between' },
    gridCard: { width: (width - 55) / 2, backgroundColor: c.surface, borderRadius: 20, padding: 12, marginBottom: 15, shadowColor: c.shadow, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    gridImageContainer: { width: '100%', height: 100, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    gridImage: { width: '100%', height: '100%' },
    gridTitle: { fontSize: 15, fontWeight: 'bold', color: c.text, marginBottom: 12 },
    
    gridBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    gridPrice: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 2 },
    gridSubtitle: { fontSize: 12, color: c.textMuted },
    gridAddBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
    
    floatingFab: { position: 'absolute', bottom: 110, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    
    // Collector specific styles
    collCatCard: { backgroundColor: c.surfaceSunken, borderRadius: 16, padding: 12, alignItems: 'center', width: 80, marginRight: 12 },
    collCatIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    collCatText: { fontSize: 12, fontWeight: '600', color: c.text },
    collCard: { width: 260, backgroundColor: c.surface, borderRadius: 20, padding: 12, marginRight: 16, shadowColor: c.shadow, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    collCardImageBox: { width: '100%', height: 140, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    collCardImage: { width: '100%', height: '100%' },
    collCardHeart: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
    collCardTitle: { fontSize: 16, fontWeight: 'bold', color: c.text, marginBottom: 6 },
    collCardSubtitle: { fontSize: 13, color: c.textSecondary },
    collCardDistanceBadge: { alignSelf: 'flex-start', backgroundColor: c.surfaceSunken, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
    collCardDistanceText: { fontSize: 12, fontWeight: '600', color: c.text },
    collCardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    collCardPrice: { fontSize: 16, fontWeight: '800', color: c.success },
    collCardBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
    collCardBtnText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 14 },
    collBanner: { backgroundColor: c.accentSoft, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 30 },
    collBannerTitle: { fontSize: 18, fontWeight: '800', color: c.success, marginBottom: 8 },
    collBannerBtn: { backgroundColor: c.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start' },
    collBannerBtnText: { color: c.onPrimary, fontWeight: 'bold', fontSize: 13 }
}));
