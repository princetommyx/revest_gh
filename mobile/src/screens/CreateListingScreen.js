import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Image, ActivityIndicator,
    Platform, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Upload, Camera, MapPin, Package, Tag, Info, Check, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { marketApi } from '../api/market';
import Toast from 'react-native-toast-message';

import { useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

export default function CreateListingScreen({ navigation }) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        material_type: '',
        description: '',
        quantity: '',
        weight_kg: 0,
        price: '',
        track_type: 'A', // Default to Track A
        is_free: false,
        location: '',
        latitude: null,
        longitude: null
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Material display mapping (Backend -> User Friendly)
    const MATERIAL_DISPLAY_MAP = {
        'PURE_WATER_RUBBERS': 'Pure Water Rubbers',
        'PURE_WATER_RUBBERS_BALE': 'Pure Water Rubbers Bale',
        'PLASTIC_BOTTLES': 'Plastic Bottles',
        'PLASTIC_BOTTLES_BALE': 'Plastic Bottles Bale',
        'PET': 'PET Bottles',
        'HDPE': 'HDPE Plastics'
    };

    // AI Pricing Logic (Updated for Track A/B and Fixed Pricing)
    React.useEffect(() => {
        if (formData.material_type && formData.weight_kg) {
            // FIXED PRICE CHECK: Skip recalculation for fixed-price high-value items
            const isFixedPriceItem = [
                'PURE_WATER_RUBBERS', 'PURE_WATER_RUBBERS_BALE',
                'PLASTIC_BOTTLES', 'PLASTIC_BOTTLES_BALE'
            ].includes(formData.material_type);

            if (isFixedPriceItem) return;

            // Only auto-calculate for general materials if AI didn't already provide a specific estimate
            if (!scanResult || scanResult.material_type !== formData.material_type) {
                const rates = {
                    'PET': 1.5,
                    'Plastics': 1.2,
                    'Metals': 4.0,
                    'Paper': 0.8,
                    'Glass': 0.5,
                    'Electronics': 8.0,
                    'Organic': 1.0,
                    'Other': 0.5
                };
                const rate = rates[formData.material_type] || 1.0;
                const weight = formData.weight_kg > 0 ? formData.weight_kg : 5;
                const estimatedValue = (rate * weight).toFixed(2);
                setFormData(prev => ({ ...prev, price: estimatedValue }));
            }
        }
    }, [formData.material_type, formData.weight_kg]);

    // ... Get Location on Mount ...
    React.useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let location = await Location.getCurrentPositionAsync({});
            setFormData(prev => ({
                ...prev,
                latitude: parseFloat(location.coords.latitude.toFixed(6)),
                longitude: parseFloat(location.coords.longitude.toFixed(6))
            }));
        })();
    }, []);

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Permission required' });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                setSelectedAsset(asset);
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Error picking image' });
        }
    };

    const handleSubmit = async () => {
        if (!formData.title) {
            Toast.show({ type: 'error', text1: 'Missing field', text2: 'Please enter a title' });
            return;
        }
        if (!formData.material_type) {
            Toast.show({ type: 'error', text1: 'Missing field', text2: 'Please select a material type' });
            return;
        }
        if (!formData.quantity) {
            Toast.show({ type: 'error', text1: 'Missing field', text2: 'Please enter a quantity' });
            return;
        }
        if (!formData.location) {
            Toast.show({ type: 'error', text1: 'Missing field', text2: 'Please enter a location' });
            return;
        }
        setLoading(true);
        try {
            const data = new FormData();
            if (selectedAsset) {
                const uri = selectedAsset.uri;
                let name = selectedAsset.fileName || uri.split('/').pop();
                if (!name.includes('.')) name += '.jpg';
                let type = selectedAsset.mimeType || 'image/jpeg';
                data.append('image', { uri, name, type });
            }

            // Append formatted data
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    data.append(key, formData[key].toString());
                }
            });

            // Specific mapping if backend expects 'track' instead of 'track_type'
            // My backend change used 'track' for Listing but PickupRequest used 'track_type'.
            // In market/models.py I used 'track'.
            data.append('track', formData.track_type);

            if (scanResult && scanResult.confidence > 0.8) data.append('is_verified_waste', 'true');

            await marketApi.createListing(data);
            queryClient.invalidateQueries(['listings']);
            Toast.show({ type: 'success', text1: 'Success', text2: 'Waste posted' });
            navigation.goBack();
        } catch (error) {
            console.error("Submission Error:", error.response?.data || error.message);
            Toast.show({ type: 'error', text1: 'Submission failed', text2: 'Failed to create listing' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Organic Curved Header */}
                <View style={styles.headerBackground}>
                    <View style={styles.curvedShape} />
                    <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                                <ArrowLeft size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>New Post</Text>
                            <View style={{ width: 40 }} />
                        </View>
                        <Text style={styles.headerSubtitle}>Post your waste for sale or recycling</Text>
                    </SafeAreaView>
                </View>

                {/* Overlapping Content Card */}
                <View style={styles.contentCard}>
                    {/* Image Upload Area */}
                    <TouchableOpacity style={styles.imageSection} onPress={pickImage} activeOpacity={0.8}>
                        {selectedAsset ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} />
                                {isScanning && (
                                    <View style={styles.scanningOverlay}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={styles.scanningText}>AI Analyzing...</Text>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedAsset(null)}>
                                    <X size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.uploadBox}>
                                <View style={styles.uploadIconCircle}>
                                    <Camera size={32} color="#111" />
                                </View>
                                <Text style={styles.uploadTitle}>Add a Photo</Text>
                                <Text style={styles.uploadSub}>Show potential buyers what you have</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Form Fields */}
                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Post Title</Text>
                            <View style={styles.inputWrapper}>
                                <Package size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 50kg Mixed Plastics"
                                    value={MATERIAL_DISPLAY_MAP[formData.material_type] || formData.title}
                                    onChangeText={(val) => handleChange('title', val)}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Category {([
                            'PURE_WATER_RUBBERS', 'PURE_WATER_RUBBERS_BALE',
                            'PLASTIC_BOTTLES', 'PLASTIC_BOTTLES_BALE'
                        ].includes(formData.material_type)) && <Text style={styles.lockedLabel}>(AI Locked)</Text>}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {['Plastics', 'Metals', 'Paper', 'Glass', 'Electronics', 'Other'].map(type => {
                                const isFixedItem = [
                                    'PURE_WATER_RUBBERS', 'PURE_WATER_RUBBERS_BALE',
                                    'PLASTIC_BOTTLES', 'PLASTIC_BOTTLES_BALE'
                                ].includes(formData.material_type);

                                // Map backend types to UI category for highlighting
                                const activeType = (formData.material_type.includes('WATER') || formData.material_type.includes('BOTTLE')) ? 'Plastics' : formData.material_type;

                                return (
                                    <TouchableOpacity
                                        key={type}
                                        disabled={isFixedItem}
                                        style={[
                                            styles.chip,
                                            activeType === type && styles.chipActive,
                                            isFixedItem && type !== activeType && { opacity: 0.5 }
                                        ]}
                                        onPress={() => handleChange('material_type', type)}
                                    >
                                        <Text style={[styles.chipText, activeType === type && styles.chipTextActive]}>{type}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.row}>
                            <View style={styles.flex1}>
                                <Text style={styles.label}>Quantity</Text>
                                <View style={styles.inputWrapper}>
                                    <Tag size={18} color="#999" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="5kg, 10 units"
                                        value={formData.quantity}
                                        onChangeText={(val) => handleChange('quantity', val)}
                                    />
                                </View>
                            </View>
                            <View style={styles.flex1}>
                                <Text style={styles.label}>Location</Text>
                                <View style={styles.inputWrapper}>
                                    <MapPin size={18} color="#999" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Madina, Accra"
                                        value={formData.location}
                                        onChangeText={(val) => handleChange('location', val)}
                                    />
                                </View>
                            </View>
                        </View>

                        <Text style={styles.label}>Track</Text>
                        <View style={styles.trackContainer}>
                            <TouchableOpacity
                                style={[styles.trackBtn, formData.track_type === 'A' && styles.trackBtnActiveA]}
                                onPress={() => handleChange('track_type', 'A')}
                            >
                                <Info size={16} color={formData.track_type === 'A' ? '#fff' : '#666'} />
                                <Text style={[styles.trackBtnText, formData.track_type === 'A' && styles.trackBtnTextActive]}>Safe Disposal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.trackBtn, formData.track_type === 'B' && styles.trackBtnActiveB]}
                                onPress={() => handleChange('track_type', 'B')}
                            >
                                <Tag size={16} color={formData.track_type === 'B' ? '#fff' : '#666'} />
                                <Text style={[styles.trackBtnText, formData.track_type === 'B' && styles.trackBtnTextActive]}>Sell Recyclables</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Description</Text>
                        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Tell us more about the items..."
                                value={formData.description}
                                onChangeText={(val) => handleChange('description', val)}
                                multiline
                                numberOfLines={4}
                            />
                        </View>



                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.submitBtnText}>Post Waste Now</Text>
                                    <View style={styles.btnIcon}>
                                        <Check size={20} color="#fff" />
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerBackground: {
        height: 220,
        backgroundColor: '#111',
        position: 'relative',
        overflow: 'hidden',
    },
    curvedShape: {
        position: 'absolute',
        bottom: -100,
        left: -width * 0.25,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        backgroundColor: '#222',
        opacity: 0.3,
    },
    headerContent: {
        paddingHorizontal: 25,
        paddingTop: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 15,
        fontWeight: '500',
    },
    contentCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -40,
        borderRadius: 30,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 1,
    },
    imageSection: {
        width: '100%',
        height: 180,
        borderRadius: 20,
        backgroundColor: '#F9FBF9',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#E0E7E0',
        overflow: 'hidden',
    },
    uploadBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    uploadSub: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    previewContainer: {
        flex: 1,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    scanningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(46,125,50,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningText: {
        color: '#fff',
        fontWeight: 'bold',
        marginTop: 8,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    formSection: {
        marginTop: 25,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 54,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        marginLeft: 10,
    },
    textAreaWrapper: {
        height: 120,
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    textArea: {
        marginLeft: 0,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    flex1: {
        flex: 1,
    },
    chipScroll: {
        marginBottom: 20,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginRight: 10,
    },
    chipActive: {
        backgroundColor: '#111',
        borderColor: '#111',
    },
    chipText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    offerCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginTop: 10,
        marginBottom: 30,
    },
    offerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    offerBadge: {
        backgroundColor: '#F39C12',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    offerBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    offerTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#92400E',
    },
    offerValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginRight: 4,
    },
    offerValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111',
    },
    offerSub: {
        fontSize: 11,
        color: '#92400E',
        opacity: 0.7,
        marginTop: 5,
    },
    submitBtn: {
        backgroundColor: '#111',
        height: 60,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#111',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    btnIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    trackBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 15,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        gap: 8,
    },
    trackBtnActiveA: {
        backgroundColor: '#5D6D7E', // Muted dark for disposal
        borderColor: '#5D6D7E',
    },
    trackBtnActiveB: {
        backgroundColor: '#111', // Revesta Green for sell
        borderColor: '#111',
    },
    trackBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    trackBtnTextActive: {
        color: '#fff',
    },
    lockedLabel: {
        fontSize: 10,
        color: '#111',
        fontWeight: 'normal',
        fontStyle: 'italic',
    },
});
