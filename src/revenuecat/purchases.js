import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

const IOS_API_KEY = import.meta.env.VITE_RC_IOS_API_KEY;
// if later adding android: //
// const ANDROID_API_KEY = import.meta.env.VITE_RC_ANDROID_API_KEY; //

// ensures configuring only ONCE per app launch //
let configurePromise=null;

async function ensureConfigured() {
    const platform = Capacitor.getPlatform();
    if (platform === "web") return;

    // if a configure is already done or in progress, wait for it //
    if (configurepromise) return configurePromise;

    configurePromise = (async () => {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        if (platform === "ios") {
            if (!IOS_API_KEY) throw new Error("Missing VITE_RC_IOS_API_KEY");
            await Purchases.configure({ apiKey: IOS_API_KEY });
        }

        await Purchases.getCustomerInfo();
    })();

    return configurePromise;
}

// configure RevenueCat ONCE per app launch (native only) //
export async function initRevenueCat() {
    return ensureConfigured();
}

// offerings (paywall products) //
export async function getOfferings() {
    await ensureConfigured();
    return Purchases.getOfferings();
}

// purchase selected package //
export async function purchasePackage(pkg) {
    await ensureConfigured();
    return Purchases.purchasePackage({ aPackage: pkg });
}

// restore //
export async function restore() {
    await ensureConfigured();
    return Purchases.restorePurchases();
}

// entitlements check //
export async function hasEntitlement(entitlementId) {
    await ensureConfigured();
    const info = await Purchases.getCustomerInfo();
    return Boolean(info?.entitlements?.active?.[entitlementId]);
}
