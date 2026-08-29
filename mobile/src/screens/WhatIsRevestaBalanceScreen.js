import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Wallet, ShieldCheck, Banknote, Zap } from 'lucide-react-native';

const WhatIsRevestaBalanceScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Revesta Balance</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.iconContainer}>
                    <Wallet size={48} color="#059669" />
                </View>
                
                <Text style={styles.mainTitle}>What is Revesta Balance?</Text>
                <Text style={styles.description}>
                    Revesta Balance is your secure, built-in digital wallet for handling all waste management transactions seamlessly within the Revesta app.
                </Text>

                <View style={styles.featuresContainer}>
                    <View style={styles.featureItem}>
                        <View style={styles.featureIconWrapper}>
                            <Banknote size={24} color="#059669" />
                        </View>
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Cashless Payments</Text>
                            <Text style={styles.featureDesc}>
                                Disposers can pay for waste pickups effortlessly, and Collectors can receive payments directly into their Revesta wallet.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.featureIconWrapper}>
                            <Zap size={24} color="#D97706" />
                        </View>
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Instant Transactions</Text>
                            <Text style={styles.featureDesc}>
                                No more waiting for change. Payments and commissions are processed instantly and securely.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.featureIconWrapper}>
                            <ShieldCheck size={24} color="#2563EB" />
                        </View>
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Safe & Secure</Text>
                            <Text style={styles.featureDesc}>
                                Your funds are encrypted and protected by industry-leading security standards.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    scrollContent: {
        padding: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    featuresContainer: {
        gap: 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    featureIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
});

export default WhatIsRevestaBalanceScreen;
