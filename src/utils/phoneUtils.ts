export interface CountryCodeOption {
  code: string;
  country: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+1', country: 'EE.UU. / Canadá', flag: '🇺🇸' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
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
