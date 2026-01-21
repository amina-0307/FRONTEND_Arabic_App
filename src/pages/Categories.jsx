import { Link } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
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

export default function Categories() {
    // keep phrases in state so UI updates when saved phrases change //
    const [phrases, setPhrases] = useState(() => getCombinedPhrases());
    const refreshPhrases = () => setPhrases(getCombinedPhrases());

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
    }), [];
    
    const categories = useMemo(() => phrases.map((c) => c.category), []);

    return (
        <div className="page">
            <h1 className="h1">Categories</h1>
            <div className="hr" />

            <div className="categoryList">
                {categories.map((name) => {
                    const slug = slugify(name);
                    const emoji = emojiMap[name] || "📌";

                    return (
                        <Link key={name} to={`/category/${slug}`} className="categoryItem">
                            <span className="categoryEmoji">{emoji}</span>
                            <span className="categoryName">{name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
