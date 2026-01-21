import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCombinedPhrases } from "../utils/phraseData";

function slugify(str) {
    return str
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const emojiMap = {
    Greetings: "👋🏼",
    Directions: "🗺️",
    "Money & Shopping": "💰🛍️",
    "Prayer Phrases": "🤲🏼",
    "Customs & Etiquette": "🤝🏼",
    "Food - General": "🍽️",
    "Food - Meat": "🥩🍗",
    "Food - Drinks": "🧃☕️",
    "Food - Fruit": "🍎",
    Airport: "✈️🛂",
    "Luggage & Baggage": "🧳",
    Emergency: "🏥🚑",
};

export default function CategoryPage() {
    const { categorySlug } = useParams();

    // Phrases in state so the UI can update when saved phrases change //
    const [phrases, setPhrases] = useState(() => getCombinedPhrases());

    const refreshPhrases = () => setPhrases(getCombinedPhrases());

    // update when: //
    // - other tabs change localStorage ("storage") //
    // - same tab fires custom event ("savedPhrasesUpdated") //
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "savedPhrases") refreshPhrases();
        };
        const onSavedUpdated = () => refreshPhrases();

        window.addEventListener("storage", onStorage);
        window.addEventListener("savedPhrasesUpdated", onSavedUpdated);

        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("savedPhrasesUpdated", onSavedUpdated);
        };
    }, []);

    const categoryObj = useMemo(() => {
        return phrases.find((c) => slugify(c.category) === categorySlug);
    }, [phrases, categorySlug]);

    if (!categoryObj) {
        return (
            <div className="page">
                <h2 className="h2">Category not found 😅</h2>
                <div className="hr" />
                <Link to="/categories">⬅️ Back to Categories</Link>
            </div>
        );
    }

    const emoji = emojiMap[categoryObj.category] || "📌";

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    return (
        <div className="page">
            <h1 className="h1">
                {emoji} {categoryObj.category}
            </h1>
            <div className="hr" />

            <div style={{ margin: "10px 0 18px" }}>
                <Link to="/categories">⬅️ Back to Catgeories</Link>
            </div>

            {categoryObj.phrases.map((p, idx) => (
                <div className="card" key={idx}>
                    <div className="arabic">{p.arabic}</div>

                    <div className="metaLine">
                        <span className="metaLabel">Meaning:</span>{" "}
                        {p.english}
                    </div>

                    <div className="metaLine">
                        <span className="metaLabel">Transliteration:</span>{" "}
                        {p.transliteration}
                    </div>

                    <div className="metaLine metaMuted">
                        Category: {categoryObj.category}
                    </div>
                </div>
            ))}

            <div className="center" style={{ margin: "30px 0 50px" }}>
                <button className="btn" onClick={scrollToTop} type="button">
                    ⬆️ Back to the Top
                </button>
            </div>
        </div>
    );
}
