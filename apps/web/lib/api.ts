export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Synapse API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
