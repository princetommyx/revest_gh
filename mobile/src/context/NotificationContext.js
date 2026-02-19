import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsApi } from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

// 1. Configure how notifications appear when app is in foreground
try {
    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            // Check for OTP or URGENT data
            const data = notification.request.content.data;
            const isUrgent = data?.urgency === 'URGENT' || data?.type?.includes('otp');

            return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                priority: isUrgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.DEFAULT,
            };
        },
    });
} catch (error) {
    console.warn("Notifications.setNotificationHandler failed (likely in Expo Go):", error.message);
}

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // Wrap all async operations in try-catch to prevent crashes
        const initializeNotifications = async () => {
            // Skip notification setup entirely in Expo Go on Android (UNSUPPORTED in SDK 53+)
            // We previously tried to remove this, but SDK 54 throws a hard error in Expo Go.
            if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
                console.log('Skipping notification fetch in Expo Go (Android)');
                return;
            }

            if (user) {
                try {
                    const token = await registerForPushNotificationsAsync();
                    setExpoPushToken(token);

                    if (token) {
                        try {
                            await notificationsApi.registerToken(token);
                            console.log("Push token registered successfully");
                        } catch (err) {
                            console.log("Token registration failed (non-critical):", err.message);
                            // Non-critical: App continues without push notifications
                        }
                    }
                } catch (err) {
                    console.log("Push notification setup failed (non-critical):", err.message);
                    // Non-critical: App continues without push notifications
                }

                // Fetch initial unread count
                try {
                    const data = await notificationsApi.getNotifications();
                    const unread = data?.results ? data.results.filter(n => !n.is_read).length : 0;
                    setUnreadCount(unread);
                } catch (e) {
                    console.log("Failed to fetch notifications (non-critical):", e.message);
                    // Non-critical: App continues with zero unread count
                    setUnreadCount(0);
                }
            }
        };

        // Call initialization function
        initializeNotifications();

        // Listeners - wrap in try-catch as well
        try {
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                setNotification(notification);
                // Increment badge count locally for immediate feedback
                setUnreadCount(prev => prev + 1);
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                try {
                    const data = response.notification.request.content.data;
                    console.log("Notification Tapped with data:", data);
                } catch (err) {
                    console.log("Error handling notification response:", err.message);
                }
            });
        } catch (err) {
            console.log("Failed to setup notification listeners (non-critical):", err.message);
        }

        return () => {
            try {
                if (notificationListener.current) {
                    notificationListener.current.remove();
                }
                if (responseListener.current) {
                    responseListener.current.remove();
                }
            } catch (err) {
                console.log("Error cleaning up notification listeners:", err.message);
            }
        };
    }, [user]);

    const markAllRead = useCallback(async () => {
        try {
            await notificationsApi.markAllAsRead();
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const value = useMemo(() => ({
        expoPushToken,
        notification,
        unreadCount,
        markAllRead,
        setUnreadCount
    }), [expoPushToken, notification, unreadCount, markAllRead]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);

async function registerForPushNotificationsAsync() {
    let token;

    // Check for Expo Go on Android where remote notifications are removed in SDK 53+
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
        console.log('Push notifications are NOT supported in Android Expo Go. Use a Development Build.');
        return null;
    }

    try {
        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });

                // Urgent Channel
                await Notifications.setNotificationChannelAsync('urgent-alerts', {
                    name: 'Urgent Alerts',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 500, 200, 500],
                    lightColor: '#FF0000',
                    sound: 'default' // Should ideally match backend sound config
                });
            } catch (err) {
                console.log('Failed to create notification channels (non-critical):', err.message);
            }
        }

        if (!Device.isDevice) {
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Push notification permission not granted');
            return null;
        }

        try {
            // Get Project ID with multiple fallbacks
            let projectId = Constants?.expoConfig?.extra?.eas?.projectId;

            if (!projectId) {
                projectId = Constants?.easConfig?.projectId;
            }

            // Hardcoded fallback as last resort (from app.json)
            if (!projectId) {
                projectId = 'e88e5cd6-d71a-46c2-ae69-cde2531d35b6';
                console.log('Using hardcoded projectId fallback');
            }

            token = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId
            })).data;

            console.log("Expo Push Token obtained successfully");
        } catch (e) {
            console.error("Error getting push token:", e.message);
            return null;
        }
    } catch (outerError) {
        console.error("Unexpected error in push notification setup:", outerError.message);
        return null;
    }

    return token;
}
