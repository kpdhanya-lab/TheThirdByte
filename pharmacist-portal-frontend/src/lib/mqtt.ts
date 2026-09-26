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

const clientId = `pharmacist_portal_${Math.random().toString(16).substring(2, 10)}_${Date.now()}`;

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

// Attach connection lifecycle handlers for diagnostics & monitoring
mqttClient.on('connect', () => {
  console.log('[MQTT Pharmacist] Connected successfully to HiveMQ broker over secure WebSockets');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT Pharmacist] Reconnecting to HiveMQ broker...');
});

mqttClient.on('close', () => {
  console.log('[MQTT Pharmacist] Connection closed');
});

mqttClient.on('error', (err) => {
  console.error('[MQTT Pharmacist] Connection error:', err.message || err);
});

if (typeof window !== 'undefined') {
  (window as any).mqttClient = mqttClient;
}

export * from './mqttStatusListener';

export default mqttClient;
