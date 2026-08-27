import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Image, ActivityIndicator,
    Platform, Dimensions, StatusBar, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Upload, Camera, MapPin, Package, Tag, Info, Check, ArrowLeft, Database, FileText, Wine, Monitor, Grid } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AnimatedButton from '../components/AnimatedButton';
import { marketApi } from '../api/market';
import Toast from 'react-native-toast-message';

import { useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

export default function CreateListingScreen({ route, navigation }) {
    const editListing = route?.params?.editListing;
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formData, setFormData] = useState({
        title: editListing?.title || '',
        material_type: editListing?.material_type || '',
        description: editListing?.description || '',
        quantity: editListing?.quantity || '',
        weight_kg: editListing?.quantity ? parseInt(editListing.quantity) : 0,
        price: editListing?.price || '',
        track_type: editListing?.track || 'A',
        is_free: editListing?.is_free || false,
        location: editListing?.location || '',
        latitude: editListing?.latitude || null,
        longitude: editListing?.longitude || null
    });
    
    // Set initial image if editing
    React.useEffect(() => {
        if (editListing?.image) {
            setSelectedAsset({ uri: editListing.image, isExisting: true });
        }
    }, [editListing]);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [priceRange, setPriceRange] = useState(null); // { min, max } - the editable guardrail around the estimate

    // Material display mapping (Backend -> User Friendly)
    const MATERIAL_DISPLAY_MAP = {
        'PURE_WATER_RUBBERS': 'Pure Water Rubbers',
        'PURE_WATER_RUBBERS_BALE': 'Pure Water Rubbers Bale',
        'PLASTIC_BOTTLES': 'Plastic Bottles',
        'PLASTIC_BOTTLES_BALE': 'Plastic Bottles Bale',
        'PET': 'PET Bottles',
        'HDPE': 'HDPE Plastics'
    };

    // Keep weight_kg in sync with whatever numeric prefix the disposer types
    // into the free-text quantity field (e.g. "50 kg" -> 50), so a real
    // weight is available for pricing even without the AI photo scan.
    React.useEffect(() => {
        const parsed = parseFloat(formData.quantity);
        if (!isNaN(parsed) && parsed !== formData.weight_kg) {
            setFormData(prev => ({ ...prev, weight_kg: parsed }));
        }
    }, [formData.quantity]);

    // Real, server-computed price estimate (based on actual market rates),
    // used whenever the disposer hasn't just gotten a fresh AI scan result
    // for the current material - e.g. no photo, or they've since changed
    // the material/weight manually.
    React.useEffect(() => {
        const isFixedPriceItem = [
            'PURE_WATER_RUBBERS', 'PURE_WATER_RUBBERS_BALE',
            'PLASTIC_BOTTLES', 'PLASTIC_BOTTLES_BALE'
        ].includes(formData.material_type);
        if (isFixedPriceItem) return;

        if (!formData.material_type || !formData.weight_kg) return;
        if (scanResult && scanResult.material_type === formData.material_type) return; // scan already priced this

        const timeoutId = setTimeout(async () => {
            try {
                const estimate = await marketApi.estimatePrice({
                    track_type: formData.track_type,
                    material_type: formData.material_type,
                    weight_kg: formData.weight_kg,
                });
                setFormData(prev => ({ ...prev, price: estimate.estimated_price.toFixed(2) }));
                setPriceRange({ min: estimate.min_price, max: estimate.max_price });
            } catch (e) {
                console.warn('Failed to estimate price:', e?.message);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [formData.material_type, formData.weight_kg, formData.track_type, scanResult]);

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

    const CATEGORY_IDS = ['Plastics', 'Metals', 'Paper', 'Glass', 'Electronics', 'Other'];
    // Maps the AI's precise material vocabulary to the manual picker's coarser
    // category buttons, purely for highlighting - the precise value is still
    // what gets saved and priced.
    const materialToCategory = (materialType) => {
        const key = (materialType || '').toUpperCase();
        if (key.includes('WATER') || key.includes('BOTTLE') || key === 'PET' || key === 'HDPE') return 'Plastics';
        if (key === 'ALUMINUM' || key === 'METALS') return 'Metals';
        if (CATEGORY_IDS.includes(materialType)) return materialType;
        return 'Other';
    };

    const analyzeImage = async (asset) => {
        setIsScanning(true);
        try {
            const data = await marketApi.analyzeWaste(asset.uri);
            setScanResult(data);

            setFormData(prev => ({
                ...prev,
                material_type: data.material_type || prev.material_type,
                quantity: data.quantity_estimate || prev.quantity,
                weight_kg: data.suggested_weight_kg ?? prev.weight_kg,
                track_type: data.track_type || prev.track_type,
                title: prev.title || data.title_suggestion || prev.title,
                description: prev.description || data.description || prev.description,
                price: (data.estimated_earnings ?? data.estimated_cost ?? prev.price)?.toString?.() ?? prev.price,
            }));

            if (data.min_price != null && data.max_price != null) {
                setPriceRange({ min: data.min_price, max: data.max_price });
            }

            Toast.show({
                type: 'success',
                text1: data.simulated ? 'Estimated (offline mode)' : 'Analyzed!',
                text2: `Identified as ${data.material_type}${data.confidence ? ` (${Math.round(data.confidence * 100)}% confident)` : ''}`
            });
        } catch (error) {
            console.warn('Waste analysis failed:', error?.message);
            Toast.show({ type: 'info', text1: 'Could not auto-analyze', text2: 'No problem - fill in the details manually.' });
        } finally {
            setIsScanning(false);
        }
    };

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
                analyzeImage(asset);
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
        if (formData.track_type === 'B' && priceRange) {
            const enteredPrice = parseFloat(formData.price);
            if (isNaN(enteredPrice) || enteredPrice < priceRange.min || enteredPrice > priceRange.max) {
                Toast.show({
                    type: 'error',
                    text1: 'Price out of range',
                    text2: `Must be between ₵${priceRange.min.toFixed(2)} and ₵${priceRange.max.toFixed(2)}`
                });
                return;
            }
        }
        setLoading(true);
        try {
            const data = new FormData();
            if (selectedAsset && !selectedAsset.isExisting) {
                const uri = selectedAsset.uri;
                let name = selectedAsset.fileName || uri.split('/').pop();
                if (!name.includes('.')) name += '.jpg';
                let type = selectedAsset.mimeType || 'image/jpeg';
                data.append('image', { uri, name, type });
            }

            let finalPrice = formData.price || '5.00';
            let isFree = formData.track_type === 'A' ? 'true' : 'false';
            if (isFree === 'true') finalPrice = '0.00';

            // Append formatted data
            Object.keys(formData).forEach(key => {
                if (key === 'price') {
                    data.append('price', finalPrice);
                } else if (key === 'is_free') {
                    data.append('is_free', isFree);
                } else if (formData[key] !== null && formData[key] !== undefined) {
                    data.append(key, formData[key].toString());
                }
            });

            // Specific mapping if backend expects 'track' instead of 'track_type'
            data.append('track', formData.track_type);

            if (scanResult && scanResult.confidence > 0.8) data.append('is_verified_waste', 'true');

            if (editListing) {
                await marketApi.updateListing(editListing.id, data);
                Toast.show({ type: 'success', text1: 'Success', text2: 'Waste updated' });
            } else {
                await marketApi.createListing(data);
                Toast.show({ type: 'success', text1: 'Success', text2: 'Waste posted' });
            }
            queryClient.invalidateQueries(['listings']);
            navigation.goBack();
        } catch (error) {
            console.error("Submission Error:", error.response?.data || error.message);
            Toast.show({ type: 'error', text1: 'Submission failed', text2: editListing ? 'Failed to update listing' : 'Failed to create listing' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Compact Header */}
            <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#111" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>{editListing ? 'Update Waste' : 'Post Waste'}</Text>
                        <Text style={styles.headerSubtitle}>{editListing ? 'Update the details of your waste' : 'Sell your recyclable waste to buyers'}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.contentPadding}>
                    {/* Photo Upload Area */}
                    <TouchableOpacity style={styles.compactUploadBox} onPress={pickImage} activeOpacity={0.7}>
                        {selectedAsset ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} />
                                {isScanning && (
                                    <View style={styles.scanningOverlay}>
                                        <ActivityIndicator color="#fff" size="small" />
                                        <Text style={styles.scanningText}>Analyzing...</Text>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.removeImageBtn} onPress={(e) => { e.stopPropagation(); setSelectedAsset(null); }}>
                                    <X size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <View style={styles.uploadIconCircle}>
                                    <Camera size={22} color="#111" />
                                </View>
                                <View style={styles.uploadTextContainer}>
                                    <Text style={styles.uploadTitle}>Add Photos</Text>
                                    <Text style={styles.uploadSub}>Help buyers see what you're selling</Text>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Form Fields */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>What are you selling?</Text>
                            {([
                                'PURE_WATER_RUBBERS', 'PURE_WATER_RUBBERS_BALE',
                                'PLASTIC_BOTTLES', 'PLASTIC_BOTTLES_BALE'
                            ].includes(formData.material_type)) && <Text style={styles.lockedLabel}>(AI Locked)</Text>}
                        </View>
                        
                        <View style={styles.categoryGrid}>
                            {[
                                { id: 'Plastics', icon: Package, color: '#3B82F6' },
                                { id: 'Metals', icon: Database, color: '#64748B' },
                                { id: 'Paper', icon: FileText, color: '#EAB308' },
                                { id: 'Glass', icon: Wine, color: '#10B981' },
                                { id: 'Electronics', icon: Monitor, color: '#8B5CF6' },
                                { id: 'Other', icon: Grid, color: '#F97316' }
                            ].map(cat => {
                                const isFixedItem = [
                                    'PURE_WATER_RUBBERS', 'PURE_WATER_RUBBERS_BALE',
                                    'PLASTIC_BOTTLES', 'PLASTIC_BOTTLES_BALE'
                                ].includes(formData.material_type);

                                // Map backend types to UI category for highlighting
                                const activeType = materialToCategory(formData.material_type);
                                const isActive = activeType === cat.id;
                                const IconComp = cat.icon;

                                return (
                                    <AnimatedButton
                                        key={cat.id}
                                        disabled={isFixedItem}
                                        containerStyle={styles.categoryCardContainer}
                                        style={[
                                            styles.categoryCard,
                                            isActive && styles.categoryCardActive,
                                            isFixedItem && !isActive && { opacity: 0.5 }
                                        ]}
                                        onPress={() => handleChange('material_type', cat.id)}
                                    >
                                        <View style={styles.categoryCardInner}>
                                            <IconComp size={20} color={isActive ? '#111' : '#666'} />
                                            <Text style={[styles.categoryCardText, isActive && styles.categoryCardTextActive]}>
                                                {cat.id}
                                            </Text>
                                        </View>
                                    </AnimatedButton>
                                );
                            })}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Waste title</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 50kg Mixed Plastic Bottles"
                                    placeholderTextColor="#9CA3AF"
                                    value={MATERIAL_DISPLAY_MAP[formData.material_type] || formData.title}
                                    onChangeText={(val) => handleChange('title', val)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Quantity</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 50 kg or 10 units"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.quantity}
                                    onChangeText={(val) => handleChange('quantity', val)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Location</Text>
                            <View style={styles.inputWrapper}>
                                <MapPin size={18} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Madina, Accra"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.location}
                                    onChangeText={(val) => handleChange('location', val)}
                                />
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>What would you like to do?</Text>
                        <View style={styles.actionCardsContainer}>
                            <TouchableOpacity
                                style={[styles.actionCard, formData.track_type === 'B' && styles.actionCardActive]}
                                onPress={() => handleChange('track_type', 'B')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionIconBox, formData.track_type === 'B' ? { backgroundColor: '#111' } : { backgroundColor: '#F3F4F6' }]}>
                                    <Tag size={20} color={formData.track_type === 'B' ? '#fff' : '#6B7280'} />
                                </View>
                                <View style={styles.actionCardContent}>
                                    <Text style={[styles.actionCardTitle, formData.track_type === 'B' && styles.actionCardTitleActive]}>Sell to Buyers</Text>
                                    <Text style={styles.actionCardSub}>Find buyers interested in your recyclables</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionCard, formData.track_type === 'A' && styles.actionCardActive]}
                                onPress={() => handleChange('track_type', 'A')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionIconBox, formData.track_type === 'A' ? { backgroundColor: '#111' } : { backgroundColor: '#F3F4F6' }]}>
                                    <Info size={20} color={formData.track_type === 'A' ? '#fff' : '#6B7280'} />
                                </View>
                                <View style={styles.actionCardContent}>
                                    <Text style={[styles.actionCardTitle, formData.track_type === 'A' && styles.actionCardTitleActive]}>Safe Disposal</Text>
                                    <Text style={styles.actionCardSub}>Hand over your waste for responsible recycling</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {formData.track_type === 'B' ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Asking Price (GHS)</Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.currencyPrefix}>₵</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="decimal-pad"
                                        value={formData.price?.toString()}
                                        onChangeText={(val) => handleChange('price', val)}
                                    />
                                </View>
                                {priceRange ? (
                                    <Text style={styles.priceHint}>
                                        Estimated from market rates. You can adjust between ₵{priceRange.min.toFixed(2)} and ₵{priceRange.max.toFixed(2)}.
                                    </Text>
                                ) : (
                                    <Text style={styles.priceHint}>Add a photo or pick a material to get a price estimate.</Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.freeNotice}>
                                <Info size={16} color="#6B7280" />
                                <Text style={styles.freeNoticeText}>Safe Disposal pickups are free for you - the collector handles responsible recycling.</Text>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description</Text>
                            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Tell buyers more about the items, their condition, type, and any other important details."
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.description}
                                    onChangeText={(val) => handleChange('description', val)}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </View>

                        <AnimatedButton 
                            style={[
                                styles.submitBtn, 
                                (!formData.title || !formData.material_type || !formData.quantity || !formData.location) && styles.submitBtnDisabled
                            ]} 
                            onPress={handleSubmit} 
                            disabled={loading || !formData.title || !formData.material_type || !formData.quantity || !formData.location}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>{editListing ? 'Update Waste' : 'Post Waste'}</Text>
                            )}
                        </AnimatedButton>
                    </View>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    scrollContent: {
        paddingBottom: 60,
    },
    contentPadding: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    compactUploadBox: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#E5E7EB',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 25,
    },
    uploadPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    uploadIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    uploadTextContainer: {
        flex: 1,
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
    },
    uploadSub: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    previewContainer: {
        height: 120,
        width: '100%',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    scanningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(17,17,17,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanningText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginTop: 8,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 12,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    categoryCardContainer: {
        width: '48%',
        marginBottom: 12,
    },
    categoryCard: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    categoryCardActive: {
        backgroundColor: '#FFF',
        borderColor: '#111',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryCardText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
        marginLeft: 10,
    },
    categoryCardTextActive: {
        color: '#111',
    },
    formSection: {
        marginTop: 0,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    currencyPrefix: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 8,
    },
    priceHint: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        lineHeight: 16,
    },
    freeNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        gap: 10,
    },
    freeNoticeText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111',
    },
    textAreaWrapper: {
        height: 120,
        alignItems: 'flex-start',
        paddingVertical: 15,
    },
    textArea: {
        textAlignVertical: 'top',
        height: '100%',
    },
    actionCardsContainer: {
        marginBottom: 25,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
    },
    actionCardActive: {
        backgroundColor: '#FFF',
        borderColor: '#111',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    actionIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    actionCardContent: {
        flex: 1,
    },
    actionCardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 4,
    },
    actionCardTitleActive: {
        color: '#111',
    },
    actionCardSub: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 16,
    },
    submitBtn: {
        backgroundColor: '#111',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    submitBtnDisabled: {
        backgroundColor: '#E5E7EB',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    lockedLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    }
});
