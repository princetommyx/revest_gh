import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../constants/googleAuth';

WebBrowser.maybeCompleteAuthSession();

// iOS has no registered OAuth client yet - see constants/googleAuth.js
export const isGoogleAuthSupported = Platform.OS !== 'ios' || !!GOOGLE_IOS_CLIENT_ID;

export function useGoogleAuth({ onToken, onError }) {
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        webClientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
    });

    useEffect(() => {
        if (!response) return;

        if (response.type === 'success') {
            const token = response.authentication?.accessToken;
            if (token) {
                onToken?.(token);
            } else {
                onError?.('Google did not return an access token.');
            }
        } else if (response.type === 'error') {
            onError?.(response.error?.message || 'Google sign-in failed.');
        }
        // 'dismiss' / 'cancel' - user backed out, nothing to report
    }, [response]);

    return { promptAsync, ready: !!request };
}
