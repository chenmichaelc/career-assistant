// client/src/composables/useApi.ts
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res  = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data as T;
}
