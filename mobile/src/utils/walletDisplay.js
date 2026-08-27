import {
    ArrowDownToLine, ArrowUpRight, Banknote, Gift, PieChart,
    TriangleAlert, ArrowDownLeft, Lock, CircleCheck, ArrowLeftRight
} from 'lucide-react-native';

// Visual identity per transaction type - the backend already gives us the
// exact type, so there's no reason every row should look the same.
const TXN_META = {
    DEPOSIT: { Icon: ArrowDownToLine, color: '#10B981' },
    WITHDRAWAL: { Icon: ArrowUpRight, color: '#EF4444' },
    JOB_EARNING: { Icon: Banknote, color: '#10B981' },
    SALE_EARNING: { Icon: Gift, color: '#10B981' },
    COMMISSION_DEDUCTION: { Icon: PieChart, color: '#F59E0B' },
    PENALTY: { Icon: TriangleAlert, color: '#EF4444' },
    REFUND: { Icon: ArrowDownLeft, color: '#3B82F6' },
    ESCROW_LOCK: { Icon: Lock, color: '#8B5CF6' },
    ESCROW_RELEASE: { Icon: CircleCheck, color: '#10B981' },
    SERVICE_FEE: { Icon: Banknote, color: '#F59E0B' },
};
const DEFAULT_META = { Icon: ArrowLeftRight, color: '#6B7280' };

export const getTxnMeta = (transactionType) => TXN_META[transactionType] || DEFAULT_META;

// amount is signed server-side (negative for debits, positive for credits) -
// trust that instead of maintaining a separate, easy-to-miss type whitelist.
export const isCreditAmount = (amount) => parseFloat(amount) >= 0;

export const STATUS_LABELS = {
    PENDING: { label: 'Pending', color: '#F59E0B' },
    FAILED: { label: 'Failed', color: '#EF4444' },
    CANCELLED: { label: 'Cancelled', color: '#9CA3AF' },
};
