import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useDispatch } from 'react-redux';
import { addMessage, setChannelName } from '../redux/slices/chatSlice';
import { useUploadLocationMutation } from '../redux/api/locationAPI';
import { UserAPI } from '../redux/api/userAPI';
import { WebSocketBaseURL } from '../data/constants/DataConstants';

const MIN_DISTANCE_METERS = 200;
const SUBURB_STABILITY_MS = 75_000;
const HEARTBEAT_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

type PendingSuburb = {
  value: string;
  firstSeenAtMs: number;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const distanceMeters = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number => {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizeSuburb = (value?: string): string => (value ?? '').trim().toLowerCase();

const addJitter = (delayMs: number): number => {
  const jitter = Math.floor(Math.random() * 500);
  return delayMs + jitter;
};

// Owns the client-side room lifecycle:
// - resolve GPS coordinates to a suburb
// - debounce room switching so boundary jitter does not flap rooms
// - open the suburb-scoped websocket connection
// - keep it alive with heartbeats and reconnect with backoff when it drops
export const useSuburbSocket = () => {
  const dispatch = useDispatch();
  const [uploadLocation] = useUploadLocationMutation();

  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');
  const [activeSuburb, setActiveSuburb] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const connectSocketRef = useRef<(suburb: string) => Promise<void>>(async () => {});
  const isClosingForSwitchRef = useRef<boolean>(false);
  const pendingSuburbRef = useRef<PendingSuburb | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const currentSuburbRef = useRef<string>('');

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // Close the current socket and suppress the reconnect path because we are
  // intentionally switching suburbs or unmounting the hook.
  const disconnectSocket = useCallback(() => {
    clearHeartbeat();
    clearReconnectTimer();

    if (socketRef.current) {
      isClosingForSwitchRef.current = true;
      socketRef.current.close();
      socketRef.current = null;
    }
  }, [clearHeartbeat, clearReconnectTimer]);

  // Retry with exponential backoff so we do not hammer the WebSocket endpoint
  // during transient network loss or app backgrounding.
  const scheduleReconnect = useCallback((suburb: string) => {
    if (!suburb || reconnectTimerRef.current) {
      return;
    }

    const attempt = reconnectAttemptRef.current;
    const rawDelay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempt));
    const delay = addJitter(rawDelay);

    setSocketStatus('reconnecting');

    reconnectTimerRef.current = setTimeout(async () => {
      reconnectTimerRef.current = null;
      reconnectAttemptRef.current = attempt + 1;
      await connectSocketRef.current(suburb);
    }, delay);
  }, []);

  // Lightweight heartbeat used for two things:
  // 1. keep the socket alive through proxies/NATs
  // 2. refresh the backend TTL on the connection record
  const startHeartbeat = useCallback(() => {
    clearHeartbeat();

    heartbeatTimerRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ message: 'heartbeat' }));
      }
    }, HEARTBEAT_MS);
  }, [clearHeartbeat]);

  // Opens the websocket for a specific suburb. The token comes from local
  // storage and is sent so the backend can verify the Cognito identity.
  const connectSocket = useCallback(async (suburb: string) => {
    const normalizedSuburb = normalizeSuburb(suburb);
    if (!normalizedSuburb) {
      return;
    }

    const token = await UserAPI.getStoredToken();
    if (!token) {
      setSocketStatus('error');
      return;
    }

    clearReconnectTimer();
    clearHeartbeat();

    const query = `suburb=${encodeURIComponent(normalizedSuburb)}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(`${WebSocketBaseURL}?${query}`);
    socketRef.current = ws;
    setSocketStatus('connecting');

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setSocketStatus('connected');
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const messageText = parsed?.message;
        if (!messageText || typeof messageText !== 'string') {
          return;
        }

        dispatch(
          addMessage({
            username: parsed.userId ?? 'Someone',
            message: messageText,
            messageTime: parsed.messageTime ?? new Date().toISOString(),
            sender: 'other',
          })
        );
      } catch {
        // Ignore malformed payloads rather than tearing down the socket.
      }
    };

    ws.onerror = () => {
      setSocketStatus('error');
    };

    ws.onclose = () => {
      clearHeartbeat();

      const switched = isClosingForSwitchRef.current;
      isClosingForSwitchRef.current = false;

      if (!switched && appStateRef.current === 'active') {
        scheduleReconnect(normalizedSuburb);
      }
    };
  }, [clearHeartbeat, clearReconnectTimer, dispatch, scheduleReconnect, startHeartbeat]);

  useEffect(() => {
    connectSocketRef.current = connectSocket;
  }, [connectSocket]);

  // Switch rooms only after the suburb has remained stable long enough to
  // avoid flapping near a suburb boundary or due to GPS drift.
  const switchSuburb = useCallback(async (newSuburb: string) => {
    const normalizedSuburb = normalizeSuburb(newSuburb);
    if (!normalizedSuburb || normalizedSuburb === currentSuburbRef.current) {
      return;
    }

    currentSuburbRef.current = normalizedSuburb;
    setActiveSuburb(normalizedSuburb);
    dispatch(setChannelName(normalizedSuburb));

    disconnectSocket();
    await connectSocket(normalizedSuburb);
  }, [connectSocket, disconnectSocket, dispatch]);

  // Reverse-geocode the current coordinates using the backend location API.
  const resolveSuburb = useCallback(async (latitude: number, longitude: number): Promise<string> => {
    const response = await uploadLocation({ latitude, longitude }).unwrap();
    return normalizeSuburb(response?.channelId);
  }, [uploadLocation]);

  // Ignore small GPS changes, then require a suburb candidate to persist for
  // SUBURB_STABILITY_MS before we actually move the user into the new room.
  const handleLocation = useCallback(async (latitude: number, longitude: number) => {
    const previous = lastCoordsRef.current;

    if (previous) {
      const movedMeters = distanceMeters(
        previous.latitude,
        previous.longitude,
        latitude,
        longitude
      );

      if (movedMeters < MIN_DISTANCE_METERS) {
        return;
      }
    }

    lastCoordsRef.current = { latitude, longitude };

    let observedSuburb = '';
    try {
      observedSuburb = await resolveSuburb(latitude, longitude);
    } catch (error: any) {
      setLocationError(error?.message ?? 'Failed to resolve suburb');
      return;
    }

    if (!observedSuburb) {
      return;
    }

    if (!currentSuburbRef.current) {
      pendingSuburbRef.current = null;
      await switchSuburb(observedSuburb);
      return;
    }

    if (observedSuburb === currentSuburbRef.current) {
      pendingSuburbRef.current = null;
      return;
    }

    const now = Date.now();
    const pending = pendingSuburbRef.current;

    if (!pending || pending.value !== observedSuburb) {
      pendingSuburbRef.current = { value: observedSuburb, firstSeenAtMs: now };
      return;
    }

    if (now - pending.firstSeenAtMs >= SUBURB_STABILITY_MS) {
      pendingSuburbRef.current = null;
      await switchSuburb(observedSuburb);
    }
  }, [resolveSuburb, switchSuburb]);

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const start = async () => {
      // The app needs foreground location permission before it can determine
      // the user's suburb and join the corresponding room.
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      await handleLocation(current.coords.latitude, current.coords.longitude);

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
          timeInterval: 20_000,
        },
        async (next) => {
          await handleLocation(next.coords.latitude, next.coords.longitude);
        }
      );
    };

    // If the app returns to the foreground after the socket dropped, try to
    // reconnect to the current room instead of waiting for the next GPS update.
    const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      appStateRef.current = nextState;

      if (nextState === 'active') {
        const suburb = currentSuburbRef.current;
        if (suburb && socketRef.current?.readyState !== WebSocket.OPEN) {
          await connectSocket(suburb);
        }
      }
    });

    start();

    return () => {
      appStateSubscription.remove();
      subscriber?.remove();
      disconnectSocket();
      isClosingForSwitchRef.current = false;
    };
  }, [connectSocket, disconnectSocket, handleLocation]);

  // Send a chat message to the active room. The backend fan-out then forwards
  // it to every connection in the same suburb.
  const sendMessage = useCallback((text: string) => {
    const payload = text.trim();
    if (!payload) {
      return false;
    }

    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      const suburb = currentSuburbRef.current;
      if (suburb) {
        scheduleReconnect(suburb);
      }
      return false;
    }

    socketRef.current.send(
      JSON.stringify({
        message: 'sendMessage',
        data: payload,
      })
    );

    dispatch(
      addMessage({
        username: 'Me',
        message: payload,
        messageTime: new Date().toISOString(),
        sender: 'user',
      })
    );

    return true;
  }, [dispatch, scheduleReconnect]);

  return {
    socketStatus,
    activeSuburb,
    locationError,
    sendMessage,
  };
};
