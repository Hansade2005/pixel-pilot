// Telemetry CRUD for telemetry_log table
import { apiRequest } from '@/lib/api-client';

export async function createTelemetry_log(data: any) {
  return apiRequest('/tables/42/records', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export async function getTelemetry_logs() {
  return apiRequest('/tables/42/records', {
    method: 'GET',
  });
}

export async function getTelemetry_log(id: string) {
  return apiRequest(`/tables/42/records/${id}`, {
    method: 'GET',
  });
}

export async function updateTelemetry_log(id: string, data: any) {
  return apiRequest(`/tables/42/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

export async function deleteTelemetry_log(id: string) {
  return apiRequest(`/tables/42/records/${id}`, {
    method: 'DELETE',
  });
}
