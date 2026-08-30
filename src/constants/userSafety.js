export const USER_SAFETY_TITLE = 'Bring Your Own Key — on-device storage';

export const USER_SAFETY_SUMMARY =
  'Your health data stays on this device. API keys live in the OS encrypted keychain. Nothing is uploaded to a Galaxy Health server.';

export const USER_SAFETY_DETAILS = [
  'Galaxy Health is Bring Your Own Key (BYOK). There is no Galaxy Health backend for keys or account data.',
  'Keys never leave the device to us. Requests go only to the provider you choose (Anthropic, OpenAI, xAI, or Gemini).',
  'Secrets use iOS Keychain / Android Keystore via expo-secure-store. On web, keys stay in this browser only.',
  'Meals, sessions, check-ins, assays, and signals live in on-device SQLite (galaxyhealth.db).',
  'The local database is sandboxed on your phone; it is not uploaded. SQLite itself is not extra-encrypted by the app.',
  'AI synthesis is optional. Core logging and the cockpit work with no key at all.',
].join('\n\n');
