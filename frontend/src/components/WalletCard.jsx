import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';

const WalletCard = () => {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('DEPOSIT'); // DEPOSIT or WITHDRAW
    const [amount, setAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchWallet();
    }, []);

    const fetchWallet = async () => {
        try {
            const res = await api.get('wallet/');
            // The viewset returns a list, so we take the first item or the object itself if modified
            // Standard ModelViewSet list returns [ { ... } ]
            if (Array.isArray(res.data) && res.data.length > 0) {
                setWallet(res.data[0]);
            } else if (res.data.balance !== undefined) {
                setWallet(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch wallet", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const endpoint = modalType === 'DEPOSIT' ? 'wallet/deposit/' : 'wallet/withdraw/';
            const res = await api.post(endpoint, { amount: parseFloat(amount) });
            setWallet(res.data);
            setShowModal(false);
            setAmount('');
            alert(`${modalType === 'DEPOSIT' ? 'Top up' : 'Withdrawal'} successful!`);
        } catch (err) {
            console.error("Transaction failed", err);
            alert(err.response?.data?.error || "Transaction failed");
        } finally {
            setProcessing(false);
        }
    };

    const openModal = (type) => {
        setModalType(type);
        setShowModal(true);
    };

    if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-2xl"></div>;

    if (!wallet) return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">Wallet not active</p>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet size={120} />
            </div>

            <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium mb-1">Total Balance</p>
                <h2 className="text-4xl font-bold mb-6">
                    {wallet ? `${wallet.currency} ${parseFloat(wallet.balance).toFixed(2)}` : 'Loading...'}
                </h2>

                <div className="flex gap-3">
                    <button
                        onClick={() => openModal('DEPOSIT')}
                        className="flex-1 bg-primary hover:bg-green-500 text-white py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Top Up
                    </button>
                    <button
                        onClick={() => openModal('WITHDRAWAL')}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowUpRight size={18} />
                        Withdraw
                    </button>
                </div>
            </div>

            {/* Transaction Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white text-gray-900 p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">
                            {modalType === 'DEPOSIT' ? 'Top Up Wallet' : 'Withdraw Funds'}
                        </h3>
                        <form onSubmit={handleTransaction}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({wallet?.currency || 'GHS'})</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-2 bg-primary text-white rounded-lg font-bold hover:bg-green-600"
                                >
                                    {processing ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletCard;
