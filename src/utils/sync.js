import { exportSavedPhrases, mergePhrases } from "./savedPhrases";

// use same env var pattern as api.js //
const BASE = import.meta.env.VITE_BACKEND_URL;

function requireBase() {
    if (!BASE) {
        throw new Error(
            "VITE_BACKEND_URL is missing. Add it to .env locally and Vercel env vars, then redeploy."
        );
    }
}

    // push local phrases --> KV //
export async function syncPush(syncKey) {
    requireBase();

    const phrases = exportSavedPhrases();

    const res = await fetch(`${BASE}/api/sync/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncKey, phrases }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
        throw new Error(bodytext || "Sync push failed");
    }

    return JSON.parse(bodyText); // { ok, count } //
}

// pull KV --> merge into local storage //
export async function syncPull(syncKey) {
    requireBase();

    const res = await fetch(`$BASE}/api/sync/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncKey }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
        throw new Error(bodyText || "Sync pull failed");
    }

    const data = JSON.parse(bodyText); // { phrases: [...] } //

    // merge into local storage //
    mergePhrases(data.phrases || []);
    
    return data;
}
