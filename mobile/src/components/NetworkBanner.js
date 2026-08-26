import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi } from 'lucide-react-native';

export default function NetworkBanner() {
    const netInfo = useNetInfo();
    const insets = useSafeAreaInsets();
    
    // Track previous state to know when we transition from offline to online
    const [wasOffline, setWasOffline] = useState(false);
    
    // Status to display: 'none', 'offline', 'online'
    const [status, setStatus] = useState('none');
    
    const translateY = useRef(new Animated.Value(-150)).current;

    useEffect(() => {
        // netInfo.isConnected can be null while initializing
        if (netInfo.isConnected === false) {
            setWasOffline(true);
            setStatus('offline');
            showBanner();
        } else if (netInfo.isConnected === true && wasOffline) {
            setStatus('online');
            // Hide the 'Back online' banner after 3 seconds
            setTimeout(() => {
                hideBanner();
                // Reset state so it doesn't show again unless we go offline first
                setTimeout(() => {
                    setStatus('none');
                    setWasOffline(false);
                }, 300); // Wait for animation to finish
            }, 3000);
        }
    }, [netInfo.isConnected]);

    const showBanner = () => {
        Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const hideBanner = () => {
        Animated.timing(translateY, {
            toValue: -150, // Slide up out of view
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    if (status === 'none') {
        return null;
    }

    const isOffline = status === 'offline';
    const backgroundColor = isOffline ? '#EF4444' : '#10B981'; // Red-500, Emerald-500
    const Icon = isOffline ? WifiOff : Wifi;
    const text = isOffline ? 'No internet connection' : 'Back online';

    return (
        <Animated.View style={[
            styles.container,
            {
                backgroundColor,
                transform: [{ translateY }],
                paddingTop: insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 44 : 24)
            }
        ]}>
            <View style={styles.content}>
                <Icon size={16} color="#FFFFFF" style={styles.icon} />
                <Text style={styles.text}>{text}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999, // Ensure it's on top of everything
        elevation: 99999,
        paddingBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    icon: {
        marginRight: 8,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    }
});
