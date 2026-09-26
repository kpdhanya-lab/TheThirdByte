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

const options: IClientOptions = {
  protocol: 'wss',
  clientId,
  clean: true,
  reconnectPeriod: 3000, // Automatically retry connection every 3 seconds if disconnected
  connectTimeout: 30 * 1000, // 30 seconds connection timeout
  keepalive: 60,
  ...(username ? { username } : {}),
  ...(password ? { password } : {}),
};

/**
 * Singleton MQTT client instance for HiveMQ Cloud over secure WebSockets (wss).
 */
export const mqttClient: MqttClient = mqtt.connect(brokerUrl, options);

// Attach connection lifecycle handlers for diagnostics & monitoring
mqttClient.on('connect', () => {
  console.log('[MQTT] Connected successfully to HiveMQ broker over secure WebSockets');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting to HiveMQ broker...');
});

mqttClient.on('close', () => {
  console.log('[MQTT] Connection closed');
});

mqttClient.on('offline', () => {
  console.warn('[MQTT] Client is currently offline');
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Connection error:', err.message || err);
});

export default mqttClient;
