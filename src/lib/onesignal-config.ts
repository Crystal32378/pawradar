/**
 * OneSignal Web Push configuration and feature flag.
 *
 * Feature flag: `Boolean(NEXT_PUBLIC_ONESIGNAL_APP_ID)`.
 * If the env var is empty (default in .env.example), the entire OneSignal
 * UI flow is disabled and the SDK is not initialised. This lets the code
 * ship safely without a real OneSignal app until Crystal is ready.
 *
 * SECURITY: Only `NEXT_PUBLIC_ONESIGNAL_APP_ID` is exposed to the client.
 * `ONESIGNAL_REST_API_KEY` is server-only and must NEVER be imported
 * into a 'use client' module.
 */

export const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? '';

/**
 * Feature flag: is OneSignal Web Push enabled?
 * Used by both client (to show/hide opt-in UI) and server (to allow
 * subscribe/notify endpoints to short-circuit cleanly when disabled).
 */
export const isOnesignalEnabled = Boolean(onesignalAppId);

/**
 * Server-only: is the REST API key configured?
 * Used to gate notify endpoints — without the key we can't send, even
 * if the SDK is initialised on the client.
 */
