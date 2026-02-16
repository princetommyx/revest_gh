import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Image, ActivityIndicator,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Upload, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { marketApi } from '../api/market';
import Toast from 'react-native-root-toast';

import { useQueryClient } from '@tanstack/react-query';

export default function CreateListingScreen({ navigation }) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        material_type: '',
        description: '',
        quantity: '',
        weight_kg: 0, // Hidden field for pricing
        price: '',
        is_free: false,
        is_free: false,
        location: '',
        latitude: null,
        longitude: null
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // AI Pricing Logic
    React.useEffect(() => {
        if (formData.material_type && formData.weight_kg) {
            const rates = {
                'Plastics': 1.5,
                'Metals': 4.0,
                'Paper': 0.8,
                'Glass': 0.5,
                'Electronics': 8.0,
                'Mixed': 1.0,
                'Other': 0.5
            };

            const rate = rates[formData.material_type] || 1.0;
            // Use AI weight or fallback to 5kg if 0
            const weight = formData.weight_kg > 0 ? formData.weight_kg : 5;
            const commission = 0.20;

            const estimatedValue = (rate * weight * (1 - commission)).toFixed(2);

            setFormData(prev => ({ ...prev, price: estimatedValue }));
        }
    }, [formData.material_type, formData.weight_kg]);

    // Get Location on Mount
    React.useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Toast.show('Permission to access location was denied', { backgroundColor: '#E74C3C' });
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setFormData(prev => ({
                ...prev,
                latitude: parseFloat(location.coords.latitude.toFixed(6)),
                longitude: parseFloat(location.coords.longitude.toFixed(6))
            }));
            console.log("Captured Location (Rounded):", {
                lat: location.coords.latitude.toFixed(6),
                lng: location.coords.longitude.toFixed(6)
            });
        })();
    }, []);

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Toast.show("Permission to access camera roll is required!", { backgroundColor: '#E74C3C' });
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

                // Start AI Analysis
                analyzeImage(asset.uri);
            }
        } catch (error) {
            console.error("PickImage Error:", error);
            Toast.show("Error picking image", { backgroundColor: '#E74C3C' });
        }
    };

    const analyzeImage = async (uri) => {
        setIsScanning(true);
        try {
            console.log("Starting AI Analysis...");
            const data = await marketApi.analyzeWaste(uri);
            console.log("AI Result:", data);

            if (data) {
                // Auto-fill form
                setFormData(prev => ({
                    ...prev,
                    material_type: data.material_type || prev.material_type,
                    quantity: data.quantity_estimate || prev.quantity,
                    weight_kg: data.weight_kg || 0,
                    title: data.title_suggestion || prev.title,
                    description: data.description || prev.description,
                }));

                setScanResult(data);
                Toast.show("Verified by Revesta AI 🤖", { backgroundColor: '#2E7D32' });
            }
        } catch (error) {
            console.error("AI Analysis Failed:", error);
            Toast.show("AI Scan failed - please enter details manually", { backgroundColor: '#F39C12' });
        } finally {
            setIsScanning(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.material_type || !formData.quantity || !formData.location) {
            Toast.show("Please fill all required fields", { backgroundColor: '#E74C3C' });
            return;
        }

        if (!formData.is_free && !formData.price) {
            Toast.show("Please set a price or mark as free", { backgroundColor: '#E74C3C' });
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();

            // Add image if selected
            if (selectedAsset) {
                const uri = selectedAsset.uri;
                let name = selectedAsset.fileName;
                let type = selectedAsset.mimeType;

                // Fallback if fileName/mimeType are missing (common on Android)
                if (!name) {
                    const parts = uri.split('/');
                    name = parts[parts.length - 1];
                }

                // Ensure name has an extension
                if (!name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    name += '.jpg';
                }

                // Infer type from extension if missing
                if (!type) {
                    const match = /\.(\w+)$/.exec(name);
                    type = match ? `image/${match[1]}` : `image/jpeg`;
                }

                // Fix common mimetype issues
                if (type === 'image/jpg') type = 'image/jpeg';

                console.log('Uploading image:', { uri, name, type });

                data.append('image', {
                    uri,
                    name,
                    type
                });
            }

            // Add other form data
            Object.keys(formData).forEach(key => {
                if (key !== 'image') {
                    data.append(key, formData[key]);
                }
            });

            // Add verification status if scanned
            if (scanResult && scanResult.confidence > 0.8) {
                data.append('is_verified_waste', 'true');
            }

            await marketApi.createListing(data);

            // Invalidate listings query to refresh Home Screen
            queryClient.invalidateQueries(['listings']);

            Toast.show("Listing created successfully!", { backgroundColor: '#2E7D32' });
            navigation.goBack();
        } catch (error) {
            console.error("Create Listing Error:", error);
            let errorMessage = "Failed to create listing";

            if (error.response?.data) {
                const data = error.response.data;
                console.log("Error Response Data:", data);

                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.error) {
                    errorMessage = data.error;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else {
                    // Handle field-specific errors
                    const messages = Object.keys(data).map(key => {
                        const val = data[key];
                        return `${key}: ${Array.isArray(val) ? val.join(', ') : val}`;
                    });
                    if (messages.length > 0) errorMessage = messages.join('\n');
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            Toast.show(errorMessage, { backgroundColor: '#E74C3C', duration: Toast.durations.LONG });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Create Listing</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <X size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Upload */}
                <Text style={styles.label}>Photo</Text>
                <TouchableOpacity
                    style={styles.imageUpload}
                    onPress={pickImage}
                >
                    {selectedAsset ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: selectedAsset.uri }} style={styles.imagePreview} />

                            {/* Scanning Overlay */}
                            {isScanning && (
                                <View style={styles.scanningOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                    <Text style={styles.scanningText}>Revesta AI Analyzing...</Text>
                                    <Text style={styles.scanningSubtext}>Detecting material & quality</Text>
                                </View>
                            )}

                            {/* Scan Result Badge */}
                            {!isScanning && scanResult && (
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedText}>AI Verified ✓</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => setSelectedAsset(null)}
                            >
                                <X size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <Upload size={48} color="#ccc" />
                            <Text style={styles.uploadText}>Tap to upload photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Title */}
                <Text style={styles.label}>Title *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 50kg Mixed Plastics"
                    value={formData.title}
                    onChangeText={(val) => handleChange('title', val)}
                />

                <View style={styles.row}>
                    {/* Material Type */}
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>Material Type *</Text>
                        <View style={styles.pickerContainer}>
                            {['Plastics', 'Metals', 'Paper', 'Glass', 'Electronics', 'Other'].map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.chip,
                                        formData.material_type === type && styles.chipActive
                                    ]}
                                    onPress={() => handleChange('material_type', type)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        formData.material_type === type && styles.chipTextActive
                                    ]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Quantity */}
                    <View style={styles.halfWidth}>
                        <Text style={styles.label}>Quantity *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 1 Fridge, 5kg"
                            value={formData.quantity}
                            onChangeText={(val) => handleChange('quantity', val)}
                        />
                    </View>
                </View>

                {/* Description */}
                <Text style={styles.label}>Description *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your materials..."
                    value={formData.description}
                    onChangeText={(val) => handleChange('description', val)}
                    multiline
                    numberOfLines={4}
                />

                {/* Location */}
                <Text style={styles.label}>Location *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Madina Market"
                    value={formData.location}
                    onChangeText={(val) => handleChange('location', val)}
                />

                {/* Revesta AI Price Offer */}
                <Text style={styles.label}>Revesta Offer (GHS)</Text>
                <View style={styles.aiPriceContainer}>
                    <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>✨ AI Rate</Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.priceInput, styles.disabledInput, { color: '#2E7D32', fontWeight: 'bold' }]}
                        placeholder="0.00"
                        value={formData.price}
                        editable={false}
                    />
                    <Text style={styles.priceSubtext}>
                        Based on quality & market rates
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Post Listing</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
    closeBtn: { padding: 5 },
    scrollContent: { padding: 20, paddingBottom: 40 },

    label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 16 },

    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: '#f8f9fa'
    },

    textArea: { height: 100, textAlignVertical: 'top' },

    row: { flexDirection: 'row', gap: 12 },
    halfWidth: { flex: 1 },

    imageUpload: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10
    },

    uploadPlaceholder: { alignItems: 'center' },
    uploadText: { marginTop: 10, color: '#888', fontSize: 14 },

    imagePreviewContainer: { position: 'relative' },
    imagePreview: { width: 200, height: 150, borderRadius: 12 },
    removeImageBtn: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#E74C3C',
        borderRadius: 20,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center'
    },

    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f3f5',
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    chipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    chipText: { fontSize: 12, color: '#666', fontWeight: '500' },
    chipTextActive: { color: '#fff', fontWeight: 'bold' },

    priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    priceInput: { flex: 1 },
    disabledInput: { backgroundColor: '#f1f3f5', color: '#999' },

    freeCheckbox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkboxActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    freeLabel: { fontSize: 14, color: '#666', fontWeight: '500' },

    submitBtn: {
        backgroundColor: '#2E7D32',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 30,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    aiPriceContainer: {
        position: 'relative',
        marginBottom: 10
    },
    aiBadge: {
        position: 'absolute',
        top: -10,
        right: 10,
        backgroundColor: '#F39C12',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        zIndex: 1
    },
    aiBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    priceSubtext: { fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' },

    scanningOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(46, 125, 50, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        zIndex: 10
    },
    scanningText: {
        color: '#fff',
        fontWeight: 'bold',
        marginTop: 10,
        fontSize: 14
    },
    scanningSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 5
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: '#2E7D32',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fff',
        zIndex: 5
    },
    verifiedText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12
    }
});
