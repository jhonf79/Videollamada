import { RecordData } from '../types';
import { formatPhoneWithCountryCode } from './phoneUtils';

export interface GoogleSheetExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  action?: 'appended' | 'updated' | 'created';
  isNewSpreadsheet?: boolean;
}

export const MASTER_SPREADSHEET_TITLE = 'Registro de Celulares y Contactos - Base de Datos';

/**
 * Verifies if a given Google Spreadsheet ID exists and can be accessed with the given access token.
 */
export async function verifySpreadsheetExists(
  spreadsheetId: string,
  accessToken: string
): Promise<{ exists: boolean; title?: string; sheetNames?: string[] }> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      return { exists: false };
    }
    const data = await res.json();
    const sheetNames = data.sheets?.map((s: any) => s.properties?.title as string) || [];
    return {
      exists: true,
      title: data.properties?.title,
      sheetNames,
    };
  } catch (e) {
    return { exists: false };
  }
}

/**
 * Creates the Master Google Spreadsheet structured for ongoing data collection.
 */
export async function createMasterSpreadsheet(
  accessToken: string,
  customTitle?: string
): Promise<GoogleSheetExportResult> {
  const title = customTitle || MASTER_SPREADSHEET_TITLE;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'Base de Datos',
            gridProperties: {
              frozenRowCount: 1,
              rowCount: 100,
              columnCount: 28,
            },
          },
        },
        {
          properties: {
            sheetId: 1,
            title: 'Detalle Celulares',
            gridProperties: {
              frozenRowCount: 1,
              rowCount: 100,
              columnCount: 10,
            },
          },
        },
        {
          properties: {
            sheetId: 2,
            title: 'Último Registro (Formato)',
            gridProperties: {
              rowCount: 20,
              columnCount: 4,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al crear la Hoja de cálculo de Google');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Headers for Base de Datos
  const masterHeader = [
    'ID Registro',
    'Fecha de Registro',
    'Nombre',
    'Apellido',
    'PIN',
    'Patio',
    'TD',
    'Total Celulares',
  ];
  for (let i = 1; i <= 10; i++) {
    masterHeader.push(`Celular ${i}`);
    masterHeader.push(`Apodo ${i}`);
  }
  masterHeader.push('Última Actualización');

  // Headers for Detalle Celulares
  // Organizado exactamente según el formato solicitado:
  // Col 1: Celular
  // Col 2: Apodo o nombre de persona a llamar
  // Col 3: Nombre del ppl
  // Col 4: Pin
  // Col 5: Patio
  // Col 6: TD
  const detailHeader = [
    'Celular',
    'Apodo o nombre de persona a llamar',
    'Nombre del ppl',
    'Pin',
    'Patio',
    'TD',
  ];

  // Populate Headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: "'Base de Datos'!A1:AD1",
          values: [masterHeader],
        },
        {
          range: "'Detalle Celulares'!A1:F1",
          values: [detailHeader],
        },
      ],
    }),
  });

  // Apply styling
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          // Base de Datos Header Style (Emerald Green)
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: masterHeader.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.05, green: 0.48, blue: 0.35 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Detalle Celulares Header Style
          {
            repeatCell: {
              range: {
                sheetId: 1,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: detailHeader.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.35, blue: 0.5 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.warn('Styling failed:', e);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
    action: 'created',
    isNewSpreadsheet: true,
  };
}

/**
 * Ensures that the required tabs ('Base de Datos', 'Detalle Celulares', 'Último Registro (Formato)')
 * exist in the target spreadsheet.
 */
async function ensureRequiredSheets(spreadsheetId: string, accessToken: string) {
  const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!checkRes.ok) return;

  const data = await checkRes.json();
  const existingSheetTitles = new Set(data.sheets?.map((s: any) => s.properties?.title) || []);

  const addRequests: any[] = [];
  if (!existingSheetTitles.has('Base de Datos')) {
    addRequests.push({
      addSheet: {
        properties: {
          title: 'Base de Datos',
          gridProperties: { frozenRowCount: 1, rowCount: 100, columnCount: 28 },
        },
      },
    });
  }
  if (!existingSheetTitles.has('Detalle Celulares')) {
    addRequests.push({
      addSheet: {
        properties: {
          title: 'Detalle Celulares',
          gridProperties: { frozenRowCount: 1, rowCount: 100, columnCount: 10 },
        },
      },
    });
  }
  if (!existingSheetTitles.has('Último Registro (Formato)')) {
    addRequests.push({
      addSheet: {
        properties: {
          title: 'Último Registro (Formato)',
          gridProperties: { rowCount: 20, columnCount: 4 },
        },
      },
    });
  }

  if (addRequests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addRequests }),
    });

    // If 'Base de Datos' was just created, add headers
    if (!existingSheetTitles.has('Base de Datos')) {
      const masterHeader = [
        'ID Registro',
        'Fecha de Registro',
        'Nombre',
        'Apellido',
        'PIN',
        'Patio',
        'TD',
        'Total Celulares',
      ];
      for (let i = 1; i <= 10; i++) {
        masterHeader.push(`Celular ${i}`);
        masterHeader.push(`Apodo ${i}`);
      }
      masterHeader.push('Última Actualización');

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Base de Datos'!A1:AD1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [masterHeader] }),
      });
    }

    // Ensure 'Detalle Celulares' header matches the exact requested 6-column layout:
    // Celular | Apodo o nombre de persona a llamar | Nombre del ppl | Pin | Patio | TD
    const detailHeader = [
      'Celular',
      'Apodo o nombre de persona a llamar',
      'Nombre del ppl',
      'Pin',
      'Patio',
      'TD',
    ];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Detalle Celulares'!A1:F1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [detailHeader] }),
    });
  }
}

/**
 * Extracts 1er Nombre + 1er Apellido del Titular Principal
 * e.g. "Juan Carlos" "Perez Gomez" -> "Juan Perez"
 */
export function getPrimerNombrePrimerApellido(nombre: string, apellido: string): string {
  const cleanNombre = (nombre || '').trim();
  const cleanApellido = (apellido || '').trim();
  const primerNombre = cleanNombre.split(/\s+/)[0] || '';
  const primerApellido = cleanApellido.split(/\s+/)[0] || '';

  if (primerNombre && primerApellido) {
    return `${primerNombre} ${primerApellido}`;
  }
  return (primerNombre || primerApellido || `${cleanNombre} ${cleanApellido}`).trim();
}

/**
 * Builds the data array for a single record row in 'Base de Datos'.
 */
function buildMasterRow(record: RecordData): string[] {
  const totalPhones = record.celulares.filter((c) => c.phone.trim()).length;
  const row = [
    record.id,
    new Date(record.createdAt).toLocaleString('es-CO'),
    record.nombre,
    record.apellido,
    record.pin,
    record.patio || '',
    record.td,
    totalPhones.toString(),
  ];

  for (let i = 0; i < 10; i++) {
    const item = record.celulares[i];
    const fullPhone = item?.phone ? formatPhoneWithCountryCode(item.phone, item.countryCode) : '';
    // Prefix with single quote so Google Sheets USER_ENTERED keeps it as text '+573180000000' -> displayed as '+573180000000'
    const sheetPhone = fullPhone.startsWith('+') ? `'${fullPhone}` : fullPhone;
    row.push(sheetPhone);
    row.push(item?.alias || '');
  }

  row.push(new Date(record.updatedAt || record.createdAt).toLocaleString('es-CO'));
  return row;
}

/**
 * Builds the detail rows for all non-empty phones of a record in the exact requested order:
 * 1. Celular
 * 2. Apodo o nombre de persona a llamar
 * 3. Nombre del ppl
 * 4. Pin
 * 5. Patio
 * 6. TD
 */
function buildDetailPhoneRows(record: RecordData): string[][] {
  const rows: string[][] = [];
  const nombreApellidoPpl = getPrimerNombrePrimerApellido(record.nombre, record.apellido);
  const pin = (record.pin || '').trim();
  const patio = (record.patio || '').trim();
  const td = (record.td || '').trim();

  record.celulares.forEach((c) => {
    const phone = c.phone.trim();
    const alias = c.alias.trim();
    if (phone || alias) {
      const fullPhone = phone ? formatPhoneWithCountryCode(phone, c.countryCode) : '';
      const sheetPhone = fullPhone.startsWith('+') ? `'${fullPhone}` : fullPhone;
      rows.push([
        sheetPhone,         // Celular concatenado con código de país (ej: +573180000000)
        alias,              // Apodo o nombre de persona a llamar
        nombreApellidoPpl,  // Nombre del ppl
        pin,                // Pin
        patio,              // Patio
        td,                 // TD
      ]);
    }
  });
  return rows;
}

/**
 * Appends or updates a record into the SAME linked Google Spreadsheet without creating new files.
 */
export async function appendRecordToLinkedGoogleSheet(
  record: RecordData,
  accessToken: string,
  targetSpreadsheetId?: string
): Promise<GoogleSheetExportResult> {
  let spreadsheetId = targetSpreadsheetId;
  let isNew = false;
  let sheetTitle = MASTER_SPREADSHEET_TITLE;

  // 1. Check if the spreadsheet exists; if not, create it
  if (spreadsheetId) {
    const check = await verifySpreadsheetExists(spreadsheetId, accessToken);
    if (!check.exists) {
      spreadsheetId = undefined;
    } else {
      sheetTitle = check.title || MASTER_SPREADSHEET_TITLE;
    }
  }

  if (!spreadsheetId) {
    const newMaster = await createMasterSpreadsheet(accessToken);
    spreadsheetId = newMaster.spreadsheetId;
    sheetTitle = newMaster.title;
    isNew = true;
  }

  // Ensure necessary sheets exist in the spreadsheet
  await ensureRequiredSheets(spreadsheetId, accessToken);

  // 2. Check if the record already exists in 'Base de Datos' (search by record.id in Column A)
  let action: 'appended' | 'updated' = 'appended';
  let targetRowIndex: number | null = null;

  try {
    const colARes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Base de Datos'!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (colARes.ok) {
      const colAData = await colARes.json();
      const rows: string[][] = colAData.values || [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i][0] === record.id) {
          targetRowIndex = i + 1; // 1-indexed
          break;
        }
      }
    }
  } catch (e) {
    console.warn('Could not read existing rows, will append:', e);
  }

  const rowData = buildMasterRow(record);

  // 3. Write or Append to 'Base de Datos'
  if (targetRowIndex) {
    // Update existing row
    action = 'updated';
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Base de Datos'!A${targetRowIndex}:AC${targetRowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowData] }),
      }
    );
    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Error al actualizar el registro en la Hoja de cálculo');
    }
  } else {
    // Append new row
    action = 'appended';
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Base de Datos'!A:AD:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowData] }),
      }
    );
    if (!appendRes.ok) {
      const err = await appendRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Error al agregar el registro en la Hoja de cálculo');
    }
  }

  // 4. Append non-empty phone details to 'Detalle Celulares'
  const detailRows = buildDetailPhoneRows(record);
  if (detailRows.length > 0) {
    try {
      // Ensure header in row 1 has the updated 6-column layout:
      // Celular | Apodo o nombre de persona a llamar | Nombre del ppl | Pin | Patio | TD
      const detailHeader = [
        'Celular',
        'Apodo o nombre de persona a llamar',
        'Nombre del ppl',
        'Pin',
        'Patio',
        'TD',
      ];
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Detalle Celulares'!A1:F1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [detailHeader] }),
        }
      );

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Detalle Celulares'!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: detailRows }),
        }
      );
    } catch (err) {
      console.warn('Failed to append to Detalle Celulares:', err);
    }
  }

  // 5. Update 'Último Registro (Formato)' with this record's visual sheet
  try {
    const formRows: string[][] = [
      ['NOMBRE:', record.nombre || ''],
      ['APELLIDO:', record.apellido || ''],
      [`PIN: ${record.pin || ''} | PATIO: ${record.patio || ''}`, `TD: ${record.td || ''}`],
      ['CELULAR A REGISTRAR', 'NOMBRE O APODO'],
    ];

    record.celulares.forEach((item, index) => {
      const fullPhone = item.phone ? formatPhoneWithCountryCode(item.phone, item.countryCode) : '';
      const phoneDisplay = fullPhone ? `CELULAR ${index + 1}: ${fullPhone}` : `CELULAR ${index + 1}:`;
      formRows.push([phoneDisplay, item.alias || '']);
    });

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Último Registro (Formato)'!A1:B14?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: formRows }),
      }
    );
  } catch (err) {
    console.warn('Failed to update Último Registro (Formato):', err);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: sheetTitle,
    action,
    isNewSpreadsheet: isNew,
  };
}

/**
 * Synchronizes ALL locally stored records into the SAME linked spreadsheet.
 */
export async function syncAllRecordsToLinkedGoogleSheet(
  records: RecordData[],
  accessToken: string,
  targetSpreadsheetId?: string
): Promise<GoogleSheetExportResult> {
  let spreadsheetId = targetSpreadsheetId;
  let isNew = false;
  let sheetTitle = MASTER_SPREADSHEET_TITLE;

  if (spreadsheetId) {
    const check = await verifySpreadsheetExists(spreadsheetId, accessToken);
    if (!check.exists) {
      spreadsheetId = undefined;
    } else {
      sheetTitle = check.title || MASTER_SPREADSHEET_TITLE;
    }
  }

  if (!spreadsheetId) {
    const newMaster = await createMasterSpreadsheet(accessToken);
    spreadsheetId = newMaster.spreadsheetId;
    sheetTitle = newMaster.title;
    isNew = true;
  }

  await ensureRequiredSheets(spreadsheetId, accessToken);

  // 1. Build Base de Datos rows
  const masterHeader = [
    'ID Registro',
    'Fecha de Registro',
    'Nombre',
    'Apellido',
    'PIN',
    'Patio',
    'TD',
    'Total Celulares',
  ];
  for (let i = 1; i <= 10; i++) {
    masterHeader.push(`Celular ${i}`);
    masterHeader.push(`Apodo ${i}`);
  }
  masterHeader.push('Última Actualización');

  const masterRows: string[][] = [masterHeader];
  records.forEach((r) => {
    masterRows.push(buildMasterRow(r));
  });

  // 2. Build Detalle Celulares rows in the exact requested order:
  // Celular | Apodo o nombre de persona a llamar | Nombre del ppl | Pin | Patio | TD
  const detailHeader = [
    'Celular',
    'Apodo o nombre de persona a llamar',
    'Nombre del ppl',
    'Pin',
    'Patio',
    'TD',
  ];
  const detailRows: string[][] = [detailHeader];
  records.forEach((r) => {
    const pRows = buildDetailPhoneRows(r);
    detailRows.push(...pRows);
  });

  // Clear and update 'Base de Datos'
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Base de Datos'!A:AD:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Base de Datos'!A1:AD${masterRows.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: masterRows }),
  });

  // Clear and update 'Detalle Celulares'
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Detalle Celulares'!A:Z:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Detalle Celulares'!A1:F${Math.max(detailRows.length, 1)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: detailRows }),
  });

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: sheetTitle,
    action: 'updated',
    isNewSpreadsheet: isNew,
  };
}

/**
 * Legacy support for exporting a single standalone sheet if desired.
 */
export async function exportSingleRecordToGoogleSheets(
  record: RecordData,
  accessToken: string
): Promise<GoogleSheetExportResult> {
  return appendRecordToLinkedGoogleSheet(record, accessToken);
}

/**
 * Legacy support for exporting all records to a standalone sheet.
 */
export async function exportAllRecordsToGoogleSheets(
  records: RecordData[],
  accessToken: string
): Promise<GoogleSheetExportResult> {
  return syncAllRecordsToLinkedGoogleSheet(records, accessToken);
}
