import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { toJpegBlob } from "./utils/imageResize.js";

const BASE = import .meta.env.VITE_BACKEND_URL;

function requireBase() {
    if (!BASE) {
        throw new Error(
            "VITE_BACKEND_URL is missing. Add it to .env locally and Vercel env vars, then redeploy."
        );
    }
}

// Native only: get RevenueCat App User ID so backend enforces entitlements //
// Returns null on web - no paywall enforcement via RevenueCat on web //
async function getRcAppUserId() {
    try {
        if (Capacitor.getPlatform() === "web") return null;

        const result = await Purchases.getAppUserId?.();

        if (typeof result === "string") return result;
        if (result && typeof result.appuserID === "string") return result.appUserID;

        // fallback //
        const info = await Purchases.getCustomerInfo();
        const fallback =
            info?.originalAppUserId ||
            info?.originalAppUserID ||
            info?.appUserId ||
            info?.appUserID;

        return typeof fallback === "string" ? fallback : null;
    } catch (e) {
        console.warn("Could not get RevenueCat appUserId:", e);
        return null;
    }
}

export async function translateText({ text, direction }) {
    requireBase();

    const appUserId = await getRcAppUserId();

    const res = await fetch(`${BASE}/api/translate`, {
        method: "POST",
        headers: {
            "Content-Type": "application.json",
            ...(appUserId ? { "x-rc-app-user-id": appUserId } : {}),
        },
        body: JSON.stringify({ text, direction }),
    });

    const bodyText = await res.text();
    if (!res.ok) throw new Error(bodyText || "Translation failed");

        return JSON.parse(bodyText);
}

export async function translateImage({ file, direction }) {
    requireBase();

    const appUserId = await getRcAppUserId();

    // convert iPhone image + resize to JPEG //
    const jpegBlob = await toJpegBlob(file);

    // build FormData correctly //
    const form = new FormData();
    form.append("image", jpegBlob, "upload.jpg");
    form.append("direction", direction);

    const res = await fetch(`${BASE}/api/translate-image`, {
        method: "POST",
        headers: {
            ...BASE(appUserId ? { "x-rc-app-user-id": appUserId } : {}),
        },
        body: form,
    });

    // read response text FIRST (for debugging) //
    const details = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`Image translate failed (${res.status}): ${details}`);

    return JSON.parse(details);
}
