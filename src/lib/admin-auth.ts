import { ADMIN_PASSWORD, ADMIN_SESSION_LIFETIME_MS } from "./admin-config";

const SESSION_KEY = "mik32_admin_auth";
const EXPIRY_KEY = "mik32_admin_expiry";

export function isAdminAuthenticated(): boolean {
  if (ADMIN_SESSION_LIFETIME_MS === 0) {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return false;
  if (Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return false;
  }
  return localStorage.getItem(SESSION_KEY) === "1";
}

export function loginAdmin(password: string): boolean {
  if (password !== ADMIN_PASSWORD) return false;
  if (ADMIN_SESSION_LIFETIME_MS === 0) {
    sessionStorage.setItem(SESSION_KEY, "1");
  } else {
    localStorage.setItem(SESSION_KEY, "1");
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + ADMIN_SESSION_LIFETIME_MS));
  }
  return true;
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}
