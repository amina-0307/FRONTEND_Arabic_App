import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

const IOS_API_KEY = import.meta.env.VITE_RC_IOS_API_KEY;
// if later adding android: //
// const ANDROID_API_KEY = import.meta.env.VITE_RC_ANDROID_API_KEY; //

export async function initRevenueCat() {
    const platform = Capacitor.getPlatform();

    // only run on native builds (ios/android) //
    if (platform === "web") return;

    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    if (platform === "ios") {
        if (!IOS_API_KEY) throw new Error("Missing VITE_RC_IOS_API_KEY");
        await Purchases.configure({ apiKey: IOS_API_KEY });
    }

    // else if (platform === "android") { //
    //     await Purchases.configure({ apiKey: ANDROID_API_KEY }); //
    // } //
}

// offerings (paywall products) //
export async function getOfferings() {
    return Purchases.getOfferings();
}

// Purchase selected package //
export async function purchasePackage(pkg) {
    return Purchases.purchasePackage({ aPackage: pkg });
}

// restore //
export async function restore() {
    return Purchases.restorePurchases();
}

// entitlement check //
export async function hasEntitlement(entitlementId) {
    const info = await Purchases.getCustomerInfo();
    return Boolean(info?.entitlements?.active?.[entitlementId]);
}
