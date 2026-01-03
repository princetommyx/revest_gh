import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../api/auth';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Truck, Trash2, Recycle, Check } from 'lucide-react-native';
import apiClient from '../api/client';

import Toast from 'react-native-toast-message';

const COLORS = {
    primary: '#27AE60', // Matching Web
    secondary: '#2980B9',
    background: '#F4F6F8',
    text: '#1F2937',
    textLight: '#6B7280',
    white: '#FFFFFF',
    border: '#E5E7EB',
};

import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
    const navigation = useNavigation();
    const { signUp } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        phone_number: '',
        city: 'Accra',
        role: '',
        // Collector
        vehicle_type: '',
        license_plate: '',
        // Recycler
        recycler_type: 'INDIVIDUAL', // INDIVIDUAL or COMPANY
        company_name: '',
        tax_id: '',
        national_id: '',
        termsAccepted: false,
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleSelect = (role) => {
        handleChange('role', role);
        // Small delay for UI feedback
        setTimeout(() => setStep(2), 200);
    };

    const handleRegister = async () => {
        // Validation
        if (formData.password !== formData.confirm_password) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (!formData.username || !formData.email || !formData.password || !formData.phone_number) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }
        if (!formData.termsAccepted) {
            Alert.alert('Error', 'You must accept the Terms and Conditions');
            return;
        }

        setLoading(true);
        try {
            // Construct payload matching frontend structure
            const payload = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                password2: formData.confirm_password,
                phone_number: formData.phone_number,
                city: formData.city,
                role: formData.role,
                // Spread role specific fields
                ...(formData.role === 'COLLECTOR' && {
                    vehicle_type: formData.vehicle_type,
                    license_plate: formData.license_plate
                }),
                ...(formData.role === 'RECYCLER' && {
                    recycler_type: formData.recycler_type,
                    company_name: formData.company_name,
                    tax_id: formData.tax_id,
                    national_id: formData.national_id
                })
            };

            await signUp(payload);

            Toast.show({
                type: 'success',
                text1: 'Account Created',
                text2: 'Welcome to ReVesta!'
            });
            // No need to navigate manually if auth state updates, 
            // but if backend requires verify, login might not happen yet.
            // Assuming current flow:
            // If auto-login happens, AuthContext state changes -> Navigator switches to Main.
            // If not, we might need to go to Login.
            // Based on context code: if data.tokens exists, we set user.
            // So logic should handle navigation automatically via AppNavigator.

            // However, to be safe and consistent with previous flow if auto-login fails:
            // navigation.navigate('Login'); // AppNavigator will redirect if user is set.
        } catch (error) {
            console.log("Registration Error Detail:", error);

            let msg = 'Registration failed';

            if (error.code === 'ECONNABORTED') {
                msg = "Connection timed out. Check your IP address and backend.";
            } else if (!error.response) {
                // Network error (no response received)
                msg = "Network Error. Is the backend running at " + apiClient.defaults.baseURL + "?";
                if (error.message) msg += " (" + error.message + ")";
            } else if (error.response?.data) {
                const errorData = error.response.data;
                const firstValue = Object.values(errorData)[0];
                if (Array.isArray(firstValue)) {
                    msg = firstValue[0];
                } else if (typeof firstValue === 'string') {
                    msg = firstValue;
                } else {
                    msg = JSON.stringify(errorData);
                }
            }
            Toast.show({
                type: 'error',
                text1: 'Registration Failed',
                text2: msg
            });
        } finally {
            setLoading(false);
        }
    };

    const RoleCard = ({ role, title, desc, icon: Icon, color, bgColor }) => {
        const isSelected = formData.role === role;
        return (
            <TouchableOpacity
                onPress={() => handleRoleSelect(role)}
                style={[
                    styles.roleCard,
                    isSelected && { borderColor: COLORS.primary, backgroundColor: '#F0FDF4' }
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
                    <Icon size={24} color={color} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>{title}</Text>
                    <Text style={styles.roleDesc}>{desc}</Text>
                </View>
                {isSelected && <Check size={20} color={COLORS.primary} />}
            </TouchableOpacity>
        );
    };

    // Step 1: Role Selection
    if (step === 1) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Register</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.stepTitle}>Choose your role</Text>

                    <View style={styles.rolesContainer}>
                        <RoleCard
                            role="COLLECTOR"
                            title="Become a Collector"
                            desc="Pick up waste and earn money"
                            icon={Truck}
                            color={COLORS.primary}
                            bgColor="#DCFCE7" // green-100
                        />

                        <RoleCard
                            role="SELLER"
                            title="Become a Disposer"
                            desc="Dispose of waste responsibly"
                            icon={Trash2}
                            color="#2563EB" // blue-600
                            bgColor="#DBEAFE" // blue-100
                        />

                        <RoleCard
                            role="RECYCLER"
                            title="Become a Recycler"
                            desc="Buy and process recyclables"
                            icon={Recycle}
                            color="#EA580C" // orange-600
                            bgColor="#FFEDD5" // orange-100
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Step 2: Details Form
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.stepTitle}>Create Account</Text>
                <Text style={styles.subTitle}>Registering as {formData.role.toLowerCase()}</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Choose a username"
                        value={formData.username}
                        onChangeText={(val) => handleChange('username', val)}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter email address"
                        value={formData.email}
                        onChangeText={(val) => handleChange('email', val)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Password Fields */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Create a password"
                        value={formData.password}
                        onChangeText={(val) => handleChange('password', val)}
                        secureTextEntry
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Repeat password"
                        value={formData.confirm_password}
                        onChangeText={(val) => handleChange('confirm_password', val)}
                        secureTextEntry
                    />
                </View>

                {/* Phone & City */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.phoneContainer}>
                        <View style={styles.phonePrefix}>
                            <Text>🇬🇭 +233</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                            placeholder="Mobile number"
                            value={formData.phone_number}
                            onChangeText={(val) => handleChange('phone_number', val)}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>City</Text>
                    {/* Simplified dropdown via simple view for now, could use Picker or Modal */}
                    <View style={styles.pickerFake}>
                        <Text>{formData.city}</Text>
                    </View>
                </View>

                {/* Conditional Fields: Collector */}
                {formData.role === 'COLLECTOR' && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Vehicle Type</Text>
                            {/* Placeholder for Picker */}
                            <TextInput
                                style={styles.input}
                                placeholder="TRUCK, TRICYCLE, MOTORBIKE..."
                                value={formData.vehicle_type}
                                onChangeText={(val) => handleChange('vehicle_type', val)}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>License Plate</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter license plate"
                                value={formData.license_plate}
                                onChangeText={(val) => handleChange('license_plate', val)}
                            />
                        </View>
                    </>
                )}

                {/* Conditional Fields: Recycler */}
                {formData.role === 'RECYCLER' && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Recycler Type</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.chip, formData.recycler_type === 'INDIVIDUAL' && styles.chipActive]}
                                    onPress={() => handleChange('recycler_type', 'INDIVIDUAL')}
                                >
                                    <Text style={[styles.chipText, formData.recycler_type === 'INDIVIDUAL' && styles.chipTextActive]}>Individual</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.chip, formData.recycler_type === 'COMPANY' && styles.chipActive]}
                                    onPress={() => handleChange('recycler_type', 'COMPANY')}
                                >
                                    <Text style={[styles.chipText, formData.recycler_type === 'COMPANY' && styles.chipTextActive]}>Company</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {formData.recycler_type === 'COMPANY' ? (
                            <>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Company Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Company Name"
                                        value={formData.company_name}
                                        onChangeText={(val) => handleChange('company_name', val)}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Tax ID</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Tax ID"
                                        value={formData.tax_id}
                                        onChangeText={(val) => handleChange('tax_id', val)}
                                    />
                                </View>
                            </>
                        ) : (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>National ID</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="National ID"
                                    value={formData.national_id}
                                    onChangeText={(val) => handleChange('national_id', val)}
                                />
                            </View>
                        )}
                    </>
                )}

                <View style={styles.termsContainer}>
                    <TouchableOpacity
                        style={[styles.checkbox, formData.termsAccepted && styles.checkboxActive]}
                        onPress={() => handleChange('termsAccepted', !formData.termsAccepted)}
                    >
                        {formData.termsAccepted && <Check size={14} color="#fff" />}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.termsText}>
                            By registering, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy policy</Text>, commit to comply with obligations under the European Union and local legislation and provide only legal services and content on the Revesta Platform.
                        </Text>
                        <Text style={[styles.termsText, { marginTop: 8 }]}>
                            Once you've become a {formData.role.toLowerCase()}, we will occasionally send you offers and promotions related to our services. You can always unsubscribe by changing your communication preferences.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>Create Account</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    content: {
        padding: 24,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 50,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 24,
    },
    subTitle: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: 24,
        marginTop: -16,
    },
    rolesContainer: {
        gap: 16,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 16,
        backgroundColor: COLORS.white,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    roleInfo: {
        flex: 1,
    },
    roleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    roleDesc: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    phoneContainer: {
        flexDirection: 'row',
    },
    phonePrefix: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        marginRight: 1,
    },
    pickerFake: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.background,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
    },
    chipText: {
        color: COLORS.text,
        fontWeight: '500',
    },
    chipTextActive: {
        color: COLORS.white,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    termsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkboxActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    termsText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textLight,
        lineHeight: 18,
    },
    linkText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
});
