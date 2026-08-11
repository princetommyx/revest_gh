import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Dimensions, Platform, LayoutAnimation, UIManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home, Map as MapIcon, MessageSquare, Wallet, Store, LayoutGrid } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

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
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
    return (
        <View style={navStyles.tabBarContainer}>
            <BlurView intensity={70} tint="dark" style={navStyles.tabBar}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!isFocused && !event.defaultPrevented) {
                            const customAnim = {
                                duration: 400,
                                create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                                update: { type: LayoutAnimation.Types.spring, springDamping: 0.75 },
                                delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity }
                            };
                            LayoutAnimation.configureNext(customAnim);
                            navigation.navigate(route.name);
                        }
                    };

                    let IconComp;
                    if (route.name === 'Home') IconComp = Home;
                    else if (route.name === 'Pickups') IconComp = MapIcon;
                    else if (route.name === 'Marketplace') IconComp = Store;
                    else if (route.name === 'Chat') IconComp = MessageSquare;
                    else if (route.name === 'Wallet') IconComp = Wallet;

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={[navStyles.tabItem, isFocused && navStyles.tabItemActive]}
                            activeOpacity={0.8}
                        >
                            {isFocused ? (
                                <View style={navStyles.activeIconContainer}>
                                    <IconComp size={18} color="#111" />
                                </View>
                            ) : (
                                <IconComp size={22} color="#aaa" style={{ marginBottom: 4 }} />
                            )}
                            <Text style={[navStyles.tabLabel, isFocused && navStyles.tabLabelActive]}>
                                {label}
                            </Text>
                            {/* Notification Badge */}
                            {options.tabBarBadge && (
                                <View style={navStyles.badge}>
                                    <Text style={navStyles.badgeText}>{options.tabBarBadge}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </BlurView>
        </View>
    );
};

const navStyles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 25 : 15,
        left: 20,
        right: 20,
        zIndex: 100,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(17, 17, 17, 0.85)',
        borderRadius: 40,
        padding: 6,
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    tabItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 34,
        paddingVertical: 6,
    },
    activeIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    tabLabel: {
        fontSize: 10,
        color: '#aaa',
        fontWeight: '600',
    },
    tabLabelActive: {
        color: '#fff',
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: '25%',
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
        fontSize: 8,
        fontWeight: 'bold',
    },
});


function MainTabs() {
    const { userRole } = useAuth();
    const { unreadCount } = useNotifications();

    return (
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

            <Tab.Screen
                name="Chat"
                component={ChatScreen}
                options={{
                    tabBarBadge: unreadCount > 0 ? unreadCount : null
                }}
            />

            <Tab.Screen name="Wallet" component={WalletScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { user, loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#111" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName={user ? "Main" : "Login"}
            >
                {user == null ? (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Main" component={MainTabs} />
                        <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Help" component={HelpScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="SupportChat" component={SupportChatScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="PickupHistory" component={PickupHistoryScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="TopUp" component={require('../screens/TopUpScreen').default} options={{ headerShown: false }} />
                        <Stack.Screen name="PaystackWebView" component={require('../screens/PaystackWebView').default} options={{ headerShown: false }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
