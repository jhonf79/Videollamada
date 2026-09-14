import React, { useState } from 'react';
import { FileSpreadsheet, ExternalLink, Settings, Check, RefreshCw, Link as LinkIcon } from 'lucide-react';
import {
  LinkedGoogleSheet,
  extractSpreadsheetId,
  saveLinkedGoogleSheet,
  DEFAULT_LINKED_SHEET,
  DEFAULT_SPREADSHEET_ID,
} from '../utils/storage';
import { User } from 'firebase/auth';

interface LinkedSheetBannerProps {
  linkedSheet: LinkedGoogleSheet | null;
  currentUser: User | null;
  onOpenExportDialog: () => void;
  onSyncAll?: () => void;
  onSheetChanged: (sheet: LinkedGoogleSheet | null) => void;
}

export const LinkedSheetBanner: React.FC<LinkedSheetBannerProps> = ({
  linkedSheet,
  currentUser,
  onOpenExportDialog,
  onSheetChanged,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  const handleLinkExisting = () => {
    setEditError(null);
    const id = extractSpreadsheetId(customInput);
    if (!id) {
      setEditError('Por favor pega un enlace o ID válido de Google Sheets.');
      return;
    }

    const updated: LinkedGoogleSheet = {
      spreadsheetId: id,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      title: 'Hoja de cálculo vinculada',
      lastUpdated: new Date().toISOString(),
      autoSync: linkedSheet ? linkedSheet.autoSync : true,
    };

    saveLinkedGoogleSheet(updated);
    onSheetChanged(updated);
    setIsEditing(false);
    setCustomInput('');
  };

  const handleResetDefault = () => {
    saveLinkedGoogleSheet(DEFAULT_LINKED_SHEET);
    onSheetChanged(DEFAULT_LINKED_SHEET);
    setIsEditing(false);
    setShowUnlinkConfirm(false);
  };

  const handleUnlink = () => {
    saveLinkedGoogleSheet(null);
    onSheetChanged(null);
    setIsEditing(false);
    setShowUnlinkConfirm(false);
  };

  const toggleAutoSync = () => {
    if (!linkedSheet) return;
    const updated = {
      ...linkedSheet,
      autoSync: !linkedSheet.autoSync,
    };
    saveLinkedGoogleSheet(updated);
    onSheetChanged(updated);
  };

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-3.5 mb-4 shadow-sm border border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                {linkedSheet
                  ? linkedSheet.spreadsheetId === DEFAULT_SPREADSHEET_ID
                    ? 'Hoja Predeterminada'
                    : 'Misma Hoja Vinculada'
                  : 'Google Sheets'}
              </span>
              {linkedSheet?.autoSync && (
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Sincronización directa activa (Sin requerir inicio de sesión)</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate mt-0.5">
              {linkedSheet ? linkedSheet.title : 'Sin hoja central vinculada todavía'}
            </p>
            <p className="text-[11px] text-slate-500">
              Los registros guardados se envían automáticamente como filas a esta misma hoja desde cualquier navegador o dispositivo.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {linkedSheet ? (
            <>
              <a
                href={linkedSheet.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 transition-colors flex items-center gap-1"
                title="Abrir hoja de cálculo en una pestaña nueva"
              >
                <span>Abrir Hoja</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Opciones de la hoja vinculada"
                aria-label="Opciones de la hoja vinculada"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenExportDialog}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm active:scale-98"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Vincular Hoja Central</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Settings */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
              <input
                type="checkbox"
                checked={linkedSheet?.autoSync ?? false}
                onChange={toggleAutoSync}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Alimentar automáticamente al presionar "Guardar"</span>
            </label>

            <button
              type="button"
              onClick={onOpenExportDialog}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              Sincronizar ahora
            </button>
          </div>

          <div className="pt-2">
            <p className="text-[11px] font-semibold text-slate-600 mb-1">
              ¿Deseas vincular otra Hoja de Google existente?
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Pega el enlace o ID de tu Google Sheet..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
              <button
                type="button"
                onClick={handleLinkExisting}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0"
              >
                Vincular
              </button>
            </div>
            {editError && <p className="text-[11px] text-red-600 mt-1">{editError}</p>}
          </div>

          {linkedSheet?.spreadsheetId !== DEFAULT_SPREADSHEET_ID && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleResetDefault}
                className="w-full py-1.5 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Restablecer a la Hoja Predeterminada del Sistema</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {showUnlinkConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-red-700 font-medium">¿Desvincular de esta hoja?</span>
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold"
                >
                  Sí, desvincular
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowUnlinkConfirm(true)}
                className="text-[11px] text-red-600 hover:text-red-700 font-semibold"
              >
                Desvincular esta hoja
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setShowUnlinkConfirm(false);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-700"
            >
              Cerrar opciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
