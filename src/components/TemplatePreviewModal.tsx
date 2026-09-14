import React from 'react';
import { X, Download, Copy, Check, FileSpreadsheet, Table2, LayoutTemplate } from 'lucide-react';
import { RecordData } from '../types';
import { exportSingleRecordToExcel } from '../utils/excelExport';
import { getPrimerNombrePrimerApellido } from '../utils/googleSheetsExport';
import { formatPhoneWithCountryCode } from '../utils/phoneUtils';

interface TemplatePreviewModalProps {
  record: RecordData;
  isOpen: boolean;
  onClose: () => void;
  onExportGoogleSheets?: () => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  record,
  isOpen,
  onClose,
  onExportGoogleSheets,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'form' | 'detail'>('detail');

  if (!isOpen) return null;

  const nombreApellidoPpl = getPrimerNombrePrimerApellido(record.nombre, record.apellido);
  const activePhones = record.celulares.filter((c) => c.phone.trim() || c.alias.trim());

  const handleExportExcel = () => {
    exportSingleRecordToExcel(record);
  };

  const handleCopyText = () => {
    let summary = `NOMBRE: ${record.nombre || '-'}\n`;
    summary += `APELLIDO: ${record.apellido || '-'}\n`;
    summary += `PIN: ${record.pin || '-'} | PATIO: ${record.patio || '-'} | TD: ${record.td || '-'}\n`;
    summary += `--- CELULARES REGISTRADOS ---\n`;
    record.celulares.forEach((c) => {
      if (c.phone || c.alias) {
        const fullPhone = c.phone ? formatPhoneWithCountryCode(c.phone, c.countryCode) : '(sin número)';
        summary += `${c.label} ${fullPhone} - ${c.alias || '(sin apodo)'}\n`;
      }
    });

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold leading-none">Vista Previa de Exportación</h2>
              <p className="text-xs text-slate-400 mt-0.5">Estructura organizada para Google Sheets y Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar vista previa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Form format and Detalle Celulares Table */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'detail'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Hoja "Detalle Celulares"</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'form'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Formato Oficial</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[65vh] bg-slate-50">
          {activeTab === 'detail' ? (
            <div>
              <div className="mb-2.5 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  Estructura de la pestaña <span className="text-emerald-700 font-bold">"Detalle Celulares"</span>:
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {activePhones.length} {activePhones.length === 1 ? 'fila' : 'filas'}
                </span>
              </div>

              {/* Table exactly as in user image */}
              <div className="border border-slate-300 rounded-lg overflow-x-auto shadow-sm bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-300">
                      <th className="py-2.5 px-3 border-r border-slate-700 whitespace-nowrap">
                        Celular
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-700 whitespace-nowrap">
                        Apodo o nombre de persona a llamar
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-700 whitespace-nowrap">
                        Nombre del ppl
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-700 whitespace-nowrap">
                        Pin
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-700 whitespace-nowrap">
                        Patio
                      </th>
                      <th className="py-2.5 px-3 whitespace-nowrap">
                        TD
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePhones.length > 0 ? (
                      activePhones.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="py-2 px-3 border-t border-r border-slate-200 font-mono text-emerald-800 font-semibold whitespace-nowrap">
                            {c.phone ? formatPhoneWithCountryCode(c.phone, c.countryCode) : <span className="text-slate-300 italic">--</span>}
                          </td>
                          <td className="py-2 px-3 border-t border-r border-slate-200 text-slate-800">
                            {c.alias || <span className="text-slate-300 italic">--</span>}
                          </td>
                          <td className="py-2 px-3 border-t border-r border-slate-200 text-slate-800 whitespace-nowrap">
                            {nombreApellidoPpl || <span className="text-slate-300 italic">--</span>}
                          </td>
                          <td className="py-2 px-3 border-t border-r border-slate-200 font-mono text-slate-700">
                            {record.pin || <span className="text-slate-300 italic">--</span>}
                          </td>
                          <td className="py-2 px-3 border-t border-r border-slate-200 text-slate-700 whitespace-nowrap">
                            {record.patio || <span className="text-slate-300 italic">--</span>}
                          </td>
                          <td className="py-2 px-3 border-t border-slate-200 font-mono text-slate-700">
                            {record.td || <span className="text-slate-300 italic">--</span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          Aún no has ingresado números de celular en el formulario.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                * Cada número registrado se añade automáticamente con el apodo del celular, el 1er nombre y 1er apellido principal ({nombreApellidoPpl || '---'}), PIN, Patio y TD.
              </p>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-900 shadow-sm mx-auto select-text font-sans">
              {/* Row 1: NOMBRE */}
              <div className="grid grid-cols-2 border-b-2 border-slate-900 min-h-[48px]">
                <div className="p-2 font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center border-r-2 border-slate-900 bg-slate-100/50">
                  NOMBRE:
                </div>
                <div className="p-2 text-xs sm:text-sm font-medium flex items-center text-slate-800 break-words">
                  {record.nombre || <span className="text-slate-300 italic">Vacío</span>}
                </div>
              </div>

              {/* Row 2: APELLIDO */}
              <div className="grid grid-cols-2 border-b-2 border-slate-900 min-h-[48px]">
                <div className="p-2 font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center border-r-2 border-slate-900 bg-slate-100/50">
                  APELLIDO:
                </div>
                <div className="p-2 text-xs sm:text-sm font-medium flex items-center text-slate-800 break-words">
                  {record.apellido || <span className="text-slate-300 italic">Vacío</span>}
                </div>
              </div>

              {/* Row 3: PIN, PATIO & TD */}
              <div className="grid grid-cols-3 border-b-2 border-slate-900 min-h-[44px]">
                <div className="p-2 font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center border-r-2 border-slate-900 bg-slate-100/50">
                  <span>PIN:</span>
                  <span className="ml-2 font-normal text-slate-800 font-mono">
                    {record.pin || <span className="text-slate-300 italic">--</span>}
                  </span>
                </div>
                <div className="p-2 font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center border-r-2 border-slate-900 bg-slate-100/50">
                  <span>PATIO:</span>
                  <span className="ml-2 font-normal text-slate-800 font-medium">
                    {record.patio || <span className="text-slate-300 italic">--</span>}
                  </span>
                </div>
                <div className="p-2 font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center bg-slate-100/50">
                  <span>TD:</span>
                  <span className="ml-2 font-normal text-slate-800 font-mono">
                    {record.td || <span className="text-slate-300 italic">--</span>}
                  </span>
                </div>
              </div>

              {/* Row 4: Column Headers */}
              <div className="grid grid-cols-2 border-b-2 border-slate-900 bg-slate-200/80">
                <div className="p-2 font-black text-xs sm:text-sm uppercase tracking-wider border-r-2 border-slate-900 text-center">
                  CELULAR A REGISTRAR
                </div>
                <div className="p-2 font-black text-xs sm:text-sm uppercase tracking-wider text-center">
                  NOMBRE O APODO
                </div>
              </div>

              {/* Phone Rows (1 to 10) */}
              {record.celulares.map((item, idx) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-2 min-h-[36px] ${
                    idx < record.celulares.length - 1 ? 'border-b border-slate-900' : ''
                  }`}
                >
                  <div className="p-1.5 px-2.5 text-xs font-semibold flex items-center justify-between border-r-2 border-slate-900">
                    <span className="text-slate-900 whitespace-nowrap">{item.label}</span>
                    <span className="font-mono text-emerald-700 font-medium ml-2 select-all">
                      {item.phone ? formatPhoneWithCountryCode(item.phone, item.countryCode) : <span className="text-slate-300 font-normal">--</span>}
                    </span>
                  </div>
                  <div className="p-1.5 px-2.5 text-xs text-slate-800 flex items-center break-words">
                    {item.alias || <span className="text-slate-300 italic">--</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 border border-slate-300"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copiado al portapapeles</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Resumen</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="p-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors flex items-center justify-center gap-1"
              title="Descargar copia .xlsx"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px]">.XLSX</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onExportGoogleSheets) {
                  onExportGoogleSheets();
                  onClose();
                }
              }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Alimentar Hoja de Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
