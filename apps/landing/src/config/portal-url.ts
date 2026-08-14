const hostedPortalUrl = 'https://attendity-portal.vercel.app/login';
const configuredPortalUrl: unknown = import.meta.env.VITE_PORTAL_URL;

export const portalUrl =
  typeof configuredPortalUrl === 'string' && configuredPortalUrl.trim().length > 0
    ? configuredPortalUrl.trim()
    : hostedPortalUrl;
