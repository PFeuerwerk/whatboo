export enum PhoneValidationSource {
  REST = 'REST',
  WHATSAPP = 'WHATSAPP',
  CUSTOMER = 'CUSTOMER',
  BUSINESS = 'BUSINESS',
}

export interface PhoneValidationResult {
  countryCode?: string;
  internationalFormat?: string;
  isValid: boolean;
  normalizedPhone?: string;
  country?: string;
  errorDetails?: {
    message: string;
    suggestion: string;
  };
  reason?: string;
}
