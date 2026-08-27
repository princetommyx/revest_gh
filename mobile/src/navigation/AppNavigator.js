import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Dimensions, Platform, LayoutAnimation, UIManager, Image, Animated, Easing } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { House, Map as MapIcon, MessageSquare, Wallet, Store, LayoutGrid, Truck } from 'lucide-react-native';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
    return (
        <View style={navStyles.floatingWrapper}>
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

                let IconComp;
                if (route.name === 'Home') IconComp = House;
                else if (route.name === 'Pickups') IconComp = Truck;
                else if (route.name === 'Marketplace') IconComp = Store;
                else if (route.name === 'Chat') IconComp = MessageSquare;
                else if (route.name === 'Wallet') IconComp = Wallet;

                const color = isFocused ? '#000000' : '#6B7280';

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        style={navStyles.tabButton}
                        activeOpacity={0.8}
                    >
                        <View style={[navStyles.tabItem, isFocused && navStyles.tabItemActive]}>
                            <View style={navStyles.iconWrapper}>
                                <IconComp size={24} color={color} strokeWidth={isFocused ? 2.5 : 2} />
                                {options.tabBarBadge && (
                                    <View style={navStyles.badge}>
                                        <Text style={navStyles.badgeText}>{options.tabBarBadge}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[navStyles.tabLabel, isFocused && navStyles.tabLabelActive]}>
                                {label}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const navStyles = StyleSheet.create({
    floatingWrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 20,
        right: 20,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 24,
    },
    tabItemActive: {
        backgroundColor: '#F3F4F6',
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: 2,
    },
    tabLabel: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 2,
    },
    tabLabelActive: {
        color: '#000000',
        fontWeight: '700',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#FF3B30',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
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
                    <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
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
