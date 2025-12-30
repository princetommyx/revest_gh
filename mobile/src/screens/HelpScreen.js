import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MessageSquare, ChevronDown } from 'lucide-react-native';

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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Contact Us</Text>

                <View style={styles.contactRow}>
                    <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
                        <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                            <Mail size={24} color="#1976D2" />
                        </View>
                        <Text style={styles.contactLabel}>Email Support</Text>
                        <Text style={styles.contactSub}>support@revesta.com</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                            <MessageSquare size={24} color="#2E7D32" />
                        </View>
                        <Text style={styles.contactLabel}>Live Chat</Text>
                        <Text style={styles.contactSub}>Coming Soon</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

                {FAQS.map((item, index) => (
                    <View key={index} style={styles.faqItem}>
                        <View style={styles.faqHeader}>
                            <Text style={styles.faqQ}>{item.q}</Text>
                        </View>
                        <Text style={styles.faqA}>{item.a}</Text>
                    </View>
                ))}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', padding: 20,
        borderBottomWidth: 1, borderBottomColor: '#f1f1f1'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    backBtn: { padding: 5 },
    content: { padding: 25 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20, marginTop: 10 },

    contactRow: { flexDirection: 'row', gap: 15, marginBottom: 40 },
    contactCard: {
        flex: 1, backgroundColor: '#fff', padding: 20,
        borderRadius: 16, alignItems: 'center',
        borderWidth: 1, borderColor: '#eee',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
    },
    iconBox: {
        width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', marginBottom: 12
    },
    contactLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    contactSub: { fontSize: 12, color: '#999', marginTop: 4 },

    faqItem: {
        marginBottom: 15, padding: 20,
        backgroundColor: '#f9fafb', borderRadius: 12
    },
    faqQ: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    faqA: { fontSize: 14, color: '#666', lineHeight: 22 }
});
