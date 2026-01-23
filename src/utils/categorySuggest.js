import phrases from "../data/phrases.json";

function tokenize(s) {
    return (s || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .split(/\s+/)
        .filter(Boolean);
}

export function suggestCategory({ english = "", arabic = "" }) {
    const engTokens = new Set(tokenize(english));
    const arTokens = new Set(tokenize(arabic));

    let best = { cat: "Saved", score: 0 };

    for (const cat of phrases) {
        let score = 0;
        for (const p of cat.phrases) {
            const e = tokenize(p.english);
            const a = tokenize(p.arabic);

            for (const t of e) if (engTokens.has(t)) score +=2;
            for (const t of a) if (arTokens.has(t)) score +=1;
        }
        if (score > best.score) best = { cat: cat.category, score };
    }

    // If nothing matched, keep it in Saved //
    return best.score >= 3 ? best.cat : "Saved";
}
