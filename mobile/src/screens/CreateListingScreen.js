import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Image, ActivityIndicator,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Upload, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { marketApi } from '../api/market';
import Toast from 'react-native-root-toast';

export default function CreateListingScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [imageUri, setImageUri] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        material_type: '',
        description: '',
        quantity: '',
        price: '',
        is_free: false,
        location: ''
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Toast.show("Permission to access camera roll is required!", { backgroundColor: '#E74C3C' });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
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
            if (imageUri) {
                const filename = imageUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                data.append('image', {
                    uri: imageUri,
                    name: filename,
                    type
                });
            }

            // Add other form data
            Object.keys(formData).forEach(key => {
                if (key !== 'image') {
                    data.append(key, formData[key]);
                }
            });

            await marketApi.createListing(data);
            Toast.show("Listing created successfully!", { backgroundColor: '#2E7D32' });
            navigation.goBack();
        } catch (error) {
            console.error("Create Listing Error:", error);
            Toast.show("Failed to create listing", { backgroundColor: '#E74C3C' });
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
                    {imageUri ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => setImageUri(null)}
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
                            placeholder="e.g. 2 Bags"
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

                {/* Price */}
                <Text style={styles.label}>Price (GHS)</Text>
                <View style={styles.priceContainer}>
                    <TextInput
                        style={[styles.input, styles.priceInput, formData.is_free && styles.disabledInput]}
                        placeholder="0.00"
                        value={formData.price}
                        onChangeText={(val) => handleChange('price', val)}
                        keyboardType="decimal-pad"
                        editable={!formData.is_free}
                    />
                    <TouchableOpacity
                        style={styles.freeCheckbox}
                        onPress={() => handleChange('is_free', !formData.is_free)}
                    >
                        <View style={[styles.checkbox, formData.is_free && styles.checkboxActive]}>
                            {formData.is_free && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.freeLabel}>Free</Text>
                    </TouchableOpacity>
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
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
