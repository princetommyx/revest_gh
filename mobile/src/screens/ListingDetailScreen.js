import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, User, MessageSquare, Tag } from 'lucide-react-native';
import { marketApi } from '../api/market';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';

export default function ListingDetailScreen({ route, navigation }) {
    const { listingId } = route.params;
    const { user } = useAuth();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchListing();
    }, [listingId]);

    const fetchListing = async () => {
        try {
            const data = await marketApi.getListing(listingId);
            setListing(data);
        } catch (error) {
            console.error("Fetch Listing Error:", error);
            Toast.show("Failed to load listing", { backgroundColor: '#E74C3C' });
        } finally {
            setLoading(false);
        }
    };

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const handleContactSeller = () => {
        navigation.navigate('ChatDetail', {
            contactId: listing.seller.id,
            contactName: listing.seller_name
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                </View>
            </SafeAreaView>
        );
    }

    if (!listing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>Listing not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Listing Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image */}
                <View style={styles.imageContainer}>
                    {listing.image ? (
                        <Image
                            source={{ uri: resolveImageUrl(listing.image) }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Tag size={64} color="#ccc" />
                        </View>
                    )}
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                    {/* Title and Price */}
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
                        <View style={[styles.priceBadge, listing.is_free ? styles.freeBadge : styles.paidBadge]}>
                            <Text style={[styles.priceText, listing.is_free ? styles.freeText : styles.paidText]}>
                                {listing.is_free ? 'FREE' : `₵${listing.price}`}
                            </Text>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.locationRow}>
                        <MapPin size={18} color="#888" />
                        <Text style={styles.locationText}>{listing.location}</Text>
                    </View>

                    {/* Tags */}
                    <View style={styles.tagsRow}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{listing.material_type}</Text>
                        </View>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{listing.quantity}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>{listing.description}</Text>
                    </View>

                    {/* Seller Info */}
                    <View style={styles.section}>
                        <View style={styles.sellerRow}>
                            <View style={styles.sellerIcon}>
                                <User size={24} color="#2E7D32" />
                            </View>
                            <View>
                                <Text style={styles.sellerName}>{listing.seller_name}</Text>
                                <Text style={styles.sellerLabel}>Seller</Text>
                            </View>
                        </View>

                        {user?.username !== listing.seller_name && (
                            <TouchableOpacity
                                style={styles.contactButton}
                                onPress={handleContactSeller}
                            >
                                <MessageSquare size={20} color="#fff" />
                                <Text style={styles.contactButtonText}>Contact Seller</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },

    scrollContent: { paddingBottom: 30 },

    imageContainer: { width: '100%', height: 300, backgroundColor: '#f1f3f5' },
    image: { width: '100%', height: '100%' },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f3f5'
    },

    detailsContainer: { padding: 20, backgroundColor: '#fff', marginTop: 2 },

    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', flex: 1, marginRight: 10 },

    priceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    freeBadge: { backgroundColor: '#E8F5E9' },
    paidBadge: { backgroundColor: '#E3F2FD' },
    priceText: { fontSize: 14, fontWeight: 'bold' },
    freeText: { color: '#2E7D32' },
    paidText: { color: '#1976D2' },

    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16
    },
    locationText: { fontSize: 16, color: '#666' },

    tagsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    tag: { backgroundColor: '#f1f3f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    tagText: { fontSize: 14, fontWeight: '500', color: '#666' },

    section: {
        borderTopWidth: 1,
        borderTopColor: '#f1f3f5',
        paddingTop: 20,
        marginTop: 20
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
    descriptionText: { fontSize: 16, color: '#666', lineHeight: 24 },

    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20
    },
    sellerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    sellerName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
    sellerLabel: { fontSize: 12, color: '#999' },

    contactButton: {
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    contactButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    errorText: { fontSize: 16, color: '#999' }
});
