import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Linking, StatusBar, Animated
} from 'react-native';
import Constants from 'expo-constants';
import { Mail, MessageSquare, ChevronDown, Phone, Globe, ExternalLink } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import ScreenHeader from '../components/ScreenHeader';

const SUPPORT_EMAIL = 'support@revesta.com';
const SUPPORT_PHONE = '+233201234567';
const WEBSITE_URL = 'https://revesta.app';

// Answers describe what the app actually does today. The previous list
// documented a self-service withdrawal flow and a "Verification Partner"
// role, neither of which exists.
const FAQS = [
    {
        q: "How do I request a pickup?",
        a: "Open the Pickups tab, confirm your pickup location and destination, choose what you're disposing of, and tap Request Pickup. Nearby collectors are notified straight away and you can track whoever accepts on the map."
    },
    {
        q: "What's the difference between disposing and selling?",
        a: "Safe Disposal is for general waste - you pay a small fee to have it cleared. Sell Recyclables is for materials worth money, like plastic or metal, where the collector pays you. You pick which one when you create the request."
    },
    {
        q: "How is the price decided?",
        a: "You and the collector agree it between yourselves. Post your waste with a price in mind, then use in-app chat to negotiate before the pickup is confirmed."
    },
    {
        q: "Is there a fee for listing items?",
        a: "Listing is free. Revesta only takes a small commission on completed sales."
    },
    {
        q: "How do I see my earnings?",
        a: "Open your Wallet to see your balance, plus any pending earnings and funds held in escrow. Transaction History shows every deposit, payout and fee."
    },
    {
        q: "Why do I need to verify my identity?",
        a: "Verification keeps both sides safe when money and addresses are being exchanged. You can submit your ID from Profile > Verification, and we'll review it."
    }
];

const FaqItem = ({ item, expanded, onToggle }) => {
    const rotate = React.useRef(new Animated.Value(expanded ? 1 : 0)).current;

    React.useEffect(() => {
        Animated.timing(rotate, {
            toValue: expanded ? 1 : 0,
            duration: 180,
            useNativeDriver: true,
        }).start();
    }, [expanded]);

    return (
        <TouchableOpacity style={styles.faqCard} onPress={onToggle} activeOpacity={0.7}>
            <View style={styles.faqHeader}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Animated.View
                    style={{
                        transform: [{
                            rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
                        }],
                    }}
                >
                    <ChevronDown size={18} color="#111" />
                </Animated.View>
            </View>
            {expanded && <Text style={styles.faqA}>{item.a}</Text>}
        </TouchableOpacity>
    );
};

export default function HelpScreen({ navigation }) {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const openUrl = async (url, failureMessage) => {
        try {
            await Linking.openURL(url);
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Could not open', text2: failureMessage });
        }
    };

    const handleEmail = () => openUrl(
        `mailto:${SUPPORT_EMAIL}?subject=Support Request`,
        'No email app is set up on this device.'
    );

    const handleCall = () => openUrl(
        `tel:${SUPPORT_PHONE}`,
        'This device cannot place calls.'
    );

    const handleWebsite = () => openUrl(
        WEBSITE_URL,
        'No browser available.'
    );

    const appVersion = Constants.expoConfig?.version || '1.0.0';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScreenHeader title="Help Center" onBack={() => navigation.goBack()} />

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
                        <TouchableOpacity style={styles.linkRow} onPress={handleCall}>
                            <Phone size={18} color="#666" />
                            <Text style={styles.linkText}>Call Support</Text>
                            <ChevronDown size={18} color="#ccc" style={{ transform: [{ rotate: '-90deg' }] }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkRow} onPress={handleWebsite}>
                            <Globe size={18} color="#666" />
                            <Text style={styles.linkText}>Visit Website</Text>
                            <ExternalLink size={16} color="#ccc" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                    {FAQS.map((item, index) => (
                        <FaqItem
                            key={index}
                            item={item}
                            expanded={expandedIndex === index}
                            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        />
                    ))}

                    <View style={styles.footerInfo}>
                        <Text style={styles.versionText}>Revesta App v{appVersion}</Text>
                        <Text style={styles.copyrightText}>© 2026 Revesta Inc. All rights reserved.</Text>
                    </View>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    contentWrap: { flex: 1, backgroundColor: '#fff' },
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
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    faqQ: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', flex: 1, marginRight: 15 },
    faqA: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginTop: 12 },
    footerInfo: { alignItems: 'center', marginTop: 30 },
    versionText: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    copyrightText: { fontSize: 11, color: '#CCC', marginTop: 4 },
});
