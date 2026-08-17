import AsyncStorage from "@react-native-async-storage/async-storage";
import { confirmResetPassword, confirmSignUp, fetchAuthSession, resendSignUpCode, resetPassword, signIn, signOut, signUp } from "aws-amplify/auth";

const STORAGE_KEY = "authToken";
const ACCESS_TOKEN_STORAGE_KEY = "authAccessToken";
const REFRESH_TOKEN_STORAGE_KEY = "authRefreshToken";

interface LoginPayload {
  email: string;
  password: string;
  expoToken?: string;
}

interface SignupPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface ConfirmSignupPayload {
  email: string;
  code: string;
}

interface ConfirmPasswordResetPayload {
  email: string;
  code: string;
  newPassword: string;
}

export class UserAPI {
  private static isConfigured = false;

  private static buildErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const details: Record<string, unknown> = {
        name: error.name,
        message: error.message,
      };

      const authError = error as Error & {
        recoverySuggestion?: string;
        underlyingError?: unknown;
      };

      if (authError.recoverySuggestion) {
        details.recoverySuggestion = authError.recoverySuggestion;
      }

      if (authError.underlyingError) {
        details.underlyingError = authError.underlyingError;
      }

      return details;
    }

    if (typeof error === "string") {
      return { message: error };
    }

    if (error && typeof error === "object") {
      return error as Record<string, unknown>;
    }

    return { message: "Unknown error" };
  }

  private static normalizeErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (error && typeof error === "object") {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === "string" && maybeMessage.trim()) {
        return maybeMessage;
      }
    }

    return fallbackMessage;
  }

  private static logAuthError(step: string, error: unknown, context?: Record<string, unknown>) {
    const details = this.buildErrorDetails(error);
    console.error(`[UserAPI] ${step} failed`, {
      ...(context ?? {}),
      ...details,
    });
  }

  private static extractErrorMessages(error: unknown): string[] {
    const messages: string[] = [];

    if (error instanceof Error && error.message) {
      messages.push(error.message);

      const maybeUnderlying = (error as Error & { underlyingError?: unknown }).underlyingError;
      if (maybeUnderlying instanceof Error && maybeUnderlying.message) {
        messages.push(maybeUnderlying.message);
      }
    }

    if (error && typeof error === "object") {
      const asObject = error as { message?: unknown; underlyingError?: unknown };
      if (typeof asObject.message === "string") {
        messages.push(asObject.message);
      }

      if (asObject.underlyingError && typeof asObject.underlyingError === "object") {
        const nestedMessage = (asObject.underlyingError as { message?: unknown }).message;
        if (typeof nestedMessage === "string") {
          messages.push(nestedMessage);
        }
      }
    }

    if (typeof error === "string") {
      messages.push(error);
    }

    return messages;
  }

  private static isAmplifyNativeLinkError(error: unknown): boolean {
    const combined = this.extractErrorMessages(error).join("\n").toLowerCase();
    return (
      combined.includes("@aws-amplify/react-native") &&
      (combined.includes("doesn't seem to be linked") || combined.includes("expo go"))
    );
  }

  private static getSignInNextStepMessage(step?: string): string {
    switch (step) {
      case "CONFIRM_SIGN_UP":
        return "Account is not confirmed. Please verify your email first.";
      case "CONFIRM_SIGN_IN_WITH_SMS_CODE":
      case "CONFIRM_SIGN_IN_WITH_EMAIL_CODE":
      case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
        return "A verification code is required to complete sign-in.";
      case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
        return "A new password is required before sign-in can complete.";
      case "RESET_PASSWORD":
        return "Password reset is required before sign-in can complete.";
      default:
        return step
          ? `Sign-in is not complete. Next required step: ${step}.`
          : "Sign-in is not complete. Additional verification is required.";
    }
  }

  private static async ensureConfigured(): Promise<void> {
    if (this.isConfigured) {
      return;
    }

    console.info("[UserAPI] ensureConfigured: loading Cognito config");

    try {
      await import("../../config/cognito");
      this.isConfigured = true;
      console.info("[UserAPI] ensureConfigured: Cognito config loaded");
    } catch (error) {
      this.logAuthError("ensureConfigured", error);
      throw error;
    }
  }

  static async getStoredToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEY);
  }

  private static async clearStoredToken() {
    await AsyncStorage.multiRemove([
      STORAGE_KEY,
      ACCESS_TOKEN_STORAGE_KEY,
      REFRESH_TOKEN_STORAGE_KEY,
    ]);
  }

  private static async saveTokens(token: string, accessToken?: string, refreshToken?: string) {
    const writes: [string, string][] = [[STORAGE_KEY, token]];

    if (accessToken) {
      writes.push([ACCESS_TOKEN_STORAGE_KEY, accessToken]);
    }

    if (refreshToken) {
      writes.push([REFRESH_TOKEN_STORAGE_KEY, refreshToken]);
    }

    await AsyncStorage.multiSet(writes);
  }

  static async hydrateSession(): Promise<string | null> {
    await this.ensureConfigured();

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      const accessToken = session.tokens?.accessToken?.toString();
      const refreshToken = (session.tokens as any)?.refreshToken?.toString();

      if (!idToken) {
        await this.clearStoredToken();
        return null;
      }

      await this.saveTokens(idToken, accessToken, refreshToken);
      return idToken;
    } catch {
      await this.clearStoredToken();
      return null;
    }
  }

  static async getStoredAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  static async login({
    email,
    password,
    expoToken: _expoToken,
  }: LoginPayload): Promise<string> {
    const username = email.trim().toLowerCase();
    console.info("[UserAPI] login: started", { username });

    try {
      await this.ensureConfigured();

      console.info("[UserAPI] login: calling signIn", { username });

      let signInResult;
      try {
        signInResult = await signIn({
          username,
          password,
        });
      } catch (initialSignInError) {
        if (!this.isAmplifyNativeLinkError(initialSignInError)) {
          throw initialSignInError;
        }

        console.warn("[UserAPI] login: native module unavailable; retrying signIn with USER_PASSWORD_AUTH", {
          username,
        });

        signInResult = await signIn({
          username,
          password,
          options: {
            authFlowType: "USER_PASSWORD_AUTH",
          },
        });
      }

      console.info("[UserAPI] login: signIn completed", {
        username,
        isSignedIn: signInResult.isSignedIn,
        nextStep: signInResult.nextStep?.signInStep,
      });

      if (!signInResult.isSignedIn) {
        const nextStep = signInResult.nextStep?.signInStep;
        throw new Error(this.getSignInNextStepMessage(nextStep));
      }

      console.info("[UserAPI] login: fetching auth session");
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const accessToken = session.tokens?.accessToken?.toString();
      const refreshToken = (session.tokens as any)?.refreshToken?.toString();

      if (!token) {
        throw new Error("No id token returned by Cognito");
      }

      console.info("[UserAPI] login: saving tokens", {
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(refreshToken),
      });
      await this.saveTokens(token, accessToken, refreshToken);
      console.info("[UserAPI] login: completed successfully", { username });

      return token;
    } catch (error) {
      this.logAuthError("login", error, { username });
      throw new Error(this.normalizeErrorMessage(error, "Login failed. Check logs for details."));
    }
  }

  static async signup({ email, password, firstName, lastName }: SignupPayload): Promise<void> {
    await this.ensureConfigured();

    const trimmedEmail = email.trim().toLowerCase();
    await signUp({
      username: trimmedEmail,
      password,
      options: {
        userAttributes: {
          email: trimmedEmail,
          given_name: firstName?.trim() ?? "",
          family_name: lastName?.trim() ?? "",
        },
      },
    });
  }

  static async confirmSignup({ email, code }: ConfirmSignupPayload): Promise<void> {
    await this.ensureConfigured();

    await confirmSignUp({
      username: email.trim().toLowerCase(),
      confirmationCode: code.trim(),
    });
  }

  static async resendSignupCode(email: string): Promise<void> {
    await this.ensureConfigured();

    await resendSignUpCode({
      username: email.trim().toLowerCase(),
    });
  }

  static async requestPasswordReset(email: string): Promise<void> {
    await this.ensureConfigured();

    await resetPassword({
      username: email.trim().toLowerCase(),
    });
  }

  static async confirmPasswordReset({ email, code, newPassword }: ConfirmPasswordResetPayload): Promise<void> {
    await this.ensureConfigured();

    await confirmResetPassword({
      username: email.trim().toLowerCase(),
      confirmationCode: code.trim(),
      newPassword,
    });
  }

  static async logout(): Promise<void> {
    await this.ensureConfigured();

    try {
      await signOut();
    } finally {
      await this.clearStoredToken();
    }
  }

  /**
   * Convenience helper: returns request options with the saved token,
   * e.g. fetch('/protected', await UserAPI.withAuth()).
   */
  static async withAuth(init: RequestInit = {}): Promise<RequestInit> {
    const token = await this.getStoredToken();
    return {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: token ? `Bearer ${token}` : "",
      },
    };
  }
}
