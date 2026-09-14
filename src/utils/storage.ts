import { RecordData, createEmptyRecord } from '../types';

export interface LinkedGoogleSheet {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastUpdated: string;
  autoSync: boolean;
}

export const DEFAULT_SPREADSHEET_ID = '1ivg4Jb1HioFN07AY8T2WZx0VEhKR511kj6XGrWOGO_E';
export const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1ivg4Jb1HioFN07AY8T2WZx0VEhKR511kj6XGrWOGO_E/edit?usp=sharing';

export const DEFAULT_LINKED_SHEET: LinkedGoogleSheet = {
  spreadsheetId: DEFAULT_SPREADSHEET_ID,
  spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
  title: 'Base de Datos de Celulares y PPL',
  lastUpdated: new Date().toISOString(),
  autoSync: true,
};

const STORAGE_KEY = 'registro_celulares_records_v1';
const DRAFT_KEY = 'registro_celulares_current_draft';
const LINKED_SHEET_KEY = 'registro_celulares_linked_google_sheet_v2';

export function getLinkedGoogleSheet(): LinkedGoogleSheet {
  try {
    const raw = localStorage.getItem(LINKED_SHEET_KEY);
    if (!raw) {
      localStorage.setItem(LINKED_SHEET_KEY, JSON.stringify(DEFAULT_LINKED_SHEET));
      return DEFAULT_LINKED_SHEET;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.spreadsheetId) {
      return parsed;
    }
    return DEFAULT_LINKED_SHEET;
  } catch (e) {
    console.error('Error loading linked sheet:', e);
    return DEFAULT_LINKED_SHEET;
  }
}

export function saveLinkedGoogleSheet(sheet: LinkedGoogleSheet | null) {
  try {
    if (sheet) {
      localStorage.setItem(LINKED_SHEET_KEY, JSON.stringify(sheet));
    } else {
      localStorage.removeItem(LINKED_SHEET_KEY);
    }
  } catch (e) {
    console.error('Error saving linked sheet:', e);
  }
}

export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Matches https://docs.google.com/spreadsheets/d/{spreadsheetId}/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already an alphanumeric ID of reasonable length
  if (!trimmed.includes('/') && trimmed.length >= 20) {
    return trimmed;
  }
  return null;
}

export function getSavedRecords(): RecordData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading saved records:', e);
    return [];
  }
}

export function saveRecord(record: RecordData): RecordData[] {
  const records = getSavedRecords();
  const existingIndex = records.findIndex((r) => r.id === record.id);
  const updatedRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };

  let updatedList: RecordData[];
  if (existingIndex >= 0) {
    updatedList = [...records];
    updatedList[existingIndex] = updatedRecord;
  } else {
    updatedList = [updatedRecord, ...records];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.error('Error saving record to storage:', e);
  }
  return updatedList;
}

export function deleteRecord(id: string): RecordData[] {
  const records = getSavedRecords();
  const filtered = records.filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting record:', e);
  }
  return filtered;
}

export function loadDraft(): RecordData {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.celulares)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading draft:', e);
  }
  return createEmptyRecord();
}

export function saveDraft(record: RecordData) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(record));
  } catch (e) {
    console.error('Error saving draft:', e);
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.error('Error clearing draft:', e);
  }
}

export function createSampleRecord(): RecordData {
  return {
    id: `rec_sample_${Date.now()}`,
    nombre: 'Carlos',
    apellido: 'Martínez',
    pin: '10234567890',
    patio: 'Patio 2',
    td: '1023456789',
    celulares: [
      { id: 1, label: 'CELULAR 1:', phone: '3104567890', alias: 'Personal', countryCode: '+57' },
      { id: 2, label: 'CELULAR 2:', phone: '3129876543', alias: 'Trabajo / Oficina', countryCode: '+57' },
      { id: 3, label: 'CELULAR 3:', phone: '3151122334', alias: 'Esposa (María)', countryCode: '+57' },
      { id: 4, label: 'CELULAR 4:', phone: '3205566778', alias: 'Hijo Mayor', countryCode: '+57' },
      { id: 5, label: 'CELULAR 5:', phone: '3189900112', alias: 'Hermano Pedro', countryCode: '+57' },
      { id: 6, label: 'CELULAR 6:', phone: '', alias: '', countryCode: '+57' },
      { id: 7, label: 'CELULAR 7:', phone: '', alias: '', countryCode: '+57' },
      { id: 8, label: 'CELULAR 8:', phone: '', alias: '', countryCode: '+57' },
      { id: 9, label: 'CELULAR 9:', phone: '', alias: '', countryCode: '+57' },
      { id: 10, label: 'CELULAR 10:', phone: '', alias: '', countryCode: '+57' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
