import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, ScrollView,
    Image, StatusBar
} from 'react-native';
import { User, Mail, MapPin, Camera, Phone, Shield } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../api/client';
import ScreenHeader from '../components/ScreenHeader';

export default function EditProfileScreen({ navigation }) {
    const { user, updateUser } = useAuth();
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

    // Must match ProfileScreen's resolver - this one omitted the /media prefix,
    // so a stored relative path rendered as a broken image here but fine there.
    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        let cleanPath = path.startsWith('/') ? path : `/${path}`;
        if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
        return `${BASE_URL}${cleanPath}`;
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Media access is required to change your photo' });
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            // `ImagePicker.MediaType` is a TypeScript type, not a runtime value -
            // reading `.Images` off it threw "Cannot read property 'Images' of
            // undefined" and crashed the screen. The array form is the current API.
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let payload;
            
            if (image) {
                payload = new FormData();
                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    if (value === null || value === undefined) return;
                    const text = value.toString().trim();
                    if (text === '') return;
                    
                    const originalValue = (user[key] || '').toString().trim();
                    if (text !== originalValue) {
                        payload.append(key, text);
                    }
                });
                
                const uri = image;
                let filename = uri.split('/').pop() || 'photo.jpg';
                if (!filename.includes('.')) filename += '.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : `image/jpeg`;
                payload.append('profile_picture', { uri, name: filename, type });
            } else {
                payload = {};
                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    if (value === null || value === undefined) return;
                    const text = value.toString().trim();
                    if (text === '') return;
                    
                    const originalValue = (user[key] || '').toString().trim();
                    if (text !== originalValue) {
                        payload[key] = text;
                    }
                });
            }
            
            const updatedUser = await authApi.updateProfile(payload);
            updateUser(updatedUser);
            Toast.show({ type: 'success', text1: 'Profile updated!' });
            navigation.goBack();
        } catch (error) {
            // Surface the real reason (e.g. "phone number already in use") instead
            // of a blanket retry message the user can't act on.
            const data = error.response?.data;
            const detail =
                data?.detail ||
                (data && typeof data === 'object'
                    ? Object.values(data).flat()[0]
                    : null);
            Toast.show({
                type: 'error',
                text1: 'Update failed',
                text2: typeof detail === 'string' ? detail : 'Please try again',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScreenHeader
                title="Edit Profile"
                onBack={() => navigation.goBack()}
                right={
                    <TouchableOpacity style={styles.saveBtnTop} onPress={handleSave} disabled={loading}>
                        {loading
                            ? <ActivityIndicator size="small" color="#111827" />
                            : <Text style={styles.saveBtnTextTop}>Save</Text>}
                    </TouchableOpacity>
                }
            />

            <View style={styles.contentWrap}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

                    {/* Avatar Selection */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.avatar} />
                            ) : (user?.profile_picture_url || user?.profile_picture) ? (
                                <Image
                                    source={{ uri: resolveImageUrl(user.profile_picture_url || user.profile_picture) }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <User size={48} color="#111" />
                                </View>
                            )}
                            <TouchableOpacity style={styles.cameraIcon} onPress={pickImage}>
                                <Camera size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.avatarHint}>Change Profile Photo</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formSection}>
                        <View style={styles.inputBox}>
                            <Text style={styles.label}>First Name</Text>
                            <View style={styles.fieldRow}>
                                <User size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.first_name}
                                    onChangeText={(t) => setFormData(p => ({ ...p, first_name: t }))}
                                    placeholder="e.g. John"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Last Name</Text>
                            <View style={styles.fieldRow}>
                                <User size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.last_name}
                                    onChangeText={(t) => setFormData(p => ({ ...p, last_name: t }))}
                                    placeholder="e.g. Doe"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Mobile Number</Text>
                            <View style={styles.fieldRow}>
                                <Phone size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.phone_number}
                                    onChangeText={(t) => setFormData(p => ({ ...p, phone_number: t }))}
                                    placeholder="+233..."
                                    keyboardType="phone-pad"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>City/Location</Text>
                            <View style={styles.fieldRow}>
                                <MapPin size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.city}
                                    onChangeText={(t) => setFormData(p => ({ ...p, city: t }))}
                                    placeholder="Enter your city"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        {/* Static Field */}
                        <View style={styles.disabledBox}>
                            <View style={styles.disabledIcon}>
                                <Mail size={16} color="#999" />
                            </View>
                            <View style={styles.disabledTextCol}>
                                <Text style={styles.disabledLabel}>Email Address</Text>
                                <Text style={styles.disabledValue}>{user?.email}</Text>
                            </View>
                            <Shield size={16} color="#ccc" />
                        </View>
                    </View>

                    {/* Bottom Action */}
                    <TouchableOpacity style={styles.footerBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Update Profile</Text>}
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    saveBtnTop: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6' },
    saveBtnTextTop: { color: '#111827', fontWeight: '700', fontSize: 14 },
    contentWrap: { flex: 1, backgroundColor: '#fff' },
    scrollPadding: { padding: 25, paddingBottom: 50 },
    avatarSection: { alignItems: 'center', marginBottom: 35 },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FAFAFA', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
    avatarHint: { fontSize: 13, color: '#999', marginTop: 12, fontWeight: '600' },
    formSection: { gap: 20, marginBottom: 40 },
    inputBox: { gap: 8 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#1A1A1A', marginLeft: 4 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 15, height: 56 },
    fieldInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1A1A1A' },
    disabledBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#F3F4F6' },
    disabledIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    disabledTextCol: { flex: 1 },
    disabledLabel: { fontSize: 11, color: '#999', fontWeight: 'bold', textTransform: 'uppercase' },
    disabledValue: { fontSize: 14, color: '#666', marginTop: 2 },
    footerBtn: { backgroundColor: '#111', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#111', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    footerBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
