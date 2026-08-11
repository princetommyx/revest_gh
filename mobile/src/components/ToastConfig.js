import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Info, AlertTriangle, AlertCircle, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const CustomToast = ({ title, text2, iconBg, IconComponent }) => (
    <View style={styles.toastContainer}>
        <View style={styles.content}>
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                <IconComponent size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View style={styles.textWrap}>
                {title ? <Text style={styles.titleText}>{title}</Text> : null}
                {text2 ? <Text style={styles.subText}>{text2}</Text> : null}
            </View>
        </View>
    </View>
);

export const toastConfig = {
    success: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="#10B981" IconComponent={Check}
        />
    ),
    info: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="#3B82F6" IconComponent={Info}
        />
    ),
    warning: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="#F59E0B" IconComponent={AlertTriangle}
        />
    ),
    error: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            iconBg="#EF4444" IconComponent={X}
        />
    )
};

const styles = StyleSheet.create({
    toastContainer: {
        width: '92%',
        marginTop: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        // Premium shadow for iOS
        shadowColor: '#475569',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        // Elevation for Android
        elevation: 8,
        // Very subtle border for depth
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.6)',
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12, 
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        marginTop: 2,
    },
    textWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '700',
        marginBottom: 4,
    },
    subText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '400',
        lineHeight: 20,
    }
});
