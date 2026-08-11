import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Info, AlertTriangle, AlertCircle, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { BlurView } from 'expo-blur';

const CustomToast = ({ title, text2, iconColor, iconBg, IconComponent }) => (
    <View style={styles.toastContainer}>
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                <IconComponent size={20} color={iconColor} />
            </View>
            <View style={styles.textWrap}>
                {title ? <Text style={styles.titleText} numberOfLines={1}>{title}</Text> : null}
                {text2 ? <Text style={styles.subText} numberOfLines={2}>{text2}</Text> : null}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => Toast.hide()}>
                <X size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
        </BlurView>
    </View>
);

export const toastConfig = {
    success: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconColor="#34D399" iconBg="rgba(52, 211, 153, 0.15)" IconComponent={Check}
        />
    ),
    info: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconColor="#60A5FA" iconBg="rgba(96, 165, 250, 0.15)" IconComponent={Info}
        />
    ),
    warning: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconColor="#FBBF24" iconBg="rgba(251, 191, 36, 0.15)" IconComponent={AlertTriangle}
        />
    ),
    error: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconColor="#F87171" iconBg="rgba(248, 113, 113, 0.15)" IconComponent={AlertCircle}
        />
    )
};

const styles = StyleSheet.create({
    toastContainer: {
        width: '90%',
        marginTop: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    blurContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: 'rgba(20, 20, 20, 0.65)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12, 
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '600',
        marginBottom: 2,
    },
    subText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '400',
    },
    closeBtn: {
        padding: 6,
        marginLeft: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
    }
});
