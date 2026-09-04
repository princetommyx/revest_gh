import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Check, X, TriangleAlert, Info, Bell } from 'lucide-react-native';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

const VARIANTS = {
    success: { Icon: Check, color: '#34D399' },
    error: { Icon: X, color: '#F87171' },
    warning: { Icon: TriangleAlert, color: '#FBBF24' },
    info: { Icon: Info, color: '#60A5FA' },
    notification: { Icon: Bell, color: '#34D399' },
};

const CustomToast = ({ type = 'info', title, text2 }) => {
    const styles = useStyles();
    const { colors } = useTheme();
    const { Icon, color } = VARIANTS[type] || VARIANTS.info;
    const entrance = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(entrance, {
            toValue: 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    opacity: entrance,
                    transform: [
                        { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
                        { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                    ],
                },
            ]}
        >
            <View style={styles.card}>
                <View style={[styles.iconDot, { backgroundColor: color }]}>
                    <Icon size={14} color={colors.text} strokeWidth={3} />
                </View>
                <View style={styles.textWrap}>
                    {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
                    {text2 ? <Text style={styles.subtext} numberOfLines={2}>{text2}</Text> : null}
                </View>
            </View>
        </Animated.View>
    );
};

export const toastConfig = {
    success: (props) => <CustomToast type="success" title={props.text1} text2={props.text2} />,
    error: (props) => <CustomToast type="error" title={props.text1} text2={props.text2} />,
    warning: (props) => <CustomToast type="warning" title={props.text1} text2={props.text2} />,
    info: (props) => <CustomToast type="info" title={props.text1} text2={props.text2} />,
    notification: (props) => <CustomToast type="notification" title={props.text1} text2={props.text2} />,
};

const useStyles = makeStyles((c) => ({
    wrapper: {
        width: width * 0.92,
        marginTop: 10,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: c.primary,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    iconDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 1,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: c.onPrimary,
        marginBottom: 2,
    },
    subtext: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
    },
}));
