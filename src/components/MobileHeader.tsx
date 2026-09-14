import React from 'react';
import { FileSpreadsheet, PlusCircle, FolderOpen, Eye, Sparkles, Trash2 } from 'lucide-react';

interface MobileHeaderProps {
  recordsCount: number;
  onOpenRecords: () => void;
  onNewRecord: () => void;
  onClear: () => void;
  onOpenPreview: () => void;
  onLoadSample: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  recordsCount,
  onOpenRecords,
  onNewRecord,
  onClear,
  onOpenPreview,
  onLoadSample,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-3 sm:px-4 py-3 shadow-md">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/40 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm sm:text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              Registro de Celulares
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400">Captura &amp; Hojas de cálculo de Google</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onLoadSample}
            title="Cargar ejemplo para probar"
            className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ejemplo</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            title="Limpiar todo el formulario"
            className="flex items-center gap-1 text-xs font-medium px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 transition-colors border border-slate-700 hover:border-red-800 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden xs:inline">Limpiar todo</span>
          </button>

          <button
            type="button"
            onClick={onOpenPreview}
            title="Ver formato oficial del formulario"
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 active:scale-95"
            aria-label="Vista previa del formato"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenRecords}
            className="relative flex items-center gap-1 text-xs font-medium px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 active:scale-95"
            title="Ver registros guardados"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Guardados</span>
            {recordsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                {recordsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onNewRecord}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm active:scale-95"
            title="Crear nuevo formulario"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden xs:inline">Nuevo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
