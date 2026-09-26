import { useState, useEffect } from 'react';
import mqtt, { type MqttClient, type IClientOptions } from 'mqtt';

const rawWsUrl = import.meta.env.VITE_HIVEMQ_WS_URL || '';
const username = import.meta.env.VITE_HIVEMQ_USERNAME || '';
const password = import.meta.env.VITE_HIVEMQ_PASSWORD || '';

// Ensure URL uses secure WebSockets (wss://) protocol
const formatWsUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('ws://')) {
    return url.replace('ws://', 'wss://');
  }
  if (!url.startsWith('wss://')) {
    return `wss://${url}`;
  }
  return url;
};

const brokerUrl = formatWsUrl(rawWsUrl);

const clientId = `patient_portal_${Math.random().toString(16).substring(2, 10)}_${Date.now()}`;

export type MqttConnectionStatus = 'connected' | 'reconnecting' | 'offline';

const options: IClientOptions = {
  protocol: 'wss',
  clientId,
  clean: true,
  reconnectPeriod: 3000, // Automatically retry connection every 3 seconds if disconnected
  connectTimeout: 30 * 1000, // 30 seconds connection timeout
  keepalive: 60,
  queueQoSZero: true, // Queue QoS 0 messages until connected
  ...(username ? { username } : {}),
  ...(password ? { password } : {}),
};

/**
 * Singleton MQTT client instance for HiveMQ Cloud over secure WebSockets (wss).
 */
export const mqttClient: MqttClient = mqtt.connect(brokerUrl, options);

// Listeners for connection state changes
type StatusListener = (status: MqttConnectionStatus) => void;
const statusListeners = new Set<StatusListener>();

let currentStatus: MqttConnectionStatus = mqttClient.connected ? 'connected' : 'reconnecting';

function updateStatus(status: MqttConnectionStatus) {
  currentStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (err) {
      console.error('[MQTT Status Listener Error]:', err);
    }
  });
}

// Attach connection lifecycle handlers for diagnostics & monitoring
mqttClient.on('connect', () => {
  console.log('[MQTT] Connected successfully to HiveMQ broker over secure WebSockets');
  updateStatus('connected');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting to HiveMQ broker...');
  updateStatus('reconnecting');
});

mqttClient.on('close', () => {
  console.log('[MQTT] Connection closed');
  if (currentStatus !== 'reconnecting') {
    updateStatus('offline');
  }
});

mqttClient.on('offline', () => {
  console.warn('[MQTT] Client is currently offline');
  updateStatus('offline');
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Connection error:', err.message || err);
  if (!mqttClient.connected) {
    updateStatus('offline');
  }
});

/**
 * Hook to monitor the live MQTT connection status in React components.
 * Returns: 'connected' | 'reconnecting' | 'offline'
 */
export function useMqttStatus(): MqttConnectionStatus {
  const [status, setStatus] = useState<MqttConnectionStatus>(() =>
    mqttClient.connected ? 'connected' : currentStatus
  );

  useEffect(() => {
    // Sync initial state
    setStatus(mqttClient.connected ? 'connected' : currentStatus);

    const listener: StatusListener = (newStatus) => {
      setStatus(newStatus);
    };

    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  }, []);

  return status;
}

export default mqttClient;
