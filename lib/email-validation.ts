/**
 * Email validation utilities using UserCheck API
 * Prevents fake email signups by checking disposable and invalid emails
 */

interface UserCheckResponse {
  status: number;
  email: string;
  domain: string;
  mx: boolean;
  mx_records: string[];
  disposable: boolean;
  public_domain: boolean;
  relay_domain: boolean;
  alias: boolean;
  role_account: boolean;
  did_you_mean: string | null;
}

/**
 * Validate email using UserCheck API
 * @param email - The email address to validate
 * @returns Promise<UserCheckResponse>
 */
export async function validateEmail(email: string): Promise<UserCheckResponse> {
  const response = await fetch(`https://api.usercheck.com/email/${encodeURIComponent(email)}`);

  if (!response.ok) {
    throw new Error(`Email validation failed: ${response.statusText}`);
  }

  const data: UserCheckResponse = await response.json();
  return data;
}

/**
 * Check if email is valid for signup
 * Blocks disposable emails and emails without MX records
 * @param email - The email address to check
 * @returns Promise<{valid: boolean, reason?: string}>
 */
export async function isEmailValidForSignup(email: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const validation = await validateEmail(email);

    if (validation.disposable) {
      return { valid: false, reason: "Disposable email addresses are not allowed" };
    }

    if (!validation.mx) {
      return { valid: false, reason: "Invalid email domain - no mail server found" };
    }

    // Optionally block role accounts like admin@, support@, etc.
    if (validation.role_account) {
      return { valid: false, reason: "Role-based email addresses are not allowed for signup" };
    }

    return { valid: true };
  } catch (error) {
    // If API fails, allow signup but log the error
    console.error("Email validation error:", error);
    return { valid: true, reason: "Email validation service temporarily unavailable" };
  }
}