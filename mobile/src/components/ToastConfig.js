import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Check, Info, AlertTriangle, X, Bell } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const CustomToast = ({ title, text2, iconBg, IconComponent, accentColor }) => (
    <View style={styles.toastWrapper}>
        <BlurView 
            intensity={90} 
            tint="light" 
            style={[styles.toastContainer, { borderLeftColor: accentColor }]}
        >
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                <IconComponent size={20} color={accentColor} strokeWidth={2.5} />
            </View>
            <View style={styles.textWrap}>
                {title ? <Text style={styles.titleText}>{title}</Text> : null}
                {text2 ? <Text style={styles.subText}>{text2}</Text> : null}
            </View>
        </BlurView>
    </View>
);

export const toastConfig = {
    success: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="rgba(16, 185, 129, 0.15)" IconComponent={Check} accentColor="#10B981"
        />
    ),
    info: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="rgba(59, 130, 246, 0.15)" IconComponent={Info} accentColor="#3B82F6"
        />
    ),
    warning: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="rgba(245, 158, 11, 0.15)" IconComponent={AlertTriangle} accentColor="#F59E0B"
        />
    ),
    error: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="rgba(239, 68, 68, 0.15)" IconComponent={X} accentColor="#EF4444"
        />
    ),
    notification: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="rgba(139, 92, 246, 0.15)" IconComponent={Bell} accentColor="#8B5CF6"
        />
    )
};

const styles = StyleSheet.create({
    toastWrapper: {
        width: width * 0.92,
        marginTop: 10,
        // Premium shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
    },
    toastContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        overflow: 'hidden',
        borderLeftWidth: 6,
        // Fallback solid color in case blur isn't supported immediately
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 16, 
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '800',
        marginBottom: 2,
        letterSpacing: 0.2,
    },
    subText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
        lineHeight: 20,
    }
});
