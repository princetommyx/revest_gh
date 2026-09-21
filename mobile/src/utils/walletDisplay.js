import {
    ArrowDownToLine, ArrowUpRight, Banknote, Gift, PieChart,
    TriangleAlert, ArrowDownLeft, Lock, CircleCheck, ArrowLeftRight
} from 'lucide-react-native';

// One distinct glyph per transaction type. These used to carry a hue each
// as well (green/red/amber/blue/purple), which read as decoration rather
// than information - the row's amount is already green for money in and
// red for money out, so the colour said nothing the amount didn't.
const TXN_META = {
    DEPOSIT: { Icon: ArrowDownToLine },
    WITHDRAWAL: { Icon: ArrowUpRight },
    JOB_EARNING: { Icon: Banknote },
    SALE_EARNING: { Icon: Gift },
    COMMISSION_DEDUCTION: { Icon: PieChart },
    PENALTY: { Icon: TriangleAlert },
    REFUND: { Icon: ArrowDownLeft },
    ESCROW_LOCK: { Icon: Lock },
    ESCROW_RELEASE: { Icon: CircleCheck },
    SERVICE_FEE: { Icon: Banknote },
};
const DEFAULT_META = { Icon: ArrowLeftRight };

export const getTxnMeta = (transactionType) => TXN_META[transactionType] || DEFAULT_META;

// amount is signed server-side (negative for debits, positive for credits) -
// trust that instead of maintaining a separate, easy-to-miss type whitelist.
export const isCreditAmount = (amount) => parseFloat(amount) >= 0;

export const STATUS_LABELS = {
    PENDING: { label: 'Pending', color: '#F59E0B' },
    FAILED: { label: 'Failed', color: '#EF4444' },
    CANCELLED: { label: 'Cancelled', color: '#9CA3AF' },
};
