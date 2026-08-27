import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { BASE_URL } from '../api/client';
import { authStorage } from '../utils/authStorage';

const MAX_BACKOFF_MS = 30000;

const buildSocketUrl = (otherUserId, token) => {
    const wsProtocol = BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const host = BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `${wsProtocol}://${host}/ws/chat/${otherUserId}/?token=${token}`;
};

/**
 * Live connection to a 1-to-1 chat thread. Sending still goes through the
 * REST API (validated, persists even if the socket is momentarily down);
 * this hook is purely for receiving the other person's messages instantly
 * instead of waiting on a poll interval.
 */
export function useChatSocket(otherUserId, onMessage) {
    const wsRef = useRef(null);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef(null);
    const closedIntentionally = useRef(false);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(async () => {
        if (!otherUserId || wsRef.current) return;

        const token = await authStorage.getAccessToken();
        if (!token) return;

        closedIntentionally.current = false;
        let ws;
        try {
            ws = new WebSocket(buildSocketUrl(otherUserId, token));
        } catch (e) {
            console.warn('[ChatSocket] Failed to open socket', e?.message);
            return;
        }
        wsRef.current = ws;

        ws.onopen = () => {
            reconnectAttempt.current = 0;
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data?.type === 'chat_message' && data.message) {
                    onMessageRef.current?.(data.message);
                }
            } catch (e) {
                console.warn('[ChatSocket] Failed to parse message', e?.message);
            }
        };

        ws.onerror = (e) => {
            console.warn('[ChatSocket] Error', e?.message);
        };

        ws.onclose = () => {
            setIsConnected(false);
            wsRef.current = null;
            if (closedIntentionally.current) return;

            const attempt = reconnectAttempt.current + 1;
            reconnectAttempt.current = attempt;
            const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
            reconnectTimer.current = setTimeout(connect, delay);
        };
    }, [otherUserId]);

    useEffect(() => {
        connect();

        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') connect();
        });

        return () => {
            closedIntentionally.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
            wsRef.current = null;
            appStateSub.remove();
        };
    }, [connect]);

    return { isConnected };
}
