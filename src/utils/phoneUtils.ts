export interface CountryCodeOption {
  code: string;
  country: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+7', country: 'Rusia / Kazajistán', flag: '🇷🇺' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+1', country: 'EE.UU. / Canadá', flag: '🇺🇸' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+1809', country: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japón', flag: '🇯🇵' },
  { code: '+380', country: 'Ucrania', flag: '🇺🇦' },
];

export const DEFAULT_COUNTRY_CODE = '+57';

/**
 * Formats a phone number including the country code concatenated directly.
 * Example requested by user: phone = "3180000000", countryCode = "+57" -> "+573180000000"
 * If withSpace is passed as true, returns "+57 3180000000"
 */
export function formatPhoneWithCountryCode(
  phone?: string,
  countryCode?: string,
  withSpace: boolean = false
): string {
  const cleanPhone = (phone || '').replace(/\s+/g, '').trim();
  if (!cleanPhone) return '';
  const code = (countryCode || DEFAULT_COUNTRY_CODE).replace(/\s+/g, '').trim();

  // If the phone already starts with '+', don't prepend country code again
  if (cleanPhone.startsWith('+')) {
    return cleanPhone;
  }

  return withSpace ? `${code} ${cleanPhone}` : `${code}${cleanPhone}`;
}
