import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Dimensions, Platform, LayoutAnimation, UIManager, Image, Animated, Easing } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { House, MessageSquare, Wallet, Store, Truck, User } from 'lucide-react-native';
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
    Pickups: Truck,
    Marketplace: Store,
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

    const color = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.55)';

    return (
        <TouchableOpacity onPress={onPress} style={navStyles.tabButton} activeOpacity={0.7}>
            <View style={navStyles.tabItem}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        navStyles.activePill,
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
                        <IconComp size={22} color={color} strokeWidth={isFocused ? 2.6 : 2} />
                    ) : null}

                    {!!badge && (
                        <View style={navStyles.badge}>
                            <Text style={navStyles.badgeText}>{badge}</Text>
                        </View>
                    )}
                </View>
                <Text style={[navStyles.tabLabel, isFocused && navStyles.tabLabelActive]} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const { user } = useAuth();
    const avatarUri = resolveAvatar(user);

    return (
        <View style={navStyles.floatingShadow}>
            <View style={navStyles.floatingClip}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={navStyles.tint} pointerEvents="none" />

                <View style={navStyles.row}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                            if (!isFocused && !event.defaultPrevented) {
                                Haptics.selectionAsync().catch(() => { });
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
        backgroundColor: 'rgba(17,17,17,0.82)',
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
        backgroundColor: 'rgba(255,255,255,0.16)',
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
        borderColor: '#FFFFFF',
    },
    tabLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '600',
    },
    tabLabelActive: {
        color: '#FFFFFF',
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
    pingRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(5, 150, 105, 0.12)',
    },
    progressTrack: {
        width: 120,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E9EEEC',
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressThumb: {
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: BRAND_GREEN,
    },
    splashStatusText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        letterSpacing: 0.4,
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
                        name="Marketplace"
                        component={MarketplaceScreen}
                        // Without this the label falls back to the route name.
                        // "Marketplace" is far wider than a fifth of the bar, so
                        // it wrapped onto two lines and collided with the tab
                        // above it. Route name stays "Marketplace" for navigation.
                        options={{ tabBarLabel: 'Market' }}
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

const BRAND_GREEN = '#059669';

const CustomSplashScreen = ({ isAppReady, onFinish }) => {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const breatheAnim = useRef(new Animated.Value(1)).current;
    const ring1Scale = useRef(new Animated.Value(0.6)).current;
    const ring1Opacity = useRef(new Animated.Value(0.4)).current;
    const ring2Scale = useRef(new Animated.Value(0.6)).current;
    const ring2Opacity = useRef(new Animated.Value(0.4)).current;
    const barSweep = useRef(new Animated.Value(0)).current;
    const exitOpacity = useRef(new Animated.Value(1)).current;
    const exitScale = useRef(new Animated.Value(1)).current;

    const [statusText, setStatusText] = useState('Preparing your experience...');

    useEffect(() => {
        // Entrance
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 700,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();

        // Logo breathing loop - subtle, alive, not distracting
        Animated.loop(
            Animated.sequence([
                Animated.timing(breatheAnim, { toValue: 1.045, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(breatheAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();

        // Radar-ping halo behind the logo, two rings staggered for a richer pulse
        const startPing = (scaleV, opacityV, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(scaleV, { toValue: 1.7, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                        Animated.timing(opacityV, { toValue: 0, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    ]),
                ])
            ).start();
        };
        startPing(ring1Scale, ring1Opacity, 0);
        startPing(ring2Scale, ring2Opacity, 1100);

        // Indeterminate progress sweep
        Animated.loop(
            Animated.sequence([
                Animated.timing(barSweep, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(barSweep, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Dynamic messaging
    useEffect(() => {
        if (isAppReady) {
            setStatusText('Almost there');
            return;
        }
        const t1 = setTimeout(() => setStatusText('Connecting you to Revesta'), 1000);
        const t2 = setTimeout(() => setStatusText('Getting things ready'), 2500);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isAppReady]);

    // Smooth exit transition - fade + gentle zoom past the camera
    useEffect(() => {
        if (isAppReady) {
            // Wait slightly so the animation doesn't cut off immediately if load is instant
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(exitOpacity, {
                        toValue: 0,
                        duration: 420,
                        easing: Easing.in(Easing.cubic),
                        useNativeDriver: true
                    }),
                    Animated.timing(exitScale, {
                        toValue: 1.06,
                        duration: 420,
                        easing: Easing.in(Easing.cubic),
                        useNativeDriver: true
                    }),
                ]).start(() => {
                    onFinish();
                });
            }, 600);
        }
    }, [isAppReady]);

    const barTranslateX = barSweep.interpolate({ inputRange: [0, 1], outputRange: [0, 76] });

    return (
        <Animated.View style={{ flex: 1, opacity: exitOpacity, transform: [{ scale: exitScale }] }}>
            <LinearGradient colors={['#FFFFFF', '#F4FBF8']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 36 }}>
                    <Animated.View style={[styles.pingRing, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
                    <Animated.View style={[styles.pingRing, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
                    <Animated.View style={{
                        opacity: opacityAnim,
                        transform: [{ scale: Animated.multiply(scaleAnim, breatheAnim) }],
                    }}>
                        <Image source={require('../../assets/icon.png')} style={{ width: 112, height: 112 }} resizeMode="contain" />
                    </Animated.View>
                </View>

                {/* Indeterminate progress bar */}
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressThumb, { transform: [{ translateX: barTranslateX }] }]} />
                </View>

                <Text style={styles.splashStatusText}>{statusText}</Text>
            </LinearGradient>
        </Animated.View>
    );
};

export default function AppNavigator() {
    const { user, loading: authLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const [showSplash, setShowSplash] = useState(true);

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
        <NavigationContainer>
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
                        <Stack.Screen name="SavedLocations" component={SavedLocationsScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="TopUp" component={require('../screens/TopUpScreen').default} options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="PaystackWebView" component={require('../screens/PaystackWebView').default} options={{ headerShown: false, presentation: 'modal' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
