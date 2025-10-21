import { NextRequest, NextResponse } from 'next/server';
import { getTelemetry_logs } from '@/app/actions/telemetry';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getTelemetry_logs();

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ records: data });
  } catch (error: any) {
    console.error('Error fetching telemetry logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch telemetry logs' },
      { status: 500 }
    );
  }
}