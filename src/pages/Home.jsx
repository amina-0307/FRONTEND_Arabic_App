import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

import PaywallModal from "../components/PaywallModal";

import { getOfferings, purchasePackage, restore } from "../revenuecat/purchases";

import { getCombinedPhrases } from "../utils/phraseData"; // live categories //
import { cacheGet, cacheSet } from "../utils/translateCache";
import { suggestCategory } from "../utils/categorySuggest";
import { savePhrase, exportSavedPhrases } from "../utils/savedPhrases";

import { translateText, translateImage } from "../api";
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

    // DEBUG: check what phrases are actually loading //
    useEffect(() => {
        console.log("getCombinedPhrases()", getCombinedPhrases());
        console.log("exportSavedPhrases()", exportSavedPhrases?.());
    }, []);

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
            .filter((cat) => cat.phrases.length > 0 && cat.category !== "Saved");
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
        return Array.from(new Set(["Other", ...names]));
    }, [phrases]);

    useEffect(() => {
        if (!savedToast) return;
        const t = setTimeout(() => setSavedToast(""), 2500);
        return () => clearTimeout(t);
    }, [savedToast]);

    const showToast = (msg) => setSavedToast(msg);

    const copy = (text) => navigator.clipboard.writeText(text || "");

    const BASIC_PRODUCT_ID = "ai_translator_monthly";
    const PRO_PRODUCT_ID = "ai_translator_pro_monthly";

    // RevenueCat access + paywall state //
    const [hasBasicAccess, setHasBasicAccess] = useState(false);
    const [hasProAccess, setHasProAccess] = useState(false);

    const [paywallOpen, setPaywallOpen] = useState(false);
    const [paywallPlan, setPaywallPlan] = useState("basic");
    const [paywallPriceText, setPaywallPriceText] = useState("");
    const [paywallBusy, setPaywallBusy] = useState(false);
    const [paywallErr, setPaywallErr] = useState("");

    const [basicPkg, setBasicPkg] = useState(null);
    const [proPkg, setProPkg] = useState(null);

    async function refreshAccess() {
        if (Capacitor.getPlatform() === "web") {
            setHasBasicAccess(false);
            setHasProAccess(false);
            return;
        }

        try {
            const info = await Purchases.getCustomerInfo();
            const active = info?.entitlements?.active ?? {};

            const pro = Boolean(active["pro"]);
            const basic = pro || Boolean(active["basic"]);

            setHasProAccess(pro);
            setHasBasicAccess(basic);
        } catch (e) {
            console.warn("RevenueCat not ready yet:", e);
            setHasBasicAccess(false);
            setHasProAccess(false);
        }
    }

    async function loadPackages() {
        if (Capacitor.getPlatform() === "web") return;

        const offerings = await getOfferings();
        const current = offerings?.current;
        const pkgs = current?.availablePackages || [];

        const foundBasic = pkgs.find((p) => p?.product?.identifier === BASIC_PRODUCT_ID) || null;
        const foundPro = pkgs.find((p) => p?.product?.identifier === PRO_PRODUCT_ID) || null;

        setBasicPkg(foundBasic);
        setProPkg(foundPro);

        return { foundBasic, foundPro };
    }

    function priceFor(plan) {
        const pkg = plan === "pro" ? proPkg : basicPkg;
        return pkg?.product?.priceString ? `${pkg.product.priceString}/month`: "";
    }

    async function openPaywall(plan) {
        setPaywallPlan(plan);
        setPaywallErr("");
        setPaywallPriceText("");
        setPaywallOpen(true);

        try {
            if (!basicPkg || !proPkg) {
                await loadPackages();
            }
            setPaywallPriceText(priceFor(plan) || "");
        } catch (e) {
            console.warn("Could not load offerings:", e);
            setPaywallErr(e?.message || "Could not load offerings");
        }
    }

    function closePaywall() {
        setPaywallOpen(false);
        setPaywallErr("");
        setPaywallBusy(false);
    }

    async function handleSubscribe() {
        setPaywallBusy(true);
        setPaywallErr("");

        try {
            if (!basicPkg && !proPkg) await loadPackages();
            const pkg = paywallPlan === "pro" ? proPkg : basicPkg;
            if (!pkg) throw new Error("Subscription package not found in Offerings");

            await purchasePackage(pkg);
            await refreshAccess();
            closePaywall();
        } catch (e) {
            setPaywallErr(e?.message || "Purchase failed");
        } finally {
            setPaywallBusy(false);
        }
    }

    async function handleRestorePurchases() {
        setPaywallBusy(true);
        setPaywallErr("");

        try {
            await restore();
            await refreshAccess();
            closePaywall();
        } catch (e) {
            setPaywallErr(e?.message || "Restore failed");
        } finally {
            setPaywallBusy(false);
        }
    }

    // load access + offerings on count //
    useEffect(() => {
        refreshAccess().catch(console.error);
        loadPackages().catch(() => {});
    }, []);

    // translator handlers //
    async function handleTranslate() {
        setErr("");
        setResult(null);
        setShowSavePrompt(false);

        const text = inputText.trim();
        if (!text) return;

        // if user does not have Basic access, open paywall instead of calling API //
        if (!hasBasicAccess) {
            openPaywall("basic");
            return;
        }

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

            // normalise english field so UI + saving is consistent //
            const normalized = {
                ...data,
                english: data.english ?? data.translation ?? "",
            };

            setResult(normalized);
            cacheSet(cacheKey, normalized);
            setSaveCat(suggestCategory(normalized) || "Other");
            setShowSavePrompt(true);
        } catch (e) {
            const msg = e?.message || "Something went wrong";

            // if backend blocks, show paywall //
            if (msg.includes("Subscription required") || msg.includes("403")) {
                openPaywall("basic");
                return;
            }

            setErr(msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleImagePick(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Pro required for image translation //
        if (!hasProAccess) {
            openPaywall("pro");
            e.target.value = "";
            return;
        }

        if (!canUseImage()) {
            const u = getUsage();
            setErr(`Image limit reached: ${u.used}/${IMAGE_LIMIT}`);
            e.target.value = "";
            return;
        }

        try {
            setErr("");
            setResult(null);
            setShowSavePrompt(false);
            setLoading(true);

            // api.js now handles conversion to jpeg via toJpegBlob() //
            const data = await translateImage({ file, direction });

            const normalized = {
                ...data,
                english: data.english ?? data.translation ?? "",
            };

            setResult(normalized);
            incrementUsage();

            setSaveCat(suggestCategory(normalized) || "Other");
            setShowSavePrompt(true);
        } catch (e2) {
            const msg = e2?.message || "Image translation failed";

            if (msg.includes("Subscription required") || msg.includes("403")) {
                openPaywall("pro");
                return;
            }

            setErr(msg);
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

    // Save handler - normalises fields + forces refresh //
    function handleSave() {
        if (!result) return;

        const trimmedInput = inputText.trim();

        // for en_to_ar: "english meaning" is what user typed //
        // for ar_to_en: "english meaning" is model output //
        const englishValue =
            direction === "en_to_ar" 
                ? trimmedInput
                : (result.english ?? result.translation ?? result.englishText ?? "");

        const phraseToSave = {
            id: crypto.randomUUID(), // helpful for stable rendering/merging //
            category: saveCat,
            createdAt: new Date().toISOString(),
            source: "translator",

            arabic: result.arabic || "",
            transliteration: result.transliteration || "",
            english: englishValue,
        };

        // don't save empty junk //
        if (!phraseToSave.arabic || !phraseToSave.english) {
            console.warn("Not saving: missing arabic/english", {phraseToSave, result});
            showToast("Not saved (missing fields)");
            return;
        }

        // save locally //
        savePhrase(phraseToSave);

        // force any liteners + this page to refresh //
        window.dispatchEvent(new Event("savedPhrasesUpdated"));
        refreshPhrases();

        setShowSavePrompt(false);
        showToast(`Saved to: ${saveCat} ✅ (Tip: press Push to back up to the cloud)`);

        // DEBUG //
        console.log("Saved phrase:", phraseToSave);
        console.log("exportSavedPhrases()", exportSavedPhrases?.());
    }

    // Sync //
    const [syncKeyState, setSyncKeyState] = useState(() => getSyncKey());
    const [syncBusy, setSyncBusy] = useState(false);
    const [syncMsg, setSyncMsg] = useState("");

    useEffect(() => {
        if (!syncMsg) return;
        const t = setTimeout(() => setSyncMsg(""), 3500);
        return () => clearTimeout(t);
    }, [syncMsg]);

    const syncToast = (msg) => setSyncMsg(msg);

    async function handleSyncPull() {
        try {
            setSyncBusy(true);
            if (!syncKeyState) return syncToast("Enter a sync code first");
            await syncPull(syncKeyState);

            // after pulling into storage //
            window.dispatchEvent(new Event("savedPhrasesUpdated"));
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
        // if a key already exists, warn the user that new key will create new cloud vault //
        if (syncKeyState && syncKeyState.trim()) {
            const ok = window.confirm(
                "You already have a sync code. \n\nCreating a new one will start a NEW cloud backup vault, and you will need to use the NEW code to Pull. \n\nDo you want to create a new sync code?"
            );
            if (!ok) return;
        }

        const key = generateSyncKey();
        setSyncKey(key);
        setSyncKeyState(key);
        syncToast("New sync code created ✨ (Copy it somewhere safe)");
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
            {/* Paywall Modal */}
            <PaywallModal
                open={paywallOpen}
                plan={paywallPlan}
                priceText={paywallPriceText}
                loading={paywallBusy}
                error={paywallErr}
                onClose={closePaywall}
                onSubscribe={handleSubscribe}
                onRestore={handleRestorePurchases}
            />

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

            <h1 className="h1">Arabic Phrases & AI Translator</h1>
            <div className="hr" />

            <h2 className="h2">🧠 AI Translator</h2>

            {/* translator card (gated)*/}
            {hasBasicAccess ? (
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

                        {/* 📸 only for Pro */}
                        {hasProAccess && (
                            <label className="iconBtn" title="Upload image">
                                📸
                                <input type="file" accept="image/*" hidden onChange={handleImagePick} />
                            </label>
                        )}
                    </div>

                    <div className="flashRow" style={{ justifyContent: "flex-start" }}>
                        <button className="btn" onClick={handleTranslate} disabled={loading}>
                            {loading ? "Translating..." : "Translate"}
                        </button>
                        <button className="btn" onClick={handleClear}>
                            Clear
                        </button>

                        {/* upsell button */}
                        {!hasProAccess && (
                            <button className="btn" onClick={() => openPaywall("pro")} disabled={loading}>
                                Upgrade to Pro 📸
                            </button>
                        )}
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

                        {/* show correct english for en_to_ar */}
                            <div className="metaLine">
                                <b>English: </b>{""}
                                {direction === "en_to_ar"
                                    ? (inputText.trim() || result.english || result.translation || "")
                                    : (result.english || result.translation || "")}
                            </div>

                            <div className="flashRow">
                                <button className="btn" onClick={() => copy(result.arabic)}>
                                    Copy Arabic
                                </button>
                                <button className="btn" onClick={() => copy(result.transliteration)}>
                                    Copy Transliteration
                                </button>
                                <button 
                                    className="btn"
                                    onClick={() => 
                                        copy(
                                            direction === "en_to_ar"
                                                ? (inputText.trim() || result.english || result.translation || "")
                                                : (result.english || result.translation || "")
                                        )
                                    }
                                >
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
                                            onClick={handleSave}
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
                ) : (
                    <div className="card">
                        <div className="metaLine" style={{ textAlign: "center" }}>
                            🔒 AI Translator is locked
                        </div>

                        <div className="flashRow" style={{ justifyContent: "center", gap: 10 }}>
                            <button className="btn" onClick={() => openPaywall("basic")}>
                                Unlock AI Translator
                            </button>
                            <button className="btn" onClick={() => openPaywall("pro")}>
                                Upgrade to Pro
                            </button>
                        </div>

                        <div className="metaLine" style={{ textAlign: "center", marginTop: 10}}>
                            Already subscribed? Tap either button, then use <b>Restore Purchases</b>.
                        </div>
                    </div>
                )}

            {/* Sync */}
            <h2 className="h2">☁️ Cloud Backup (Sync)</h2>
            <div className="card">
                <div className="metaLine" style={{ lineHeight: 1.5 }}>
                    <b>Cloud Backup (Sync):</b><br />
                    Sync lets you keep your saved phrases safe if you change device or reinstall the app.<br />
                    <br />
                    <b>Steps:</b><br />
                    1. Create a sync code once and save it somewhere safe.<br />
                    2. When you save new phrases, press <b>Push</b> to upload them to the cloud.<br />
                    3. On another device, enter the same code and press <b>Pull</b> to get your phrases back.<br />
                    <br />
                    ⚠️ Your sync code is the only way to access your cloud backup.
                </div>

                <div className="hr" />

                <input
                    className="input"
                    style={{ width: "100%", marginTop: 10 }}
                    placeholder="Enter sync code"
                    value={syncKeyState}
                    onChange={(e) => setSyncKeyState(e.target.value)}
                />

                <div className="flashRow">
                    <button className="btn" onClick={handleCreateSync} disabled={syncBusy}>
                        ✨ Create
                    </button>

                    <button className="btn" onClick={handleSaveSync} disabled={syncBusy || !syncKeyState}>
                        💾 Save
                    </button>

                    <button
                        className="btn"
                        onClick={() => {
                            navigator.clipboard.writeText(syncKeyState || "");
                            syncToast("Sync code copied 📋");
                        }}
                        disabled={syncBusy || !syncKeyState}
                        >
                            📋 Copy Code
                    </button>

                    <button className="btn" onClick={handleClearSync} disabled={syncBusy}>
                        🚮 Remove
                    </button>
                </div>

                <div className="flashRow">
                    <button className="btn" onClick={handleSyncPull} disabled={syncBusy}>
                        ⬇️ Pull
                    </button>
                    <button className="btn" onClick={handleSyncPush} disabled={syncBusy}>
                        ⬆️ Push
                    </button>
                </div>

                {syncMsg && <div className="metaLine">{syncMsg}</div>}
            </div>

            {/* phrasecards */}
            {filtered
                .filter((cat) => cat.category !== "Saved")
                .map((cat) => {
                    const slug = slugify(cat.category);

                return (
                    <div key={cat.category} id={`section-${slug}`}>
                        <h3 className="sectionTitle">
                            <span className="sectionEmoji">{getCategoryEmoji(cat.category)}</span>
                            {cat.category}
                        </h3>

                        {cat.phrases.map((p, idx) => (
                            <div className="card" key={p.id || idx}>
                                <div className="arabic">{p.arabic}</div>

                                <div className="metaLine">
                                    <span className="metaLabel">Meaning:</span> {p.english}
                                </div>

                                <div className="metaLine">
                                    <span className="metaLabel">Transliteration:</span> {p.transliteration}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}

            <div className="center" style={{ margin: "30px 0 50px" }}>
                <button className="btn" onClick={scrollToTop}>
                    ⬆️ Back to the top
                </button>
            </div>
        </div>
    );

}

export default Home;
        