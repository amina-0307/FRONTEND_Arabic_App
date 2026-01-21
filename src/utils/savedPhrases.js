const LS_KEY = "savedPhrases"; // keep consistent with all Listeners //

export function loadSavedPhrases() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
        return [];
    }
}

    export function savePhrase(newPhrase) {
        const list = loadSavedPhrases();

        const exists = list.some(
            (p) =>
                (p.arabic || "").trim() === (newPhrase.arabic || "").trim() &&
                (p.english || "").trim().toLowerCase() ===
                    (newPhrase.english || "").trim().toLowerCase() &&
                (p.category || "Saved") === (newPhrase.category || "Saved")
        );

        if (exists) return list;

        const updated = [newPhrase, ...list];
        localStorage.setItem(LS_KEY, JSON.stringify(updated));

        // same tab update //
        window.dispatchEvent(new Event("savedPhrasesUpdated"));

        return updated;
}
