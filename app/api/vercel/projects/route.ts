import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const teamId = searchParams.get('teamId');

  if (!token) {
    return NextResponse.json({ error: 'Vercel token is required' }, { status: 400 });
  }

  try {
    console.log('Fetching projects from Vercel API with teamId:', teamId);
    
    // Build the API URL - include teamId if provided
    let apiUrl = 'https://api.vercel.com/v9/projects';
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vercel API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Vercel API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Vercel projects response:', {
      projectCount: data.projects?.length || 0,
      pagination: data.pagination
    });

    return NextResponse.json({
      projects: data.projects || [],
      pagination: data.pagination
    });

  } catch (error) {
    console.error('Error fetching Vercel projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects from Vercel' },
      { status: 500 }
    );
  }
}