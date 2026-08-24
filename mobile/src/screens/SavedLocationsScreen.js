import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Home, Briefcase, MapPin, Plus } from 'lucide-react-native';

const LocationItem = ({ icon: Icon, title, address, isLast }) => (
    <TouchableOpacity
        style={[styles.locationItem, isLast && styles.locationItemLast]}
        activeOpacity={0.6}
    >
        <View style={styles.iconContainer}>
            <Icon size={20} color="#111827" strokeWidth={2} />
        </View>
        <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.address} numberOfLines={1}>{address}</Text>
        </View>
    </TouchableOpacity>
);

export default function SavedLocationsScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#111827" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Saved Locations</Text>
                <View style={{ width: 40 }} /> {/* Placeholder for balance */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <Text style={styles.sectionTitle}>FAVORITES</Text>
                
                <View style={styles.listContainer}>
                    <LocationItem 
                        icon={Home}
                        title="Home"
                        address="East Legon, Boundary Road"
                    />
                    <LocationItem 
                        icon={Briefcase}
                        title="Work"
                        address="Airport Residential Area, Accra"
                        isLast={true}
                    />
                </View>

                <Text style={styles.sectionTitle}>OTHER LOCATIONS</Text>
                
                <View style={styles.listContainer}>
                    <LocationItem 
                        icon={MapPin}
                        title="Drop-off Point A"
                        address="Madina Market"
                    />
                    <LocationItem 
                        icon={MapPin}
                        title="Recycling Hub"
                        address="Achimota Retail Center"
                        isLast={true}
                    />
                </View>

                <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
                    <Plus size={20} color="#059669" strokeWidth={2.5} style={{ marginRight: 8 }} />
                    <Text style={styles.addBtnText}>Add new location</Text>
                </TouchableOpacity>
                
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    scrollContent: {
        paddingHorizontal: 32,
        paddingBottom: 60,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1.2,
        marginBottom: 16,
        marginTop: 24,
    },
    listContainer: {
        marginBottom: 8,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    locationItemLast: {
        borderBottomWidth: 0,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    address: {
        fontSize: 14,
        color: '#6B7280',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
        paddingVertical: 12,
    },
    addBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#059669', // Revesta green
    },
});
