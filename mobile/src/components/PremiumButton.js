import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

export default function PremiumButton({
    title,
    leftIcon: LeftIcon,
    rightIcon: RightIcon = ChevronRight,
    variant = 'primary', // 'primary' or 'secondary'
    onPress,
    disabled,
    loading,
    style
}) {
    const { colors, isDark } = useTheme();
    const isPrimary = variant === 'primary';

    // Primary Theme (Theme's Primary Color)
    const primaryBgColors = [colors.primary, colors.primary];
    const primaryTextColor = colors.onPrimary;
    const primaryIconBg = isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
    const primaryIconColor = colors.onPrimary;

    // Secondary Theme (Theme's Surface Sunken Color)
    const secondaryBgColors = [colors.surfaceSunken, colors.surfaceSunken];
    const secondaryTextColor = colors.text;
    const secondaryIconBg = colors.surface;
    const secondaryIconColor = colors.text;

    const bgColors = isPrimary ? primaryBgColors : secondaryBgColors;
    const textColor = isPrimary ? primaryTextColor : secondaryTextColor;
    const iconBg = isPrimary ? primaryIconBg : secondaryIconBg;
    const iconColor = isPrimary ? primaryIconColor : secondaryIconColor;

    return (
        <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={onPress} 
            disabled={disabled || loading}
            style={[styles.container, style]}
        >
            <LinearGradient
                colors={bgColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.button, 
                    isPrimary ? styles.primaryShadow : styles.secondaryShadow,
                    (disabled || loading) && styles.disabled
                ]}
            >
                {/* Left Icon */}
                <View style={[styles.iconCircle, { backgroundColor: iconBg, ...(!isPrimary && styles.innerShadow) }]}>
                    {loading ? (
                        <ActivityIndicator size="small" color={iconColor} />
                    ) : LeftIcon ? (
                        <LeftIcon size={20} color={iconColor} />
                    ) : (
                        <View style={{ width: 20, height: 20 }} /> // Spacer for balance
                    )}
                </View>

                {/* Text */}
                <Text style={[styles.text, { color: textColor }]}>{title}</Text>

                {/* Right Icon */}
                <View style={[styles.iconCircle, { backgroundColor: iconBg, ...(!isPrimary && styles.innerShadow) }]}>
                    <RightIcon size={20} color={iconColor} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 100, // Pill shape
    },
    primaryShadow: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    secondaryShadow: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },
    disabled: {
        opacity: 0.6,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    innerShadow: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
    },
    text: {
        fontSize: 17,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        letterSpacing: 0.3,
    }
});
