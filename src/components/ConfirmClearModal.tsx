import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hasData: boolean;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hasData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white text-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-modal-title"
      >
        <div className="p-5 text-center space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-inner">
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 id="clear-modal-title" className="font-bold text-base text-slate-900">
              ¿Limpiar todo el formulario?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              {hasData
                ? 'Se borrarán el Nombre, Apellido, PIN, TD y todos los números de celular y apodos ingresados.'
                : 'El formulario quedará completamente en blanco y listo para un nuevo registro.'}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-left flex items-start gap-2 text-[11px] text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Esta acción restablece los campos actuales en pantalla. Los registros guardados en el historial no se afectarán.</span>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-700/20 active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sí, limpiar todo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
