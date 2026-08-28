import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, ScrollView
} from 'react-native';
import { Lock, ShieldCheck, ShieldAlert, Key, Eye, EyeOff } from 'lucide-react-native';
import { authApi } from '../api/auth';
import Toast from 'react-native-toast-message';
import ScreenHeader from '../components/ScreenHeader';

const PasswordField = ({ label, icon: Icon, value, onChangeText, placeholder }) => {
    const [visible, setVisible] = useState(false);
    return (
        <View style={styles.inputBox}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.fieldRow}>
                <Icon size={18} color="#9CA3AF" />
                <TextInput
                    style={styles.fieldInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity onPress={() => setVisible(v => !v)} style={styles.eyeBtn}>
                    {visible ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function SecurityScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        new_password2: ''
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.old_password || !formData.new_password || !formData.new_password2) {
            Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Please fill in all fields' });
            return;
        }

        if (formData.new_password !== formData.new_password2) {
            Toast.show({ type: 'error', text1: 'Passwords do not match', text2: 'Please re-enter your new password' });
            return;
        }

        setLoading(true);
        try {
            await authApi.changePassword(formData);
            Toast.show({ type: 'success', text1: 'Password updated!' });
            navigation.goBack();
        } catch (error) {
            const msg = error.response?.data?.new_password?.[0] || error.response?.data?.detail || "Update failed";
            Toast.show({ type: 'error', text1: 'Update failed', text2: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScreenHeader title="Account Security" onBack={() => navigation.goBack()} />

            <View style={styles.contentWrap}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

                    <View style={styles.heroSection}>
                        <View style={styles.shieldWrap}>
                            <ShieldCheck size={50} color="#111" />
                        </View>
                        <Text style={styles.heroTitle}>Security Settings</Text>
                        <Text style={styles.heroSub}>Update your password regularly to keep your Revesta account safe.</Text>
                    </View>

                    <View style={styles.formSection}>
                        <PasswordField
                            label="Current Password"
                            icon={Lock}
                            value={formData.old_password}
                            onChangeText={(val) => handleChange('old_password', val)}
                            placeholder="Enter current password"
                        />
                        <PasswordField
                            label="New Password"
                            icon={Key}
                            value={formData.new_password}
                            onChangeText={(val) => handleChange('new_password', val)}
                            placeholder="Enter new password"
                        />
                        <PasswordField
                            label="Confirm New Password"
                            icon={Key}
                            value={formData.new_password2}
                            onChangeText={(val) => handleChange('new_password2', val)}
                            placeholder="Re-type new password"
                        />
                    </View>

                    <TouchableOpacity style={styles.updateBtn} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>Update Password</Text>}
                    </TouchableOpacity>

                    <View style={styles.protectionNote}>
                        <ShieldAlert size={16} color="#999" />
                        <Text style={styles.protectionText}>Use at least 8 characters. Your password can't be all numbers, a commonly used password, or too similar to your name or email.</Text>
                    </View>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    contentWrap: { flex: 1, backgroundColor: '#fff' },
    scrollPadding: { padding: 25, paddingBottom: 50 },
    heroSection: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
    shieldWrap: { width: 90, height: 90, borderRadius: 30, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    heroTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
    heroSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 20 },
    formSection: { gap: 20, marginBottom: 40 },
    inputBox: { gap: 8 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#1A1A1A', marginLeft: 4 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 15, height: 56 },
    fieldInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1A1A1A' },
    eyeBtn: { padding: 4 },
    updateBtn: { backgroundColor: '#111', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#111', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    updateBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    protectionNote: { flexDirection: 'row', gap: 10, marginTop: 25, paddingHorizontal: 15 },
    protectionText: { fontSize: 12, color: '#999', flex: 1, lineHeight: 18 }
});
