import "server-only";
import { readFileSync } from "node:fs";
import { SignJWT, importPKCS8 } from "jose";
import type { Cell } from "./parse";

/**
 * Minimal Google Sheets reader using a service account (no googleapis dep):
 * sign an RS256 JWT with jose, swap it for an access token, read values.
 *
 * Env:
 *   LEDGER_SHEET_ID                      — spreadsheet id from the URL
 *   LEDGER_SHEET_TAB                     — optional tab name (default: first tab)
 *   GOOGLE_SERVICE_ACCOUNT_KEY_FILE      — path to the downloaded JSON key, OR
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (\n-escaped PEM)
 */

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type Credentials = { email: string; privateKey: string };

function loadCredentials(): Credentials | null {
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (file) {
    const json = JSON.parse(readFileSync(file, "utf8")) as { client_email?: string; private_key?: string };
    if (!json.client_email || !json.private_key) throw new Error(`${file} is not a service account key`);
    return { email: json.client_email, privateKey: json.private_key };
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (email && key) return { email, privateKey: key.replace(/\\n/g, "\n") };
  return null;
}

export function isLedgerConfigured(): boolean {
  return Boolean(
    process.env.LEDGER_SHEET_ID &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ||
        (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)),
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(creds: Credentials): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const key = await importPKCS8(creds.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(creds.email)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status}): ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

/** All cell values of the ledger tab, unformatted (numbers stay numbers, dates are serials). */
export async function fetchLedgerRows(): Promise<Cell[][]> {
  const sheetId = process.env.LEDGER_SHEET_ID;
  if (!sheetId) throw new Error("LEDGER_SHEET_ID is not set");
  const creds = loadCredentials();
  if (!creds) throw new Error("Google service account credentials are not set");

  const token = await getAccessToken(creds);
  const tab = process.env.LEDGER_SHEET_TAB;
  const range = tab ? `'${tab.replace(/'/g, "''")}'!A1:Z2000` : "A1:Z2000";
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}` +
    `?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;

  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.status === 403 || res.status === 404) {
    throw new Error(
      `Google Sheets returned ${res.status}. Share the sheet with ${creds.email} (Viewer) and check LEDGER_SHEET_ID.`,
    );
  }
  if (!res.ok) throw new Error(`Google Sheets request failed (${res.status}): ${await res.text()}`);
  const body = (await res.json()) as { values?: Cell[][] };
  return body.values ?? [];
}
