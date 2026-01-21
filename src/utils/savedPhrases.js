const LS_KEY = "ao_saved_phrases_v1";

export function loadSavedPhrases() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
        return [];
    }
}

    export function saevPhrase(newPhrase) {
        const list = loadSavedPhrases();

        const exists = list.some(
            (p) =>
            (p.arabic || "").trim() === (newPhrase.arabic || "").trim() &&
            (p.english || "").trim().toLowerCase() === (newPhrase.english || "").trim().toLowerCase() &&
            (p.category || "Saved") === (newPhrase.category || "Saved")
        );

        if (exists) return list;

        const updated = [newPhrase, ...list];
        localStorage.setItem(LS_KEY, JSON,stringify(updated));
        return updated;
}
