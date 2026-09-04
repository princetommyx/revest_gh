/**
 * Semantic colour tokens.
 *
 * Screens should never reach for a raw hex again - they ask for the *role*
 * ("this is a surface", "this is muted text") and the active theme decides the
 * value. That's what makes one StyleSheet work in both modes.
 *
 * The light values are the app's existing palette, so light mode is unchanged.
 *
 * The one non-obvious pairing is `primary` / `onPrimary`. Revesta's primary
 * action is a black button with white text. On a dark background a black
 * button disappears, so in dark mode the pair inverts to a light button with
 * dark text - preserving the *intent* (the highest-contrast thing on screen)
 * rather than the literal colour.
 */

export const lightColors = {
    // Grounds
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',      // inset fields, quiet rows
    surfaceSunken: '#F3F4F6',   // chips, icon boxes, pressed states

    // Lines
    border: '#E5E7EB',
    borderSubtle: '#F3F4F6',

    // Type
    text: '#111111',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Primary action
    primary: '#111111',
    onPrimary: '#FFFFFF',

    // Brand accent
    accent: '#059669',
    accentSoft: '#ECFDF5',
    onAccent: '#FFFFFF',

    // Status
    danger: '#EF4444',
    dangerSoft: '#FEF2F2',
    warning: '#F59E0B',
    warningSoft: '#FFFBEB',
    success: '#10B981',
    successSoft: '#ECFDF5',
    info: '#3B82F6',
    infoSoft: '#EFF6FF',

    // Chrome
    overlay: 'rgba(0,0,0,0.45)',
    shadow: '#000000',
    skeleton: '#E5E7EB',
};

export const darkColors = {
    // Grounds - neutrals carry a slight green bias so they sit with the brand
    // accent rather than reading as generic grey.
    bg: '#0B0F0E',
    surface: '#141A19',
    surfaceAlt: '#1B2322',
    surfaceSunken: '#232C2B',

    border: '#2C3634',
    borderSubtle: '#1F2726',

    text: '#F2F5F4',
    textSecondary: '#A6B2AF',
    textMuted: '#7C8A87',
    textInverse: '#0B0F0E',

    // Inverted: a black button is invisible on a black ground.
    primary: '#F2F5F4',
    onPrimary: '#0B0F0E',

    // Brighter green - #059669 doesn't carry enough luminance on a dark ground.
    accent: '#10B981',
    accentSoft: '#0F2A22',
    onAccent: '#04120D',

    danger: '#F87171',
    dangerSoft: '#2A1616',
    warning: '#FBBF24',
    warningSoft: '#2A2110',
    success: '#34D399',
    successSoft: '#0F2A22',
    info: '#60A5FA',
    infoSoft: '#13233A',

    overlay: 'rgba(0,0,0,0.65)',
    shadow: '#000000',
    skeleton: '#232C2B',
};

export const themes = { light: lightColors, dark: darkColors };
