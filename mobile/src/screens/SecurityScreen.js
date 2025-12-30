import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react-native';
import { authApi } from '../api/auth';
import Toast from 'react-native-root-toast';

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
            Toast.show("Please fill in all fields", { backgroundColor: '#E74C3C' });
            return;
        }

        if (formData.new_password !== formData.new_password2) {
            Toast.show("New passwords do not match", { backgroundColor: '#E74C3C' });
            return;
        }

        setLoading(true);
        try {
            await authApi.changePassword(formData);
            Toast.show("Password changed successfully!", { backgroundColor: '#2E7D32' });
            navigation.goBack();
        } catch (error) {
            console.error("Change Password Error:", error);
            const msg = error.response?.data?.new_password?.[0] ||
                error.response?.data?.detail ||
                "Failed to change password";
            Toast.show(msg, { backgroundColor: '#E74C3C' });
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
                <Text style={styles.headerTitle}>Security</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.shieldIcon}>
                    <ShieldCheck size={60} color="#2E7D32" />
                </View>
                <Text style={styles.infoText}>
                    Keep your account secure by using a strong password.
                </Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Current Password</Text>
                    <View style={styles.inputContainer}>
                        <Lock size={18} color="#999" />
                        <TextInput
                            style={styles.inputIcon}
                            value={formData.old_password}
                            onChangeText={(val) => handleChange('old_password', val)}
                            placeholder="Type current password"
                            secureTextEntry
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputContainer}>
                        <Lock size={18} color="#999" />
                        <TextInput
                            style={styles.inputIcon}
                            value={formData.new_password}
                            onChangeText={(val) => handleChange('new_password', val)}
                            placeholder="Type new password"
                            secureTextEntry
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.inputContainer}>
                        <Lock size={18} color="#999" />
                        <TextInput
                            style={styles.inputIcon}
                            value={formData.new_password2}
                            onChangeText={(val) => handleChange('new_password2', val)}
                            placeholder="Re-type new password"
                            secureTextEntry
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Update Password</Text>
                    )}
                </TouchableOpacity>
            </View>
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

    shieldIcon: { alignSelf: 'center', marginBottom: 20, marginTop: 10 },
    infoText: {
        textAlign: 'center', color: '#666', marginBottom: 30,
        paddingHorizontal: 20
    },

    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#eee',
        borderRadius: 12, paddingHorizontal: 14
    },
    inputIcon: { flex: 1, padding: 14, fontSize: 16, color: '#1a1a1a' },

    saveBtn: {
        backgroundColor: '#2E7D32', padding: 18, borderRadius: 15,
        alignItems: 'center', marginTop: 20, shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
        elevation: 5
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
