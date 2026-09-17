import { RecordData } from '../types';
import { formatPhoneWithCountryCode } from './phoneUtils';

export const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwp0g7tisVa8Os01Wx_ljaDoWoAfrxeAf5Jg-swW5gUwVhkPfO718iEmaPiRPghmbSA/exec';

const WEBHOOK_STORAGE_KEY = 'google_apps_script_webhook_url_v1';

export function getWebhookUrl(): string {
  try {
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_WEBHOOK_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('https://script.google.com/')) {
      return envUrl.trim();
    }
  } catch (e) {}

  try {
    const saved = localStorage.getItem(WEBHOOK_STORAGE_KEY);
    if (saved && saved.trim().startsWith('https://script.google.com/')) {
      return saved.trim();
    }
  } catch (e) {}
  return DEFAULT_WEBHOOK_URL;
}

export function saveWebhookUrl(url: string): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(WEBHOOK_STORAGE_KEY);
    } else {
      localStorage.setItem(WEBHOOK_STORAGE_KEY, url.trim());
    }
  } catch (e) {}
}

export interface WebhookSyncPayload {
  id: string;
  firstName: string;
  lastName: string;
  alfiler: string;
  patio: string;
  td: string;
  createdAt: string;
  updatedAt: string;
  phones: {
    number: string;
    nickname: string;
  }[];
  rawRecord?: RecordData;
}

/**
 * Sends record to the Google Apps Script Webhook directly.
 * No OAuth or Google account login needed on any client browser.
 */
export async function syncRecordViaWebhook(
  record: RecordData,
  customUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const targetUrl = customUrl || getWebhookUrl();

  try {
    const phones = record.celulares
      .filter((c) => c.phone && c.phone.trim().length > 0)
      .map((c) => {
        const full = formatPhoneWithCountryCode(c.phone.trim(), c.countryCode);
        return {
          number: full,
          nickname: (c.alias || '').trim(),
        };
      });

    const payload: WebhookSyncPayload = {
      id: record.id,
      firstName: record.nombre,
      lastName: record.apellido,
      alfiler: record.pin,
      patio: record.patio || '',
      td: record.td,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt || new Date().toISOString(),
      phones,
      rawRecord: record,
    };

    // Google Apps Script doPost redirects (302). Fetching with text/plain
    // ensures browsers won't trigger complex preflight errors.
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error syncing via Apps Script Webhook:', error);
    return { success: false, error: error?.message || 'Error de red al conectar con Google Sheets' };
  }
}

/**
 * Tests whether the given Webhook URL is deployed with "Anyone" access or giving 403 / redirect issues.
 */
export async function testWebhookAccessibility(url: string): Promise<{
  ok: boolean;
  status?: number;
  message: string;
}> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('https://script.google.com/macros/s/') || !cleanUrl.endsWith('/exec')) {
      return {
        ok: false,
        message: 'La URL debe empezar por https://script.google.com/macros/s/ y terminar en /exec',
      };
    }

    // Try a standard ping
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ping: true, date: new Date().toISOString() }),
    });

    return {
      ok: true,
      message: 'Petición enviada. Si no ves filas nuevas, asegúrate de haber pegado el código en Apps Script y configurado "Cualquier usuario (Anyone)".',
    };
  } catch (e: any) {
    return {
      ok: false,
      message: 'Error de conexión. Verifica que el Webhook tenga acceso para "Cualquier usuario (Anyone)".',
    };
  }
}

/**
 * Syncs multiple records sequentially to the Google Apps Script Webhook.
 */
export async function syncAllRecordsViaWebhook(
  records: RecordData[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; total: number; error?: string }> {
  try {
    for (let i = 0; i < records.length; i++) {
      if (onProgress) onProgress(i + 1, records.length);
      await syncRecordViaWebhook(records[i]);
      if (i < records.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    return { success: true, total: records.length };
  } catch (err: any) {
    return { success: false, total: 0, error: err?.message || 'Error al enviar registros' };
  }
}

