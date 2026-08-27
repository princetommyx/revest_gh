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
import { authApi } from '../api/auth';
import { BASE_URL } from '../api/client';
import {
    MapPin, Box, ChevronRight, BadgeCheck, Truck, Clock, Bookmark,
    UserCog, ShieldCheck, ShieldAlert, Share2, MessageCircleQuestion, LogOut,
    Recycle
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

const NavLink = ({ title, subtitle, subtitleColor = '#9CA3AF', icon: Icon, iconColor = '#111', iconBg = '#F3F4F6', onPress, isLast, danger }) => (
    <TouchableOpacity
        style={[styles.navLink, !isLast && styles.navLinkDivider]}
        onPress={onPress}
        activeOpacity={0.6}
    >
        <View style={[styles.navLinkIconBox, { backgroundColor: danger ? '#FEF2F2' : iconBg }]}>
            <Icon size={18} color={danger ? '#EF4444' : iconColor} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[styles.navLinkText, danger && styles.navLinkTextDanger]}>{title}</Text>
            {!!subtitle && <Text style={[styles.navLinkSubtitle, { color: subtitleColor }]}>{subtitle}</Text>}
        </View>
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

    // Fetch KYC status (used for the verification status subtitle + completion nudge)
    const { data: kycData } = useQuery({
        queryKey: ['kycStatus'],
        queryFn: () => authApi.getKycStatus(),
        staleTime: 60000,
    });
    const kycStatus = kycData?.status || 'UNVERIFIED';
    const kycLabel = kycStatus === 'VERIFIED' ? 'Verified' : kycStatus === 'PENDING' ? 'Pending review' : kycStatus === 'REJECTED' ? 'Resubmission needed' : 'Not verified';

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

    // Profile completion nudge - only counts fields that genuinely exist on the User model
    const completionChecks = [
        !!(user?.profile_picture_url || user?.profile_picture),
        !!user?.phone_number,
        !!user?.city,
        kycStatus === 'VERIFIED',
    ];
    const completionDone = completionChecks.filter(Boolean).length;
    const completionTotal = completionChecks.length;
    const profileComplete = completionDone === completionTotal;

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

                {/* Profile completion nudge */}
                {!profileComplete && (
                    <View style={styles.completionContainer}>
                        <TouchableOpacity style={styles.completionCard} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.85}>
                            <View style={styles.completionRing}>
                                <Text style={styles.completionRingText}>{completionDone}/{completionTotal}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.completionTitle}>Complete your profile</Text>
                                <Text style={styles.completionDesc}>Add a photo, phone number, city and get verified to build trust with the other side.</Text>
                            </View>
                            <ChevronRight size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                )}

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

                {/* Become a Collector cross-sell (Disposers only) */}
                {userRole === 'SELLER' && (
                    <View style={styles.navBlock}>
                        <TouchableOpacity style={styles.earnCard} onPress={() => navigation.navigate('SupportChat')} activeOpacity={0.85}>
                            <View style={styles.earnIconBox}>
                                <Recycle size={22} color="#111" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.earnTitle}>Earn as a Collector</Text>
                                <Text style={styles.earnDesc}>Pick up listed waste and get paid. Chat with our team to get set up.</Text>
                            </View>
                            <ChevronRight size={18} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.navBlock}>
                    <SectionHeader title="Account" />
                    <NavCard>
                        <NavLink title="Profile Information" icon={UserCog} iconColor="#3B82F6" iconBg="#EFF6FF" onPress={() => navigation.navigate('EditProfile')} />
                        <NavLink
                            title="Verification"
                            subtitle={kycLabel}
                            subtitleColor={kycStatus === 'VERIFIED' ? '#059669' : kycStatus === 'REJECTED' ? '#EF4444' : '#9CA3AF'}
                            icon={ShieldCheck}
                            iconColor="#059669"
                            iconBg="#ECFDF5"
                            onPress={() => navigation.navigate('KYCVerification')}
                        />
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
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
    },
    navLinkSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    navLinkTextDanger: {
        color: '#EF4444',
    },
    completionContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    completionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderRadius: 18,
        padding: 16,
        gap: 14,
    },
    completionRing: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2.5,
        borderColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
    },
    completionRingText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    completionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 3,
    },
    completionDesc: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 17,
    },
    earnCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 18,
        padding: 18,
        gap: 14,
    },
    earnIconBox: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FBBF24',
        alignItems: 'center',
        justifyContent: 'center',
    },
    earnTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 3,
    },
    earnDesc: {
        fontSize: 12,
        color: '#D1D5DB',
        lineHeight: 17,
    },
});
