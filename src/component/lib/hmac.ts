/**
 * HMAC Signature Utilities for OKRHub Component
 *
 * Provides cryptographic signature functions for secure API communication
 * with LinkHub's ingest endpoints.
 */

import { OKRHUB_VERSION } from "../externalId.js";

/**
 * Creates HMAC-SHA256 signature for payload authentication
 *
 * SECURITY NOTE: Uses the signing secret (not the API key) to create
 * cryptographically consistent signatures that the server can verify.
 */
export async function createHmacSignature(
  payload: string,
  signingSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingSecret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates request headers with HMAC signature, version, and key prefix
 */
export async function createRequestHeaders(
  payload: string,
  apiKeyPrefix: string,
  signingSecret: string
): Promise<Headers> {
  const signature = await createHmacSignature(payload, signingSecret);

  return new Headers({
    "Content-Type": "application/json",
    "X-OKRHub-Version": OKRHUB_VERSION,
    "X-OKRHub-Key-Prefix": apiKeyPrefix,
    "X-OKRHub-Signature": signature,
  });
}
