const LS_KEY = "savedPhrases"; // keep consistent with all Listeners //

export function exportSavedPhrases() {
    return loadSavedPhrases();
}

export function mergePhrases(incoming) {
    const current = loadSavedPhrases();
    const map = new Map();

    const keyOf = (p) =>
        `${(p.arabic || "").trim()}||${(p.english || "").trim().toLowerCase()}||${(p.category || "Saved").trim()}`;

    // current first //
    for (const p of current) map.set(keyOf(p), p);

    // then incoming overwrites/adds //
    for (const p of incoming || []) map.set(keyOf(p), p);

    const merged = Array.from(map.values()).sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""))
    );

    localStorage.setItem(LS_KEY, JSON.stringify(merged));

    // notify same-tab listeners //
    window.dispatchEvent(new Event("savedPhrasesUpdated"));

    return merged;
}
