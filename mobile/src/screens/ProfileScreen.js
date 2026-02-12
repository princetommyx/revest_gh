import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    User, Settings, Shield, Bell,
    LogOut, ChevronRight, HelpCircle,
    Star, Wallet, Package, Clock
} from 'lucide-react-native';
import { usePickupHistory } from '../hooks/usePickupHistory';
import { BASE_URL } from '../api/client';

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

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = "#1a1a1a", isLast }) => (
        <TouchableOpacity
            style={[styles.menuItem, isLast && styles.menuItemLast]}
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.menuTextContent}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            <ChevronRight size={18} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Brand Header */}
                <View style={styles.headerBackground}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.headerContent}>
                            <View style={styles.avatarBox}>
                                {user?.profile_picture_url ? (
                                    <Image
                                        source={{ uri: resolveImageUrl(user.profile_picture_url) }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <User size={32} color="rgba(255,255,255,0.7)" />
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.editBadge}
                                    onPress={() => navigation.navigate('EditProfile')}
                                >
                                    <Settings size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.userInfo}>
                                <View style={styles.userNameRow}>
                                    <Text style={styles.userName}>{user?.username || 'Guest User'}</Text>
                                    {user?.is_verified && <Shield size={16} color="#FFD700" fill="#FFD700" style={styles.verifiedBadge} />}
                                </View>
                                <Text style={styles.userEmail}>{user?.email || 'No email connected'}</Text>
                                <View style={styles.roleTag}>
                                    <Text style={styles.roleText}>{userRole || 'MEMBER'}</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Floating Stats Card */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{Array.isArray(pickups) ? pickups.length : 0}</Text>
                        <Text style={styles.statLabel}>Pickups</Text>
                    </View>
                </View>

                {/* Account Settings Group */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={User}
                        title="Personal Details"
                        subtitle="Name, Phone, City"
                        onPress={() => navigation.navigate('EditProfile')}
                        color="#2E7D32"
                    />
                    <MenuItem
                        icon={Clock}
                        title="Pickup History"
                        subtitle="View past requests"
                        onPress={() => navigation.navigate('PickupHistory')}
                        color="#5C6BC0"
                    />
                    <MenuItem
                        icon={Wallet}
                        title="Wallet & Payment"
                        subtitle="Manage Mobile Money"
                        onPress={() => navigation.navigate('Wallet')}
                        color="#F39C12"
                    />
                    <MenuItem
                        icon={Shield}
                        title="Security & Privacy"
                        subtitle="Password, 2FA"
                        onPress={() => navigation.navigate('Security')}
                        color="#E74C3C"
                        isLast
                    />
                </View>

                {/* Preferences Group */}
                <Text style={styles.sectionTitle}>Support</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={Bell}
                        title="Notifications"
                        onPress={() => Alert.alert("Coming Soon", "Notification settings will be available shortly.")}
                        color="#3498DB"
                    />
                    <MenuItem
                        icon={HelpCircle}
                        title="Help Center"
                        onPress={() => navigation.navigate('Help')}
                        color="#9B59B6"
                        isLast
                    />
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#E74C3C" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>ReVesta v1.0.2 • Build 2024</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f2f7' }, // iOS system gray

    headerBackground: {
        backgroundColor: '#2E7D32',
        paddingTop: 20,
        paddingBottom: 80, // Space for overlapping card
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarBox: {
        position: 'relative',
        marginRight: 20,
    },
    avatar: {
        width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }
    },
    avatarPlaceholder: {
        width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center'
    },
    editBadge: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#F39C12', width: 26, height: 26,
        borderRadius: 13, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#2E7D32'
    },
    userInfo: { flex: 1 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    userName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    verifiedBadge: { marginTop: 2 },
    userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    roleTag: {
        backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 16, alignSelf: 'flex-start', marginTop: 10
    },
    roleText: { color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },

    // Stats Card (Floating)
    statsContainer: {
        marginTop: -50,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        marginBottom: 28
    },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
    statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
    statDivider: { width: 1, backgroundColor: '#f0f0f0', height: '80%' },

    // Menu Sections
    scrollContent: { paddingBottom: 40 },
    sectionTitle: {
        fontSize: 14, fontWeight: '600', color: '#666',
        marginLeft: 25, marginBottom: 10, marginTop: 10,
        textTransform: 'uppercase'
    },
    menuGroup: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 20,
        paddingVertical: 6,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 15, paddingHorizontal: 15,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    menuItemLast: { borderBottomWidth: 0 },

    iconContainer: {
        width: 36, height: 36, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    menuTextContent: { flex: 1 },
    menuTitle: { fontSize: 16, color: '#333', fontWeight: '500' },
    menuSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },

    logoutBtn: {
        marginHorizontal: 20,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#fee'
    },
    logoutText: { color: '#E74C3C', fontSize: 16, fontWeight: '600' },

    versionText: { textAlign: 'center', color: '#ccc', fontSize: 12, marginBottom: 30 }
});
