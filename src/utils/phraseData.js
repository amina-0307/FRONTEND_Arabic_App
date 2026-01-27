import basePhrases from "../data/phrases.json";
import { loadSavedPhrases } from "./savedPhrases";

export function getCombinedPhrases() {
    const saved = loadSavedPhrases();

    // group saved by category //
    const byCategory = saved.reduce((acc, p) => {
        const cat = (p.category || "Saved").trim() || "Saved";
        acc[cat] ||= [];
        acc[cat].push({
            arabic: p.arabic,
            english: p.english,
            transliteration: p.transliteration,
        });
        return acc;
    }, {});

    const baseMap = new Map(basePhrases.map((c) => [c.category, { ...c }]));

    // seed categories that should always exist //
    if (!baseMap.has("Saved")) baseMap.set("Saved", { category: "Saved", phrases: [] });
    if (!baseMap.has("Other")) baseMap.set("Other", { category: "Other", phrases: [] });

    // merge saved into base //
    for (const [cat, items] of Object.entries(byCategory)) {
        if (baseMap.has(cat)) {
            baseMap.get(cat).phrases = [ ...items, ...baseMap.get(cat).phrases];
        } else {
            baseMap.set(cat, { category: cat, phrases: items });
        }
    }

        return Array.from(baseMap.values());
}
