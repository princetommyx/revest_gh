import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, Switch, ScrollView, Alert, StatusBar, Dimensions
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

const { width } = Dimensions.get('window');

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
                {/* Organic Curved Header */}
                <View style={styles.headerBackground}>
                    <View style={styles.curvedShape} />
                    <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
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
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                    <View>
                                        <Text style={styles.greetingText}>My Profile</Text>
                                        <Text style={styles.name}>{user?.username || 'Guest User'}</Text>
                                    </View>
                                    <View style={[
                                        styles.roleBadge,
                                        userRole === 'RECYCLER' && { backgroundColor: '#0284c7' },
                                        userRole === 'SELLER' && { backgroundColor: '#ea580c' }
                                    ]}>
                                        <Text style={styles.roleText}>
                                            {userRole === 'SELLER' ? 'DISPOSER' : userRole || 'USER'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.email}>{user?.email || 'No email connected'}</Text>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Overlapping Stats Card */}
                <View style={styles.overlappingCard}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{Array.isArray(pickups) ? pickups.length : 0}</Text>
                        <Text style={styles.statLabel}>Pickups</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>Gold</Text>
                        <Text style={styles.statLabel}>Member</Text>
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
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
                            onPress={() => navigation.navigate('Main', { screen: 'Wallet' })}
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
                    <Text style={styles.sectionTitle}>Help & Support</Text>
                    <View style={styles.menuGroup}>
                        <MenuItem
                            icon={MessageSquare}
                            title="Chat Support"
                            subtitle="Get help with your orders"
                            onPress={() => navigation.navigate('SupportChat')}
                            color="#8B5CF6"
                            iconBg="#EDE9FE"
                            isLast
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F7F4',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerBackground: {
        height: 240,
        backgroundColor: '#2E7D32',
        position: 'relative',
        overflow: 'hidden',
    },
    curvedShape: {
        position: 'absolute',
        bottom: -120,
        left: -width * 0.25,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        backgroundColor: '#388E3C',
        opacity: 0.3,
    },
    headerContent: {
        paddingHorizontal: 25,
        paddingTop: 20,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 20,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    placeholderAvatar: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    userInfo: {
        flex: 1,
    },
    greetingText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    email: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    roleBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginLeft: 12,
    },
    roleText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 10,
        letterSpacing: 0.5,
    },
    overlappingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -40,
        borderRadius: 25,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 1,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#F3F4F6',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    section: {
        marginTop: 30,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        marginLeft: 5,
    },
    menuGroup: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    menuSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    logoutText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
