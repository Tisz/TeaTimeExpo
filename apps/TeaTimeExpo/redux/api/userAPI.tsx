import AsyncStorage from "@react-native-async-storage/async-storage";
import { APIBaseURL } from "../../data/constants/DataConstants";

const STORAGE_KEY = "authToken";
const ACCESS_TOKEN_STORAGE_KEY = "authAccessToken";
const REFRESH_TOKEN_STORAGE_KEY = "authRefreshToken";

interface LoginPayload {
  email: string;
  password: string;
  expoToken: string; // push‑notification device token
}

interface LoginResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
}

export class UserAPI {
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

  static async getStoredAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  static async login({
    email,
    password,
    expoToken,
  }: LoginPayload): Promise<string> {
    const res = await fetch(`${APIBaseURL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, expoToken }),
    });

    if (!res.ok) {
      throw new Error(`Login failed: ${res.status}`);
    }

    const { token, accessToken, refreshToken } = (await res.json()) as LoginResponse;
    if (!token) throw new Error("No token in response");

    await this.saveTokens(token, accessToken, refreshToken);
    return token;
  }

  static async logout(): Promise<void> {
    const accessToken = await this.getStoredAccessToken();
    if (!accessToken) {
      await this.clearStoredToken();
      return;
    }

    try {
      await fetch(`${APIBaseURL}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
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
