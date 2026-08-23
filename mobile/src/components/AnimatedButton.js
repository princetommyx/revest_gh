import React, { useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function AnimatedButton({ 
    onPress, 
    children, 
    style, 
    containerStyle,
    disabled, 
    activeOpacity = 0.9,
    haptic = true 
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
        
        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePressOut = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
    };

    const handlePress = (e) => {
        if (disabled) return;
        if (onPress) {
            onPress(e);
        }
    };

    return (
        <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={activeOpacity}
            style={containerStyle}
        >
            <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}
