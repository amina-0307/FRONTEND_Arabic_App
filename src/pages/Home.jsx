import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { getCombinedPhrases } from "../utils/phraseData"; // if you want live categories //
import { cacheGet, cacheSet } from "../utils/translateCache";
import { suggestCategory } from "../utils/categorySuggest";
import { savePhrase } from "../utils/savedPhrases";

import { translateText, translateImage } from "../api";
import { resizeImage } from "../utils/imageResize";
import { canUseImage, incrementUsage, getUsage, IMAGE_LIMIT } from "../utils/imageCap";

import { syncPull, syncPush } from "../utils/sync";
import { getSyncKey, setSyncKey, clearSyncKey, generateSyncKey } from "../utils/syncCode";

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
        Other: "🗃️",
    };

    const getCategoryEmoji = (name) => emojiMap[name] || "📌";

    // phrases //
    const [phrases, setPhrases] = useState(() => getCombinedPhrases());

    // Helper to reload from storage + base json //
    const refreshPhrases = () => {
        setPhrases(getCombinedPhrases());
    };

    // If user switches tabs/windows, refresh too) //
    useEffect(() => {
        const onUpdate = () => refreshPhrases();
        window.addEventListener("savedPhrasesUpdated", onUpdate);
        window.addEventListener("storage", onUpdate);
        return () => {
            window.removeEventListener("savedPhrasesUpdated", onUpdate);
            window.removeEventListener("storage", onUpdate);
        };
    }, []);

    // Search + jump //
    const [query, setQuery] = useState("");
    const [jumpTo, setJumpTo] = useState("");

    const categories = useMemo(
        () => phrases.map((c) => c.category),
        [phrases]
    );

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
        document
            .getElementById(`section-${slug}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

    // Save //
    const [saveCat, setSaveCat] = useState("Other");
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [savedToast, setSavedToast] = useState("");

    const categoriesForSave = useMemo(() => {
        const names = phrases.map((c) => c.category);
        return Array.from(new Set(["Saved", "Other", ...names]));
    }, [phrases]);

    const showToast = (msg) => {
        setSavedToast(msg);
        setTimeout(() => setSavedToast(""), 2500);
    };

    const copy = (text) => navigator.clipboard.writeText(text || "");

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
            setSaveCat(suggestCategory(cached) || "Other");
            setShowSavePrompt(true);
            return;
        }

        try {
            setLoading(true);
            const data = await translateText({ text, direction });
            setResult(data);
            cacheSet(cacheKey, data);
            setSaveCat(suggestCategory(data) || "Other");
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

        if (!canUseImage()) {
            const u = getUsage();
            setErr(`Image limit reached: ${u.used}/${IMAGE_LIMIT}`);
            e.target.value = "";
            return;
        }

        try {
            setLoading(true);

            const resized = await resizeImage(file);
            const data = await translateImage({ file: resized, direction });

            incrementUsage();
            setResult(data);

            setSaveCat(suggestCategory(data) || "Other");
            setShowSavePrompt(true);
        } catch {
            setErr("Image translation failed");
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
        setSaveCat("Other");
    }

    // Sync //
    const [syncKeyState, setSyncKeyState] = useState(() => getSyncKey());
    const [syncBusy, setSyncBusy] = useState(false);
    const [syncMsg, setSyncMsg] = useState("");

    const syncToast = (msg) => {
        setSyncMsg(msg);
        setTimeout(() => setSyncMsg(""), 3500);
    };

    async function handleSyncPull() {
        try {
            setSyncBusy(true);
            if (!syncKeyState) return syncToast("Enter a sync code first");
            await syncPull(syncKeyState);
            refreshPhrases();
            syncToast("Pulled from cloud ✅");
        } catch {
            syncToast("Sync pull failed");
        } finally {
            setSyncBusy(false);
        }
    }

    async function handleSyncPush() {
        try {
            setSyncBusy(true);
            if (!syncKeyState) return syncToast("Enter a sync code first");
            const out = await syncPush(syncKeyState);
            syncToast(`Pushed (${out.count}) ✅`);
        } catch {
            syncToast("Sync push failed");
        } finally {
            setSyncBusy(false);
        }
    }

    const handleCreateSync = () => {
        const key = generateSyncKey();
        setSyncKey(key);
        setSyncKeyState(key);
        syncToast("New sync code created ✨");
    };

    const handleSaveSync = () => {
        setSyncKey(syncKeyState);
        syncToast("Sync code saved 💾");
    };

    const handleClearSync = () => {
        clearSyncKey();
        setSyncKeyState("");
        syncToast("Sync removed 🚮");
    };

    // UI //
    return (
        <div className="page">
            {/* search + jump */}
            <div className="top-controls">
                <input
                    className="input search-input"
                    placeholder="Search phrases..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <select
                    className="select jump-select"
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

            {/* translator card */}
            <div className="card">
                <div className="flashRow" style={{ justifyContent: "flex-start" }}>
                    <button 
                        className={`btn ${direction === "en_to_ar" ? "btnActive" : ""}`}
                        onClick={() => setDirection("en_to_ar")}
                    >
                        English → Arabic
                    </button>
                    <button
                        className={`btn ${direction === "ar_to_en" ? "btnActive" : ""}`}
                        onClick={() => setDirection("ar_to_en")}
                    >
                        Arabic → English
                    </button>
                </div>

                <div className="translatorRow" style={{ marginTop: 12 }}>
                    <input
                        className="input"
                        placeholder={
                            direction === "en_to_ar" ? "Type English..." : "اكتب بالعربي..."
                        }
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
                    />

                    <label className="iconBtn" title="Upload image">
                        📸
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleImagePick}
                        />
                    </label>
                </div>

                <div className="flashRow" style={{ justifyContent: "flex-start" }}>
                    <button className="btn" onClick={handleTranslate} disabled={loading}>
                        {loading ? "Translating..." : "Translate"}
                    </button>
                    <button className="btn" onClick={handleClear}>
                        Clear
                    </button>
                </div>

                {err && <div className="metaLine">❌ {err}</div>}
                {savedToast && <div className="metaLine">✅ {savedToast}</div>}

                {result && (
                    <>
                        <div className="hr" />
                        <div className="arabic" style={{ textAlign: "center" }}>
                            {result.arabic}
                        </div>
                        <div className="metaLine">
                            <b>Transliteration:</b> {result.transliteration}
                        </div>
                        <div className="metaLine">
                            <b>English:</b> {result.english}
                        </div>

                        <div className="flashRow">
                            <button className="btn" onClick={() => copy(result.arabic)}>
                                Copy Arabic
                            </button>
                            <button className="btn" onClick={() => copy(result.transliteration)}>
                                Copy Transliteration
                            </button>
                            <button className="btn" onClick={() => copy(result.english)}>
                                Copy English
                            </button>
                        </div>

                        {showSavePrompt && (
                            <>
                                <div className="hr" />
                                <select
                                    className="select"
                                    value={saveCat}
                                    onChange={(e) => setSaveCat(e.target.value)}
                                >
                                    {categoriesForSave.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>

                                <div className="flashRow">
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            savePhrase({
                                                ...result,
                                                category: saveCat,
                                                createdAt: new Date().toISOString(),
                                                source: "translator",
                                            });
                                            refreshPhrases();
                                            setShowSavePrompt(false);
                                            showToast(`Saved to: ${saveCat}`);
                                        }}
                                    >
                                        💾 Save
                                    </button>
                                    <button 
                                        className="btn"
                                        onClick={() => setShowSavePrompt(false)}
                                    >
                                        🙅🏽 Don't save
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Sync */}
            <h2 className="h2">☁️ Sync</h2>
            <div className="card">
                <input
                    className="input"
                    style={{ width: "100%", marginTop: 10 }}
                    placeholder="Enter sync code"
                    value={syncKeyState}
                    onChange={(e) => setSyncKeyState(e.target.value)}
                />

                <div className="flashRow">
                    <button className="btn" onClick={handleCreateSync}>
                        ✨ Create
                    </button>
                    <button className="btn" onClick={handleSaveSync}>
                        💾 Save
                    </button>
                    <button className="btn" onClick={handleClearSync}>
                        🚮 Remove
                    </button>
                </div>

                <div className="flashRow">
                    <button className="btn" onClick={handleSyncPull}>
                        ⬇️ Pull
                    </button>
                    <button className="btn" onClick={handleSyncPush}>
                        ⬆️ Push
                    </button>
                </div>

                {syncMsg && <div className="metaLine">{syncMsg}</div>}
            </div>

            <div className="center" style={{ margin: "30px 0 50px" }}>
                <button className="btn" onClick={scrollToTop}>
                    ⬆️ Back to the top
                </button>
            </div>
        </div>
    );
}

export default Home;
                   