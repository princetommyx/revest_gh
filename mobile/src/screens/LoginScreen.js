import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../api/auth';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: '196345204120-trrs708ntrih7r7aaf1bccv2u2io1e1p.apps.googleusercontent.com',
        androidClientId: '196345204120-trrs708ntrih7r7aaf1bccv2u2io1e1p.apps.googleusercontent.com', // Reusing web ID to prevent crash
        iosClientId: '196345204120-trrs708ntrih7r7aaf1bccv2u2io1e1p.apps.googleusercontent.com',
    });

    React.useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            // Use access token or id_token depending on your backend
            handleGoogleBackend(authentication.accessToken);
        }
    }, [response]);

    const { signIn, googleSignIn } = useAuth();

    const handleGoogleBackend = async (token) => {
        setLoading(true);
        try {
            await googleSignIn(token);
            Toast.show({
                type: 'success',
                text1: 'Google Sign-In',
                text2: 'Logged in with Google!'
            });
        } catch (error) {
            console.log("Google Login Error:", error);
            Toast.show({
                type: 'error',
                text1: 'Google Login Failed',
                text2: 'Could not authenticate with server'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please enter email and password'
            });
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);
            Toast.show({
                type: 'success',
                text1: 'Welcome back!',
                text2: 'Successfully signed in.'
            });
        } catch (error) {
            console.log(error);
            Toast.show({
                type: 'error',
                text1: 'Login Failed',
                text2: error.response?.data?.detail || 'Invalid credentials'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <View style={{ width: 24 }} />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>ReVesta</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email or Username"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.googleButton]}
                    onPress={() => promptAsync()}
                    disabled={!request}
                >
                    <Text style={[styles.buttonText, styles.googleButtonText]}>Sign in with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
                </TouchableOpacity>
            </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2E7D32', // Green
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30,
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
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    googleButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        marginTop: 15,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    googleButtonText: {
        color: '#333',
    },
    linkText: {
        color: '#2E7D32',
        marginTop: 20,
        textAlign: 'center',
        fontSize: 16,
    },
});
