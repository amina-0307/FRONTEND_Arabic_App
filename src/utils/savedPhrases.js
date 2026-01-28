const LS_KEY = "savedPhrases"; // keep consistent with all listeners //

export function loadSavedPhrases() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

// used by sync push: export everything currently saved locally //
export function exportSavedPhrases() {
    return loadSavedPhrases();
}

//used by sync pull: merge cloud --> local (dedupe) //
export function mergePhrases(incoming) {
    const current = loadSavedPhrases();
    const map = new Map();

    const keyOf = (p) =>
        `${(p.arabic || "").trim()}||${(p.english || "")
            .trim()
            .toLowerCase()}||${(p.category || "Saved").trim()}`;

    // current first //
    for (const p of current) map.set(keyOf(p), p);

    // incoming overwrites/adds //
    for (const p of Array.isArray(incoming) ? incoming : []) map.set(keyOf(p), p);

    const merged = Array.from(map.values()).sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "")
    );

    localStorage.setItem(LS_KEY, JSON.stringify(merged));

    // notify same-tab listeners //
    window.dispatchEvent(new Event("savedPhrasesUpdated"));

    return merged;
}

// saved ONE phrase locally (dedupes) //

export function savePhrase(newPhrase) {
    const list = loadSavedPhrases();

    const normalized = {
        arabic: (newPhrase.arabic || "").trim(),
        english: (newPhrase.english || "").trim(),
        transliteration: (newPhrase.transliteration || "").trim(),
        category: (newPhrase.category || "Saved").trim(),
        createdAt: newPhrase.createdAt || new Date().toISOString(),
        source: newPhrase.source || "unknown",
    };

    const exists = list.some(
        (p) =>
        (p.arabic || "").trim() === normalized.arabic &&
        (p.english || "").trim().toLowerCase() ===
            normalized.english.toLowerCase() &&
        (p.category || "Saved").trim() === normalized.category
    );

    if (exists) return list;

    const updated = [normalized, ...list];
    localStorage.setItem(LS_KEY, JSON.stringify(updated));

    // notify same-tab listeners //
    window.dispatchEvent(new Event("savedPhrasesUpdated"));

    return updated;

}