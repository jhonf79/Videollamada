import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ExternalLink, Settings, Check, RefreshCw, Link as LinkIcon, AlertTriangle, CheckCircle2, Code } from 'lucide-react';
import {
  LinkedGoogleSheet,
  extractSpreadsheetId,
  saveLinkedGoogleSheet,
  DEFAULT_LINKED_SHEET,
  DEFAULT_SPREADSHEET_ID,
} from '../utils/storage';
import { getWebhookUrl, saveWebhookUrl, testWebhookAccessibility, DEFAULT_WEBHOOK_URL } from '../utils/googleWebhookSync';
import { AppsScriptCodeModal } from './AppsScriptCodeModal';
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
  const [webhookInput, setWebhookInput] = useState(getWebhookUrl());
  const [webhookTestStatus, setWebhookTestStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({ testing: false });
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  useEffect(() => {
    setWebhookInput(getWebhookUrl());
  }, [isEditing]);

  const handleSaveWebhook = () => {
    saveWebhookUrl(webhookInput);
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2500);
  };

  const handleTestWebhook = async () => {
    setWebhookTestStatus({ testing: true });
    const res = await testWebhookAccessibility(webhookInput);
    setWebhookTestStatus({
      testing: false,
      success: res.ok,
      message: res.message,
    });
    setTimeout(() => {
      setWebhookTestStatus((prev) => ({ ...prev, message: undefined }));
    }, 6000);
  };

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
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap justify-end">
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
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border shadow-xs ${
                  isEditing
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-300'
                }`}
                title="Configurar Webhook y opciones de Google Sheets"
                aria-label="Configurar Webhook y opciones de Google Sheets"
              >
                <Settings className={`w-3.5 h-3.5 ${isEditing ? 'text-white' : 'text-slate-600'}`} />
                <span>{isEditing ? 'Cerrar Ajustes' : 'Ajustes Webhook ⚙️'}</span>
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

          {/* Webhook Configuration */}
          <div className="pt-2.5 pb-1 px-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Configuración de Webhook (Google Apps Script)</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={webhookTestStatus.testing}
                  onClick={handleTestWebhook}
                  className="text-xs text-emerald-800 hover:text-emerald-950 bg-emerald-200/80 hover:bg-emerald-200 px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {webhookTestStatus.testing ? 'Probando...' : '🔍 Probar conexión'}
                </button>
              </div>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={handleSaveWebhook}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors"
              >
                {webhookSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardado</span>
                  </>
                ) : (
                  <span>Guardar URL</span>
                )}
              </button>
            </div>

            {webhookTestStatus.message && (
              <p
                className={`text-[11px] mt-1 flex items-center gap-1 ${
                  webhookTestStatus.success ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'
                }`}
              >
                {webhookTestStatus.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span>{webhookTestStatus.message}</span>
              </p>
            )}

            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
              ⚠️ Nota clave: En Google Apps Script la implementación debe configurarse con <strong>Quién tiene acceso: Cualquier usuario (Anyone)</strong> para que no exija inicio de sesión.
            </p>

            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="w-full mt-2.5 py-1.5 px-3 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>📋 Ver / Copiar Código para Google Apps Script</span>
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

      <AppsScriptCodeModal
        isOpen={showScriptModal}
        onClose={() => setShowScriptModal(false)}
        spreadsheetUrl={linkedSheet?.spreadsheetUrl}
      />
    </div>
  );
};
