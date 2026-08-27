import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Receipt } from 'lucide-react-native';
import { walletApi } from '../api/wallet';
import TransactionRow from '../components/TransactionRow';
import PageLoader from '../components/PageLoader';

export default function TransactionHistoryScreen({ navigation }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTransactions = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const data = await walletApi.getTransactions();
            setTransactions(Array.isArray(data) ? data : (data?.results || []));
        } catch (error) {
            console.error('Failed to load transaction history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transaction History</Text>
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {loading ? (
                <PageLoader label="Loading transactions..." />
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item, index) => (item.id ?? index).toString()}
                    renderItem={({ item }) => <TransactionRow item={item} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTransactions(true)} />}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Receipt size={48} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>No transactions yet</Text>
                            <Text style={styles.emptyText}>Your deposits, earnings, and payouts will show up here.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },
    emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 16, marginBottom: 6 },
    emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
});
