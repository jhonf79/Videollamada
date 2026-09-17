import React, { useState } from 'react';
import { X, Copy, Check, Code, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';
import { DEFAULT_SPREADSHEET_URL } from '../utils/storage';

interface AppsScriptCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetUrl?: string;
}

export const APPS_SCRIPT_SOURCE_CODE = `/**
 * GOOGLE APPS SCRIPT - SINCRONIZADOR DE REGISTROS DE CELULARES
 * Escribe automáticamente en las pestañas "Detalle Celulares" y "Base de Datos".
 */

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Webhook activo y funcionando correctamente." }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "No data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);

    // Respuesta a prueba de conexión (ping)
    if (data.ping) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "pong", time: new Date() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ==========================================
    // 1. PESTAÑA: Detalle Celulares (Filas individuales)
    // Columnas: Celular | Apodo o nombre | Nombre del ppl | Pin | Patio | TD
    // ==========================================
    var sheetDetalle = ss.getSheetByName("Detalle Celulares");
    if (!sheetDetalle) {
      sheetDetalle = ss.insertSheet("Detalle Celulares");
      sheetDetalle.appendRow([
        "Celular",
        "Apodo o nombre de persona a llamar",
        "Nombre del ppl",
        "Pin",
        "Patio",
        "TD"
      ]);
      sheetDetalle.getRange(1, 1, 1, 6)
        .setBackground("#1a5980")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
      sheetDetalle.setFrozenRows(1);
    }

    // Extraer datos del titular
    var nombre = (data.firstName || (data.rawRecord && data.rawRecord.nombre) || "").trim();
    var apellido = (data.lastName || (data.rawRecord && data.rawRecord.apellido) || "").trim();
    var pNom = nombre.split(/\\s+/)[0] || "";
    var pApe = apellido.split(/\\s+/)[0] || "";
    var nombrePpl = (pNom && pApe) ? (pNom + " " + pApe) : (nombre + " " + apellido).trim();

    var pin = (data.alfiler || data.pin || (data.rawRecord && data.rawRecord.pin) || "").toString().trim();
    var patio = (data.patio || (data.rawRecord && data.rawRecord.patio) || "").toString().trim();
    var td = (data.td || (data.rawRecord && data.rawRecord.td) || "").toString().trim();

    // Lista de celulares recibidos
    var phones = data.phones || [];
    if ((!phones || phones.length === 0) && data.rawRecord && data.rawRecord.celulares) {
      phones = data.rawRecord.celulares
        .filter(function(c) { return c.phone && c.phone.trim(); })
        .map(function(c) {
          return {
            number: c.phone.trim(),
            nickname: (c.alias || "").trim()
          };
        });
    }

    // Escribir cada teléfono en 'Detalle Celulares'
    var rowsAdded = 0;
    for (var i = 0; i < phones.length; i++) {
      var item = phones[i];
      var rawNum = (item.number || item.phone || "").toString().trim();
      var alias = (item.nickname || item.alias || "").toString().trim();

      if (rawNum || alias) {
        // Prefijo con apóstrofe para evitar que Sheets borre el '+' del indicativo
        var phoneFormatted = rawNum.indexOf("+") === 0 ? ("'" + rawNum) : rawNum;
        sheetDetalle.appendRow([phoneFormatted, alias, nombrePpl, pin, patio, td]);
        rowsAdded++;
      }
    }

    // ==========================================
    // 2. PESTAÑA: Base de Datos (Fila resumen por persona)
    // ==========================================
    var sheetBD = ss.getSheetByName("Base de Datos");
    if (sheetBD) {
      var fechaCol = Utilities.formatDate(new Date(), "America/Bogota", "dd/MM/yyyy, hh:mm:ss a");
      var rowBD = [
        data.id || ("rec_" + new Date().getTime()),
        fechaCol,
        nombre,
        apellido,
        pin,
        patio,
        td,
        phones.length.toString()
      ];

      for (var k = 0; k < 10; k++) {
        var p = phones[k];
        if (p) {
          var pNum = (p.number || p.phone || "").toString().trim();
          rowBD.push(pNum.indexOf("+") === 0 ? ("'" + pNum) : pNum);
          rowBD.push((p.nickname || p.alias || "").toString().trim());
        } else {
          rowBD.push("");
          rowBD.push("");
        }
      }
      rowBD.push(fechaCol);
      sheetBD.appendRow(rowBD);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", rowsAdded: rowsAdded }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export const AppsScriptCodeModal: React.FC<AppsScriptCodeModalProps> = ({
  isOpen,
  onClose,
  spreadsheetUrl = DEFAULT_SPREADSHEET_URL,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SOURCE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="script-modal-title"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 id="script-modal-title" className="font-bold text-sm sm:text-base text-white">
                Código para Google Apps Script
              </h3>
              <p className="text-[11px] text-slate-400">
                Pega este código en tu hoja para que los datos se guarden en "Detalle Celulares"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Instrucciones 1-2-3-4 */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 space-y-2 text-xs text-amber-950">
            <p className="font-bold flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Instrucciones obligatorias para que guarde en la hoja:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900 pl-1 leading-relaxed">
              <li>
                Abre tu hoja de Google:{' '}
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-amber-800 hover:text-amber-950 inline-flex items-center gap-0.5"
                >
                  Abrir Hoja de Google <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                En el menú superior de la hoja ve a: <strong>Extensiones ➔ Apps Script</strong>.
              </li>
              <li>
                Borra cualquier código que veas y <strong>pega el código que está abajo</strong>. Guarda con <strong>Ctrl + S</strong>.
              </li>
              <li>
                Arriba a la derecha haz clic en el botón azul <strong>Implementar ➔ Nueva implementación</strong> (o Administrar implementaciones ➔ Editar).
              </li>
              <li className="bg-amber-200/60 p-1.5 rounded-md font-semibold text-amber-950">
                ⚠️ En <u>Quién tiene acceso</u> (Who has access): Selecciona <strong>Cualquier usuario (Anyone)</strong>. Si dejas "Solo yo", Google bloqueará el guardado.
              </li>
              <li>
                Haz clic en <strong>Implementar</strong>, copia la URL que termina en <code className="bg-white/80 px-1 py-0.5 rounded font-mono">/exec</code> y pégala en los ajustes de la app.
              </li>
            </ol>
          </div>

          {/* Code Box with Copy Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Código JavaScript (Código.gs):</span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Código Completo</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed border border-slate-800 select-all">
              {APPS_SCRIPT_SOURCE_CODE}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
