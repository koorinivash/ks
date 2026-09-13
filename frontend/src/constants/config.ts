/**
 * API base URL, configurable via the EXPO_PUBLIC_API_URL environment variable
 * (Expo inlines EXPO_PUBLIC_* vars at build time). Falls back to localhost for
 * local development. Set EXPO_PUBLIC_API_URL to your deployed Render URL for
 * production builds.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
