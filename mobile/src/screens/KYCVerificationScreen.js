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

const STATUS_BANNER = {
    PENDING: {
        title: 'Verification under review',
        body: "We've received your documents and are reviewing them. You don't need to submit again unless we ask you to.",
        bg: '#FFFBEB',
        color: '#B45309',
    },
    VERIFIED: {
        title: "You're verified",
        body: 'Your identity has been confirmed. Nothing further is needed.',
        bg: '#ECFDF5',
        color: '#059669',
    },
    REJECTED: {
        title: 'Resubmission needed',
        body: 'We couldn’t verify your last submission. Please upload clear photos and try again.',
        bg: '#FEF2F2',
        color: '#DC2626',
    },
};

export default function KYCVerificationScreen() {
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
                    <Icon size={32} color="#757575" />
                    <Text style={styles.placeholderText}>{label}</Text>
                    <View style={styles.uploadBadge}>
                        <Upload size={14} color="#fff" />
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Identity Verification</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {!statusLoading && STATUS_BANNER[kycStatus] && (
                    <View style={[styles.statusBanner, { backgroundColor: STATUS_BANNER[kycStatus].bg }]}>
                        <Text style={[styles.statusTitle, { color: STATUS_BANNER[kycStatus].color }]}>
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
                        <CreditCard size={20} color="#757575" />
                        <TextInput
                            style={styles.input}
                            placeholder="GHA-123456789-0"
                            placeholderTextColor="#999"
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
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Verification</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
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
        color: '#4B5563',
        lineHeight: 19,
    },
    statusReason: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '600',
        marginTop: 8,
    },
    infoAlert: {
        backgroundColor: '#E0F2FE',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0369A1',
        marginBottom: 6,
    },
    infoText: {
        fontSize: 14,
        color: '#0C4A6E',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
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
        backgroundColor: '#fff',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#D1D5DB',
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
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    uploadBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#111',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
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
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    disclaimerText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    submitBtn: {
        backgroundColor: '#111',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#111',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: {
        backgroundColor: '#9CA3AF',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
