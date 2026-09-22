import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Save,
  Trash2,
  Phone,
  User,
  Hash,
  CreditCard,
  Building2,
  Eye,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Share2,
  X,
} from 'lucide-react';
import { RecordData } from '../types';
import { exportSingleRecordToExcel } from '../utils/excelExport';
import { LinkedGoogleSheet } from '../utils/storage';
import { COUNTRY_CODES, formatPhoneWithCountryCode } from '../utils/phoneUtils';

interface RegistrationFormProps {
  record: RecordData;
  onChange: (updated: RecordData) => void;
  onSave: () => void;
  onClear: () => void;
  onOpenPreview: () => void;
  onLoadSample: () => void;
  onExportGoogleSheets: () => void;
  onExportExcel: () => void;
  linkedSheet?: LinkedGoogleSheet | null;
  isAutoSyncing?: boolean;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  record,
  onChange,
  onSave,
  onClear,
  onOpenPreview,
  onLoadSample,
  onExportGoogleSheets,
  onExportExcel,
  linkedSheet,
  isAutoSyncing = false,
}) => {
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidPhoneIndex, setInvalidPhoneIndex] = useState<number | null>(null);
  const [showMainDataErrors, setShowMainDataErrors] = useState<boolean>(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const markFieldTouched = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  // Reset errors when record is blank (e.g., on clear)
  useEffect(() => {
    if (!record.nombre && !record.apellido && !record.pin && !record.patio && !record.td) {
      setShowMainDataErrors(false);
      setTouchedFields({});
      setValidationError(null);
      setInvalidPhoneIndex(null);
    }
  }, [record]);

  const isSingleWord = (val: string) => val.trim().length > 0 && !/\s/.test(val.trim());

  const allMainDataFilled = Boolean(
    isSingleWord(record.nombre) &&
    isSingleWord(record.apellido) &&
    record.pin.trim().length === 11 &&
    record.patio?.trim() &&
    record.td.trim()
  );

  const updateField = (field: keyof RecordData, value: any) => {
    let sanitizedValue = value;
    if (field === 'td') {
      sanitizedValue = String(value || '').replace(/\D/g, '');
    } else if (field === 'pin') {
      // PIN: only numbers, limit to 11 digits
      sanitizedValue = String(value || '').replace(/\D/g, '').slice(0, 11);
    }

    onChange({
      ...record,
      [field]: sanitizedValue,
    });

    // If validation error was showing, check if all required main fields are now valid
    if (showMainDataErrors) {
      const nextNombre = field === 'nombre' ? sanitizedValue : record.nombre;
      const nextApellido = field === 'apellido' ? sanitizedValue : record.apellido;
      const nextPin = field === 'pin' ? sanitizedValue : record.pin;
      const nextPatio = field === 'patio' ? sanitizedValue : (record.patio || '');
      const nextTd = field === 'td' ? sanitizedValue : record.td;

      const hasValidNombre = isSingleWord(nextNombre);
      const hasValidApellido = isSingleWord(nextApellido);
      const hasValidPin = nextPin.trim().length === 11;
      const hasValidPatio = Boolean(nextPatio.trim());
      const hasValidTd = Boolean(nextTd.trim());

      if (hasValidNombre && hasValidApellido && hasValidPin && hasValidPatio && hasValidTd) {
        setShowMainDataErrors(false);
        setValidationError(null);
      }
    }
  };

  const updatePhoneEntry = (index: number, key: 'phone' | 'alias' | 'countryCode', value: string) => {
    let cleanedValue = value;
    const currentItem = record.celulares[index];
    const currentCode = key === 'countryCode' ? value : (currentItem?.countryCode || '+57');

    if (key === 'phone') {
      const maxLen = currentCode === '+57' ? 10 : 15;
      cleanedValue = value.replace(/\D/g, '').slice(0, maxLen);
    }
    const updated = [...record.celulares];
    updated[index] = {
      ...updated[index],
      [key]: cleanedValue,
    };
    onChange({
      ...record,
      celulares: updated,
    });

    if (key === 'phone' && invalidPhoneIndex === index) {
      const validLen = currentCode === '+57' ? 10 : (currentCode === '+595' ? 8 : 7);
      if (cleanedValue.length === 0 || cleanedValue.length >= validLen) {
        setInvalidPhoneIndex(null);
        setValidationError(null);
      }
    }
  };

  const clearPhoneEntry = (index: number) => {
    const updated = [...record.celulares];
    updated[index] = {
      ...updated[index],
      phone: '',
      alias: '',
      countryCode: '+57',
    };
    onChange({
      ...record,
      celulares: updated,
    });
    if (invalidPhoneIndex === index) {
      setInvalidPhoneIndex(null);
      setValidationError(null);
    }
  };

  const validateMainData = (): {
    isValid: boolean;
    missingFields: string[];
    error: string | null;
    firstFieldId: string | null;
  } => {
    const missing: { label: string; fieldId: string }[] = [];
    const specificErrors: string[] = [];
    let firstInvalidId: string | null = null;

    // 1. Nombre: obligatorio y un solo nombre
    const nombreTrimmed = record.nombre.trim();
    if (!nombreTrimmed) {
      missing.push({ label: 'Nombre', fieldId: 'field-nombre' });
      if (!firstInvalidId) firstInvalidId = 'field-nombre';
    } else if (/\s/.test(nombreTrimmed)) {
      specificErrors.push('En Nombre debes ingresar un solo nombre (sin espacios ni segundos nombres)');
      if (!firstInvalidId) firstInvalidId = 'field-nombre';
    }

    // 2. Apellido: obligatorio y un solo apellido
    const apellidoTrimmed = record.apellido.trim();
    if (!apellidoTrimmed) {
      missing.push({ label: 'Apellido', fieldId: 'field-apellido' });
      if (!firstInvalidId) firstInvalidId = 'field-apellido';
    } else if (/\s/.test(apellidoTrimmed)) {
      specificErrors.push('En Apellido debes ingresar un solo apellido (sin espacios ni segundos apellidos)');
      if (!firstInvalidId) firstInvalidId = 'field-apellido';
    }

    // 3. PIN: obligatorio y exactamente 11 dígitos
    const pinTrimmed = record.pin.trim();
    if (!pinTrimmed) {
      missing.push({ label: 'PIN', fieldId: 'field-pin' });
      if (!firstInvalidId) firstInvalidId = 'field-pin';
    } else if (pinTrimmed.length !== 11) {
      specificErrors.push(`El PIN debe tener exactamente 11 dígitos (actualmente tiene ${pinTrimmed.length})`);
      if (!firstInvalidId) firstInvalidId = 'field-pin';
    }

    // 4. Patio
    if (!record.patio?.trim()) {
      missing.push({ label: 'Patio', fieldId: 'field-patio' });
      if (!firstInvalidId) firstInvalidId = 'field-patio';
    }

    // 5. TD
    if (!record.td.trim()) {
      missing.push({ label: 'TD', fieldId: 'field-td' });
      if (!firstInvalidId) firstInvalidId = 'field-td';
    }

    if (missing.length > 0 || specificErrors.length > 0) {
      let errorMsg = '';
      if (missing.length > 0) {
        errorMsg += `Faltan campos obligatorios: ${missing.map((m) => m.label).join(', ')}. `;
      }
      if (specificErrors.length > 0) {
        errorMsg += specificErrors.join('. ') + '.';
      }

      return {
        isValid: false,
        missingFields: missing.map((m) => m.label),
        error: errorMsg.trim(),
        firstFieldId: firstInvalidId,
      };
    }

    return { isValid: true, missingFields: [], error: null, firstFieldId: null };
  };

  const validatePhoneNumbers = (): { isValid: boolean; error: string | null; invalidIndex?: number } => {
    for (let i = 0; i < record.celulares.length; i++) {
      const item = record.celulares[i];
      const phone = item.phone.trim();
      if (!phone) continue;

      const code = item.countryCode || '+57';
      if (code === '+57' && phone.length < 10) {
        return {
          isValid: false,
          error: `El campo "${item.label}" tiene solo ${phone.length} dígitos. Para Colombia debe tener 10 dígitos (o déjalo vacío).`,
          invalidIndex: i,
        };
      } else if (code === '+595' && phone.length < 8) {
        return {
          isValid: false,
          error: `El campo "${item.label}" para Paraguay debe tener al menos 8 o 9 dígitos.`,
          invalidIndex: i,
        };
      } else if (phone.length < 7) {
        return {
          isValid: false,
          error: `El campo "${item.label}" tiene solo ${phone.length} dígitos. Debe tener un número válido (mínimo 7 dígitos).`,
          invalidIndex: i,
        };
      }
    }
    return { isValid: true, error: null };
  };

  const runFullValidation = (): boolean => {
    const mainCheck = validateMainData();
    if (!mainCheck.isValid) {
      setShowMainDataErrors(true);
      setValidationError(mainCheck.error);
      if (mainCheck.firstFieldId) {
        const el = document.getElementById(mainCheck.firstFieldId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
      return false;
    }

    const phoneCheck = validatePhoneNumbers();
    if (!phoneCheck.isValid) {
      setValidationError(phoneCheck.error);
      setInvalidPhoneIndex(phoneCheck.invalidIndex ?? null);
      return false;
    }

    setValidationError(null);
    setInvalidPhoneIndex(null);
    setShowMainDataErrors(false);
    return true;
  };

  const handleSaveInternal = () => {
    if (!runFullValidation()) return;
    onSave();
    triggerFeedback('¡Registro guardado correctamente!');
  };

  const handleExportGoogleSheetsInternal = () => {
    if (!runFullValidation()) return;
    onExportGoogleSheets();
  };

  const handleExportExcelInternal = () => {
    if (!runFullValidation()) return;
    onExportExcel();
  };

  const triggerFeedback = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => {
      setSaveFeedback(null);
    }, 3000);
  };

  const handleShareWhatsApp = () => {
    if (!runFullValidation()) return;
    let text = `*REGISTRO DE INFORMACIÓN*\n`;
    text += `*NOMBRE:* ${record.nombre}\n`;
    text += `*APELLIDO:* ${record.apellido}\n`;
    text += `*PIN:* ${record.pin} | *PATIO:* ${record.patio} | *TD:* ${record.td}\n\n`;
    text += `*CELULARES:*\n`;
    record.celulares.forEach((c) => {
      if (c.phone || c.alias) {
        const fullPhone = c.phone ? formatPhoneWithCountryCode(c.phone, c.countryCode) : '';
        text += `• ${c.label} ${fullPhone}${c.alias ? ` - ${c.alias}` : ''}\n`;
      }
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filledCount = record.celulares.filter((c) => c.phone.trim()).length;

  const isNombreEmpty = !record.nombre.trim();
  const isNombreMultiple = !isNombreEmpty && /\s/.test(record.nombre.trim());
  const isNombreInvalid = (showMainDataErrors || touchedFields['nombre']) && (isNombreEmpty || isNombreMultiple);

  const isApellidoEmpty = !record.apellido.trim();
  const isApellidoMultiple = !isApellidoEmpty && /\s/.test(record.apellido.trim());
  const isApellidoInvalid = (showMainDataErrors || touchedFields['apellido']) && (isApellidoEmpty || isApellidoMultiple);

  const isPinEmpty = !record.pin.trim();
  const isPinLengthInvalid = !isPinEmpty && record.pin.trim().length !== 11;
  const isPinInvalid = (showMainDataErrors || touchedFields['pin']) && (isPinEmpty || isPinLengthInvalid);

  const isPatioInvalid = (showMainDataErrors || touchedFields['patio']) && !record.patio?.trim();
  const isTdInvalid = (showMainDataErrors || touchedFields['td']) && !record.td.trim();

  return (
    <div className="space-y-4 pb-24">
      {/* Save / Export Toast Feedback */}
      {saveFeedback && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-emerald-400 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-500/30 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3.5 rounded-2xl shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs sm:text-sm text-red-900 leading-snug">
                Atención con los datos ingresados
              </p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                {validationError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setValidationError(null);
              setInvalidPhoneIndex(null);
            }}
            className="p-1 rounded-lg text-red-500 hover:bg-red-100 transition-colors shrink-0"
            aria-label="Cerrar advertencia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Card 1: Main Identification (NOMBRE, APELLIDO, PIN, PATIO, TD) */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Datos Principales
            </h2>
            {allMainDataFilled ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Completados
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                * Obligatorios
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-200"
            title="Limpiar todos los campos del formulario"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Limpiar todo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* NOMBRE */}
          <div>
            <label
              htmlFor="field-nombre"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center justify-between"
            >
              <span>
                NOMBRE: <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Un solo nombre</span>
            </label>
            <div className="relative">
              <input
                id="field-nombre"
                type="text"
                placeholder="Ej: Juan"
                value={record.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
                onBlur={() => markFieldTouched('nombre')}
                className={`w-full px-3 py-2 text-sm rounded-xl font-medium transition-colors ${
                  isNombreInvalid
                    ? 'bg-red-50/50 border-2 border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900'
                    : 'bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900'
                }`}
                autoComplete="given-name"
              />
            </div>
            {isNombreInvalid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                {isNombreMultiple
                  ? 'Ingresa un solo nombre (sin espacios ni segundos nombres)'
                  : 'El Nombre es obligatorio'}
              </p>
            )}
          </div>

          {/* APELLIDO */}
          <div>
            <label
              htmlFor="field-apellido"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center justify-between"
            >
              <span>
                APELLIDO: <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Un solo apellido</span>
            </label>
            <div className="relative">
              <input
                id="field-apellido"
                type="text"
                placeholder="Ej: Rodríguez"
                value={record.apellido}
                onChange={(e) => updateField('apellido', e.target.value)}
                onBlur={() => markFieldTouched('apellido')}
                className={`w-full px-3 py-2 text-sm rounded-xl font-medium transition-colors ${
                  isApellidoInvalid
                    ? 'bg-red-50/50 border-2 border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900'
                    : 'bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900'
                }`}
                autoComplete="family-name"
              />
            </div>
            {isApellidoInvalid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                {isApellidoMultiple
                  ? 'Ingresa un solo apellido (sin espacios ni segundos apellidos)'
                  : 'El Apellido es obligatorio'}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5">
          {/* PIN */}
          <div>
            <label
              htmlFor="field-pin"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center justify-between"
            >
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                PIN: <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">{record.pin.length}/11 dígitos</span>
            </label>
            <input
              id="field-pin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={11}
              placeholder="Ej: 12345678901"
              value={record.pin}
              onChange={(e) => updateField('pin', e.target.value)}
              onBlur={() => markFieldTouched('pin')}
              className={`w-full px-3 py-2 text-sm font-mono rounded-xl transition-colors ${
                isPinInvalid
                  ? 'bg-red-50/50 border-2 border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900'
                  : 'bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900'
              }`}
            />
            {isPinInvalid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                {isPinLengthInvalid
                  ? `El PIN debe tener 11 dígitos exactos (${record.pin.length}/11)`
                  : 'El PIN es obligatorio (11 dígitos)'}
              </p>
            )}
            {!isPinInvalid && record.pin.length > 0 && record.pin.length < 11 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium flex items-center gap-1">
                <span>Faltan {11 - record.pin.length} dígitos (debe tener 11)</span>
              </p>
            )}
          </div>

          {/* PATIO */}
          <div>
            <label
              htmlFor="field-patio"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center justify-between"
            >
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                PATIO: <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Pabellón / Bloque</span>
            </label>
            <input
              id="field-patio"
              type="text"
              placeholder="Ej: Patio 1, Patio 5..."
              value={record.patio || ''}
              onChange={(e) => updateField('patio', e.target.value)}
              onBlur={() => markFieldTouched('patio')}
              className={`w-full px-3 py-2 text-sm rounded-xl transition-colors ${
                isPatioInvalid
                  ? 'bg-red-50/50 border-2 border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900'
                  : 'bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900'
              }`}
            />
            {isPatioInvalid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                El Patio es obligatorio
              </p>
            )}
          </div>

          {/* TD */}
          <div>
            <label
              htmlFor="field-td"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center justify-between"
            >
              <span className="flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                TD: <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Solo números</span>
            </label>
            <input
              id="field-td"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Ej: 1023456789"
              value={record.td}
              onChange={(e) => updateField('td', e.target.value)}
              onBlur={() => markFieldTouched('td')}
              className={`w-full px-3 py-2 text-sm font-mono rounded-xl transition-colors ${
                isTdInvalid
                  ? 'bg-red-50/50 border-2 border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900'
                  : 'bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900'
              }`}
            />
            {isTdInvalid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                El TD es obligatorio (solo números)
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Card 2: Celulares a Registrar Table (1 to 10) */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              Listado de Celulares (1 al 10)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa el número (debe tener exactamente <span className="font-semibold text-slate-700">10 dígitos</span> numéricos) y a quién corresponde
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                filledCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {filledCount} de 10 registrados
            </span>
          </div>
        </div>

        {/* Table layout matching the official format */}
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
          {/* Header Row for Tablet/Desktop */}
          <div className="hidden sm:grid grid-cols-12 bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wide border-b border-slate-300 py-2.5 px-3">
            <div className="col-span-6 flex items-center">
              <span>CÓDIGO Y CELULAR (EJ: +573180000000)</span>
            </div>
            <div className="col-span-5 flex items-center">
              <span>NOMBRE O APODO</span>
            </div>
            <div className="col-span-1 text-center flex items-center justify-center">
              <span className="sr-only">Acciones</span>
            </div>
          </div>

          {/* Rows 1 through 10 */}
          <div className="divide-y divide-slate-200">
            {record.celulares.map((entry, idx) => {
              const code = entry.countryCode || '+57';
              const isColombia = code === '+57';
              const phoneLength = entry.phone.length;
              const minLength = isColombia ? 10 : (code === '+595' ? 8 : 7);
              const maxLength = isColombia ? 10 : (code === '+595' ? 9 : 15);
              const isPartiallyFilled = phoneLength > 0 && phoneLength < minLength;
              const isComplete = phoneLength >= minLength;
              const isErrorRow = invalidPhoneIndex === idx;

              const phoneInputClasses = isErrorRow
                ? 'border-red-500 ring-2 ring-red-400 bg-red-50/50 text-slate-900 focus:outline-none focus:ring-red-500'
                : isPartiallyFilled
                ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50/20 text-slate-900 focus:outline-none focus:ring-amber-500'
                : isComplete
                ? 'border-emerald-500 ring-1 ring-emerald-400 bg-emerald-50/20 text-slate-900 font-medium focus:outline-none focus:ring-emerald-500'
                : 'border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';

              return (
                <div
                  key={entry.id}
                  id={`phone-row-${idx}`}
                  className={`p-2.5 sm:px-3 sm:py-2 transition-colors ${
                    isErrorRow
                      ? 'bg-red-50/40'
                      : entry.phone
                      ? 'bg-emerald-50/25'
                      : idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-slate-50/60'
                  }`}
                >
                  {/* Mobile View (< sm) */}
                  <div className="sm:hidden space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded">
                          {entry.label}
                        </span>
                        {isPartiallyFilled && (
                          <span className="text-[10px] font-mono font-medium text-amber-700 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            {isColombia ? `Faltan ${10 - phoneLength} (${phoneLength}/10)` : `${phoneLength} dígitos`}
                          </span>
                        )}
                        {isComplete && (
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {isColombia ? '10 dígitos' : `${phoneLength} dígitos`}
                          </span>
                        )}
                        {isErrorRow && (
                          <span className="text-[10px] font-semibold text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded">
                            ¡Incompleto!
                          </span>
                        )}
                      </div>
                      {(entry.phone || entry.alias) && (
                        <button
                          type="button"
                          onClick={() => clearPhoneEntry(idx)}
                          className="text-[11px] text-red-500 hover:text-red-700 font-medium flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Limpiar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      <div className="relative flex rounded-lg overflow-hidden">
                        <select
                          value={entry.countryCode || '+57'}
                          onChange={(e) => updatePhoneEntry(idx, 'countryCode', e.target.value)}
                          className="w-24 bg-slate-100 hover:bg-slate-200/80 border-y border-l border-r border-slate-300 text-xs font-bold text-slate-700 px-2 py-1.5 focus:outline-none cursor-pointer shrink-0 rounded-l-lg truncate"
                          title={`Código de país (${entry.countryCode || '+57'})`}
                          aria-label={`Código de país para ${entry.label}`}
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={`${c.code}-${c.country}`} value={c.code}>
                              {c.flag} {c.code} ({c.country})
                            </option>
                          ))}
                        </select>
                        <input
                          id={`phone-input-mobile-${idx}`}
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={maxLength}
                          placeholder={isColombia ? '10 dígitos (ej: 3001234567)' : 'Número de celular...'}
                          value={entry.phone}
                          onChange={(e) => updatePhoneEntry(idx, 'phone', e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-sm font-mono border-y border-r rounded-r-lg transition-colors ${phoneInputClasses}`}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Nombre o apodo..."
                          value={entry.alias}
                          onChange={(e) => updatePhoneEntry(idx, 'alias', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tablet / Desktop View (sm+) */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                    {/* Column 1: Celular Number with Country Code */}
                    <div className="col-span-6">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500 w-16 shrink-0 select-none">
                          {entry.label}
                        </span>
                        <div className="relative flex-1 flex rounded-lg shadow-xs overflow-hidden">
                          <select
                            value={entry.countryCode || '+57'}
                            onChange={(e) => updatePhoneEntry(idx, 'countryCode', e.target.value)}
                            className="w-24 sm:w-28 bg-slate-100 hover:bg-slate-200/80 border-y border-l border-r border-slate-300 text-xs font-bold text-slate-700 px-2 py-1.5 focus:outline-none cursor-pointer shrink-0 rounded-l-lg truncate"
                            title={`Código de país (${entry.countryCode || '+57'})`}
                            aria-label={`Código de país para ${entry.label}`}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={`${c.code}-${c.country}`} value={c.code}>
                                {c.flag} {c.code} ({c.country})
                              </option>
                            ))}
                          </select>
                          <div className="relative flex-1">
                            <input
                              id={`phone-input-desktop-${idx}`}
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={maxLength}
                              placeholder={isColombia ? '10 dígitos (ej: 3001234567)' : 'Número de celular...'}
                              value={entry.phone}
                              onChange={(e) => updatePhoneEntry(idx, 'phone', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm font-mono border-y border-r rounded-r-lg transition-colors pr-14 ${phoneInputClasses}`}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                              {isPartiallyFilled && (
                                <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-100/90 border border-amber-300 px-1 py-0.5 rounded">
                                  {isColombia ? `${phoneLength}/10` : `${phoneLength}d`}
                                </span>
                              )}
                              {isComplete && (
                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1 py-0.5 rounded flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  {isColombia ? '10' : `${phoneLength}`}
                                </span>
                              )}
                              {isErrorRow && (
                                <span className="text-[10px] font-bold text-red-600">
                                  !
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Nombre o Apodo */}
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Nombre o apodo..."
                        value={entry.alias}
                        onChange={(e) => updatePhoneEntry(idx, 'alias', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      />
                    </div>

                    {/* Clear Row Button */}
                    <div className="col-span-1 flex justify-center">
                      {(entry.phone || entry.alias) && (
                        <button
                          type="button"
                          onClick={() => clearPhoneEntry(idx)}
                          title="Limpiar esta fila"
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label={`Limpiar ${entry.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Helper Tools */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadSample}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Autollenar datos de prueba</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
            title="Limpiar todos los campos del formulario"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar todo</span>
          </button>
        </div>
      </section>

      {/* Floating / Sticky Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClear}
            className="p-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-semibold flex items-center justify-center transition-colors shrink-0 active:scale-95"
            title="Limpiar todo el formulario"
            aria-label="Limpiar todo el formulario"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenPreview}
            className="px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
            title="Ver formato impreso"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="hidden xs:inline">Formato</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center transition-colors shrink-0"
            title="Compartir por WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSaveInternal}
            disabled={isAutoSyncing}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-98 disabled:opacity-75"
          >
            {isAutoSyncing ? (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Guardando en Hoja...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-slate-300" />
                <span>{linkedSheet?.autoSync ? 'Guardar y Alimentar Hoja' : 'Guardar'}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={handleExportGoogleSheetsInternal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-colors active:scale-98"
              title={linkedSheet ? `Alimentar la misma hoja: ${linkedSheet.title}` : 'Alimentar Hoja de cálculo de Google'}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{linkedSheet ? 'Alimentar Hoja de Google' : 'Hojas de cálculo de Google'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcelInternal}
              className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
              title="Descargar copia offline (.xlsx)"
              aria-label="Descargar archivo Excel .xlsx"
            >
              <span className="text-[10px] font-bold">.XLSX</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
