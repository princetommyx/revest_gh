import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ScrollView, Alert, StatusBar, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    User, Settings, Shield,
    LogOut, ChevronRight,
    Wallet, Clock, MessageSquare, ArrowLeft, MoreHorizontal, Edit3
} from 'lucide-react-native';
import { usePickupHistory } from '../hooks/usePickupHistory';
import { BASE_URL } from '../api/client';

const { width } = Dimensions.get('window');

const MenuItem = ({ icon: Icon, title, subtitle, onPress, isLast, color = "#111" }) => (
    <TouchableOpacity
        style={[styles.menuItem, isLast && styles.menuItemLast]}
        onPress={onPress}
    >
        <View style={styles.menuIconContainer}>
            <Icon size={22} color={color} />
        </View>
        <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{title}</Text>
            {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        <ChevronRight size={18} color="#ccc" />
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }) {
    const { user, signOut, userRole } = useAuth();
    const { data: pickups = [] } = usePickupHistory();
    const insets = useSafeAreaInsets();

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: () => signOut() }
            ]
        );
    };

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const profilePic = resolveImageUrl(user?.profile_picture_url);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Large Image Header */}
            <View style={styles.headerImageContainer}>
                {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.headerImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.headerImage, styles.placeholderBg]}>
                        <User size={80} color="#666" />
                    </View>
                )}
                
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Overlapping Primary Card (Info & Quick Actions) */}
                <View style={styles.primaryCard}>
                    <View style={styles.cardHeaderRow}>
                        <View>
                            <Text style={styles.userName}>{user?.username || 'Guest User'}</Text>
                            <View style={styles.roleRow}>
                                <Text style={styles.userRole}>{userRole === 'SELLER' ? 'DISPOSER' : userRole || 'USER'}</Text>
                                {user?.kyc_status === 'VERIFIED' && <Shield size={14} color="#4ADE80" fill="#22C55E" style={{ marginLeft: 6 }} />}
                            </View>
                        </View>
                        <View style={styles.badgeBox}>
                            <Text style={styles.badgeText}>{Array.isArray(pickups) ? pickups.length : 0} Pickups</Text>
                        </View>
                    </View>

                    {/* Quick Action Circles */}
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('EditProfile')}>
                            <View style={styles.actionIconCircle}>
                                <Edit3 size={20} color="#111" />
                            </View>
                            <Text style={styles.actionText}>Edit Profile</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Main', { screen: 'Wallet' })}>
                            <View style={styles.actionIconCircle}>
                                <Wallet size={20} color="#111" />
                            </View>
                            <Text style={styles.actionText}>Wallet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('SupportChat')}>
                            <View style={styles.actionIconCircle}>
                                <MessageSquare size={20} color="#111" />
                            </View>
                            <Text style={styles.actionText}>Support</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Secondary Card (Settings Menu) */}
                <View style={styles.secondaryCard}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>

                    <View style={styles.menuGroup}>
                        {(userRole === 'COLLECTOR' || userRole === 'RECYCLER') && (
                            <MenuItem
                                icon={Shield}
                                title="Identity Verification"
                                subtitle={user?.kyc_status === 'VERIFIED' ? 'Verified Account' : 'Required for Withdrawals'}
                                onPress={() => navigation.navigate('KYCVerification')}
                            />
                        )}
                        <MenuItem
                            icon={Clock}
                            title="Pickup History"
                            subtitle="View past requests"
                            onPress={() => navigation.navigate('PickupHistory')}
                        />
                        <MenuItem
                            icon={Shield}
                            title="Security & Privacy"
                            subtitle="Password, 2FA"
                            onPress={() => navigation.navigate('Security')}
                            isLast={false}
                        />
                        <MenuItem
                            icon={LogOut}
                            title="Log Out"
                            subtitle="Sign out of your account"
                            color="#EF4444"
                            onPress={handleLogout}
                            isLast={true}
                        />
                    </View>
                </View>
                
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Header Controls Overlay */}
            <SafeAreaView edges={['top']} style={styles.headerOverlay} pointerEvents="box-none">
                <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={20} color="#111" />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    headerImageContainer: {
        width: '100%',
        height: 380, // Large height like the mockup
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    placeholderBg: {
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        zIndex: 100,
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    scrollContent: {
        paddingTop: 320, // Start scrolling over the image
        paddingBottom: 40,
    },
    primaryCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
        marginBottom: 20,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userRole: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    badgeBox: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    badgeText: {
        color: '#111',
        fontWeight: 'bold',
        fontSize: 14,
    },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 2,
    },
    actionText: {
        fontSize: 12,
        color: '#111',
        fontWeight: '600',
    },
    secondaryCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 20,
    },
    menuGroup: {
        backgroundColor: '#FFF',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    menuItemLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
        color: '#999',
    },
});
