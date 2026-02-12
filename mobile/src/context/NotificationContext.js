import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsApi } from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

// 1. Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        // Check urgency from data
        const urgency = notification.request.content.data?.urgency;
        const isUrgent = urgency === 'URGENT';

        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            priority: isUrgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.DEFAULT,
        };
    },
});

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        if (user) {
            registerForPushNotificationsAsync().then(token => {
                setExpoPushToken(token);
                if (token) {
                    // Send to backend
                    notificationsApi.registerToken(token).catch(err => console.log("Token Reg Error", err));
                }
            });

            // Fetch initial unread count
            notificationsApi.getNotifications().then(data => {
                const unread = data?.results ? data.results.filter(n => !n.is_read).length : 0;
                setUnreadCount(unread);
            }).catch(e => console.log("Fetch notifs error", e));
        }

        // Listeners
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
            // Increment badge count locally for immediate feedback
            setUnreadCount(prev => prev + 1);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            // Handle Deep Linking here or in AppNavigator via linking config
            // But we can also handle specific actions here
            const data = response.notification.request.content.data;
            console.log("Notification Tapped with data:", data);
            // If we have a navigation ref available globally, we could navigate here.
            // For now, we rely on Expo's deep linking or React Navigation's linking prop.
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [user]);

    const markAllRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <NotificationContext.Provider value={{ expoPushToken, notification, unreadCount, markAllRead, setUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
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
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        try {
            // Get Project ID from app.json/app.config.js if using EAS
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

            token = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId
            })).data;

            console.log("Expo Push Token:", token);
        } catch (e) {
            console.error("Error getting token:", e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
