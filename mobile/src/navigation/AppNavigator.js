import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Dimensions, Platform, LayoutAnimation, UIManager, Image, Animated, Easing } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { House, MessageSquare, Wallet, CarFront, User, Search, Leaf } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import PickupsScreen from '../screens/PickupsScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SecurityScreen from '../screens/SecurityScreen';
import HelpScreen from '../screens/HelpScreen';
import SupportChatScreen from '../screens/SupportChatScreen';
import PickupHistoryScreen from '../screens/PickupHistoryScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import KYCVerificationScreen from '../screens/KYCVerificationScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SavedLocationsScreen from '../screens/SavedLocationsScreen';
import WhatIsRevestaBalanceScreen from '../screens/WhatIsRevestaBalanceScreen';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import TrackingWidget from '../components/TrackingWidget';
import { BASE_URL } from '../api/client';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM } from '../constants/layout';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
    Home: House,
    Pickups: CarFront,
    Discover: Search,
    Chat: MessageSquare,
    Wallet: Wallet,
    // Fallback for the avatar tab when the user hasn't set a photo.
    You: User,
};

const resolveAvatar = (user) => {
    const path = user?.profile_picture_url || user?.profile_picture;
    if (!path) return null;
    if (path.startsWith('http')) return path;
    let clean = path.startsWith('/') ? path : `/${path}`;
    if (!clean.startsWith('/media/')) clean = `/media${clean}`;
    return `${BASE_URL}${clean}`;
};

const TabButton = ({ label, isFocused, onPress, IconComp, badge, avatarUri }) => {
    // Each button owns its animation so the active pill can grow/fade in
    // rather than snapping between tabs.
    const anim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: isFocused ? 1 : 0,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
        }).start();
    }, [isFocused]);

    const { colors, isDark } = useTheme();
    const color = isFocused ? colors.text : (isDark ? 'rgba(242,245,244,0.55)' : 'rgba(17,17,17,0.5)');

    return (
        <TouchableOpacity onPress={onPress} style={navStyles.tabButton} activeOpacity={0.7}>
            <View style={navStyles.tabItem}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        navStyles.activePill,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' },
                        {
                            opacity: anim,
                            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
                        },
                    ]}
                />
                <View style={navStyles.iconWrapper}>
                    {avatarUri ? (
                        <Image
                            source={{ uri: avatarUri }}
                            style={[navStyles.avatar, isFocused && navStyles.avatarActive]}
                        />
                    ) : IconComp ? (
                        <IconComp size={22} color={color} strokeWidth={isFocused ? 2.6 : 2} fill={isFocused && IconComp === House ? color : 'transparent'} />
                    ) : null}

                    {!!badge && (
                        <View style={navStyles.badge}>
                            <Text style={navStyles.badgeText}>{badge}</Text>
                        </View>
                    )}
                </View>
                <Text
                    style={[navStyles.tabLabel, { color }, isFocused && navStyles.tabLabelActive, isFocused && { color }]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const avatarUri = resolveAvatar(user);

    return (
        <View style={navStyles.floatingShadow}>
            <View style={navStyles.floatingClip}>
                <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View
                    style={[
                        navStyles.tint,
                        { backgroundColor: isDark ? 'rgba(20,26,25,0.92)' : 'rgba(255,255,255,0.92)' },
                    ]}
                    pointerEvents="none"
                />

                <View style={navStyles.row}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        // An uncapped count overflows the pill - WhatsApp caps too.
                        const raw = options.tabBarBadge;
                        const badge = raw ? (Number(raw) > 99 ? '99+' : String(raw)) : null;

                        return (
                            <TabButton
                                key={route.key}
                                label={label}
                                isFocused={isFocused}
                                onPress={onPress}
                                IconComp={TAB_ICONS[route.name]}
                                badge={badge}
                                avatarUri={route.name === 'You' ? avatarUri : null}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const navStyles = StyleSheet.create({
    // Shadow and clipping are split: iOS won't render a shadow on a view that
    // also clips its children, which the blur layer requires.
    floatingShadow: {
        position: 'absolute',
        bottom: TAB_BAR_BOTTOM,
        left: 16,
        right: 16,
        borderRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 12,
    },
    floatingClip: {
        borderRadius: 32,
        overflow: 'hidden',
    },
    // Blur alone is too transparent over busy content (the map especially),
    // so a dark scrim sits on top of it for legibility.
    tint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.92)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
        paddingVertical: 8,
        minHeight: TAB_BAR_HEIGHT,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        // Was 10 — with five tabs that left barely enough room for a
        // seven-character label before it started truncating.
        paddingHorizontal: 4,
        borderRadius: 20,
        alignSelf: 'stretch',
    },
    activePill: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: 3,
        height: 24,
        justifyContent: 'center',
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    avatarActive: {
        borderWidth: 1.5,
        borderColor: '#111111',
    },
    tabLabel: {
        fontSize: 10,
        color: 'rgba(17,17,17,0.5)',
        fontWeight: '600',
    },
    tabLabelActive: {
        color: '#111111',
        fontWeight: '700',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -11,
        backgroundColor: '#FF3B30',
        minWidth: 17,
        height: 17,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#111111',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
});

const styles = StyleSheet.create({
    splashRingPiece: {
        position: 'absolute',
        top: 53,
        left: 53,
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 3,
    },
    splashDotPiece: {
        position: 'absolute',
        bottom: 8,
        right: 22,
        width: 13,
        height: 13,
        borderRadius: 6.5,
    },
    splashWordmark: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
});


function MainTabs() {
    const { userRole } = useAuth();
    const { unreadCount } = useNotifications();

    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator
                tabBar={props => <CustomTabBar {...props} />}
                screenOptions={{ headerShown: false }}
            >
                <Tab.Screen name="Home" component={HomeScreen} />

                {(userRole === 'COLLECTOR' || userRole === 'RECYCLER') && (
                    <Tab.Screen
                        name="Discover"
                        component={MarketplaceScreen}
                        options={{ tabBarLabel: 'Discover' }}
                    />
                )}

                <Tab.Screen
                    name="Pickups"
                    component={PickupsScreen}
                    options={{
                        tabBarLabel: 'Pickups'
                    }}
                />

                {(userRole === 'SELLER') && (
                    <Tab.Screen
                        name="Chat"
                        component={ChatScreen}
                        options={{
                            tabBarBadge: unreadCount > 0 ? unreadCount : null
                        }}
                    />
                )}
                <Tab.Screen name="Wallet" component={WalletScreen} />

                {/* WhatsApp-style "You" tab - shows the user's own avatar
                    instead of a generic icon. Named 'You' rather than
                    'Profile' so the existing stack route of that name keeps
                    working for full-screen pushes from other screens. */}
                <Tab.Screen name="You" component={ProfileScreen} />
            </Tab.Navigator>
            <TrackingWidget />
        </View>
    );
}

// A one-time brand reveal, not a loading spinner: three simple pieces echoing
// the mark's own vocabulary (the leaf sprouting from its base, the loop
// stroke, the closing dot) gather in and dissolve into the real icon, then
// the wordmark settles underneath. No looping motion, no progress bar, no
// "please wait" copy - once assembled it just holds, calm, until the app is
// actually ready.
const CustomSplashScreen = ({ isAppReady, onFinish }) => {
    const { colors } = useTheme();

    const leafAnim = useRef(new Animated.Value(0)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;
    const dotAnim = useRef(new Animated.Value(0)).current;
    const piecesOpacity = useRef(new Animated.Value(1)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.75)).current;
    const wordmarkOpacity = useRef(new Animated.Value(0)).current;
    const wordmarkTranslateY = useRef(new Animated.Value(12)).current;
    const exitOpacity = useRef(new Animated.Value(1)).current;
    const exitScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Stage 1 - the three pieces gather toward the centre, staggered.
        Animated.stagger(120, [
            Animated.timing(leafAnim, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(ringAnim, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(dotAnim, { toValue: 1, duration: 460, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
        ]).start();

        // Stage 2 - once gathered, the abstract pieces dissolve as the real,
        // authentic mark resolves into view in their place.
        const t1 = setTimeout(() => {
            Animated.timing(piecesOpacity, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
            Animated.parallel([
                Animated.timing(logoOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
            ]).start();
        }, 640);

        // Stage 3 - the wordmark settles in underneath.
        const t2 = setTimeout(() => {
            Animated.parallel([
                Animated.timing(wordmarkOpacity, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(wordmarkTranslateY, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();
        }, 950);

        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // Smooth exit transition - fade + gentle zoom past the camera. Gated well
    // past the reveal's own ~1.3s runtime so a fast/cached load never cuts
    // the brand moment short.
    useEffect(() => {
        if (isAppReady) {
            const t = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(exitOpacity, { toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
                    Animated.timing(exitScale, { toValue: 1.06, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
                ]).start(() => onFinish());
            }, 1450);
            return () => clearTimeout(t);
        }
    }, [isAppReady]);

    const leafTranslate = leafAnim.interpolate({ inputRange: [0, 1], outputRange: [-46, 0] });
    const leafRotate = leafAnim.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] });
    const ringTranslate = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [-46, 0] });
    const dotTranslate = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

    return (
        <Animated.View style={{ flex: 1, opacity: exitOpacity, transform: [{ scale: exitScale }] }}>
            <LinearGradient colors={[colors.surface, colors.accentSoft]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 28 }}>
                    {/* Stage 1 pieces - fade out together once the real mark takes over */}
                    <Animated.View style={{ opacity: piecesOpacity, ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }}>
                        <Animated.View style={{
                            position: 'absolute', top: 18, left: 34,
                            opacity: leafAnim,
                            transform: [{ translateY: leafTranslate }, { rotate: leafRotate }],
                        }}>
                            <Leaf size={30} color={colors.accent} strokeWidth={2.25} />
                        </Animated.View>
                        <Animated.View style={[styles.splashRingPiece, {
                            borderColor: colors.accent,
                            opacity: ringAnim,
                            transform: [{ translateX: ringTranslate }],
                        }]} />
                        <Animated.View style={[styles.splashDotPiece, {
                            backgroundColor: colors.text,
                            opacity: dotAnim,
                            transform: [{ translateY: dotTranslate }],
                        }]} />
                    </Animated.View>

                    {/* Stage 2 - the authentic mark */}
                    <Animated.View style={{
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                        borderRadius: 40,
                        overflow: 'hidden',
                        backgroundColor: colors.surface,
                        elevation: 4,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.12,
                        shadowRadius: 10,
                    }}>
                        <Image source={require('../../assets/icon.png')} style={{ width: 92, height: 92 }} resizeMode="contain" />
                    </Animated.View>
                </View>

                <Animated.Text style={[styles.splashWordmark, { color: colors.text, opacity: wordmarkOpacity, transform: [{ translateY: wordmarkTranslateY }] }]}>
                    Revesta
                </Animated.Text>
            </LinearGradient>
        </Animated.View>
    );
};

export default function AppNavigator() {
    const { user, loading: authLoading } = useAuth();
    const { colors, isDark } = useTheme();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const [showSplash, setShowSplash] = useState(true);

    // Without this React Navigation paints its own white card behind every
    // screen, which flashes on each transition in dark mode.
    const navTheme = React.useMemo(() => {
        const base = isDark ? DarkTheme : DefaultTheme;
        return {
            ...base,
            colors: {
                ...base.colors,
                background: colors.bg,
                card: colors.surface,
                text: colors.text,
                border: colors.border,
                primary: colors.accent,
            },
        };
    }, [isDark, colors]);

    useEffect(() => {
        async function checkFirstLaunch() {
            try {
                const hasSeen = await AsyncStorage.getItem('has_seen_onboarding');
                setIsFirstLaunch(hasSeen === null || hasSeen !== 'true');
            } catch (err) {
                setIsFirstLaunch(false);
            }
        }
        checkFirstLaunch();
    }, []);

    const isAppReady = !authLoading && isFirstLaunch !== null;

    if (showSplash) {
        return <CustomSplashScreen isAppReady={isAppReady} onFinish={() => setShowSplash(false)} />;
    }

    return (
        <>
            {/* Follows the theme so the clock/battery stay legible against the
                app's ground in both modes. */}
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <NavigationContainer theme={navTheme}>
            <Stack.Navigator
                screenOptions={{ 
                    headerShown: false,
                    animation: 'slide_from_right'
                }}
                initialRouteName={user ? "Main" : (isFirstLaunch ? "Onboarding" : "Login")}
            >
                {user == null ? (
                    <>
                        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
                        <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Help" component={HelpScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="SupportChat" component={SupportChatScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="PickupHistory" component={PickupHistoryScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="BlockedUsers" component={require('../screens/BlockedUsersScreen').default} options={{ headerShown: false }} />
                        <Stack.Screen name="SavedLocations" component={SavedLocationsScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="TopUp" component={require('../screens/TopUpScreen').default} options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="PaystackWebView" component={require('../screens/PaystackWebView').default} options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="WhatIsRevestaBalance" component={WhatIsRevestaBalanceScreen} options={{ headerShown: false, presentation: 'modal' }} />
                    </>
                )}
            </Stack.Navigator>
            </NavigationContainer>
        </>
    );
}
