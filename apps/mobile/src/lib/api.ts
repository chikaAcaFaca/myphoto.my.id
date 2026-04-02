import { ApiClient } from '@myphoto/api-client';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export const apiClient = new ApiClient({
  baseUrl: API_URL,
  getToken: async () => {
    return SecureStore.getItemAsync('auth_token');
  },
});

// Direct fetch helper for endpoints not in ApiClient
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await SecureStore.getItemAsync('auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error ${response.status}`);
  }

  return response.json();
}
