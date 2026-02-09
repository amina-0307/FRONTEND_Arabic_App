import basePhrasesRaw from "../data/phrases.json";
import { loadSavedPhrases } from "./savedPhrases";

function normalizeBase(baseRaw) {
    const baseArray = Array.isArray(baseRaw)
    ? baseRaw
    : Array.isArray(baseRaw?.categories)
    ? baseRaw.categories
    : [];

    // ensure each category has expected shape //
    return baseArray
        .filter(Boolean)
        .map((c) => ({
            category: (c.category || "").trim(),
            phrases: Array.isArray(c.phrases) ? c.phrases : [],
        }))
        .filter((c) => c.category);
}

export function getCombinedPhrases() {
    const basePhrases = normalizeBase(basePhrasesRaw);

    const savedRaw = loadSavedPhrases();
    const saved = Array.isArray(savedRaw) ? savedRaw : [];

    // group saved by category //
    const byCategory = saved.reduce((acc, p) => {
        const cat = (p.category || "Saved").trim() || "Saved";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({
            arabic: (p.arabic || "").trim(),
            english: (p.english || "").trim(),
            transliteration: (p.transliteration || "").trim(),
            createdAt: p.createdAt,
            source: p.source,
        });
        return acc;
    }, {});

    // map base categories for easy merge //
    const baseMap = new Map(
        basePhrases.map((c) => [c.category, { category: c.category, phrases: [...c.phrases] }])
    );

    // seed categories that should always exist //
    if (!baseMap.has("Saved")) baseMap.set("Saved", { category: "Saved", phrases: [] });
    if (!baseMap.has("Other")) baseMap.set("Other", { category: "Other", phrases: [] });

    // merge saved into base //
    for (const [cat, items] of Object.entries(byCategory)) {
        if (baseMap.has(cat)) {
            const existing = baseMap.get(cat);
            existing.phrases = [...items, ...(existing.phrases || [])];
        } else {
            baseMap.set(cat, { category: cat, phrases: items });
        }
    }

    return Array.from(baseMap.values());
}
