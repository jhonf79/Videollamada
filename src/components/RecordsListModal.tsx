import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit3,
  Search,
  Calendar,
  Phone,
  User,
  Hash,
} from 'lucide-react';
import { RecordData } from '../types';
import { exportSingleRecordToExcel, exportAllRecordsToExcel } from '../utils/excelExport';
import { formatPhoneWithCountryCode } from '../utils/phoneUtils';

interface RecordsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: RecordData[];
  onSelectRecord: (record: RecordData) => void;
  onDeleteRecord: (id: string) => void;
  onExportGoogleSheetsSingle?: (record: RecordData) => void;
  onExportGoogleSheetsAll?: () => void;
}

export const RecordsListModal: React.FC<RecordsListModalProps> = ({
  isOpen,
  onClose,
  records,
  onSelectRecord,
  onDeleteRecord,
  onExportGoogleSheetsSingle,
  onExportGoogleSheetsAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    const fullName = `${r.nombre} ${r.apellido}`.toLowerCase();
    const pinMatch = (r.pin || '').toLowerCase().includes(term);
    const tdMatch = (r.td || '').toLowerCase().includes(term);
    const phoneMatch = r.celulares.some(
      (c) => c.phone.includes(term) || c.alias.toLowerCase().includes(term)
    );
    return fullName.includes(term) || pinMatch || tdMatch || phoneMatch;
  });

  const handleExportAll = () => {
    if (records.length === 0) return;
    exportAllRecordsToExcel(records);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold leading-none">Registros Almacenados</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {records.length} {records.length === 1 ? 'formulario guardado' : 'formularios guardados'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar registros"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Bulk Actions */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, celular, PIN o TD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {records.length > 0 && (
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (onExportGoogleSheetsAll) {
                    onExportGoogleSheetsAll();
                    onClose();
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
                title="Sincronizar todos los registros en la Hoja de cálculo de Google"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Sincronizar con Hoja de Google</span>
              </button>

              <button
                type="button"
                onClick={handleExportAll}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                title="Descargar copia offline de todos (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[11px]">.XLSX</span>
              </button>
            </div>
          )}
        </div>

        {/* Records List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <User className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-medium text-slate-600">
                {searchTerm ? 'No se encontraron resultados' : 'No hay registros guardados aún'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {searchTerm
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Diligencia el formulario y presiona "Guardar Registro" para tener tu historial disponible.'}
              </p>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const activePhones = rec.celulares.filter((c) => c.phone.trim()).length;
              return (
                <div
                  key={rec.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-slate-900 truncate">
                        {rec.nombre || rec.apellido
                          ? `${rec.nombre} ${rec.apellido}`.trim()
                          : '(Sin nombre)'}
                      </h3>
                      {rec.td && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          TD: {rec.td}
                        </span>
                      )}
                      {rec.pin && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                          <Hash className="w-3 h-3" /> {rec.pin}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-emerald-600">
                        <Phone className="w-3 h-3" />
                        {activePhones} {activePhones === 1 ? 'celular' : 'celulares'}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(rec.createdAt).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Preview first 2 registered numbers */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rec.celulares
                        .filter((c) => c.phone)
                        .slice(0, 3)
                        .map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center text-[10px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                          >
                            <span className="font-semibold text-slate-500 mr-1">{c.label}</span>
                            <span className="font-mono">{formatPhoneWithCountryCode(c.phone, c.countryCode)}</span>
                            {c.alias && (
                              <span className="text-slate-400 ml-1 italic">({c.alias})</span>
                            )}
                          </span>
                        ))}
                      {activePhones > 3 && (
                        <span className="text-[10px] text-slate-400 px-1 py-0.5">
                          +{activePhones - 3} más
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (onExportGoogleSheetsSingle) {
                          onExportGoogleSheetsSingle(rec);
                          onClose();
                        }
                      }}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                      title="Alimentar o actualizar en la Hoja de cálculo de Google"
                      aria-label="Alimentar o actualizar en la Hoja de cálculo de Google"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => exportSingleRecordToExcel(rec)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
                      title="Descargar copia local .xlsx"
                      aria-label="Descargar copia local .xlsx"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectRecord(rec);
                        onClose();
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                      title="Editar o cargar en formulario"
                      aria-label="Editar registro"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {confirmDeleteId === rec.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteRecord(rec.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 text-[11px] rounded-lg"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(rec.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar registro"
                        aria-label="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
