/**
 * API base URL, configurable via the EXPO_PUBLIC_API_URL environment variable
 * (Expo inlines EXPO_PUBLIC_* vars at build time). Defaults to the hosted KS
 * backend. Override EXPO_PUBLIC_API_URL to use a local development server.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ks-eoi4.onrender.com';
