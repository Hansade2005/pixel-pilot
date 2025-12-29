```typescript
// PiPilot Authentication Service following the documented API
// https://pipilot.dev/api/v1/databases/{databaseId}/auth

interface PipilotUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

interface PipilotTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface PipilotAuthResponse {
  message: string;
  user: PipilotUser;
  tokens: PipilotTokens;
}

interface PipilotVerifyResponse {
  valid: boolean;
  user: PipilotUser;
  payload: {
    userId: string;
    email: string;
    databaseId: string;
    iat: number;
    exp: number;
  };
}

const API_BASE = 'https://pipilot.dev/api/v1/databases';
const DATABASE_ID = process.env.NEXT_PUBLIC_PIPILOT_DATABASE_ID || '41';
const API_KEY = process.env.PIPILOT_API_KEY || '';

if (!DATABASE_ID || !API_KEY) {
  console.warn('PiPilot API credentials not configured. Authentication will not work.');
}

class PipilotAuthService {
  private apiBase = API_BASE;
  private databaseId = DATABASE_ID;
  private apiKey = API_KEY;

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async signup(
    email: string,
    password: string,
    full_name: string,
    avatar_url?: string
  ): Promise<PipilotAuthResponse> {
    if (!this.apiKey || !this.databaseId) {
      throw new Error('PiPilot API credentials not configured');
    }

    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ 
        email, 
        password, 
        full_name,
        avatar_url
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Signup failed with status ${response.status}`);
    }

    const data = await response.json();
    this.storeTokens(data.tokens);
    return data;
  }

  async login(email: string, password: string): Promise<PipilotAuthResponse> {
    if (!this.apiKey || !this.databaseId) {
      throw new Error('PiPilot API credentials not configured');
    }

    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Login failed with status ${response.status}`);
    }

    const data = await response.json();
    this.storeTokens(data.tokens);
    return data;
  }

  async verifyToken(token: string): Promise<PipilotVerifyResponse | null> {
    if (!this.apiKey || !this.databaseId) {
      return null;
    }

    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  }

  async refreshToken(refreshToken: string): Promise<PipilotAuthResponse> {
    if (!this.apiKey || !this.databaseId) {
      throw new Error('PiPilot API credentials not configured');
    }

    const response = await fetch(`${this.apiBase}/${this.databaseId}/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Token refresh failed with status ${response.status}`);
    }

    const data = await response.json();
    this.storeTokens(data.tokens);
    return data;
  }

  async logout(): Promise<void> {
    this.clearTokens();
  }

  private storeTokens(tokens: PipilotTokens): void {
    localStorage.setItem('pipilot_access_token', tokens.access_token);
    localStorage.setItem('pipilot_refresh_token', tokens.refresh_token);
  }

  retrieveTokens(): { accessToken: string | null; refreshToken: string | null } {
    const accessToken = localStorage.getItem('pipilot_access_token');
    const refreshToken = localStorage.getItem('pipilot_refresh_token');
    return { accessToken, refreshToken };
  }

  clearTokens(): void {
    localStorage.removeItem('pipilot_access_token');
    localStorage.removeItem('pipilot_refresh_token');
  }

  async getAuthenticatedUser(): Promise<PipilotUser | null> {
    const { accessToken } = this.retrieveTokens();
    
    if (!accessToken) {
      return null;
    }

    try {
      const result = await this.verifyToken(accessToken);
      if (result && result.valid) {
        return result.user;
      } else {
        // Try to refresh the token
        const { refreshToken } = this.retrieveTokens();
        if (refreshToken) {
          try {
            const refreshedData = await this.refreshToken(refreshToken);
            return refreshedData.user;
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // If refresh fails, clear tokens
            this.clearTokens();
            return null;
          }
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      return null;
    }
  }

  // Helper method for making authenticated requests
  async makeAuthenticatedRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    let { accessToken } = this.retrieveTokens();
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(`${this.apiBase}/${this.databaseId}${endpoint}`, {
      ...options,
      headers,
    });

    // If token expired (401), try to refresh and retry
    if (response.status === 401) {
      const { refreshToken } = this.retrieveTokens();
      if (refreshToken) {
        try {
          const refreshResult = await this.refreshToken(refreshToken);
          const newAccessToken = refreshResult.tokens.access_token;
          
          // Retry original request with new token
          const retryHeaders = {
            ...options.headers,
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json',
          };

          response = await fetch(`${this.apiBase}/${this.databaseId}${endpoint}`, {
            ...options,
            headers: retryHeaders,
          });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          this.clearTokens();
          throw new Error('Authentication failed and refresh token is invalid');
        }
      } else {
        this.clearTokens();
        throw new Error('Authentication token expired and no refresh token available');
      }
    }

    return response;
  }
}

// Export singleton instance
export const pipilotAuthService = new PipilotAuthService();
export type { PipilotUser, PipilotTokens, PipilotAuthResponse, PipilotVerifyResponse }; 
```