import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Linking, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MessageSquare, ChevronDown, HelpCircle, Phone, Globe, ExternalLink } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const FAQS = [
    {
        q: "How do I request a pickup?",
        a: "Go to the 'Pickups' tab, ensure your location is correct, and tap 'Request Pickup'."
    },
    {
        q: "How do I withdraw earnings?",
        a: "Go to Profile > Wallet Settings, add your Mobile Money number, and request a withdrawal."
    },
    {
        q: "Is there a fee for listing items?",
        a: "Listing items is completely free. We only charge a small commission on successful sales."
    },
    {
        q: "How do I become a Verification Partner?",
        a: "Contact our support team with your credentials to apply for the Verification Partner role."
    }
];

export default function HelpScreen({ navigation }) {
    const handleEmail = () => {
        Linking.openURL('mailto:support@revesta.com?subject=Support Request');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            {/* Organic Curved Header */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Help Center</Text>
                        <TouchableOpacity style={styles.iconBtn}>
                            <HelpCircle size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* Content Overlap */}
            <View style={styles.contentWrap}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

                    <Text style={styles.sectionTitle}>Contact Support</Text>
                    <View style={styles.contactContainer}>
                        <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
                            <View style={[styles.iconBox, { backgroundColor: '#FAFAFA' }]}>
                                <Mail size={22} color="#111" />
                            </View>
                            <Text style={styles.contactLabel}>Email Us</Text>
                            <Text style={styles.contactSub}>Fast response</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.contactCard} onPress={() => navigation.navigate('SupportChat')}>
                            <View style={[styles.iconBox, { backgroundColor: '#FAFAFA' }]}>
                                <MessageSquare size={22} color="#111" />
                            </View>
                            <Text style={styles.contactLabel}>Live Chat</Text>
                            <Text style={styles.contactSub}>AI Assistant</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.otherContacts}>
                        <TouchableOpacity style={styles.linkRow}>
                            <Phone size={18} color="#666" />
                            <Text style={styles.linkText}>Call Support</Text>
                            <ChevronDown size={18} color="#ccc" style={{ transform: [{ rotate: '-90deg' }] }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkRow}>
                            <Globe size={18} color="#666" />
                            <Text style={styles.linkText}>Visit Website</Text>
                            <ExternalLink size={16} color="#ccc" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    {FAQS.map((item, index) => (
                        <View key={index} style={styles.faqCard}>
                            <View style={styles.faqHeader}>
                                <Text style={styles.faqQ}>{item.q}</Text>
                                <ChevronDown size={18} color="#111" />
                            </View>
                            <Text style={styles.faqA}>{item.a}</Text>
                        </View>
                    ))}

                    <View style={styles.footerInfo}>
                        <Text style={styles.versionText}>Revesta App v2.4.0</Text>
                        <Text style={styles.copyrightText}>© 2026 Revesta Inc. All rights reserved.</Text>
                    </View>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    headerBackground: { height: 160, backgroundColor: '#111', overflow: 'hidden' },
    curvedShape: {
        position: 'absolute', bottom: -80, left: -width * 0.25,
        width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75,
        backgroundColor: '#222', opacity: 0.3
    },
    headerContent: { paddingHorizontal: 25, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    contentWrap: { flex: 1, marginTop: -35, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
    scrollPadding: { padding: 25, paddingBottom: 50 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 20, marginTop: 10 },
    contactContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    contactCard: {
        flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 24,
        alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    contactLabel: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
    contactSub: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },
    otherContacts: { marginBottom: 35 },
    linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    linkText: { flex: 1, marginLeft: 15, fontSize: 15, color: '#4B5563', fontWeight: '500' },
    faqCard: { marginBottom: 15, padding: 20, backgroundColor: '#F9FAFB', borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6' },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    faqQ: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', flex: 1, marginRight: 15 },
    faqA: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
    footerInfo: { alignItems: 'center', marginTop: 30 },
    versionText: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    copyrightText: { fontSize: 11, color: '#CCC', marginTop: 4 },
});
