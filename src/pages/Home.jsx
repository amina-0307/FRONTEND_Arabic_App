import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { getCombinedPhrases } from "../utils/phraseData"; // if you want live categories //
import { cacheGet, cacheSet } from "../utils/translateCache";
import { suggestCategory } from "../utils/categorySuggest";
import { savePhrase } from "../utils/savedPhrases";

import { translateText, translateImage } from "../api";

import { resizeImage } from "../utils/imageResize";
import { canUseImage, incrementUsage, getUsage, IMAGE_LIMIT } from "../utils/imageCap";

function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function Home({ theme, toggleTheme }) {
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

    function getCategoryEmoji(name) {
        return emojiMap[name] || "📌";
    }

    // Keep combined phrases in state (so UI updates instantly) //
    const [phrases, setPhrases] = useState(() => getCombinedPhrases());

    // Helper to reload from storage + base json //
    const refreshPhrases = () => {
        setPhrases(getCombinedPhrases());
    };

    // If user switches tabs/windows, refresh too) //
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "savedPhrases") refreshPhrases();
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // Search + jump //
    const [query, setQuery] = useState("");
    const [jumpTo, setJumpTo] = useState("");

    const categories = useMemo(() => phrases.map((c) => c.category), [phrases]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return phrases;

        return phrases
            .map((cat) => ({
                ...cat,
                phrases: cat.phrases.filter((p) =>
                    [p.english, p.arabic, p.transliteration]
                        .filter(Boolean)
                        .some((v) => v.toLowerCase().includes(q))
                ),
            }))
            .filter((cat) => cat.phrases.length > 0);
    }, [phrases, query]);

    const handleJump = (slug) => {
        setJumpTo(slug);
        if (!slug) return;
        const el = document.getElementById(`section-${slug}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth"});
    };

    // Translator state //
    const [direction, setDirection] = useState("en_to_ar");
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [err, setErr] = useState("");

    // Save prompt state //
    const [saveCat, setSaveCat] = useState("Saved");
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [savedToast, setSavedToast] = useState("");

    const categoriesForSave = useMemo(() => {
        const names = phrases.map((c) => c.category);
        return Array.from(new Set(["Saved", ...names]));
    }, [phrases]);

    function showToast(msg) {
        setSavedToast(msg);
        setTimeout(() => setSavedToast(""), 2500);
    }

    function copy(text) {
        navigator.clipboard.writeText(text || "");
    }

    async function handleTranslate() {
        setErr("");
        setResult(null);
        setShowSavePrompt(false);

        const text = inputText.trim();
        if (!text) return;

        const cacheKey = `${direction}::${text.toLowerCase()}`;
        const cached = cacheGet(cacheKey);

        if (cached) {
            setResult(cached);
            const suggested = suggestCategory(cached);
            setSaveCat(suggested || "Saved");
            setShowSavePrompt(true);
            return;
        }

        try {
            setLoading(true);
            const data = await translateText({ text, direction });
            setResult(data);
            cacheSet(cacheKey, data);

            const suggested = suggestCategory(data);
            setSaveCat(suggested || "Saved");
            setShowSavePrompt(true);
        } catch (e) {
            setErr(e?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    async function handleImagePick(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setErr("");
        setResult(null);
        setShowSavePrompt(false);

        if (!canUseImage()) {
            const u = getUsage();
            setErr(`Image limit reached: ${u.used}/${IMAGE_LIMIT} this month.`);
            e.target.value = "";
            return;
        }

        try {
            setLoading(true);

            const resized = await resizeImage(file);
            const data = await translateImage({ file: resized, direction });

            incrementUsage();
            setResult(data);

            const suggested = suggestCategory(data);
            setSaveCat(suggested || "Saved");
            setShowSavePrompt(true);
        } catch (e2) {
            setErr(e2?.message || "Image translation failed");
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    }

    function handleClear() {
        setInputText("");
        setResult(null);
        setErr("");
        setShowSavePrompt(false);
        setSaveCat("Saved");
    }

    return (
        <div className="page">
            <button className="toTopFixed" onClick={scrollToTop} title="Back to top">
                ⬆️ Top
            </button>

            <div className="topbar">
                <button className="iconBtn" onClick={toggleTheme} title="Toggle theme">
                    {theme === "dark" ? "☀️" : "🌙"}
                </button>

                <input
                    className="input"
                    placeholder="Search phrases..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <select
                    className="select"
                    value={jumpTo}
                    onChange={(e) => handleJump(e.target.value)}
                >
                    <option value="">~ Jump to Section ~</option>
                    {categories.map((c) => (
                        <option key={c} value={slugify(c)}>
                            {c}
                        </option>
                    ))}
                </select>
                </div>

                <h1 className="h1">Arabic Phrasebook</h1>
                <div className="hr" />

                <h2 className="h2">🧠 AI Translator</h2>

                <div className="card" style={{ marginBottom: 18 }}>
                    <div className="flashRow" style={{ justifyContent: "flex-start" }}>
                        <button
                            className={`btn ${direction === "en_to_ar" ? "btnActive" : ""}`}
                            onClick={() => setDirection("en_to_ar")}
                            type="button"
                        >
                            English → Arabic
                        </button>
                        <button
                            className={`btn ${direction === "ar_to_en" ? "btnActive" : ""}`}
                            onClick={() => setDirection("ar_to_en")}
                            type="button"
                        >
                            Arabic → English
                        </button>
                    </div>

                    <div className="translatorRow" style={{ marginTop: 12}}>
                        <input
                            className="input"
                            style={{ width: "100%" }}
                            placeholder={direction === "en_to_ar" ? "Type English..." : "اكتب بالعربي..."}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
                        />

                        <label className="iconBtn" title="Upload image" style={{ display: "grid", placeItems: "center" }}>
                            📸
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleImagePick}
                            />
                        </label>
                    </div>

                    <div className="flashRow" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                        <button className="btn" onClick={handleTranslate} disabled={loading} type="button">
                            {loading ? "Translating..." : "Translate"}
                        </button>

                        <button
                            className="btn"
                            onClick={handleClear}
                            type="button"
                        >
                            Clear
                        </button>
                    </div>

                    {err && (
                        <div className="metaLine" style={{ marginTop: 12 }}>
                            ❌ {err}
                        </div>
                    )}

                    {savedToast && (
                        <div className="metaLine" style={{ marginTop: 10 }}>
                            ✅ {savedToast}
                        </div>
                    )}

                    {result && (
                        <div style={{ marginTop: 14 }}>
                            <div className="hr" />

                            <div className="arabic" style={{ textAlign: "center" }}>
                                {result.arabic}
                            </div>

                            <div className="metaLine">
                                <span className="metaLabel">Transliteration:</span> {result.transliteration}
                            </div>
                            <div className="metaLine">
                                <span className="metaLabel">English:</span> {result.english}
                            </div>

                            <div className="flashRow" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                                <button className="btn" onClick={() => copy(result.arabic)} type="button">
                                    Copy Arabic
                                </button>
                                <button className="btn" onClick={() => copy(result.transliteration)} type="button">
                                    Copy Transliteration
                                </button>
                                <button className="btn" onClick={() => copy(result.english)} type="button">
                                    Copy English
                                </button>
                            </div>

                            {showSavePrompt && (
                                <div style={{ marginTop: 14 }}>
                                    <div className="hr" />

                                    <div className="metaLine">
                                        <span className="metaLabel">Save to category:</span>
                                    </div>

                                    <select
                                        className="select"
                                        value={saveCat}
                                        onChange={(e) => setSaveCat(e.target.value)}
                                        style={{ width: "100%", marginTop: 8 }}
                                    >
                                        {categoriesForSave.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flashRow" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                                        <button
                                            className="btn"
                                            type="button"
                                            onClick={() => {
                                                savePhrase({
                                                    ...result,
                                                    category:saveCat,
                                                    createdAt: new Date().toISOString(),
                                                    source: "translator",
                                                });
                                                refreshPhrases(); // instant UI update //

                                                setShowSavePrompt(false);
                                                showToast(`Saved to: ${saveCat}`);
                                            }}
                                        >
                                            💾 Save
                                        </button>

                                        <button
                                            className="btn"
                                            type="button"
                                            onClick={() => setShowSavePrompt(false)}
                                        >
                                            🙅🏽 Don't save
                                        </button>
                                    </div>
                                </div>
                            )}
                    </div>
                    )}
                </div>

                <div className="center" style={{margin: "10px 0 22px"}}>
                    <Link to="/flashcards" style={{ fontFamily: "Georgia, serif", fontSize: 26 }}>
                        🗒️ Flashcards 🗒️
                    </Link>
                </div>

                {/* Sections */}
                {filtered.map((cat) => {
                    const slug = slugify(cat.category);

                    return (
                    <div key={cat.category} id={`section-${slug}`}>
                        <h3 className="sectionTitle">
                            <span className="sectionEmoji">{getCategoryEmoji(cat.category)}</span>
                            {cat.category}
                        </h3>

                        {cat.phrases.map((p, idx) => (
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
                                    Category: {cat.category}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}

            {/* bottom centre back to the top */}
            <div className="center" style={{ margin: "30px 0 50px" }}>
                <button className="btn" onClick={scrollToTop}>
                    ⬆️ Back to the top
                </button>
            </div>
        </div>
    );
}

export default Home;
