import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, Switch, ScrollView, Alert, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    User, Settings, Shield, Bell,
    LogOut, ChevronRight, HelpCircle,
    Star, Wallet, Package, Clock, MessageSquare
} from 'lucide-react-native';
import { usePickupHistory } from '../hooks/usePickupHistory';
import { BASE_URL } from '../api/client';

const MenuItem = ({ icon: Icon, title, subtitle, onPress, isLast, color = "#2E7D32", iconBg }) => (
    <TouchableOpacity
        style={[styles.menuItem, isLast && styles.menuItemLast]}
        onPress={onPress}
    >
        <View style={[styles.iconBox, { backgroundColor: iconBg || `${color}15` }]}>
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Green Header Section - Matching Home Screen */}
                <View style={styles.greenHeaderContainer}>
                    <SafeAreaView edges={['top', 'left', 'right']}>
                        <View style={styles.headerContent}>
                            <View style={styles.profileRow}>
                                <View style={styles.avatarContainer}>
                                    {user?.profile_picture_url ? (
                                        <Image
                                            source={{ uri: resolveImageUrl(user.profile_picture_url) }}
                                            style={styles.avatar}
                                        />
                                    ) : (
                                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                                            <User size={40} color="#fff" />
                                        </View>
                                    )}
                                    <TouchableOpacity style={styles.editBadge} onPress={() => navigation.navigate('EditProfile')}>
                                        <Settings size={14} color="#F59E0B" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.userInfo}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.name}>{user?.username || 'Guest User'}</Text>
                                        {userRole === 'COLLECTOR' && (
                                            <View style={styles.roleBadge}>
                                                <Text style={styles.roleText}>COLLECTOR</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.email}>{user?.email || 'No email connected'}</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Overlapping Stats Card - Matching Home Screen */}
                <View style={styles.overlappingCard}>
                    <Text style={styles.statValue}>{Array.isArray(pickups) ? pickups.length : 0}</Text>
                    <Text style={styles.statLabel}>Pickups</Text>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.menuGroup}>
                        <MenuItem
                            icon={User}
                            title="Personal Details"
                            subtitle="Name, Phone, City"
                            onPress={() => navigation.navigate('EditProfile')}
                            color="#2E7D32"
                            iconBg="#E8F5E9"
                        />
                        <MenuItem
                            icon={Clock}
                            title="Pickup History"
                            subtitle="View past requests"
                            onPress={() => navigation.navigate('PickupHistory')}
                            color="#4B5563"
                            iconBg="#F3F4F6"
                        />
                        <MenuItem
                            icon={Wallet}
                            title="Wallet & Payment"
                            subtitle="Manage Mobile Money"
                            onPress={() => navigation.navigate('Wallet')}
                            color="#D97706"
                            iconBg="#FEF3C7"
                        />
                        <MenuItem
                            icon={Shield}
                            title="Security & Privacy"
                            subtitle="Password, 2FA"
                            onPress={() => navigation.navigate('Security')}
                            color="#DC2626"
                            iconBg="#FEE2E2"
                            isLast
                        />
                    </View>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>
                    <View style={styles.menuGroup}>
                        <MenuItem
                            icon={Bell}
                            title="Notifications"
                            onPress={() => navigation.navigate('Notifications')}
                            color="#2563EB"
                            iconBg="#DBEAFE"
                        />
                        <MenuItem
                            icon={MessageSquare}
                            title="Chat Support"
                            onPress={() => navigation.navigate('SupportChat')}
                            color="#8B5CF6"
                            iconBg="#EDE9FE"
                            isLast
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    scrollContent: { paddingBottom: 40 },

    // Header Style from HomeScreen
    greenHeaderContainer: {
        backgroundColor: '#2E7D32',
        paddingBottom: 80, // High padding for overlap
        paddingTop: 10,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 0,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    placeholderAvatar: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    userInfo: {
        flex: 1,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    email: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    roleBadge: {
        backgroundColor: '#1B5E20',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginLeft: 8,
    },
    roleText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 10,
        letterSpacing: 0.5,
    },

    // Overlapping Card from HomeScreen
    overlappingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -50, // Negative margin to overlap
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
        marginBottom: 24,
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },

    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    menuGroup: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        color: '#9CA3AF',
    },

    logoutBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        paddingVertical: 16,
    },
    logoutText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 16,
    },
});
