import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Info, AlertTriangle, AlertCircle, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const CustomToast = ({ title, text2, iconBg, bg, border, IconComponent }) => (
    <View style={[styles.toastContainer, { backgroundColor: bg, borderColor: border }]}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <IconComponent size={20} color="#FFF" />
        </View>
        <View style={styles.textWrap}>
            <Text style={styles.titleText} numberOfLines={1}>{title || text2}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => Toast.hide()}>
            <X size={16} color="#666" />
        </TouchableOpacity>
    </View>
);

export const toastConfig = {
    success: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            bg="#F0FDF4" border="#DCFCE7" iconBg="#22C55E" IconComponent={Check}
        />
    ),
    info: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            bg="#EFF6FF" border="#DBEAFE" iconBg="#3B82F6" IconComponent={Info}
        />
    ),
    warning: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            bg="#FFFBEB" border="#FEF3C7" iconBg="#F59E0B" IconComponent={AlertTriangle}
        />
    ),
    error: (props) => (
        <CustomToast 
            title={props.text1} text2={props.text2}
            bg="#FEF2F2" border="#FEE2E2" iconBg="#EF4444" IconComponent={AlertCircle}
        />
    )
};

const styles = StyleSheet.create({
    toastContainer: {
        width: '85%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        marginTop: 20
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 12, 
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 15,
        color: '#1F2937',
        fontWeight: '500',
    },
    closeBtn: {
        padding: 4,
    }
});
