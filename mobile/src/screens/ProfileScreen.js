import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Alert, StatusBar, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
    User, Settings, Shield,
    LogOut, ChevronRight,
    Wallet, Clock, Heart, MoreVertical,
    FileText, Smartphone, Award, Settings2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MenuItem = ({ icon: Icon, title, onPress, isLast, iconColor = "#666", customIcon }) => (
    <TouchableOpacity
        style={[styles.menuItem, isLast && styles.menuItemLast]}
        onPress={onPress}
    >
        <View style={styles.menuIconContainer}>
            {customIcon ? customIcon : <Icon size={24} color={iconColor} strokeWidth={1.5} />}
        </View>
        <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{title}</Text>
        </View>
        <ChevronRight size={20} color="#ccc" strokeWidth={1.5} />
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }) {
    const { user, signOut, userRole } = useAuth();
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

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.userName} numberOfLines={1}>
                    {user?.username || 'Guest User'} <Text style={styles.userHandle}>@{(user?.username || 'guest').toLowerCase().replace(' ', '.')}</Text>
                </Text>
                <View style={styles.roleContainer}>
                    <Award size={16} color="#8B5CF6" />
                    <Text style={styles.roleText}>{userRole === 'SELLER' ? 'Disposer' : 'Collector'}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >
                {/* Gradient Banner */}
                <LinearGradient 
                    colors={['#FF7C52', '#8B5CF6']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 0 }} 
                    style={styles.banner}
                >
                    <View style={styles.bannerLeft}>
                        <MoreVertical size={20} color="#FFF" style={{ opacity: 0.6, marginRight: 8 }} />
                        <Heart size={24} color="#FFF" strokeWidth={2} />
                    </View>
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>Enjoying Revesta?</Text>
                        <Text style={styles.bannerSubtitle}>Refer a friend and earn rewards</Text>
                    </View>
                    <ChevronRight size={24} color="#FFF" />
                </LinearGradient>

                {/* Menu List */}
                <View style={styles.menuGroup}>
                    <MenuItem
                        customIcon={
                            <View style={styles.bronzeBadge}>
                                <View style={styles.bronzeBadgeInner} />
                            </View>
                        }
                        title="Membership Status - Active"
                        onPress={() => {}}
                    />
                    <MenuItem
                        icon={Settings2}
                        title="Security settings"
                        onPress={() => navigation.navigate('Security')}
                    />
                    <MenuItem
                        icon={Settings}
                        title="Profile information"
                        onPress={() => navigation.navigate('EditProfile')}
                    />
                    <MenuItem
                        icon={FileText}
                        title="KYC information"
                        onPress={() => navigation.navigate('KYCVerification')}
                    />

                    <MenuItem
                        icon={Wallet}
                        title="View wallets"
                        onPress={() => navigation.navigate('Main', { screen: 'Wallet' })}
                    />
                    <MenuItem
                        icon={Smartphone}
                        title="Chat support"
                        onPress={() => navigation.navigate('SupportChat')}
                    />
                    <MenuItem
                        icon={LogOut}
                        title="Log Out"
                        iconColor="#EF4444"
                        onPress={handleLogout}
                        isLast={true}
                    />
                </View>
                
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    userHandle: {
        fontSize: 16,
        fontWeight: 'normal',
        color: '#999',
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    roleText: {
        fontSize: 15,
        color: '#444',
        fontWeight: '500',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    banner: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    bannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    bannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
    },
    menuGroup: {
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    menuIconContainer: {
        width: 32,
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginRight: 16,
    },
    bronzeBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D4AF37', // Gold/Bronze color
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    bronzeBadgeInner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#C5A028',
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#111',
    },
});
