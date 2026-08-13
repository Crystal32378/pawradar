import { onesignalAppId } from './onesignal-config';

/**
 * Client-side OneSignal SDK loader.
 *
 * Loads the official OneSignal SDK from their CDN only when:
 *   1. The feature flag is enabled (NEXT_PUBLIC_ONESIGNAL_APP_ID set)
 *   2. We're in a browser environment
 *
 * The SDK is loaded lazily — not bundled — so the bundle size stays
 * small when the feature is disabled.
 *
 * Returns `null` if disabled or load fails. Callers must handle null.
 */
export async function loadOnesignalSdk(): Promise<null | {
  init: (options: {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    welcomeNotification?: { title: string; message: string; disable?: boolean };
  }) => Promise<void>;
  setSubscription: (flag: boolean) => Promise<void>;
  isPushNotificationsEnabled: () => Promise<boolean>;
  getSubscription: () => Promise<{ id: string | null; optedOut: boolean }>;
}> {
  if (!onesignalAppId) return null;
  if (typeof window === 'undefined') return null;

  // OneSignal's official browser SDK is exposed as window.OneSignal
  // after loading their script tag. We inject it dynamically.
  return new Promise((resolve) => {
    if ((window as any).OneSignal) {
      resolve((window as any).OneSignal);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.onload = () => {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) resolve(OneSignal);
      else resolve(null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * Initialise OneSignal with our config. Safe to call multiple times —
 * OneSignal dedupes internally. Returns true if init succeeded.
 */
export async function initOnesignal(): Promise<boolean> {
  if (!onesignalAppId) return false;
  const OneSignal = await loadOnesignalSdk();
  if (!OneSignal) return false;
  try {
    await OneSignal.init({
      appId: onesignalAppId,
      allowLocalhostAsSecureOrigin: true,
      welcomeNotification: { title: 'PawRadar', message: '已開啟通知', disable: false },
    });
    return true;
  } catch (err) {
    console.error('[PawRadar] OneSignal init failed:', err);
    return false;
  }
}

/**
 * Prompt the user for notification permission and return their
 * OneSignal player ID if they accept. Returns null on rejection or
 * if the SDK is unavailable.
 */
export async function promptForSubscription(): Promise<string | null> {
  if (!onesignalAppId) return null;
  const OneSignal = await loadOnesignalSdk();
  if (!OneSignal) return null;

  // Re-enable subscription (it gets opted-out by default after init)
  await OneSignal.setSubscription(true);
  const subscription = await OneSignal.getSubscription();
  return subscription.id ?? null;
}
