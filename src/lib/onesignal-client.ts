import { onesignalAppId } from './onesignal-config';

interface PushSubscriptionApi {
  id?: string;
  optedIn?: boolean;
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
  addEventListener: (name: 'change', listener: () => void) => void;
  removeEventListener: (name: 'change', listener: () => void) => void;
}

interface OneSignalV16 {
  init: (options: Record<string, unknown>) => Promise<void>;
  User: { PushSubscription: PushSubscriptionApi };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(sdk: OneSignalV16) => void | Promise<void>>;
  }
}

let sdkPromise: Promise<OneSignalV16 | null> | null = null;
let initPromise: Promise<boolean> | null = null;

export function loadOnesignalSdk(): Promise<OneSignalV16 | null> {
  if (!onesignalAppId || typeof window === 'undefined') return Promise.resolve(null);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push((sdk) => resolve(sdk));

    if (document.querySelector('script[data-pawradar-onesignal]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.dataset.pawradarOnesignal = 'true';
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function initOnesignal(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const sdk = await loadOnesignalSdk();
    if (!sdk) return false;
    try {
      await sdk.init({
        appId: onesignalAppId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
      });
      return true;
    } catch {
      console.error('[PawRadar] OneSignal initialization failed');
      return false;
    }
  })();
  return initPromise;
}

export async function promptForSubscription(): Promise<string | null> {
  if (!(await initOnesignal())) return null;
  const sdk = await loadOnesignalSdk();
  if (!sdk) return null;

  await sdk.User.PushSubscription.optIn();
  if (sdk.User.PushSubscription.id) return sdk.User.PushSubscription.id;

  return new Promise((resolve) => {
    const subscription = sdk.User.PushSubscription;
    const finish = () => {
      if (!subscription.id) return;
      subscription.removeEventListener('change', finish);
      resolve(subscription.id);
    };
    subscription.addEventListener('change', finish);
    window.setTimeout(() => {
      subscription.removeEventListener('change', finish);
      resolve(subscription.id ?? null);
    }, 10_000);
  });
}

export async function optOutOfPush(): Promise<void> {
  const sdk = await loadOnesignalSdk();
  await sdk?.User.PushSubscription.optOut();
}
