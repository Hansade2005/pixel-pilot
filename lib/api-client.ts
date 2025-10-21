const API_BASE = 'https://pipilot.dev/api/v1/databases';
const DATABASE_ID = process.env.NEXT_PUBLIC_PIPILOT_DATABASE_ID!;
const API_KEY = process.env.PIPILOT_API_KEY!;

interface ApiResponse<T> {
  data: T;
  error?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}/${DATABASE_ID}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return { data: null as T, error: data.error };
  }

  return { data, error: undefined };
}
