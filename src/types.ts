export interface PhoneEntry {
  id: number; // 1 to 10
  label: string; // e.g., "CELULAR 1:"
  phone: string;
  alias: string; // "NOMBRE O APODO"
  countryCode?: string; // e.g., "+57"
}

export interface RecordData {
  id: string;
  nombre: string;
  apellido: string;
  pin: string;
  patio: string;
  td: string;
  celulares: PhoneEntry[];
  createdAt: string;
  updatedAt: string;
}

export const DOCUMENT_TYPES = [
  'CC', // Cédula de Ciudadanía
  'TI', // Tarjeta de Identidad
  'CE', // Cédula de Extranjería
  'PASAPORTE',
  'PEP', // Permiso Especial
  'PPT', // Permiso por Protección Temporal
  'NIT',
  'OTRO',
] as const;

export const INITIAL_PHONE_ENTRIES: PhoneEntry[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  label: `CELULAR ${i + 1}:`,
  phone: '',
  alias: '',
  countryCode: '+57',
}));

export const createEmptyRecord = (): RecordData => ({
  id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  nombre: '',
  apellido: '',
  pin: '',
  patio: '',
  td: '',
  celulares: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    label: `CELULAR ${i + 1}:`,
    phone: '',
    alias: '',
    countryCode: '+57',
  })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
