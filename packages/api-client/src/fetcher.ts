import { ApiError, getApiClientConfig } from "./runtime";

/**
 * The mutator every generated operation routes through (see orval.config.cjs).
 * Handles auth, JSON vs FormData bodies, and 204/binary responses: the same
 * behaviour the hand-written `apiFetch` in each frontend used to provide.
 */
export const customFetch = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const config = getApiClientConfig();
  const doFetch = config.fetch ?? globalThis.fetch;

  const headers = new Headers(options.headers ?? {});

  for (const [key, value] of Object.entries(config.headers ?? {})) {
    if (!headers.has(key)) headers.set(key, value);
  }

  if (config.getToken) {
    const token = await config.getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Let the browser set the multipart boundary itself; only JSON is declared here.
  const body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (isFormData) {
    headers.delete("Content-Type");
  }

  const response = await doFetch(`${config.baseUrl}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    config.onUnauthorized?.();
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      await readBody(response),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await readBody(response)) as T;
};

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (response.status === 204 || contentType === "") {
    return undefined;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  // PDFs, CSV exports, wallet passes and photo downloads all land here.
  if (
    contentType.includes("application/pdf") ||
    contentType.includes("application/octet-stream") ||
    contentType.includes("application/vnd") ||
    contentType.startsWith("image/") ||
    contentType.includes("zip")
  ) {
    return response.blob();
  }

  return response.text();
}

export default customFetch;
