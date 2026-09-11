import type { AuthUser } from "../../types";

const AUTH_USER_KEY = "srcb_eduassess_auth_user";
const ACTIVE_TAB_KEY = "srcb_eduassess_active_tab";

/**
 * Retrieves the persisted authenticated user from storage.
 * Checks localStorage first, then falls back to sessionStorage.
 */
export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw =
      localStorage.getItem(AUTH_USER_KEY) ||
      sessionStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.id && parsed.role) {
      return parsed as AuthUser;
    }
    return null;
  } catch (err) {
    console.warn("Failed to parse stored auth user:", err);
    return null;
  }
}

/**
 * Persists the authenticated user to both localStorage and sessionStorage.
 */
export function storeAuthUser(user: AuthUser | null): void {
  try {
    if (user) {
      const payload = JSON.stringify(user);
      localStorage.setItem(AUTH_USER_KEY, payload);
      sessionStorage.setItem(AUTH_USER_KEY, payload);
    } else {
      clearAuthSession();
    }
  } catch (err) {
    console.warn("Failed to store auth user:", err);
  }
}

/**
 * Retrieves the stored active tab from storage.
 */
export function getStoredActiveTab(): string | null {
  try {
    return (
      localStorage.getItem(ACTIVE_TAB_KEY) ||
      sessionStorage.getItem(ACTIVE_TAB_KEY)
    );
  } catch {
    return null;
  }
}

/**
 * Persists the currently selected tab to storage so page refreshes stay on the same screen.
 */
export function storeActiveTab(tab: string): void {
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, tab);
    sessionStorage.setItem(ACTIVE_TAB_KEY, tab);
  } catch (err) {
    console.warn("Failed to store active tab:", err);
  }
}

/**
 * Clears authentication session and active tab from all storage layers.
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(ACTIVE_TAB_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(ACTIVE_TAB_KEY);
  } catch (err) {
    console.warn("Failed to clear auth session:", err);
  }
}
