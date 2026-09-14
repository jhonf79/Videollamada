import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  LogOut,
  User as UserIcon,
  PlusCircle,
  Layers,
  Link2,
  ShieldAlert,
} from 'lucide-react';
import { User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { googleSignIn, googleLogout, getAccessToken } from '../utils/googleAuth';
import {
  appendRecordToLinkedGoogleSheet,
  syncAllRecordsToLinkedGoogleSheet,
  createMasterSpreadsheet,
  GoogleSheetExportResult,
} from '../utils/googleSheetsExport';
import { RecordData } from '../types';
import {
  getLinkedGoogleSheet,
  saveLinkedGoogleSheet,
  LinkedGoogleSheet,
  extractSpreadsheetId,
  DEFAULT_LINKED_SHEET,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
} from '../utils/storage';

interface GoogleExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record?: RecordData;
  records?: RecordData[];
  mode: 'single' | 'all';
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onSheetLinked?: (sheet: LinkedGoogleSheet | null) => void;
}

export const GoogleExportDialog: React.FC<GoogleExportDialogProps> = ({
  isOpen,
  onClose,
  record,
  records,
  mode,
  currentUser,
  onUserChange,
  onSheetLinked,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDomainError, setIsDomainError] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [result, setResult] = useState<GoogleSheetExportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkedSheet, setLinkedSheet] = useState<LinkedGoogleSheet | null>(() => getLinkedGoogleSheet());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const isUnauthorizedDomainError = (err: any): boolean => {
    if (!err) return false;
    const code = err.code || '';
    const msg = `${err.message || ''} ${err.toString ? err.toString() : ''}`.toLowerCase();
    return (
      code === 'auth/unauthorized-domain' ||
      msg.includes('auth/unauthorized-domain') ||
      msg.includes('dominio no autorizado') ||
      msg.includes('unauthorized domain') ||
      msg.includes('autenticación/dominio no autorizado')
    );
  };

  useEffect(() => {
    if (isOpen) {
      setLinkedSheet(getLinkedGoogleSheet());
      setError(null);
      setIsDomainError(false);
      setCopiedDomain(false);
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteExport = async (forceNewSpreadsheet = false) => {
    setError(null);
    setIsDomainError(false);
    setLoading(true);

    try {
      let token = await getAccessToken();
      let user = currentUser;

      if (!token || !user) {
        const authRes = await googleSignIn();
        token = authRes.accessToken;
        user = authRes.user;
        onUserChange(user);
      }

      let targetSpreadsheetId: string | undefined = undefined;
      if (!forceNewSpreadsheet && linkedSheet?.spreadsheetId) {
        targetSpreadsheetId = linkedSheet.spreadsheetId;
      }

      let res: GoogleSheetExportResult;
      if (mode === 'single' && record) {
        res = await appendRecordToLinkedGoogleSheet(record, token, targetSpreadsheetId);
      } else if (mode === 'all' && records) {
        res = await syncAllRecordsToLinkedGoogleSheet(records, token, targetSpreadsheetId);
      } else {
        throw new Error('No hay datos disponibles para enviar a Google Sheets.');
      }

      // Save as the linked sheet so all future records append to the SAME sheet
      const updatedLinkedSheet: LinkedGoogleSheet = {
        spreadsheetId: res.spreadsheetId,
        spreadsheetUrl: res.spreadsheetUrl,
        title: res.title,
        lastUpdated: new Date().toISOString(),
        autoSync: linkedSheet ? linkedSheet.autoSync : true,
      };

      saveLinkedGoogleSheet(updatedLinkedSheet);
      setLinkedSheet(updatedLinkedSheet);
      if (onSheetLinked) {
        onSheetLinked(updatedLinkedSheet);
      }

      setResult(res);
    } catch (err: any) {
      console.error('Error con Google Sheets:', err);
      if (err.message?.includes('token') || err.message?.includes('401') || err.message?.includes('auth')) {
        onUserChange(null);
      }
      if (isUnauthorizedDomainError(err)) {
        setIsDomainError(true);
      } else {
        setIsDomainError(false);
      }
      setError(
        err.message || 'No se pudo comunicar con Google Sheets. Verifica los permisos de tu cuenta.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLinkManual = () => {
    const id = extractSpreadsheetId(customInput);
    if (!id) {
      setError('Por favor ingresa un enlace o ID válido de Google Sheets.');
      return;
    }
    const updated: LinkedGoogleSheet = {
      spreadsheetId: id,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      title: id === DEFAULT_SPREADSHEET_ID ? DEFAULT_LINKED_SHEET.title : 'Hoja de cálculo vinculada',
      lastUpdated: new Date().toISOString(),
      autoSync: true,
    };
    saveLinkedGoogleSheet(updated);
    setLinkedSheet(updated);
    if (onSheetLinked) {
      onSheetLinked(updated);
    }
    setCustomInput('');
    setShowAdvanced(false);
  };

  const handleResetToDefault = () => {
    saveLinkedGoogleSheet(DEFAULT_LINKED_SHEET);
    setLinkedSheet(DEFAULT_LINKED_SHEET);
    if (onSheetLinked) {
      onSheetLinked(DEFAULT_LINKED_SHEET);
    }
    setShowAdvanced(false);
  };

  const handleCopyLink = () => {
    if (!result?.spreadsheetUrl) return;
    navigator.clipboard.writeText(result.spreadsheetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await googleLogout();
    onUserChange(null);
    setResult(null);
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {linkedSheet ? 'Alimentar Hoja de Cálculo' : 'Vincular Hoja de Cálculo'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Google Sheets • Base de datos continua
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Active Account Pill */}
          {currentUser && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google'}
                    className="w-6 h-6 rounded-full shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div className="truncate">
                  <p className="font-semibold text-slate-800 truncate leading-tight">
                    {currentUser.displayName || 'Usuario de Google'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate leading-tight">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] text-slate-500 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-slate-200 transition-colors flex items-center gap-1 shrink-0 ml-2"
                title="Cerrar sesión de Google"
              >
                <LogOut className="w-3 h-3" />
                <span>Salir</span>
              </button>
            </div>
          )}

          {/* Success State */}
          {result ? (
            <div className="text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {result.action === 'updated'
                    ? '¡Registro actualizado en la misma hoja!'
                    : result.action === 'created'
                    ? '¡Hoja central creada y vinculada!'
                    : '¡Registro agregado a la misma hoja!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {result.isNewSpreadsheet
                    ? 'Se creó tu Hoja Maestra central en Google Drive. Todos los siguientes registros se agregarán a este mismo archivo sin crear más hojas.'
                    : 'Los datos se incorporaron en las filas correspondientes de la hoja existente sin generar un archivo nuevo.'}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                  Misma Hoja Central en Google Drive
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate">{result.title}</p>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={result.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-colors active:scale-98"
                >
                  <span>Abrir Hoja de Cálculo</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>¡Enlace copiado al portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copiar enlace de la Hoja</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Idle State */
            <div className="space-y-3.5">
              {/* Target info */}
              {linkedSheet ? (
                <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                      <Layers className="w-4 h-4 text-emerald-700" />
                      <span>Se alimentará la misma Hoja:</span>
                    </div>
                    {linkedSheet.spreadsheetId === DEFAULT_SPREADSHEET_ID && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 text-xs truncate">
                    {linkedSheet.title}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {mode === 'single'
                      ? 'Se añadirá este registro como una nueva fila en la pestaña "Base de Datos" y sus teléfonos en "Detalle Celulares".'
                      : `Se sincronizarán los ${records?.length || 0} registros en esta misma hoja.`}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Configuración de Hoja Única
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Al confirmar, se creará tu <strong>Hoja de cálculo central</strong> en Google Drive. A partir de ese momento, cada registro que guardes continuará alimentando esa <strong>misma hoja</strong> sin crear archivos repetidos.
                  </p>
                </div>
              )}

              {isDomainError ? (
                <div className="bg-amber-50/95 border-2 border-amber-300 rounded-xl p-3.5 sm:p-4 text-xs space-y-3 animate-in fade-in duration-200 text-left">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                        Dominio no autorizado en Firebase
                      </h4>
                      <p className="text-amber-900/90 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                        Firebase bloquea el inicio de sesión desde dominios nuevos por seguridad. Para permitir que tu app en Vercel se conecte a Google Sheets, solo debes agregar este dominio a la lista autorizada en Firebase.
                      </p>
                    </div>
                  </div>

                  {/* Dominio a copiar */}
                  <div className="bg-white border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Dominio a registrar:
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 select-all break-all">
                        {typeof window !== 'undefined' && window.location.hostname
                          ? window.location.hostname
                          : 'videollamada-five.vercel.app'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const host =
                          typeof window !== 'undefined' && window.location.hostname
                            ? window.location.hostname
                            : 'videollamada-five.vercel.app';
                        navigator.clipboard.writeText(host);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2500);
                      }}
                      className="shrink-0 px-2.5 py-1.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors border border-amber-300 active:scale-95"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-700" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pasos guiados */}
                  <div className="bg-amber-100/70 rounded-lg p-2.5 text-[11px] text-slate-800 space-y-1">
                    <p className="font-bold text-amber-950">Cómo autorizarlo en 1 minuto:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-700 leading-snug">
                      <li>Abre la consola de Firebase en tu proyecto (botón abajo).</li>
                      <li>Ve a <strong>Authentication</strong> &gt; pestaña <strong>Ajustes (Settings)</strong>.</li>
                      <li>Desplázate a <strong>Dominios autorizados (Authorized domains)</strong> y haz clic en <strong>Agregar dominio</strong>.</li>
                      <li>Pega el dominio copiado y haz clic en <strong>Guardar</strong>.</li>
                    </ol>
                  </div>

                  {/* Botón directo a Firebase */}
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Ir a Ajustes de Firebase Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              ) : null}

              {/* Main Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleExecuteExport(false)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Alimentando Hoja de Cálculo...</span>
                    </>
                  ) : linkedSheet ? (
                    <>
                      <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                      <span>
                        {mode === 'single'
                          ? 'Alimentar Hoja de Cálculo Actual'
                          : `Sincronizar ${records?.length || 0} Registros en la Hoja`}
                      </span>
                    </>
                  ) : currentUser ? (
                    <>
                      <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                      <span>Crear y Vincular Hoja Central</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span>Continuar con Google y Vincular</span>
                    </>
                  )}
                </button>
              </div>

              {/* Secondary Options Toggle */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                >
                  {showAdvanced ? 'Ocultar opciones avanzadas' : 'Otras opciones (vincular existente o crear nueva)'}
                </button>
              </div>

              {/* Advanced options */}
              {showAdvanced && (
                <div className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Vincular Hoja existente (pegar enlace o ID):
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleLinkManual}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shrink-0"
                      >
                        Vincular
                      </button>
                    </div>
                  </div>

                  {linkedSheet?.spreadsheetId !== DEFAULT_SPREADSHEET_ID && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="w-full py-1.5 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Restablecer a la Hoja Predeterminada del Sistema</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleExecuteExport(true)}
                      className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Crear una Hoja de Cálculo NUEVA independiente</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
          >
            {result ? 'Listo' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
};
