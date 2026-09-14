import React, { useState, useEffect } from 'react';
import { RecordData, createEmptyRecord } from './types';
import { MobileHeader } from './components/MobileHeader';
import { RegistrationForm } from './components/RegistrationForm';
import { TemplatePreviewModal } from './components/TemplatePreviewModal';
import { RecordsListModal } from './components/RecordsListModal';
import { GoogleExportDialog } from './components/GoogleExportDialog';
import { LinkedSheetBanner } from './components/LinkedSheetBanner';
import { ConfirmClearModal } from './components/ConfirmClearModal';
import {
  getSavedRecords,
  saveRecord,
  deleteRecord,
  loadDraft,
  saveDraft,
  clearDraft,
  createSampleRecord,
  getLinkedGoogleSheet,
  saveLinkedGoogleSheet,
  LinkedGoogleSheet,
} from './utils/storage';
import { FileSpreadsheet, ExternalLink, CheckCircle2 } from 'lucide-react';
import { exportSingleRecordToExcel } from './utils/excelExport';
import { initAuth, getCurrentUser, getAccessToken } from './utils/googleAuth';
import { appendRecordToLinkedGoogleSheet } from './utils/googleSheetsExport';
import { syncRecordViaWebhook } from './utils/googleWebhookSync';
import { User } from 'firebase/auth';

export default function App() {
  const [currentRecord, setCurrentRecord] = useState<RecordData>(() => loadDraft());
  const [records, setRecords] = useState<RecordData[]>(() => getSavedRecords());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);

  // Linked Google Sheet state (to feed the SAME spreadsheet continuously)
  const [linkedSheet, setLinkedSheet] = useState<LinkedGoogleSheet | null>(() => getLinkedGoogleSheet());
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; url?: string } | null>(null);

  // Google Sheets Export Dialog State
  const [isGoogleExportOpen, setIsGoogleExportOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [googleExportMode, setGoogleExportMode] = useState<'single' | 'all'>('single');
  const [exportTargetRecord, setExportTargetRecord] = useState<RecordData | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());

  // Check if current form contains data
  const formHasData = Boolean(
    currentRecord.nombre.trim() ||
    currentRecord.apellido.trim() ||
    currentRecord.pin.trim() ||
    currentRecord.patio?.trim() ||
    currentRecord.td.trim() ||
    currentRecord.celulares.some((c) => c.phone.trim() || c.alias.trim())
  );

  // Listen to Google Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Auto-save draft on changes
  useEffect(() => {
    saveDraft(currentRecord);
  }, [currentRecord]);

  const handleRecordChange = (updated: RecordData) => {
    setCurrentRecord(updated);
  };

  const handleSaveCurrent = async () => {
    const updatedRecords = saveRecord(currentRecord);
    setRecords(updatedRecords);

    // If a Google Sheet is linked and auto-sync is enabled:
    if (linkedSheet && linkedSheet.autoSync) {
      try {
        setIsAutoSyncing(true);

        // 1. Direct Webhook sync (No OAuth, no 403 error, works across any browser/device immediately)
        const webhookPromise = syncRecordViaWebhook(currentRecord);

        // 2. Also try Google Sheets REST API if a token happens to be available in this browser
        const token = await getAccessToken();
        if (token) {
          try {
            const res = await appendRecordToLinkedGoogleSheet(currentRecord, token, linkedSheet.spreadsheetId);
            const updated: LinkedGoogleSheet = {
              ...linkedSheet,
              title: res.title,
              spreadsheetUrl: res.spreadsheetUrl,
              lastUpdated: new Date().toISOString(),
            };
            saveLinkedGoogleSheet(updated);
            setLinkedSheet(updated);
          } catch (e) {
            console.warn('REST API sync fallback, relying on Webhook:', e);
          }
        }

        await webhookPromise;

        const updatedSheet: LinkedGoogleSheet = {
          ...linkedSheet,
          lastUpdated: new Date().toISOString(),
        };
        saveLinkedGoogleSheet(updatedSheet);
        setLinkedSheet(updatedSheet);

        setSyncToast({
          message: '¡Registro guardado y sincronizado en tu Hoja de Google!',
          url: linkedSheet.spreadsheetUrl,
        });
        setTimeout(() => setSyncToast(null), 5000);
      } catch (err: any) {
        console.warn('Auto-sync a Google Sheets:', err);
        setSyncToast({
          message: 'Registro guardado localmente (no se pudo enviar a la hoja).',
        });
        setTimeout(() => setSyncToast(null), 5000);
      } finally {
        setIsAutoSyncing(false);
      }
    }
  };

  const handleExecuteClear = () => {
    const fresh = createEmptyRecord();
    setCurrentRecord(fresh);
    clearDraft();
    setSyncToast({
      message: '✓ Formulario limpiado por completo.',
    });
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleNewRecord = () => {
    if (formHasData) {
      setIsClearModalOpen(true);
    } else {
      const fresh = createEmptyRecord();
      setCurrentRecord(fresh);
      clearDraft();
      setSyncToast({ message: 'Nuevo formulario listo.' });
      setTimeout(() => setSyncToast(null), 2500);
    }
  };

  const handleClearCurrent = () => {
    if (formHasData) {
      setIsClearModalOpen(true);
    } else {
      setSyncToast({ message: 'El formulario ya se encuentra en blanco.' });
      setTimeout(() => setSyncToast(null), 2500);
    }
  };

  const handleSelectRecordFromList = (selected: RecordData) => {
    setCurrentRecord(selected);
  };

  const handleDeleteRecord = (id: string) => {
    const remaining = deleteRecord(id);
    setRecords(remaining);
  };

  const handleLoadSample = () => {
    const sample = createSampleRecord();
    setCurrentRecord(sample);
  };

  // Google Sheets Export triggers
  const handleOpenGoogleExportCurrent = () => {
    setExportTargetRecord(currentRecord);
    setGoogleExportMode('single');
    setIsGoogleExportOpen(true);
  };

  const handleOpenGoogleExportSingle = (record: RecordData) => {
    setExportTargetRecord(record);
    setGoogleExportMode('single');
    setIsGoogleExportOpen(true);
  };

  const handleOpenGoogleExportAll = () => {
    setGoogleExportMode('all');
    setIsGoogleExportOpen(true);
  };

  const handleOfflineExcelExport = () => {
    exportSingleRecordToExcel(currentRecord);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Mobile App Header */}
      <MobileHeader
        recordsCount={records.length}
        onOpenRecords={() => setIsRecordsModalOpen(true)}
        onNewRecord={handleNewRecord}
        onClear={handleClearCurrent}
        onOpenPreview={() => setIsPreviewOpen(true)}
        onLoadSample={handleLoadSample}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 pt-3 sm:pt-5">
        {/* Banner / Guide info */}
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl mb-3 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Formulario de Recopilación de Celulares
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                Diligencia los Datos Principales (Nombre, Apellido, PIN, Patio, TD) y hasta 10 celulares con su respectivo apodo. Al guardar, se alimenta <strong className="text-emerald-300 font-semibold">la misma Hoja de cálculo de Google</strong> sin generar archivos duplicados.
              </p>
            </div>
          </div>
        </div>

        {/* Linked Google Sheet Status Banner */}
        <LinkedSheetBanner
          linkedSheet={linkedSheet}
          currentUser={currentUser}
          onOpenExportDialog={handleOpenGoogleExportCurrent}
          onSheetChanged={(sheet) => setLinkedSheet(sheet)}
        />

        {/* Toast feedback when record is added to the Google Sheet */}
        {syncToast && (
          <div className="bg-emerald-950 text-white p-3 sm:p-3.5 rounded-2xl mb-3 shadow-lg border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold truncate text-emerald-100">
                {syncToast.message}
              </p>
            </div>
            {syncToast.url && (
              <a
                href={syncToast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>Ver Hoja</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* The Form */}
        <RegistrationForm
          record={currentRecord}
          onChange={handleRecordChange}
          onSave={handleSaveCurrent}
          onClear={handleClearCurrent}
          onOpenPreview={() => setIsPreviewOpen(true)}
          onLoadSample={handleLoadSample}
          onExportGoogleSheets={handleOpenGoogleExportCurrent}
          onExportExcel={handleOfflineExcelExport}
          linkedSheet={linkedSheet}
          isAutoSyncing={isAutoSyncing}
        />
      </main>

      {/* Preview Modal matching the uploaded paper/image template */}
      <TemplatePreviewModal
        record={currentRecord}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExportGoogleSheets={handleOpenGoogleExportCurrent}
      />

      {/* Saved Records Modal */}
      <RecordsListModal
        isOpen={isRecordsModalOpen}
        onClose={() => setIsRecordsModalOpen(false)}
        records={records}
        onSelectRecord={handleSelectRecordFromList}
        onDeleteRecord={handleDeleteRecord}
        onExportGoogleSheetsSingle={handleOpenGoogleExportSingle}
        onExportGoogleSheetsAll={handleOpenGoogleExportAll}
      />

      {/* Google Sheets Export / Link Modal */}
      <GoogleExportDialog
        isOpen={isGoogleExportOpen}
        onClose={() => setIsGoogleExportOpen(false)}
        record={exportTargetRecord || currentRecord}
        records={records}
        mode={googleExportMode}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        onSheetLinked={(sheet) => setLinkedSheet(sheet)}
      />

      {/* Confirm Clear Modal */}
      <ConfirmClearModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleExecuteClear}
        hasData={formHasData}
      />
    </div>
  );
}
