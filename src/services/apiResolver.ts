/**
 * Resolves the backend API base URL from the environment.
 * 
 * The EXPO_PUBLIC_API_URL environment variable is the single source of truth.
 * All connections must use HTTPS for production security.
 */
export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!envUrl) {
    throw new Error(
      "Missing API configuration. Please set the EXPO_PUBLIC_API_URL environment variable in your environment."
    );
  }

  const resolvedUrl = ensureApiSuffix(envUrl);

  // Enforce HTTPS protocol in production/staging (non-development) builds
  if (!__DEV__ && !resolvedUrl.startsWith("https://")) {
    throw new Error(
      `Insecure API URL: "${resolvedUrl}". In production and release environments, the FinSight mobile application must connect to the deployed backend securely via HTTPS.`
    );
  }

  return resolvedUrl;
}

function ensureApiSuffix(url: string): string {
  // Remove trailing slash
  url = url.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    return `${url}/api`;
  }
  return url;
}

