const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;

export const publicApiUrl =
  typeof configuredApiUrl === 'string' && configuredApiUrl.length > 0
    ? configuredApiUrl.replace(/\/$/, '')
    : 'http://localhost:4000/api/v1';
