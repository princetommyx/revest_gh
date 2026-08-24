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
        <View style={navStyles.tabBarContainer}>
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
                else if (route.name === 'Pickups') IconComp = MapIcon;
                else if (route.name === 'Marketplace') IconComp = Store;
                else if (route.name === 'Chat') IconComp = MessageSquare;
                else if (route.name === 'Wallet') IconComp = Wallet;

                const color = isFocused ? '#111' : '#9CA3AF';

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        style={navStyles.tabItem}
                        activeOpacity={0.8}
                    >
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
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const navStyles = StyleSheet.create({
    tabBarContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: 4,
    },
    tabLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    tabLabelActive: {
        color: '#111',
        fontWeight: '700',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: '#EF4444',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
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

const CustomSplashScreen = ({ isAppReady, onFinish }) => {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const truckAnim = useRef(new Animated.Value(0)).current;
    const dot1 = useRef(new Animated.Value(0.2)).current;
    const dot2 = useRef(new Animated.Value(0.2)).current;
    const dot3 = useRef(new Animated.Value(0.2)).current;
    const exitOpacity = useRef(new Animated.Value(1)).current;

    const [statusText, setStatusText] = useState('Preparing your experience...');

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 800,
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

        // Subtle logistics truck route animation
        Animated.loop(
            Animated.timing(truckAnim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // 3-dot loading indicator
        const animateDots = () => {
            Animated.sequence([
                Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot1, { toValue: 0.2, duration: 300, useNativeDriver: true }),
                Animated.timing(dot2, { toValue: 0.2, duration: 300, useNativeDriver: true }),
                Animated.timing(dot3, { toValue: 0.2, duration: 300, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished && !isAppReady) {
                    animateDots();
                }
            });
        };
        animateDots();
    }, []);

    // Dynamic messaging
    useEffect(() => {
        if (isAppReady) {
            setStatusText('Almost there...');
            return;
        }
        const t1 = setTimeout(() => setStatusText('Connecting you to Revesta...'), 1000);
        const t2 = setTimeout(() => setStatusText('Getting things ready...'), 2500);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isAppReady]);

    // Smooth exit transition
    useEffect(() => {
        if (isAppReady) {
            // Wait slightly so the animation doesn't cut off immediately if load is instant
            setTimeout(() => {
                Animated.timing(exitOpacity, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                }).start(() => {
                    onFinish();
                });
            }, 800);
        }
    }, [isAppReady]);

    const truckTranslateX = truckAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 100]
    });
    
    // Truck opacity fades in and out at edges
    const truckOpacity = truckAnim.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 1, 1, 0]
    });

    return (
        <Animated.View style={{ flex: 1, opacity: exitOpacity }}>
            <LinearGradient colors={['#FAFAFA', '#F3F4F6', '#E5E7EB']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                    <Image source={require('../../assets/icon.png')} style={{ width: 140, height: 140, marginBottom: 20 }} resizeMode="contain" />
                </Animated.View>
                
                {/* Logistics Route Indicator */}
                <View style={{ width: 140, height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 40, position: 'relative' }}>
                    {/* Subtle Route Line */}
                    <View style={{ width: '100%', height: 2, backgroundColor: 'rgba(17, 17, 17, 0.05)', position: 'absolute', bottom: 4, borderRadius: 1 }} />
                    {/* Moving Truck */}
                    <Animated.View style={{ transform: [{ translateX: truckTranslateX }], opacity: truckOpacity }}>
                        <Truck size={16} color="#059669" />
                    </Animated.View>
                </View>

                {/* Dynamic Message & Dots */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500', marginRight: 8, letterSpacing: 0.5 }}>{statusText}</Text>
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                        <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#059669', opacity: dot1 }} />
                        <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#059669', opacity: dot2 }} />
                        <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#059669', opacity: dot3 }} />
                    </View>
                </View>
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
