import re

with open('mobile/src/navigation/AppNavigator.js', 'r') as f:
    content = f.read()

new_imports = """import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home, Map as MapIcon, MessageSquare, Wallet, Store, LayoutGrid } from 'lucide-react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
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
"""

content = re.sub(r'import React.*?from \'../context/NotificationContext\';', new_imports, content, flags=re.DOTALL)

custom_tab_bar = """
const CustomTabBar = ({ state, descriptors, navigation }) => {
    return (
        <View style={navStyles.tabBarContainer}>
            <View style={navStyles.tabBar}>
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
                                <IconComp size={22} color="rgba(255,255,255,0.4)" style={{ marginBottom: 4 }} />
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
            </View>
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
        backgroundColor: 'rgba(40, 40, 40, 0.95)',
        borderRadius: 40,
        padding: 6,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    tabItemActive: {
        backgroundColor: '#0a0a0a',
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
        color: 'rgba(255,255,255,0.4)',
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
        borderColor: '#222',
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
});
"""

main_tabs = """function MainTabs() {
    const { userRole } = useAuth();
    const { unreadCount } = useNotifications();

    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />

            {userRole === 'RECYCLER' && (
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
}"""

content = re.sub(r'const Stack = createNativeStackNavigator\(\);\nconst Tab = createBottomTabNavigator\(\);\n', 'const Stack = createNativeStackNavigator();\nconst Tab = createBottomTabNavigator();\n' + custom_tab_bar + '\n', content)
content = re.sub(r'function MainTabs\(\).*?    \);\n}', main_tabs, content, flags=re.DOTALL)

with open('mobile/src/navigation/AppNavigator.js', 'w') as f:
    f.write(content)

print("Done")
