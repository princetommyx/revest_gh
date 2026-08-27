import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Alert, StatusBar, Image, ActivityIndicator, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { logisticsApi } from '../api/logistics';
import { marketApi } from '../api/market';
import { BASE_URL } from '../api/client';
import {
    MapPin, Box, ChevronRight, BadgeCheck, Truck, Clock, Bookmark,
    UserCog, ShieldCheck, ShieldAlert, Share2, MessageCircleQuestion, LogOut
} from 'lucide-react-native';

const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
    return `${BASE_URL}${cleanPath}`;
};

const ROLE_LABELS = {
    SELLER: 'Disposer',
    COLLECTOR: 'Collector',
    RECYCLER: 'Recycler',
};

const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
);

const NavCard = ({ children }) => (
    <View style={styles.navCard}>{children}</View>
);

const NavLink = ({ title, icon: Icon, iconColor = '#111', iconBg = '#F3F4F6', onPress, isLast, danger }) => (
    <TouchableOpacity
        style={[styles.navLink, !isLast && styles.navLinkDivider]}
        onPress={onPress}
        activeOpacity={0.6}
    >
        <View style={[styles.navLinkIconBox, { backgroundColor: danger ? '#FEF2F2' : iconBg }]}>
            <Icon size={18} color={danger ? '#EF4444' : iconColor} />
        </View>
        <Text style={[styles.navLinkText, danger && styles.navLinkTextDanger]}>{title}</Text>
        {!danger && <ChevronRight size={18} color="#D1D5DB" />}
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }) {
    const { user, signOut, userRole } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: () => signOut() }
            ]
        );
    };

    const handleInvite = async () => {
        try {
            await Share.share({
                message: 'Join me on Revesta! The best platform to list and recycle waste. Download the app at https://revesta.app',
                title: 'Join Revesta'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // Fetch active pickups
    const { data: pickupsData, isLoading: loadingJobs } = useQuery({
        queryKey: ['pickups'],
        queryFn: () => logisticsApi.getPickupRequests(),
    });

    // Fetch active listings
    const { data: listingsData } = useQuery({
        queryKey: ['myListings'],
        queryFn: () => marketApi.getMyListings(),
    });

    // Extract arrays from paginated response
    const jobs = Array.isArray(pickupsData) ? pickupsData : (pickupsData?.results || []);
    const listings = Array.isArray(listingsData) ? listingsData : (listingsData?.results || []);

    // Derive dynamic context
    const activeJob = jobs.find(j => ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(j.status));
    const activeListing = listings.find(l => l.status === 'AVAILABLE');

    // Real activity stats - completed pickups, and total weight recovered
    // from completed Track B/C (recyclable) jobs specifically.
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
    const completedPickups = completedJobs.length;
    const totalWeight = completedJobs.reduce((sum, j) => sum + (parseFloat(j.weight_kg) || 0), 0);

    const avatarUri = resolveImageUrl(user?.profile_picture_url || user?.profile_picture);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Top Section: Identity */}
                <View style={styles.identityContainer}>
                    <Image
                        source={{ uri: avatarUri || 'https://ui-avatars.com/api/?name=' + (user?.username || 'User') + '&background=F3F4F6&color=111&size=128' }}
                        style={styles.avatar}
                    />
                    <View style={styles.identityNameRow}>
                        <Text style={styles.identityName}>{user?.username || 'Guest User'}</Text>
                        {user?.is_verified && <BadgeCheck size={18} color="#059669" style={{ marginLeft: 6 }} />}
                    </View>
                    <Text style={styles.identityHandle}>@{(user?.username || 'guest').toLowerCase().replace(/\s+/g, '')}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{ROLE_LABELS[userRole] || userRole}</Text>
                    </View>
                </View>

                {/* Activity / Impact */}
                <View style={styles.impactContainer}>
                    <Text style={styles.sectionHeader}>YOUR REVESTA ACTIVITY</Text>
                    <View style={styles.impactRow}>
                        <View style={styles.impactCard}>
                            <Text style={styles.impactValue}>{completedPickups}</Text>
                            <Text style={styles.impactLabel}>Pickups{'\n'}completed</Text>
                        </View>
                        <View style={styles.impactCard}>
                            <Text style={styles.impactValue}>{totalWeight.toFixed(0)} <Text style={{ fontSize: 16 }}>kg</Text></Text>
                            <Text style={styles.impactLabel}>Waste{'\n'}recovered</Text>
                        </View>
                    </View>
                </View>

                {/* Dynamic Context Section */}
                {(activeJob || activeListing || loadingJobs) && (
                    <View style={styles.contextualContainer}>
                        {loadingJobs ? (
                            <ActivityIndicator size="small" color="#111" />
                        ) : activeJob ? (
                            <TouchableOpacity style={styles.contextCard} onPress={() => navigation.navigate('Main', { screen: 'Pickups' })} activeOpacity={0.8}>
                                <Text style={styles.contextHeader}>UP NEXT</Text>
                                <Text style={styles.contextTitle}>Pickup scheduled</Text>
                                <View style={styles.contextRow}>
                                    <MapPin size={14} color="#666" />
                                    <Text style={styles.contextDesc} numberOfLines={1}>
                                        {activeJob.pickup_address || 'Custom location'} → {activeJob.destination_address || 'Drop-off'}
                                    </Text>
                                </View>
                                <Text style={styles.contextLink}>View details</Text>
                            </TouchableOpacity>
                        ) : activeListing ? (
                            <TouchableOpacity style={styles.contextCard} onPress={() => navigation.navigate('Main', { screen: 'Marketplace' })} activeOpacity={0.8}>
                                <Text style={styles.contextHeader}>ACTIVE LISTING</Text>
                                <Text style={styles.contextTitle}>{activeListing.quantity} {activeListing.material_type}</Text>
                                <View style={styles.contextRow}>
                                    <Box size={14} color="#666" />
                                    <Text style={styles.contextDesc}>Waiting for interested collectors</Text>
                                </View>
                                <Text style={styles.contextLink}>View listing</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}

                {/* Information Architecture Blocks */}
                <View style={styles.navBlock}>
                    <SectionHeader title="My Activity" />
                    <NavCard>
                        <NavLink title="My Listings" icon={Box} iconColor="#3B82F6" iconBg="#EFF6FF" onPress={() => navigation.navigate('Main', { screen: 'Marketplace' })} />
                        <NavLink title="Pickup History" icon={Truck} iconColor="#059669" iconBg="#ECFDF5" onPress={() => navigation.navigate('PickupHistory')} />
                        <NavLink title="Transaction History" icon={Clock} iconColor="#8B5CF6" iconBg="#F5F3FF" onPress={() => navigation.navigate('TransactionHistory')} />
                        <NavLink title="Saved Locations" icon={Bookmark} iconColor="#F59E0B" iconBg="#FFFBEB" onPress={() => navigation.navigate('SavedLocations')} isLast />
                    </NavCard>
                </View>

                <View style={styles.navBlock}>
                    <SectionHeader title="Account" />
                    <NavCard>
                        <NavLink title="Profile Information" icon={UserCog} iconColor="#3B82F6" iconBg="#EFF6FF" onPress={() => navigation.navigate('EditProfile')} />
                        <NavLink title="Verification" icon={ShieldCheck} iconColor="#059669" iconBg="#ECFDF5" onPress={() => navigation.navigate('KYCVerification')} />
                        <NavLink title="Security" icon={ShieldAlert} iconColor="#EF4444" iconBg="#FEF2F2" onPress={() => navigation.navigate('Security')} isLast />
                    </NavCard>
                </View>

                <View style={styles.navBlock}>
                    <SectionHeader title="Support & Community" />
                    <NavCard>
                        <NavLink title="Invite someone" icon={Share2} iconColor="#F59E0B" iconBg="#FFFBEB" onPress={handleInvite} />
                        <NavLink title="Help & Support" icon={MessageCircleQuestion} iconColor="#8B5CF6" iconBg="#F5F3FF" onPress={() => navigation.navigate('SupportChat')} isLast />
                    </NavCard>
                </View>

                {/* Log Out */}
                <View style={styles.navBlock}>
                    <NavCard>
                        <NavLink title="Log Out" icon={LogOut} onPress={handleLogout} danger isLast />
                    </NavCard>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingTop: 32,
        paddingBottom: 60,
    },
    identityContainer: {
        paddingHorizontal: 32,
        marginBottom: 40,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F3F4F6',
        marginBottom: 16,
    },
    identityNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    identityName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.5,
    },
    identityHandle: {
        fontSize: 15,
        color: '#6B7280',
        marginTop: 4,
        marginBottom: 12,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    roleBadgeText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '600',
    },
    impactContainer: {
        paddingHorizontal: 32,
        marginBottom: 40,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1.2,
        marginBottom: 16,
    },
    impactRow: {
        flexDirection: 'row',
        gap: 12,
    },
    impactCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 18,
        padding: 18,
    },
    impactValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -1,
        marginBottom: 8,
    },
    impactLabel: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    contextualContainer: {
        paddingHorizontal: 24,
        marginBottom: 48,
    },
    contextCard: {
        backgroundColor: '#F9FAFB',
        padding: 24,
        borderRadius: 18,
    },
    contextHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669', // Subtle Revesta green
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    contextTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    contextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    contextDesc: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    contextLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    navBlock: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    navCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 18,
        paddingHorizontal: 8,
        overflow: 'hidden',
    },
    navLink: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
    },
    navLinkDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0F1F2',
    },
    navLinkIconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    navLinkText: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
    },
    navLinkTextDanger: {
        color: '#EF4444',
    },
});
