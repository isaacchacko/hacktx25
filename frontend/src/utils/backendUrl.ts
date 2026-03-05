const DEFAULT_BACKEND_URL = "http://localhost:3001";

export function getBackendBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!configuredUrl) {
    return DEFAULT_BACKEND_URL;
  }

  return configuredUrl.replace(/\/+$/, "");
}

export function getPdfProxyUrl(pdfUrl: string): string {
  return `${getBackendBaseUrl()}/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;
}
