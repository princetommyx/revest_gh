import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, ScrollView,
    Image, Alert, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, MapPin, Camera, ChevronRight, Phone, Shield } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import Toast from 'react-native-root-toast';
import apiClient, { BASE_URL } from '../api/client';

const { width } = Dimensions.get('window');

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

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Toast.show("Media permission required", { backgroundColor: '#E74C3C' });
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaType.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    data.append(key, formData[key].toString());
                }
            });
            if (image) {
                const uri = image;
                let filename = uri.split('/').pop() || 'photo.jpg';
                if (!filename.includes('.')) filename += '.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : `image/jpeg`;
                data.append('profile_picture', { uri, name: filename, type });
            }
            const updatedUser = await authApi.updateProfile(data);
            updateUser(updatedUser);
            Toast.show("Profile updated!", { backgroundColor: '#111' });
            navigation.goBack();
        } catch (error) {
            Toast.show("Update failed", { backgroundColor: '#E74C3C' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            {/* Organic Curved Header */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <TouchableOpacity style={styles.saveBtnTop} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnTextTop}>Save</Text>}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* Content Overlap */}
            <View style={styles.contentWrap}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

                    {/* Avatar Selection */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.avatar} />
                            ) : user?.profile_picture_url ? (
                                <Image source={{ uri: resolveImageUrl(user.profile_picture_url) }} style={styles.avatar} />
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
                                <User size={18} color="#9BAA9B" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.first_name}
                                    onChangeText={(t) => setFormData(p => ({ ...p, first_name: t }))}
                                    placeholder="e.g. John"
                                    placeholderTextColor="#9BAA9B"
                                />
                            </View>
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Last Name</Text>
                            <View style={styles.fieldRow}>
                                <User size={18} color="#9BAA9B" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.last_name}
                                    onChangeText={(t) => setFormData(p => ({ ...p, last_name: t }))}
                                    placeholder="e.g. Doe"
                                    placeholderTextColor="#9BAA9B"
                                />
                            </View>
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>Mobile Number</Text>
                            <View style={styles.fieldRow}>
                                <Phone size={18} color="#9BAA9B" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.phone_number}
                                    onChangeText={(t) => setFormData(p => ({ ...p, phone_number: t }))}
                                    placeholder="+233..."
                                    keyboardType="phone-pad"
                                    placeholderTextColor="#9BAA9B"
                                />
                            </View>
                        </View>

                        <View style={styles.inputBox}>
                            <Text style={styles.label}>City/Location</Text>
                            <View style={styles.fieldRow}>
                                <MapPin size={18} color="#9BAA9B" />
                                <TextInput
                                    style={styles.fieldInput}
                                    value={formData.city}
                                    onChangeText={(t) => setFormData(p => ({ ...p, city: t }))}
                                    placeholder="Enter your city"
                                    placeholderTextColor="#9BAA9B"
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
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    headerBackground: { height: 160, backgroundColor: '#111', overflow: 'hidden' },
    curvedShape: {
        position: 'absolute', bottom: -80, left: -width * 0.25,
        width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75,
        backgroundColor: '#222', opacity: 0.3
    },
    headerContent: { paddingHorizontal: 25, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
    saveBtnTop: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
    saveBtnTextTop: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    contentWrap: { flex: 1, marginTop: -35, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
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
