import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { BASE_URL } from '../api/client';
import { authStorage } from '../utils/authStorage';
import { useAuth } from '../context/AuthContext';

const MAX_BACKOFF_MS = 30000;

const buildSocketUrl = (token) => {
    const wsProtocol = BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const host = BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `${wsProtocol}://${host}/ws/logistics/?token=${token}`;
};

/**
 * Live connection to the backend's logistics websocket group for the
 * current user (new pickup requests, job status changes, collector GPS
 * pushes). Reconnects with backoff on drop, and eagerly reconnects when
 * the app returns to the foreground.
 */
export function useLogisticsSocket(onMessage, { enabled = true } = {}) {
    const { user } = useAuth();
    const wsRef = useRef(null);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef(null);
    const closedIntentionally = useRef(false);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(async () => {
        if (!enabled || !user || wsRef.current) return;

        const token = await authStorage.getAccessToken();
        if (!token) return;

        closedIntentionally.current = false;
        let ws;
        try {
            ws = new WebSocket(buildSocketUrl(token));
        } catch (e) {
            console.warn('[LogisticsSocket] Failed to open socket', e?.message);
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
                onMessageRef.current?.(data);
            } catch (e) {
                console.warn('[LogisticsSocket] Failed to parse message', e?.message);
            }
        };

        ws.onerror = (e) => {
            console.warn('[LogisticsSocket] Error', e?.message);
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
    }, [enabled, user]);

    useEffect(() => {
        connect();

        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && enabled) {
                connect();
            }
        });

        return () => {
            closedIntentionally.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
            wsRef.current = null;
            appStateSub.remove();
        };
    }, [connect, enabled]);

    return { isConnected };
}
