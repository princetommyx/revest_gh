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
import { MapPin, Box, ArrowRight } from 'lucide-react-native';

const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
);

const NavLink = ({ title, onPress }) => (
    <TouchableOpacity style={styles.navLink} onPress={onPress} activeOpacity={0.5}>
        <Text style={styles.navLinkText}>{title}</Text>
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }) {
    const { user, signOut, userRole } = useAuth();
    const isDisposer = userRole === 'SELLER';

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
    const { data: listingsData, isLoading: loadingListings } = useQuery({
        queryKey: ['myListings'],
        queryFn: () => marketApi.getMyListings(),
    });

    // Extract arrays from paginated response
    const jobs = Array.isArray(pickupsData) ? pickupsData : (pickupsData?.results || []);
    const listings = Array.isArray(listingsData) ? listingsData : (listingsData?.results || []);

    // Derive dynamic context
    const activeJob = jobs.find(j => ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(j.status));
    const activeListing = listings.find(l => l.status === 'AVAILABLE');
    
    // Impact calculations (mocked for this scope unless real data exists in response)
    const completedPickups = jobs.filter(j => j.status === 'COMPLETED').length || 24; 
    // Usually we would calculate weight, but we'll mock 156 kg for demonstration as requested
    const totalWeight = '156';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Top Section: Identity */}
                <View style={styles.identityContainer}>
                    <Image 
                        source={{ uri: user?.avatar || 'https://ui-avatars.com/api/?name=' + (user?.username || 'User') + '&background=F3F4F6&color=111&size=128' }} 
                        style={styles.avatar} 
                    />
                    <Text style={styles.identityName}>{user?.username || 'Guest User'}</Text>
                    <Text style={styles.identityHandle}>@{ (user?.username || 'guest').toLowerCase().replace(' ', '') }</Text>
                    <Text style={styles.identityRole}>{isDisposer ? 'Disposer' : 'Collector'}</Text>
                </View>

                {/* Activity / Impact */}
                <View style={styles.impactContainer}>
                    <Text style={styles.sectionHeader}>YOUR REVESTA ACTIVITY</Text>
                    <View style={styles.impactRow}>
                        <View style={styles.impactMetric}>
                            <Text style={styles.impactValue}>{completedPickups}</Text>
                            <Text style={styles.impactLabel}>Pickups{'\n'}completed</Text>
                        </View>
                        <View style={styles.impactMetric}>
                            <Text style={styles.impactValue}>{totalWeight} <Text style={{fontSize: 16}}>kg</Text></Text>
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
                            <TouchableOpacity style={styles.contextCard} onPress={() => navigation.navigate('Main', { screen: 'Market' })} activeOpacity={0.8}>
                                <Text style={styles.contextHeader}>ACTIVE LISTING</Text>
                                <Text style={styles.contextTitle}>{activeListing.weight_kg} kg {activeListing.material_type}</Text>
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
                    <NavLink title="My Listings" onPress={() => navigation.navigate('Main', { screen: 'Market' })} />
                    <NavLink title="Pickup History" onPress={() => navigation.navigate('Main', { screen: 'Pickups' })} />
                    <NavLink title="Saved Locations" onPress={() => navigation.navigate('SavedLocations')} />
                </View>

                <View style={styles.navBlock}>
                    <SectionHeader title="Account" />
                    <NavLink title="Profile Information" onPress={() => navigation.navigate('EditProfile')} />
                    <NavLink title="Verification" onPress={() => navigation.navigate('KYCVerification')} />
                    <NavLink title="Security" onPress={() => navigation.navigate('Security')} />
                </View>

                <View style={styles.navBlock}>
                    <SectionHeader title="Support & Community" />
                    <NavLink title="Invite someone" onPress={handleInvite} />
                    <NavLink title="Help & Support" onPress={() => navigation.navigate('SupportChat')} />
                </View>

                {/* Log Out */}
                <View style={styles.logoutContainer}>
                    <TouchableOpacity onPress={handleLogout} activeOpacity={0.5}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
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
    identityName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    identityHandle: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 12,
    },
    identityRole: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
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
        gap: 40,
    },
    impactMetric: {
        flex: 1,
    },
    impactValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -1,
        marginBottom: 8,
    },
    impactLabel: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    contextualContainer: {
        paddingHorizontal: 24,
        marginBottom: 48,
    },
    contextCard: {
        backgroundColor: '#F9FAFB',
        padding: 24,
        borderRadius: 16,
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
        paddingHorizontal: 32,
        marginBottom: 40,
    },
    navLink: {
        paddingVertical: 12,
    },
    navLinkText: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '400',
    },
    logoutContainer: {
        paddingHorizontal: 32,
        marginTop: 20,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#EF4444',
    },
});
