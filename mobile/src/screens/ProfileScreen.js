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
    Star, Wallet, Package
} from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
    const { user, signOut, userRole } = useAuth();

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

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = "#1a1a1a" }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.iconBox, { backgroundColor: color + '10' }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
            </View>
            <ChevronRight size={20} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarBox}>
                            <User size={40} color="#2E7D32" />
                            <TouchableOpacity style={styles.editBadge}>
                                <Settings size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.nameSection}>
                            <Text style={styles.userName}>{user?.username || 'User'}</Text>
                            <Text style={styles.userEmail}>{user?.email || 'email@revesta.com'}</Text>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{userRole || 'SELLER'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>0</Text>
                        <Text style={styles.statLabel}>Pickups</Text>
                    </View>
                    <View style={[styles.statCard, styles.statBorder]}>
                        <Text style={styles.statVal}>4.9</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>0</Text>
                        <Text style={styles.statLabel}>Days</Text>
                    </View>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <MenuItem
                        icon={User}
                        title="Personal Information"
                        subtitle="Update your name and number"
                        onPress={() => navigation.navigate('EditProfile')}
                        color="#2E7D32"
                    />
                    <MenuItem
                        icon={Wallet}
                        title="Wallet Settings"
                        subtitle="Manage MoMo accounts"
                        onPress={() => navigation.navigate('Wallet')}
                        color="#F39C12"
                    />
                    <MenuItem
                        icon={Shield}
                        title="Security"
                        subtitle="Password and 2FA"
                        onPress={() => navigation.navigate('Security')}
                        color="#E74C3C"
                    />
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <MenuItem
                        icon={Bell}
                        title="Notifications"
                        onPress={() => Alert.alert("Coming Soon", "Notification settings will be available in the next update.")}
                        color="#3498DB"
                    />
                    <MenuItem
                        icon={HelpCircle}
                        title="Support & Help"
                        onPress={() => navigation.navigate('Help')}
                        color="#9B59B6"
                    />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#fff" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0 (Alpha)</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 25, backgroundColor: '#fff' },
    profileInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarBox: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#E8F5E9', justifyContent: 'center',
        alignItems: 'center', position: 'relative'
    },
    editBadge: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#2E7D32', width: 24, height: 24,
        borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    nameSection: { marginLeft: 20 },
    userName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    userEmail: { fontSize: 14, color: '#888', marginBottom: 8 },
    roleBadge: {
        backgroundColor: '#2E7D32', paddingHorizontal: 12,
        paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start'
    },
    roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    statsRow: {
        flexDirection: 'row', padding: 20,
        backgroundColor: '#f8f9fa', marginHorizontal: 20,
        borderRadius: 20, marginBottom: 30
    },
    statCard: { flex: 1, alignItems: 'center' },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#eee' },
    statVal: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
    statLabel: { fontSize: 12, color: '#888', marginTop: 4 },

    menuSection: { paddingHorizontal: 25, marginBottom: 30 },
    sectionTitle: {
        fontSize: 14, fontWeight: 'bold', color: '#999',
        textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, marginBottom: 15
    },
    iconBox: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center'
    },
    menuText: { flex: 1, marginLeft: 15 },
    menuTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
    menuSub: { fontSize: 12, color: '#999', marginTop: 2 },

    logoutBtn: {
        flexDirection: 'row', backgroundColor: '#E74C3C',
        marginHorizontal: 25, padding: 18, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center', gap: 10,
        marginBottom: 20, elevation: 5, shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    version: { textAlign: 'center', color: '#ccc', fontSize: 12, marginBottom: 30 }
});
