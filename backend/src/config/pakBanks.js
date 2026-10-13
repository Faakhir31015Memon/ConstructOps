// Pakistani banks accepted for subscription bank-transfer payments.
// Codes are the SBP-published IBAN bank codes where available.
export const PAK_BANKS = [
  { code: 'HABB', name: 'Habib Bank Limited (HBL)' },
  { code: 'NIBP', name: 'National Bank of Pakistan (NBP)' },
  { code: 'UNIL', name: 'United Bank Limited (UBL)' },
  { code: 'MABL', name: 'MCB Bank' },
  { code: 'Meezan Bank', name: 'Meezan Bank' },
  { code: 'ABL', name: 'Allied Bank Limited (ABL)' },
  { code: 'BAHL', name: 'Bank of Punjab (BOP)' },
  { code: 'SCBL', name: 'Standard Chartered Bank Pakistan' },
  { code: 'DFBA', name: 'DFC Bank (formerly Doha Bank Pakistan)' },
  { code: 'Faysal Bank', name: 'Faysal Bank' },
  { code: 'Summit Bank', name: 'Summit Bank' },
  { code: 'SNCB', name: 'Sindh National Bank' },
  { code: 'ZTBL', name: 'Zarai Taraqiati Bank Limited (ZTBL)' },
  { code: 'Bank of Khyber', name: 'Bank of Khyber' },
  { code: 'Albaraka', name: 'Albaraka Bank Pakistan' },
  { code: 'Bank Al-Habib', name: 'Bank Al-Habib' },
  { code: 'Citibank', name: 'Citibank N.A. Pakistan' },
  { code: 'Deutsche Bank', name: 'Deutsche Bank AG Pakistan' },
  { code: 'Emirates NBD', name: 'Emirates NBD Bank Pakistan' },
  { code: 'ASKARI Bank', name: 'Askari Bank' },
  { code: 'Soneri Bank', name: 'Soneri Bank' },
  { code: 'United Microfinance', name: 'United Microfinance Bank (UMBL)' },
  { code: 'Khushhali MFB', name: 'Khushhali Microfinance Bank' },
  { code: 'Mobilink MFB', name: 'Mobilink Microfinance Bank' },
  { code: 'JazzCash', name: 'JazzCash (wallet transfer)' },
  { code: 'Easypaisa', name: 'Easypaisa (wallet transfer)' },
];

const BANK_LOOKUP = new Map(PAK_BANKS.map((b) => [b.name.toLowerCase(), b]));

export const findPakBank = (name) => BANK_LOOKUP.get(String(name || '').trim().toLowerCase());

export const isPakBank = (name) => Boolean(findPakBank(name));

export const normalizeIBAN = (raw) => String(raw || '').toUpperCase().replace(/\s+/g, '');

// Pakistani IBANs are exactly 24 chars: PK + 2 check digits + 4-char SBP bank code + 16-char account reference.
export const isValidPakIBAN = (iban) => /^PK\d{2}[A-Z]{4}\d{16}$/.test(normalizeIBAN(iban));

export const normalizeAccountNumber = (raw) => String(raw || '').replace(/[\s-]/g, '');

// Validates the payer's bank information for a manual transfer.
// Rule: bank + account title required, and at least one of account number / valid PK IBAN.
export const validateBankInfo = ({ bankName, accountTitle, accountNumber, iban }) => {
  const bank = findPakBank(bankName);
  if (!bank) {
    return { ok: false, error: 'Please select a valid Pakistani bank from the list.' };
  }
  const title = String(accountTitle || '').trim();
  if (title.length < 3) {
    return { ok: false, error: 'Account title (holder name) is required.' };
  }
  const acc = normalizeAccountNumber(accountNumber);
  const cleanIban = normalizeIBAN(iban);
  if (!acc && !cleanIban) {
    return { ok: false, error: 'Provide at least one: account number or IBAN.' };
  }
  if (acc && !/^\d{6,20}$/.test(acc)) {
    return { ok: false, error: 'Account number must be 6-20 digits.' };
  }
  if (cleanIban && !isValidPakIBAN(cleanIban)) {
    return { ok: false, error: 'IBAN must be a valid 24-character Pakistani IBAN (e.g. PK36SCBL0000001123456702).' };
  }
  return {
    ok: true,
    value: {
      bankName: bank.name,
      bankCode: bank.code,
      accountTitle: title,
      accountNumber: acc || null,
      iban: cleanIban || null,
    },
  };
};
