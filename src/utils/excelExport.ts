import * as XLSX from 'xlsx';
import { RecordData } from '../types';
import { getPrimerNombrePrimerApellido } from './googleSheetsExport';
import { formatPhoneWithCountryCode } from './phoneUtils';

/**
 * Ensures cells starting with '+' are explicitly stored as text format ('@' format, 's' type)
 * so Excel does not attempt to evaluate them as formulas and preserves +573180000000 exactly.
 */
function formatWorksheetPhoneCells(ws: XLSX.WorkSheet) {
  Object.keys(ws).forEach((cellKey) => {
    if (cellKey.startsWith('!')) return;
    const cell = ws[cellKey];
    if (cell && typeof cell.v === 'string' && cell.v.startsWith('+')) {
      cell.t = 's';
      cell.z = '@';
    }
  });
}

/**
 * Formats and downloads a single record matching the exact layout of the user's image:
 * - NOMBRE: [value]
 * - APELLIDO: [value]
 * - PIN: [value] | TD: [value]
 * - CELULAR A REGISTRAR | NOMBRE O APODO
 * - CELULAR 1: [num] | [apodo]
 * ... up to CELULAR 10
 */
export function exportSingleRecordToExcel(record: RecordData, fileName?: string) {
  const wb = XLSX.utils.book_new();

  // 1. Exact Form Sheet (Matching visual template)
  const formRows = [
    ['NOMBRE:', record.nombre || ''],
    ['APELLIDO:', record.apellido || ''],
    [`PIN: ${record.pin || ''}  |  PATIO: ${record.patio || ''}`, `TD: ${record.td || ''}`],
    ['CELULAR A REGISTRAR', 'NOMBRE O APODO'],
  ];

  record.celulares.forEach((item, index) => {
    const fullPhone = item.phone ? formatPhoneWithCountryCode(item.phone, item.countryCode) : '';
    const phoneDisplay = fullPhone ? `CELULAR ${index + 1}: ${fullPhone}` : `CELULAR ${index + 1}:`;
    formRows.push([phoneDisplay, item.alias || '']);
  });

  const wsForm = XLSX.utils.aoa_to_sheet(formRows);

  // Set column widths
  wsForm['!cols'] = [
    { wch: 35 }, // Col A
    { wch: 40 }, // Col B
  ];
  formatWorksheetPhoneCells(wsForm);

  XLSX.utils.book_append_sheet(wb, wsForm, 'Formulario');

  // 2. Detalle Celulares Sheet (Layout exacto solicitado)
  // Col 1: Celular
  // Col 2: Apodo o nombre de persona a llamar
  // Col 3: Nombre del ppl
  // Col 4: Pin
  // Col 5: Patio
  // Col 6: TD
  const nombreApellidoPpl = getPrimerNombrePrimerApellido(record.nombre, record.apellido);
  const detailData = record.celulares
    .filter((c) => c.phone.trim() || c.alias.trim())
    .map((c) => ({
      'Celular': formatPhoneWithCountryCode(c.phone, c.countryCode),
      'Apodo o nombre de persona a llamar': c.alias.trim(),
      'Nombre del ppl': nombreApellidoPpl,
      'Pin': (record.pin || '').trim(),
      'Patio': (record.patio || '').trim(),
      'TD': (record.td || '').trim(),
    }));

  if (detailData.length > 0) {
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    wsDetail['!cols'] = [
      { wch: 18 }, // Celular
      { wch: 34 }, // Apodo o nombre de persona a llamar
      { wch: 30 }, // Nombre del ppl
      { wch: 12 }, // Pin
      { wch: 16 }, // Patio
      { wch: 12 }, // TD
    ];
    formatWorksheetPhoneCells(wsDetail);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Celulares');
  }

  const fullName = `${record.nombre || ''} ${record.apellido || ''}`.trim() || 'Registro';
  const tdPart = record.td ? `_TD_${record.td}` : '';
  const cleanName = `${fullName}${tdPart}`
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/gi, '');
  const safeFilename = fileName || `Registro_${cleanName}.xlsx`;

  XLSX.writeFile(wb, safeFilename);
}

/**
 * Exports all records in a comprehensive master workbook:
 * - Master Tab: One row per person with all 10 phones
 * - Detalle Celulares Tab: Formato ordenado exactamente como solicitado
 */
export function exportAllRecordsToExcel(records: RecordData[], fileName?: string) {
  if (records.length === 0) return;

  const wb = XLSX.utils.book_new();

  // 1. Consolidated Summary (1 row per contact)
  const masterRows = records.map((r, i) => {
    const rowObj: Record<string, string | number> = {
      'N°': i + 1,
      'Nombre': r.nombre,
      'Apellido': r.apellido,
      'PIN': r.pin,
      'Patio': r.patio || '',
      'TD': r.td,
      'Total Celulares': r.celulares.filter((c) => c.phone.trim()).length,
      'Fecha': new Date(r.createdAt).toLocaleDateString('es-CO'),
    };

    // Add Celular 1..10 columns
    r.celulares.forEach((c, idx) => {
      rowObj[`Celular ${idx + 1}`] = c.phone ? formatPhoneWithCountryCode(c.phone, c.countryCode) : '';
      rowObj[`Apodo ${idx + 1}`] = c.alias;
    });

    return rowObj;
  });

  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  formatWorksheetPhoneCells(wsMaster);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Consolidado General');

  // 2. Detalle Celulares (Orden exacto de columnas solicitado)
  // Col 1: Celular
  // Col 2: Apodo o nombre de persona a llamar
  // Col 3: Nombre del ppl
  // Col 4: Pin
  // Col 5: Patio
  // Col 6: TD
  const phoneRows: Array<Record<string, string | number>> = [];
  records.forEach((r) => {
    const nombreApellidoPpl = getPrimerNombrePrimerApellido(r.nombre, r.apellido);
    r.celulares.forEach((c) => {
      if (c.phone.trim() || c.alias.trim()) {
        phoneRows.push({
          'Celular': formatPhoneWithCountryCode(c.phone, c.countryCode),
          'Apodo o nombre de persona a llamar': c.alias.trim(),
          'Nombre del ppl': nombreApellidoPpl,
          'Pin': (r.pin || '').trim(),
          'Patio': (r.patio || '').trim(),
          'TD': (r.td || '').trim(),
        });
      }
    });
  });

  if (phoneRows.length > 0) {
    const wsPhones = XLSX.utils.json_to_sheet(phoneRows);
    wsPhones['!cols'] = [
      { wch: 18 }, // Celular
      { wch: 34 }, // Apodo o nombre de persona a llamar
      { wch: 30 }, // Nombre del ppl
      { wch: 12 }, // Pin
      { wch: 16 }, // Patio
      { wch: 12 }, // TD
    ];
    formatWorksheetPhoneCells(wsPhones);
    XLSX.utils.book_append_sheet(wb, wsPhones, 'Detalle Celulares');
  }

  const safeFilename = fileName || `Consolidado_Registros_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}
