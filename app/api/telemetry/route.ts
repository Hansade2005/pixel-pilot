import { NextRequest, NextResponse } from 'next/server';
import { getTelemetry_logs } from '@/app/actions/telemetry';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getTelemetry_logs();
    console.log('Raw telemetry API response from Pipilot:', { data, error });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // Handle different response formats
    let records: any[] = [];
    if (Array.isArray(data)) {
      records = data;
    } else if (data && typeof data === 'object' && 'records' in data && Array.isArray((data as any).records)) {
      records = (data as any).records;
    } else if (data && typeof data === 'object') {
      records = [data]; // Single record
    }

    console.log('Processed records:', records);
    console.log('First record input_data:', records[0]?.input_data);

    return NextResponse.json({ records });
  } catch (error: any) {
    console.error('Error fetching telemetry logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch telemetry logs' },
      { status: 500 }
    );
  }
}