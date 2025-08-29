import { NextResponse ,NextRequest} from 'next/server';

// GitHub OAuth App configuration - Fallback credentials
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23lihgU0dNPk4ct1Au';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'c8723d7d32704b6ab8ec235ef720ec955789fb7a';
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'https://dev.pixelways.co/api/auth/github/oauth-callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const origin = searchParams.get('origin'); // Get the origin URL for callback

  if (action === 'authorize') {
    // Redirect to GitHub OAuth authorization
    const scopes = 'repo user:email delete_repo'; // Request repo access, user email, and delete permissions
    const state = crypto.randomUUID(); // Generate random state for security

    // Store state and origin in cookies for the callback
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&state=${state}`;

    const response = NextResponse.redirect(authUrl);
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600 // 10 minutes
    });

    // Store the origin URL for callback
    if (origin) {
      response.cookies.set('github_oauth_origin', origin, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600 // 10 minutes
      });
    }

    return response;
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token exchange error:', tokenData);
      return NextResponse.json({ error: tokenData.error_description || 'Failed to exchange code for token' }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error('GitHub user fetch error:', userData);
      return NextResponse.json({ error: 'Failed to fetch user information' }, { status: 400 });
    }

    // Return success with token and user data
    return NextResponse.json({
      success: true,
      access_token: accessToken,
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
      },
    });

  } catch (error) {
    console.error('GitHub auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
