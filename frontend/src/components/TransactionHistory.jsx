import { useState, useEffect } from 'react';
import api from '../api/axios';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

const TransactionHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await api.get('wallet/');
            if (Array.isArray(res.data) && res.data.length > 0) {
                // Assuming the serializer includes transactions nested or we fetch from a separate endpoint
                // The current serializer setup includes `transactions` in the wallet object
                const wallet = res.data[0];
                // Sort by newest first
                const sorted = wallet.transactions ? [...wallet.transactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
                setTransactions(sorted);
            }
        } catch (err) {
            console.error("Failed to fetch transactions", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-4 text-gray-500">Loading history...</div>;

    if (transactions.length === 0) return (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Clock className="mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'PAYMENT_RECEIVED'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                            }`}>
                            {tx.transaction_type === 'DEPOSIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">
                                {tx.transaction_type === 'DEPOSIT' ? 'Top Up' :
                                    tx.transaction_type === 'WITHDRAWAL' ? 'Withdrawal' : tx.transaction_type}
                            </p>
                            <p className="text-xs text-gray-500">
                                {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-bold ${tx.transaction_type === 'DEPOSIT'
                            ? 'text-green-600'
                            : 'text-gray-900'
                            }`}>
                            {tx.transaction_type === 'DEPOSIT' ? '+' : '-'} {tx.amount}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {tx.status}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TransactionHistory;
