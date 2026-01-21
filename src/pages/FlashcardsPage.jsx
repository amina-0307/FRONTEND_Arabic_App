import { useEffect, useMemo, useState } from "react";
import { getCombinedPhrases } from "../utils/phraseData";

// keep slugify consistent across app //
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

// Fisher-Yates shuffle //
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function FlashcardsPage() {
    // phrases in state so UI can update when saved phrases change //
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

    const categories = useMemo(() => {
        return[...new Set(phrases.map((c) => c.category))];
    }, [phrases]);

    // Flat list of all phrases with category attached //
    const allCards = useMemo(() => {
        return phrases.flatMap((cat) =>
        cat.phrases.map((p) => ({
            ...p,
            category: cat.category,
            categorySlug: slugify(cat.category),
        }))
    );
    }, [phrases]);

    const [mode, setMode] = useState("random"); //"random" | "category"
    const [selectedCategory, setSelectedCategory] = useState("");
    const [showFront, setShowFront] = useState(true); // front = Arabic, back = English + transliteration
    const [index, setIndex] = useState(0);

// Ensure selectedCategory is always valid when categories load/change //
useEffect(() => {
    if (mode === "category") {
        if (!selectedCategory || !categories.includes(selectedCategory)) {
            setSelectedCategory(categories[0] || "");
        }
    }
}, [categories, mode, selectedCategory]);

// Deck depends on mode/category //
    const deck = useMemo(() => {
        if (mode === "category" && selectedCategory) {
            return allCards.filter((c) => c.category === selectedCategory);
        }
        return allCards;
    }, [mode, selectedCategory, allCards]);

    // Keep a shuffled "order" separate, so Next/Prev feels stable //
    const [order, setOrder] = useState(() => shuffleArray(deck.map((_, i) => i)));

    // When deck changes, reset deck index/order safely //
    useEffect(() => {
        // reset index and front when switching modes/categories //
        setIndex(0);
        setShowFront(true);

        // Build a shuffled order for the CURRENT deck //
        const deckIndices = deck.map((_, i) => i);
        setOrder(shuffleArray(deckIndices));
    }, [deck]);

    const current = useMemo(() => {
        if (!deck.length) return null;

        const safeIndex = Math.min(index, deck.length - 1);
        const deckPos = order[safeIndex] ?? safeIndex;

        return deck[deckPos];
    }, [deck, index, order]);

const emoji = 
    (current && emojiMap[current.category]) ||
    (mode === "category" && emojiMap[selectedCategory]) ||
    "🗂️";

    const canGoPrev = index > 0;
    const canGoNext = index < deck.length - 1;

    const handleFlip = () => setShowFront((s) => !s);

    const handleNext = () => {
        if (!canGoNext) return;
        setIndex((i) => i + 1);
        setShowFront(true);
    };

    const handlePrev = () => {
        if (!canGoPrev) return;
        setIndex((i) => i - 1);
        setShowFront(true);
    };

    const handleShuffle = () => {
        if (!deck.length) return;
        const deckIndices = deck.map((_, i) => i);
        setOrder(shuffleArray(deckIndices));
        setIndex(0);
        setShowFront(true);
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    return (
        <div className="page">
            <button className="toTopFixed" onClick={scrollToTop} title="Back to top" type="button">
                ⬆️ Top
            </button>

            <h1 className="h1">🗒️ Flashcards</h1>
            <div className="hr" />

            {/* Controls */}
            <div className="flashControls">
                <div className="flashRow">
                    <button className={`btn ${mode === "random" ? "btnActive" : ""}`}
                    onClick={() => setMode("random")} type="button"
                    >
                        🎲 Random
                    </button>

                    <button className={`btn ${mode === "category" ? "btnActive" : ""}`}
                    onClick={() => setMode("category")} type="button"
                    >
                        📂 By Category
                    </button>

                    <button className="btn" onClick={handleShuffle} type="button">
                        🔀 Shuffle
                    </button>
                </div>

                {mode === "category" && (
                    <div className="flashRow">
                        <select className="select flashSelect"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {(emojiMap[c] || "📌") + " " + c}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flashRow flashMeta">
                    <span>
                        {emoji}{" "}
                        <strong>
                            {mode === "category" ? selectedCategory : "All Categories"}
                        </strong>
                    </span>
                    <span>
                        Card <strong>{deck.length ? index +1 : 0}</strong> /{" "}
                        <strong>{deck.length}</strong>
                    </span>
                </div>
            </div>

            {/* Flashcard */}
            {!current ? (
                <div className="card">
                    <div className="metaLine">No flashcards found for this selection 😅</div>
                </div>
            ) : (
                <button className="flashCard" onClick={handleFlip} type="button">
                    {showFront ? (
                        // FRONT: English only //
                        <div className="flashFront">
                            <div className="flashHint">Tap to flip</div>

                            <div className="flashEnglish">
                                {current.english || "-"}
                            </div>

                            <div className="flashCategoryLine">
                                Category: <strong>{emoji} {current.category}</strong>
                            </div>
                        </div>
                    ) : (
                        // BACK: Arabic + Transliteration //
                        <div className="flashBack">
                            <div className="flashHint">Tap to flip back</div>

                            <div className="arabic flashArabic">{current.arabic || "-"}
                            </div>

                            <div className="flashTransliteration">
                                Transliteration: <strong>{current.transliteration || "-"}</strong>
                            </div>

                            <div className="flashCategoryLine">
                                Category: <strong>{emoji} {current.category}</strong>
                            </div>
                        </div>
                    )}
                </button>
            )}

            {/* Nav Buttons */}
            <div className="flashNav">
                <button className="btn" onClick={handlePrev} disabled={!canGoPrev} type="button">
                    ⏪ Prev
                </button>
                <button className="btn" onClick={handleFlip} disabled={!current} type="button">
                    🔄 Flip
                </button>
                <button className="btn" onClick={handleNext} disabled={!canGoNext} type="button">
                    Next ⏩
                </button>
            </div>
        </div>
    );
}
