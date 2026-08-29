import { Platform } from 'react-native';

/**
 * Geometry of the floating bottom tab bar.
 *
 * Kept here rather than in AppNavigator so screens can import it without a
 * circular dependency (AppNavigator imports every screen).
 *
 * Any scrolling tab screen should pad its content by TAB_BAR_CLEARANCE, or
 * the bar covers the last row - which is exactly what was happening on
 * Wallet and Chat, whose lists ended in 40px of padding.
 */
export const TAB_BAR_HEIGHT = 66;
export const TAB_BAR_BOTTOM = Platform.OS === 'ios' ? 24 : 16;
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 16;
