import React, { useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

export default function PaystackWebView() {
    const navigation = useNavigation();
    const route = useRoute();
    const { authUrl, reference } = route.params;
    const webViewRef = useRef(null);

    const handleNavigationStateChange = (navState) => {
        const { url } = navState;

        // Check for success callback
        if (url.includes('standard.paystack.co/close') || url.includes('/wallet/verify_payment')) {
            // Payment likely completed or cancelled
            navigation.navigate('Wallet', {
                paymentVerified: true,
                reference
            });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Completing Payment</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <X size={24} color="#000" />
                </TouchableOpacity>
            </View>
            <WebView
                ref={webViewRef}
                source={{ uri: authUrl }}
                onNavigationStateChange={handleNavigationStateChange}
                startInLoadingState
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#2E7D32" />
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)'
    }
});
