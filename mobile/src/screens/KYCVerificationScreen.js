import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, CreditCard, User, Upload, CircleCheck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import apiClient from '../api/client';
import { authApi } from '../api/auth';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const STATUS_BANNER = {
    PENDING: {
        title: 'Verification under review',
        body: "We've received your documents and are reviewing them. You don't need to submit again unless we ask you to.",
        tone: 'warning',
    },
    VERIFIED: {
        title: "You're verified",
        body: 'Your identity has been confirmed. Nothing further is needed.',
        tone: 'accent',
    },
    REJECTED: {
        title: 'Resubmission needed',
        body: 'We couldn’t verify your last submission. Please upload clear photos and try again.',
        tone: 'danger',
    },
};

export default function KYCVerificationScreen() {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [kycStatus, setKycStatus] = useState(null);
    const [rejectionReason, setRejectionReason] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);

    // The screen used to open on a blank upload form regardless of whether a
    // submission was already pending, verified, or rejected - and never showed
    // the rejection reason the backend returns.
    useEffect(() => {
        (async () => {
            try {
                const data = await authApi.getKycStatus();
                setKycStatus(data?.status || 'UNVERIFIED');
                setRejectionReason(data?.rejection_reason || null);
            } catch (e) {
                setKycStatus('UNVERIFIED');
            } finally {
                setStatusLoading(false);
            }
        })();
    }, []);

    const [idFront, setIdFront] = useState(null);
    const [idBack, setIdBack] = useState(null);
    const [selfie, setSelfie] = useState(null);
    const [idNumber, setIdNumber] = useState('');

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required for identity verification.');
            return false;
        }
        return true;
    };

    const pickImage = async (setter, useCamera = false) => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;

        let result;
        const options = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: useCamera ? [1, 1] : [4, 3], // Square for selfie, rectangle for ID
            quality: 0.8,
        };

        if (useCamera) {
            result = await ImagePicker.launchCameraAsync({
                ...options,
                cameraType: ImagePicker.CameraType.front,
            });
        } else {
            // Let them choose camera or gallery for ID
            Alert.alert(
                "Upload Document",
                "Choose a source",
                [
                    {
                        text: "Camera",
                        onPress: async () => {
                            result = await ImagePicker.launchCameraAsync(options);
                            if (!result.canceled) setter(result.assets[0]);
                        }
                    },
                    {
                        text: "Gallery",
                        onPress: async () => {
                            result = await ImagePicker.launchImageLibraryAsync(options);
                            if (!result.canceled) setter(result.assets[0]);
                        }
                    },
                    { text: "Cancel", style: "cancel" }
                ]
            );
            return;
        }

        if (!result.canceled) {
            setter(result.assets[0]);
        }
    };

    const handleSubmit = async () => {
        if (!idFront || !idBack || !selfie || !idNumber.trim()) {
            Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please provide all required images and your ID number.' });
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('id_number', idNumber);

            const appendImage = (asset, name) => {
                let filename = asset.uri.split('/').pop();
                let match = /\.(\w+)$/.exec(filename);
                let type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : `image/jpeg`;
                formData.append(name, { uri: asset.uri, name: filename, type });
            };

            appendImage(idFront, 'id_front_image');
            appendImage(idBack, 'id_back_image');
            appendImage(selfie, 'selfie_image');

            const response = await apiClient.post('users/kyc/submit/', formData);

            Toast.show({ type: 'success', text1: 'Submitted', text2: 'Your identity document is pending review.' });
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: 'Submission Failed',
                text2: error.response?.data?.error || 'Something went wrong.'
            });
        } finally {
            setLoading(false);
        }
    };

    const ImagePickerBox = ({ label, icon: Icon, image, onPress }) => (
        <TouchableOpacity style={styles.pickerBox} onPress={onPress}>
            {image ? (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    <View style={styles.changeOverlay}>
                        <Text style={styles.changeText}>Tap to change</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.placeholderContainer}>
                    <Icon size={32} color={colors.textSecondary} />
                    <Text style={styles.placeholderText}>{label}</Text>
                    <View style={styles.uploadBadge}>
                        <Upload size={14} color={colors.onPrimary} />
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Identity Verification</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {!statusLoading && STATUS_BANNER[kycStatus] && (
                    <View style={[styles.statusBanner, { backgroundColor: colors[STATUS_BANNER[kycStatus].tone + 'Soft'] }]}>
                        <Text style={[styles.statusTitle, { color: colors[STATUS_BANNER[kycStatus].tone] }]}>
                            {STATUS_BANNER[kycStatus].title}
                        </Text>
                        <Text style={styles.statusBody}>{STATUS_BANNER[kycStatus].body}</Text>
                        {kycStatus === 'REJECTED' && !!rejectionReason && (
                            <Text style={styles.statusReason}>Reason: {rejectionReason}</Text>
                        )}
                    </View>
                )}

                <View style={styles.infoAlert}>
                    <Text style={styles.infoTitle}>Why do we need this?</Text>
                    <Text style={styles.infoText}>As a Collector or Recycler, we need to verify your identity to ensure trust and safety across the ReVesta network.</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ECOWAS / National ID Number</Text>
                    <View style={styles.inputWrapper}>
                        <CreditCard size={20} color={colors.textSecondary} />
                        <TextInput
                            style={styles.input}
                            placeholder="GHA-123456789-0"
                            placeholderTextColor={colors.textMuted}
                            value={idNumber}
                            onChangeText={setIdNumber}
                            autoCapitalize="characters"
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Document Upload</Text>

                <View style={styles.gridContainer}>
                    <View style={styles.gridItem}>
                        <ImagePickerBox
                            label="Front of ID"
                            icon={CreditCard}
                            image={idFront}
                            onPress={() => pickImage(setIdFront, false)}
                        />
                    </View>
                    <View style={styles.gridItem}>
                        <ImagePickerBox
                            label="Back of ID"
                            icon={CreditCard}
                            image={idBack}
                            onPress={() => pickImage(setIdBack, false)}
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Face Matching</Text>
                <View style={styles.gridContainer}>
                    <View style={[styles.gridItem, { width: '100%', height: 180 }]}>
                        <ImagePickerBox
                            label="Take a clear selfie"
                            icon={User}
                            image={selfie}
                            onPress={() => pickImage(setSelfie, true)}
                        />
                    </View>
                </View>

                <Text style={styles.disclaimerText}>
                    Your information is encrypted securely and will only be used for verification purposes.
                </Text>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Verification</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.surfaceAlt,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: c.surfaceSunken,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: c.text,
    },
    content: {
        padding: 20,
        paddingBottom: 50,
    },
    statusBanner: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
    },
    statusBody: {
        fontSize: 13,
        color: c.textSecondary,
        lineHeight: 19,
    },
    statusReason: {
        fontSize: 13,
        color: c.text,
        fontWeight: '600',
        marginTop: 8,
    },
    infoAlert: {
        backgroundColor: c.infoSoft,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: c.info,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: c.info,
        marginBottom: 6,
    },
    infoText: {
        fontSize: 14,
        color: c.text,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: c.text,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: c.text,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: c.text,
        marginBottom: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    gridItem: {
        width: '48%',
        height: 120,
    },
    pickerBox: {
        flex: 1,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: c.border,
        borderRadius: 12,
        overflow: 'hidden',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 12,
        color: c.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    uploadBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: c.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    imagePreviewContainer: {
        flex: 1,
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    changeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeText: {
        color: c.onPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    disclaimerText: {
        fontSize: 12,
        color: c.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    submitBtn: {
        backgroundColor: c.primary,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: {
        backgroundColor: c.textMuted,
        shadowOpacity: 0,
        elevation: 0,
    },
    submitBtnText: {
        color: c.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
}));
