// SpeedUp Video Pro - GA4 Measurement Protocol Telemetry Module (Manifest V3)
const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const MEASUREMENT_ID = 'G-1WMDCJ7HDC';
const API_SECRET = 'r3KXiFPXTXizAy31JGLJ7Q';

// Genera o recupera un identificativo pseudonimo casuale per la singola installazione
async function getOrCreateClientId() {
  const data = await chrome.storage.local.get('telemetry_client_id');
  if (data.telemetry_client_id) {
    return data.telemetry_client_id;
  }
  const newId = self.crypto.randomUUID();
  await chrome.storage.local.set({ telemetry_client_id: newId });
  return newId;
}

// Invia l'evento HTTP anonimo a GA4 senza bloccare l'interfaccia (fire-and-forget)
export async function sendTelemetryEvent(eventName, eventParams = {}) {
  try {
    const clientId = await getOrCreateClientId();
    const url = `${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name: eventName,
            params: {
              ...eventParams,
              engagement_time_msec: 100
            }
          }
        ]
      })
    });
  } catch (err) {
    // Non bloccare mai l'estensione o mostrare errori bloccanti in console se la rete fallisce
    console.debug('[Telemetry] Dispatch bypassed:', err);
  }
}

// Compatibilità runtime globale
if (typeof globalThis !== 'undefined') {
  globalThis.sendTelemetryEvent = sendTelemetryEvent;
}
