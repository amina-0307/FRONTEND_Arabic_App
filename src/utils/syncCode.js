const SYNC_KEY = "syncKey";

export function getSyncKey() {
    return localStorage.getItem(SYNC_KEY) || "";
}

export function setSyncKey(key) {
    localStorage.setItem(SYNC_KEY, key);
    window.dispatchEvent(new Event("syncKeyUpdated"));
}

export function clearSyncKey() {
    localStorage.removeItem(SYNC_KEY);
    window.dispatchEvent(new Event("syncKeyUpdated"));
}

// readable + short (not "secure", but fine for "optional sync") //
export function generateSyncKey() {
    const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
    const part3 = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${part1}-${part2}-${part3}`; // e.g. "A3KQ-9XLF-P2M8" (14 chars) //
}
