// client/src/composables/useApi.ts

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};

  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const apiResponse = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  const data = await apiResponse.json();
  if (!apiResponse.ok) throw new Error(data.error ?? `Request failed: ${apiResponse.status}`);
  return data as T;
}
