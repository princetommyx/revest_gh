import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { authApi } from '../api/auth';


export default function ForgotPasswordScreen() {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendResetLink = async () => {
        if (!email) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your email address' });
            return;
        }

        setLoading(true);
        try {
            await authApi.requestPasswordReset(email);

            Toast.show({
                type: 'success',
                text1: 'Email Sent',
                text2: 'If an account exists, you will receive a reset link.'
            });
            setTimeout(() => navigation.goBack(), 2000);
        } catch (error) {
            console.log(error);
            Toast.show({
                type: 'error',
                text1: 'Request Failed',
                text2: 'Could not send reset link. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <ArrowLeft size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Forgot Password</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.description}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleSendResetLink}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Send Reset Link</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 20,
        paddingTop: 40,
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        lineHeight: 24,
    },
    inputContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 20,
        height: 56,
        justifyContent: 'center',
    },
    input: {
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    button: {
        backgroundColor: '#2E7D32',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
