import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

export default function TopUpScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Top Up Debug</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.text}>If you can see this, the navigation works.</Text>
                <Text style={styles.subText}>The crash is caused by the Payment Module.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 20
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    text: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    subText: { fontSize: 14, color: '#666', textAlign: 'center' }
});
