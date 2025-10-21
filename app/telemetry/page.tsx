"use client";
import { useState, useEffect } from "react";

export default function TelemetryLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch('/api/telemetry');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch telemetry logs');
        }

        setLogs(data.records || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  if (loading) return <div className="p-8 text-lg">Loading telemetry logs...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Telemetry Log</h1>
      {logs.length === 0 ? (
        <div>No logs found.</div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="border rounded p-4 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <strong>Request ID:</strong><br />
                  <span className="text-xs font-mono">{log.request_id}</span>
                </div>
                <div>
                  <strong>Status:</strong><br />
                  <span className={`px-2 py-1 rounded text-xs ${
                    log.status === 'success' ? 'bg-green-100 text-green-800' :
                    log.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <div>
                  <strong>Response Time:</strong><br />
                  <span className="text-sm">{log.response_time_ms ? `${log.response_time_ms}ms` : 'N/A'}</span>
                </div>
                <div>
                  <strong>Created:</strong><br />
                  <span className="text-xs">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              </div>
              
              {log.error_message && (
                <div className="mb-4">
                  <strong>Error:</strong><br />
                  <span className="text-red-600 text-sm">{log.error_message}</span>
                </div>
              )}
              
              <div className="mb-4">
                <strong>Input Data:</strong><br />
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(log.input_data, null, 2)}
                </pre>
              </div>
              
              {log.metadata && (
                <div>
                  <strong>Metadata:</strong><br />
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-20 overflow-y-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
