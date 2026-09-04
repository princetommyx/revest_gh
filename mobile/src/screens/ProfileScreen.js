import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Alert, StatusBar, Image, ActivityIndicator, Share,
    Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { logisticsApi } from '../api/logistics';
import { marketApi } from '../api/market';
import { authApi } from '../api/auth';
import { BASE_URL } from '../api/client';
import Toast from 'react-native-toast-message';
import {
    MapPin, Box, ChevronRight, BadgeCheck, Truck, Clock, Bookmark,
    UserCog, ShieldCheck, ShieldAlert, Share2, MessageCircleQuestion, LogOut,
    Recycle, UserX, Trash2, X, Ban
} from 'lucide-react-native';
import { TAB_BAR_CLEARANCE } from '../constants/layout';
import { useTheme, makeStyles } from '../theme/ThemeContext';
import AppearanceToggle from '../components/AppearanceToggle';

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

const SectionHeader = ({ title }) => {
    const styles = useStyles();
    return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
};

const NavCard = ({ children }) => {
    const styles = useStyles();
    return <View style={styles.navCard}>{children}</View>;
};

// Icon colours default to theme tokens rather than fixed hex, so a caller that
// doesn't pass one still reads correctly in both modes.
const NavLink = ({ title, subtitle, subtitleColor, icon: Icon, iconColor, iconBg, onPress, isLast, danger }) => {
    const styles = useStyles();
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.navLink, !isLast && styles.navLinkDivider]}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View style={[styles.navLinkIconBox, { backgroundColor: danger ? colors.dangerSoft : (iconBg || colors.surfaceSunken) }]}>
                <Icon size={18} color={danger ? colors.danger : (iconColor || colors.text)} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.navLinkText, danger && styles.navLinkTextDanger]}>{title}</Text>
                {!!subtitle && <Text style={[styles.navLinkSubtitle, { color: subtitleColor || colors.textMuted }]}>{subtitle}</Text>}
            </View>
            {!danger && <ChevronRight size={18} color={colors.textMuted} />}
        </TouchableOpacity>
    );
};

export default function ProfileScreen({ navigation }) {
    const { user, signOut, userRole } = useAuth();
    const styles = useStyles();
    const { colors, isDark } = useTheme();

    // 'deactivate' | 'delete' | null
    const [dangerModal, setDangerModal] = useState(null);
    const [dangerPassword, setDangerPassword] = useState('');
    const [dangerLoading, setDangerLoading] = useState(false);
    const [dangerError, setDangerError] = useState('');

    // Google-auth accounts were created with no password at all
    // (create_user(password=None)) - nothing to confirm with, so being
    // authenticated is their confirmation instead.
    const needsPasswordConfirm = user?.auth_provider !== 'GOOGLE';

    const closeDangerModal = () => {
        setDangerModal(null);
        setDangerPassword('');
        setDangerError('');
    };

    const handleDangerConfirm = async () => {
        setDangerLoading(true);
        setDangerError('');
        try {
            if (dangerModal === 'deactivate') {
                await authApi.deactivateAccount(needsPasswordConfirm ? dangerPassword : undefined);
            } else {
                await authApi.deleteAccount(needsPasswordConfirm ? dangerPassword : undefined);
            }
            closeDangerModal();
            Toast.show({
                type: 'success',
                text1: dangerModal === 'deactivate' ? 'Account deactivated' : 'Account deleted',
                text2: dangerModal === 'deactivate' ? 'Log back in anytime to reactivate.' : 'Sorry to see you go.',
            });
            await signOut();
        } catch (error) {
            const data = error.response?.data;
            const detail = data?.detail
                || data?.password?.[0]
                || (data && typeof data === 'object' ? Object.values(data).flat()[0] : null);
            setDangerError(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.');
        } finally {
            setDangerLoading(false);
        }
    };

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
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Top Section: Identity */}
                <View style={styles.identityContainer}>
                    <Image
                        source={{ uri: avatarUri || 'https://ui-avatars.com/api/?name=' + (user?.username || 'User') + '&background=F3F4F6&color=111&size=128' }}
                        style={styles.avatar}
                    />
                    <View style={styles.identityNameRow}>
                        <Text style={styles.identityName}>{user?.username || 'Guest User'}</Text>
                        {user?.is_verified && <BadgeCheck size={18} color={colors.accent} style={{ marginLeft: 6 }} />}
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
                            <ChevronRight size={18} color={colors.textMuted} />
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
                            <ActivityIndicator size="small" color={colors.text} />
                        ) : activeJob ? (
                            <TouchableOpacity style={styles.contextCard} onPress={() => navigation.navigate('Main', { screen: 'Pickups' })} activeOpacity={0.8}>
                                <Text style={styles.contextHeader}>UP NEXT</Text>
                                <Text style={styles.contextTitle}>Pickup scheduled</Text>
                                <View style={styles.contextRow}>
                                    <MapPin size={14} color={colors.textSecondary} />
                                    <Text style={styles.contextDesc} numberOfLines={1}>
                                        {activeJob.pickup_address || 'Custom location'}
                                    </Text>
                                </View>
                                <Text style={styles.contextLink}>View details</Text>
                            </TouchableOpacity>
                        ) : activeListing ? (
                            <TouchableOpacity style={styles.contextCard} onPress={() => navigation.navigate('Main', { screen: 'Marketplace' })} activeOpacity={0.8}>
                                <Text style={styles.contextHeader}>ACTIVE LISTING</Text>
                                <Text style={styles.contextTitle}>{activeListing.quantity} {activeListing.material_type}</Text>
                                <View style={styles.contextRow}>
                                    <Box size={14} color={colors.textSecondary} />
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
                        <NavLink title="My Listings" icon={Box} onPress={() => navigation.navigate('Main', { screen: 'Marketplace' })} />
                        <NavLink title="Pickup History" icon={Truck} onPress={() => navigation.navigate('PickupHistory')} />
                        <NavLink title="Transaction History" icon={Clock} onPress={() => navigation.navigate('TransactionHistory')} />
                        <NavLink title="Saved Locations" icon={Bookmark} onPress={() => navigation.navigate('SavedLocations')} isLast />
                    </NavCard>
                </View>

                {/* Become a Collector cross-sell (Disposers only) */}
                {userRole === 'SELLER' && (
                    <View style={styles.navBlock}>
                        <TouchableOpacity style={styles.earnCard} onPress={() => navigation.navigate('SupportChat')} activeOpacity={0.85}>
                            <View style={styles.earnIconBox}>
                                <Recycle size={22} color={colors.text} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.earnTitle}>Earn as a Collector</Text>
                                <Text style={styles.earnDesc}>Pick up listed waste and get paid. Chat with our team to get set up.</Text>
                            </View>
                            <ChevronRight size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.navBlock}>
                    <SectionHeader title="Account" />
                    <NavCard>
                        <NavLink title="Profile Information" icon={UserCog} onPress={() => navigation.navigate('EditProfile')} />
                        <NavLink
                            title="Verification"
                            subtitle={kycLabel}
                            subtitleColor={kycStatus === 'VERIFIED' ? colors.accent : kycStatus === 'REJECTED' ? colors.danger : colors.textMuted}
                            icon={ShieldCheck}
                            iconColor={kycStatus === 'VERIFIED' ? colors.accent : colors.text}
                            iconBg={kycStatus === 'VERIFIED' ? colors.accentSoft : colors.surfaceSunken}
                            onPress={() => navigation.navigate('KYCVerification')}
                        />
                        <NavLink title="Security" icon={ShieldAlert} onPress={() => navigation.navigate('Security')} />
                        <NavLink
                            title="Blocked Accounts"
                            subtitle="People you've blocked from messaging you"
                            icon={Ban}
                            onPress={() => navigation.navigate('BlockedUsers')}
                            isLast
                        />
                    </NavCard>
                </View>

                <View style={styles.navBlock}>
                    <SectionHeader title="Appearance" />
                    <View style={styles.appearanceCard}>
                        <AppearanceToggle />
                        <Text style={styles.appearanceHint}>
                            System follows your phone's display setting.
                        </Text>
                    </View>
                </View>

                <View style={styles.navBlock}>
                    <SectionHeader title="Support & Community" />
                    <NavCard>
                        <NavLink title="Invite someone" icon={Share2} onPress={handleInvite} />
                        <NavLink title="Help & Support" icon={MessageCircleQuestion} onPress={() => navigation.navigate('SupportChat')} isLast />
                    </NavCard>
                </View>

                <View style={styles.navBlock}>
                    <SectionHeader title="Danger Zone" />
                    <NavCard>
                        <NavLink
                            title="Deactivate Account"
                            subtitle="Hide your account temporarily. Log back in anytime to reactivate."
                            icon={UserX}
                            iconColor={colors.warning}
                            iconBg={colors.warningSoft}
                            onPress={() => setDangerModal('deactivate')}
                        />
                        <NavLink title="Delete Account" icon={Trash2} onPress={() => setDangerModal('delete')} danger />
                        <NavLink title="Log Out" icon={LogOut} onPress={handleLogout} danger isLast />
                    </NavCard>
                </View>

            </ScrollView>

            <Modal
                visible={!!dangerModal}
                transparent
                animationType="fade"
                onRequestClose={closeDangerModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.dangerOverlay}
                >
                    <View style={styles.dangerCard}>
                        <View style={styles.dangerCardHeader}>
                            <Text style={styles.dangerCardTitle}>
                                {dangerModal === 'deactivate' ? 'Deactivate Account' : 'Delete Account'}
                            </Text>
                            <TouchableOpacity onPress={closeDangerModal}>
                                <X size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.dangerCardDesc}>
                            {dangerModal === 'deactivate'
                                ? "Your account will be hidden and you'll be signed out. Nothing is deleted — log back in anytime to pick up right where you left off."
                                : "This permanently removes your personal information and can't be undone. You'll need to withdraw your wallet balance and finish or cancel any active pickup first."}
                        </Text>

                        {needsPasswordConfirm && (
                            <TextInput
                                style={styles.dangerPasswordInput}
                                placeholder="Confirm your password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                value={dangerPassword}
                                onChangeText={setDangerPassword}
                                autoCapitalize="none"
                            />
                        )}

                        {!!dangerError && <Text style={styles.dangerErrorText}>{dangerError}</Text>}

                        <View style={styles.dangerActionsRow}>
                            <TouchableOpacity style={styles.dangerCancelBtn} onPress={closeDangerModal} disabled={dangerLoading}>
                                <Text style={styles.dangerCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dangerConfirmBtn, (needsPasswordConfirm && !dangerPassword.trim()) && styles.dangerConfirmBtnDisabled]}
                                onPress={handleDangerConfirm}
                                disabled={dangerLoading || (needsPasswordConfirm && !dangerPassword.trim())}
                            >
                                {dangerLoading ? (
                                    <ActivityIndicator color={colors.onPrimary} size="small" />
                                ) : (
                                    <Text style={styles.dangerConfirmBtnText}>
                                        {dangerModal === 'deactivate' ? 'Deactivate' : 'Delete Account'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((c) => ({
    appearanceCard: {
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: c.borderSubtle,
    },
    appearanceHint: {
        fontSize: 12,
        color: c.textMuted,
        marginTop: 10,
        textAlign: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: c.surface,
    },
    scrollContent: {
        paddingTop: 32,
        // Profile is now a tab, so it must clear the floating bar too.
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    identityContainer: {
        paddingHorizontal: 32,
        marginBottom: 40,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: c.surfaceSunken,
        marginBottom: 16,
    },
    identityNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    identityName: {
        fontSize: 24,
        fontWeight: '700',
        color: c.text,
        letterSpacing: -0.5,
    },
    identityHandle: {
        fontSize: 15,
        color: c.textSecondary,
        marginTop: 4,
        marginBottom: 12,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: c.surfaceSunken,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    roleBadgeText: {
        fontSize: 13,
        color: c.text,
        fontWeight: '600',
    },
    impactContainer: {
        paddingHorizontal: 32,
        marginBottom: 40,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: c.textMuted,
        letterSpacing: 1.2,
        marginBottom: 16,
    },
    impactRow: {
        flexDirection: 'row',
        gap: 12,
    },
    impactCard: {
        flex: 1,
        backgroundColor: c.surfaceAlt,
        borderRadius: 18,
        padding: 18,
    },
    impactValue: {
        fontSize: 28,
        fontWeight: '700',
        color: c.text,
        letterSpacing: -1,
        marginBottom: 8,
    },
    impactLabel: {
        fontSize: 13,
        color: c.textSecondary,
        lineHeight: 18,
    },
    contextualContainer: {
        paddingHorizontal: 24,
        marginBottom: 48,
    },
    contextCard: {
        backgroundColor: c.surfaceAlt,
        padding: 24,
        borderRadius: 18,
    },
    contextHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: c.accent, // Subtle Revesta green
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    contextTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: c.text,
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
        color: c.textSecondary,
        flex: 1,
    },
    contextLink: {
        fontSize: 14,
        fontWeight: '600',
        color: c.text,
    },
    navBlock: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    navCard: {
        backgroundColor: c.surfaceAlt,
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
        borderBottomColor: c.surfaceSunken,
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
        color: c.text,
        fontWeight: '500',
    },
    navLinkSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    navLinkTextDanger: {
        color: c.danger,
    },
    completionContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    completionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.accentSoft,
        borderRadius: 18,
        padding: 16,
        gap: 14,
    },
    completionRing: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2.5,
        borderColor: c.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completionRingText: {
        fontSize: 11,
        fontWeight: '700',
        color: c.accent,
    },
    completionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: c.text,
        marginBottom: 3,
    },
    completionDesc: {
        fontSize: 12,
        color: c.textSecondary,
        lineHeight: 17,
    },
    earnCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.text,
        borderRadius: 18,
        padding: 18,
        gap: 14,
    },
    earnIconBox: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: c.warning,
        alignItems: 'center',
        justifyContent: 'center',
    },
    earnTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: c.surface,
        marginBottom: 3,
    },
    earnDesc: {
        fontSize: 12,
        color: c.textMuted,
        lineHeight: 17,
    },
    dangerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    dangerCard: {
        backgroundColor: c.surface,
        borderRadius: 24,
        padding: 24,
    },
    dangerCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    dangerCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: c.text,
    },
    dangerCardDesc: {
        fontSize: 14,
        color: c.textSecondary,
        lineHeight: 20,
        marginBottom: 18,
    },
    dangerPasswordInput: {
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: c.text,
        marginBottom: 12,
    },
    dangerErrorText: {
        fontSize: 13,
        color: c.danger,
        marginBottom: 12,
    },
    dangerActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    dangerCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
    },
    dangerCancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: c.text,
    },
    dangerConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: c.danger,
        alignItems: 'center',
    },
    dangerConfirmBtnDisabled: {
        opacity: 0.5,
    },
    dangerConfirmBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: c.surface,
    },
}));
