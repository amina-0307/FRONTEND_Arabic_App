import { exportSavedPhrases, mergePhrases } from "./savedPhrases";

// use same env var pattern as api.js //
const BASE = import.meta.env.VITE_BACKEND_URL;

    // push local phrases --> KV //
export async function syncPush(syncKey) {
    const phrases = exportSavedPhrases();

    const res = await fetch(`${BASE}/api/sync/push)`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncKey, phrases }),
    });

    if (!res.ok) throw new Error("Sync push failed");
    return res.json(); // { ok, count } //
}

// pull KV --> merge into local storage //
export async function syncPull(syncKey) {
    const res = await fetch(`$BASE}/api/sync/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncKey }),
    });

    if (!res.ok) throw new Error("Sync pull failed");
    const data = await res.json(); // { phrases: [...] } //

    // merge into local storage //
    mergePhrases(data.phrases || []);
    return data;
}
