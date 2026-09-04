import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import { SkeletonWalletPage } from '../components/Skeleton';
import { ChevronRight, HelpCircle, Clock, Plus, Banknote, ArrowLeft } from 'lucide-react-native';
import { TAB_BAR_CLEARANCE } from '../constants/layout';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const PAYMENT_METHODS = [
    { id: 'ATL', name: 'AirtelTigo Money', icon: require('../../assets/airteltigo.jpg') },
    { id: 'MTN', name: 'MTN Mobile Money', icon: require('../../assets/mtn.jpg') },
    { id: 'TEL', name: 'Telecel cash', icon: require('../../assets/telecel.jpg') },
    // Icon built at render time - this list is module scope, where the theme isn't available.
    { id: 'CASH', name: 'Cash', icon: null },
];

export default function WalletScreen() {
    const { user } = useAuth();
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const { data: wallet, isLoading } = useWallet();
    const [selectedMethod, setSelectedMethod] = useState('CASH');

    if (isLoading) {
        return <SkeletonWalletPage />;
    }

    const balance = parseFloat(wallet?.balance || 0);
    const pendingEarnings = parseFloat(wallet?.pending_earnings || 0); // Commission amount

    const isCollector = user?.role === 'COLLECTOR' || user?.role === 'RECYCLER';

    const renderRadioButton = (isSelected) => (
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
            {isSelected && <View style={styles.radioInner} />}
        </View>
    );

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Revesta balance</Text>
                    <Text style={styles.balanceAmount}>GH₵{balance.toFixed(2)}</Text>
                    
                    <View style={styles.balanceDivider} />
                    
                    <Text style={styles.balanceNote}>
                        Revesta balance can be used for payments
                    </Text>
                </View>

                {/* Balance Links */}
                <View style={styles.linksContainer}>
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('WhatIsRevestaBalance')}>
                        <View style={styles.linkLeft}>
                            <HelpCircle size={20} color={colors.textSecondary} style={styles.linkIcon} />
                            <Text style={styles.linkText}>What is Revesta balance?</Text>
                        </View>
                        <ChevronRight size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    
                    <View style={styles.linkDivider} />
                    
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('TransactionHistory')}>
                        <View style={styles.linkLeft}>
                            <Clock size={20} color={colors.textSecondary} style={styles.linkIcon} />
                            <Text style={styles.linkText}>See Revesta balance transactions</Text>
                        </View>
                        <ChevronRight size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Collector Commission Section */}
                {isCollector && (
                    <View style={styles.commissionSection}>
                        <Text style={styles.sectionTitle}>Commission</Text>
                        <View style={[styles.balanceCard, { backgroundColor: colors.dangerSoft }]}>
                            <Text style={styles.balanceLabel}>Pending Commission</Text>
                            <Text style={styles.balanceAmount}>GH₵{pendingEarnings.toFixed(2)}</Text>
                            
                            <View style={styles.balanceDivider} />
                            
                            <TouchableOpacity style={styles.payBtn}>
                                <Text style={styles.payBtnText}>Pay Commission</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Payment Methods */}
                <View style={styles.paymentMethodsSection}>
                    <Text style={styles.sectionTitle}>Payment methods</Text>
                    
                    <View style={styles.methodsList}>
                        {PAYMENT_METHODS.map((method, index) => (
                            <View key={method.id}>
                                <TouchableOpacity 
                                    style={styles.methodRow}
                                    onPress={() => setSelectedMethod(method.id)}
                                >
                                    <View style={styles.methodLeft}>
                                        <View style={styles.methodIconWrapper}>
                                            {typeof method.icon === 'number' ? (
                                                <Image source={method.icon} style={{ width: 40, height: 40, resizeMode: 'contain', borderRadius: 4 }} />
                                            ) : method.icon?.uri ? (
                                                <Image source={{ uri: method.icon.uri }} style={{ width: 40, height: 40, resizeMode: 'contain', borderRadius: 4 }} />
                                            ) : typeof method.icon === 'string' ? (
                                                <Text style={styles.methodEmoji}>{method.icon}</Text>
                                            ) : (
                                                (method.icon || <Banknote size={20} color={colors.accent} />)
                                            )}
                                        </View>
                                        <Text style={styles.methodName}>{method.name}</Text>
                                    </View>
                                    {renderRadioButton(selectedMethod === method.id)}
                                </TouchableOpacity>
                                {index < PAYMENT_METHODS.length - 1 && <View style={styles.methodDivider} />}
                            </View>
                        ))}
                    </View>

                    {/* Add Card */}
                    <TouchableOpacity style={styles.addCardRow}>
                        <View style={styles.methodLeft}>
                            <Plus size={20} color={colors.text} style={styles.addIcon} />
                            <Text style={styles.methodName}>Add debit/credit card</Text>
                        </View>
                        <ChevronRight size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: c.text,
    },
    scrollContent: {
        paddingBottom: TAB_BAR_CLEARANCE + 20,
    },
    balanceCard: {
        backgroundColor: c.surfaceSunken,
        borderRadius: 16,
        marginHorizontal: 20,
        padding: 20,
        marginTop: 10,
    },
    balanceLabel: {
        fontSize: 16,
        color: c.textSecondary,
        marginBottom: 8,
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: c.text,
        marginBottom: 16,
    },
    balanceDivider: {
        height: 1,
        backgroundColor: c.surfaceSunken,
        marginBottom: 16,
    },
    balanceNote: {
        fontSize: 14,
        color: c.textSecondary,
    },
    linksContainer: {
        marginHorizontal: 20,
        marginTop: 20,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkIcon: {
        marginRight: 16,
    },
    linkText: {
        fontSize: 16,
        color: c.text,
    },
    linkDivider: {
        height: 1,
        backgroundColor: c.surfaceSunken,
        marginLeft: 36,
    },
    commissionSection: {
        marginTop: 30,
    },
    payBtn: {
        backgroundColor: c.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    payBtnText: {
        color: c.onPrimary,
        fontWeight: 'bold',
        fontSize: 15,
    },
    paymentMethodsSection: {
        marginTop: 30,
        marginHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: c.text,
        marginBottom: 20,
    },
    methodsList: {
        marginBottom: 10,
    },
    methodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    methodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    methodIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    methodEmoji: {
        fontSize: 16,
    },
    methodName: {
        fontSize: 16,
        color: c.text,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: c.accent,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: c.accent,
    },
    methodDivider: {
        height: 1,
        backgroundColor: c.surfaceSunken,
        marginLeft: 48,
    },
    addCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    addIcon: {
        marginRight: 16,
        marginLeft: 4,
    },
}));
