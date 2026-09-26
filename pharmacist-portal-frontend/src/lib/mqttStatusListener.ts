import { useEffect, useState } from 'react';
import { mqttClient } from './mqtt';

export const PHARMACY_STATUS_TOPIC = 'pharmacy/status';
export const PHARMACY_DISPENSE_TOPIC = 'pharmacy/dispense';
export const PHARMACY_DISPENSE_WILDCARD = 'pharmacy/dispense/#';

/**
 * Payload published by HiveMQ / ESP32 upon dispense completion / slot state change
 * e.g. { "token": "MED-XXXX", "slot": 1, "status": "EMPTY" }
 */
export interface ESP32StatusPayload {
  token: string;
  slot: number;
  status: 'EMPTY' | string;
}

export type ESP32StatusCallback = (payload: ESP32StatusPayload) => void;

// Active subscriber registry
const activeListeners = new Set<ESP32StatusCallback>();
let isSubscribedToTopic = false;
let messageHandlerAttached = false;

function ensureSubscription() {
  if (!isSubscribedToTopic) {
    // Explicitly subscribe to the required topic pharmacy/status
    mqttClient.subscribe(PHARMACY_STATUS_TOPIC, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT HiveMQ] Failed to subscribe to ${PHARMACY_STATUS_TOPIC}:`, err);
      } else {
        console.log(`[MQTT HiveMQ] Successfully subscribed to topic: ${PHARMACY_STATUS_TOPIC}`);
      }
    });

    // Also support any wildcard dispense subtopics
    mqttClient.subscribe(PHARMACY_DISPENSE_WILDCARD, { qos: 1 }, () => {});

    isSubscribedToTopic = true;
  }

  if (!messageHandlerAttached) {
    mqttClient.on('message', (topic, rawMessage) => {
      if (
        topic !== PHARMACY_STATUS_TOPIC &&
        topic !== 'pharmacy/status' &&
        topic !== PHARMACY_DISPENSE_TOPIC &&
        !topic.startsWith('pharmacy/dispense')
      ) {
        return;
      }

      try {
        const text = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString();
        const data = JSON.parse(text);

        if (!data || typeof data !== 'object') return;

        const payload: ESP32StatusPayload = {
          token: String(data.token || ''),
          slot: Number(data.slot) || 1,
          status: String(data.status || 'EMPTY').toUpperCase() as 'EMPTY' | string,
        };

        console.log(`[MQTT HiveMQ] Received message on topic [${topic}]:`, payload);

        // Dispatch immediately to all active listeners in the pharmacist portal
        activeListeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (listenerErr) {
            console.error('[MQTT HiveMQ Status Listener] Callback error:', listenerErr);
          }
        });
      } catch (err) {
        console.warn(`[MQTT HiveMQ] Error parsing message from ${topic}:`, err);
      }
    });

    // Automatically re-subscribe on reconnection to ensure persistent connectivity
    mqttClient.on('connect', () => {
      console.log(`[MQTT HiveMQ] Client connected/reconnected. Ensuring subscription to ${PHARMACY_STATUS_TOPIC}`);
      mqttClient.subscribe(PHARMACY_STATUS_TOPIC, { qos: 1 });
      mqttClient.subscribe(PHARMACY_DISPENSE_WILDCARD, { qos: 1 });
      isSubscribedToTopic = true;
    });

    messageHandlerAttached = true;
  }
}

// Eagerly initiate subscription to pharmacy/status immediately on module load
ensureSubscription();

/**
 * Reusable utility function to subscribe to ESP32 pharmacy status updates.
 *
 * @param callback Callback invoked whenever a pharmacy/status message arrives
 * @returns Unsubscribe function to clean up the listener
 */
export function subscribeToPharmacyStatus(callback: ESP32StatusCallback): () => void {
  activeListeners.add(callback);
  ensureSubscription();

  return () => {
    activeListeners.delete(callback);
  };
}

/**
 * React hook to listen for ESP32 pharmacy status updates inside components.
 *
 * @param onStatus Optional callback triggered on each incoming status message
 * @returns The latest ESP32StatusPayload received, or null
 */
export function usePharmacyStatus(onStatus?: ESP32StatusCallback): ESP32StatusPayload | null {
  const [latestStatus, setLatestStatus] = useState<ESP32StatusPayload | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPharmacyStatus((payload) => {
      setLatestStatus(payload);
      if (onStatus) {
        onStatus(payload);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onStatus]);

  return latestStatus;
}

/**
 * Simulation helper for testing real-time HiveMQ payload dispatch
 */
export function simulatePharmacyStatus(payload: ESP32StatusPayload) {
  console.log('[MQTT HiveMQ] Simulating pharmacy/status message:', payload);
  activeListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error('[MQTT HiveMQ Simulator] Error:', err);
    }
  });
}

if (typeof window !== 'undefined') {
  (window as any).simulatePharmacyStatus = simulatePharmacyStatus;
}
