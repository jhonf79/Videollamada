import { RecordData } from '../types';
import { formatPhoneWithCountryCode } from './phoneUtils';

export const GOOGLE_APPS_SCRIPT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwp0g7tisVa8Os01Wx_ljaDoWoAfrxeAf5Jg-swW5gUwVhkPfO718iEmaPiRPghmbSA/exec';

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
export async function syncRecordViaWebhook(record: RecordData): Promise<{ success: boolean; error?: string }> {
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

    // Google Apps Script doPost redirects (302). Fetching with mode: 'no-cors' and text/plain
    // ensures browsers won't block it with CORS preflight errors.
    await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
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
      // Small pause to ensure Google Sheets script does not hit write collision
      if (i < records.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    return { success: true, total: records.length };
  } catch (err: any) {
    return { success: false, total: 0, error: err?.message || 'Error al enviar registros' };
  }
}

