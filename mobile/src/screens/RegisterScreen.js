import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../api/auth';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
    const navigation = useNavigation();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        role: 'SELLER' // Default role
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async () => {
        if (formData.password !== formData.confirm_password) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (!formData.username || !formData.email || !formData.password) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            await authApi.register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                password_confirmation: formData.confirm_password,
                role: formData.role
            });

            Alert.alert('Success', 'Account created! Please login.');
            navigation.navigate('Login');
        } catch (error) {
            console.log(error.response?.data);
            const msg = error.response?.data ? JSON.stringify(error.response.data) : 'Registration failed';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Create Account</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    value={formData.username}
                    onChangeText={(val) => handleChange('username', val)}
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={formData.email}
                    onChangeText={(val) => handleChange('email', val)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={formData.password}
                    onChangeText={(val) => handleChange('password', val)}
                    secureTextEntry
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={formData.confirm_password}
                    onChangeText={(val) => handleChange('confirm_password', val)}
                    secureTextEntry
                />

                {/* Simple Role Selection */}
                <View style={styles.roleContainer}>
                    <Text style={styles.roleLabel}>I want to:</Text>
                    <View style={styles.roleButtons}>
                        <TouchableOpacity
                            style={[styles.roleBtn, formData.role === 'SELLER' && styles.roleBtnActive]}
                            onPress={() => handleChange('role', 'SELLER')}
                        >
                            <Text style={[styles.roleText, formData.role === 'SELLER' && styles.roleTextActive]}>Sell</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.roleBtn, formData.role === 'COLLECTOR' && styles.roleBtnActive]}
                            onPress={() => handleChange('role', 'COLLECTOR')}
                        >
                            <Text style={[styles.roleText, formData.role === 'COLLECTOR' && styles.roleTextActive]}>Collect</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.roleBtn, formData.role === 'RECYCLER' && styles.roleBtnActive]}
                            onPress={() => handleChange('role', 'RECYCLER')}
                        >
                            <Text style={[styles.roleText, formData.role === 'RECYCLER' && styles.roleTextActive]}>Recycle</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>Already have an account? Login</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 20,
        justifyContent: 'center',
        minHeight: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#2E7D32',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkText: {
        color: '#2E7D32',
        marginTop: 20,
        textAlign: 'center',
        fontSize: 16,
    },
    roleContainer: {
        marginBottom: 20,
    },
    roleLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
    },
    roleButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roleBtn: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    roleBtnActive: {
        backgroundColor: '#E8F5E9',
        borderColor: '#2E7D32',
    },
    roleText: {
        color: '#666',
        fontWeight: '500',
    },
    roleTextActive: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
});
