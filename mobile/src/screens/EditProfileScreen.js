import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, ScrollView,
    Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, MapPin, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';

export default function EditProfileScreen({ navigation }) {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        city: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone_number: user.phone_number || '',
                city: user.city || ''
            });
        }
    }, [user]);

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
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
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const data = new FormData();

            // Append fields only if they have values
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            if (image) {
                const filename = image.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                data.append('profile_picture', {
                    uri: image,
                    name: filename,
                    type
                });
            }

            const updatedUser = await authApi.updateProfile(data);
            setUser(updatedUser); // Update local user state
            Toast.show("Profile updated successfully!", { backgroundColor: '#2E7D32' });
            navigation.goBack();
        } catch (error) {
            console.error("Update Profile Error:", error);
            Toast.show("Failed to update profile", { backgroundColor: '#E74C3C' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarHelper}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.avatar} />
                        ) : user?.profile_picture_url ? (
                            <Image source={{ uri: resolveImageUrl(user.profile_picture_url) }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <User size={40} color="#2E7D32" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                            <Camera size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.first_name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, first_name: text }))}
                        placeholder="Enter first name"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.last_name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, last_name: text }))}
                        placeholder="Enter last name"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>City</Text>
                    <View style={styles.inputContainer}>
                        <MapPin size={20} color="#999" />
                        <TextInput
                            style={styles.inputIcon}
                            value={formData.city}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                            placeholder="Current city"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.phone_number}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, phone_number: text }))}
                        placeholder="+233..."
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.infoBox}>
                    <Mail size={16} color="#666" />
                    <Text style={styles.infoText}>Email cannot be changed: {user?.email}</Text>
                </View>

                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', padding: 20,
        borderBottomWidth: 1, borderBottomColor: '#f1f1f1'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    backBtn: { padding: 5 },
    content: { padding: 25 },

    avatarContainer: { alignItems: 'center', marginBottom: 30 },
    avatarHelper: { position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center'
    },
    cameraBtn: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#2E7D32', width: 32, height: 32,
        borderRadius: 16, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },

    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    input: {
        backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#eee',
        borderRadius: 12, padding: 14, fontSize: 16, color: '#1a1a1a'
    },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#eee',
        borderRadius: 12, paddingHorizontal: 14
    },
    inputIcon: { flex: 1, padding: 14, fontSize: 16, color: '#1a1a1a' },

    infoBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#f1f3f5', padding: 15, borderRadius: 10, marginBottom: 30
    },
    infoText: { fontSize: 12, color: '#666' },

    saveBtn: {
        backgroundColor: '#2E7D32', padding: 18, borderRadius: 15,
        alignItems: 'center', shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
        elevation: 5
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
