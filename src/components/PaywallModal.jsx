import React from "react";

export default function PaywallModal({
    open,
    plan, // "basic" | "pro"
    priceText, // e.g. "£1.99/month"
    loading,
    error,
    onClose,
    onSubscribe,
    onRestore,
}) {
    if (!open) return null;

    const isPro = plan === "pro";

    const title = isPro ? "Upgrade to Pro" : "Unlock AI Translator";
    const subtitle = isPro
        ? "Get AI text + AI image translation (camera)."
        : "Get AI text translation.";

    const includes = isPro
        ? ["AI text translation", "AI image translation (📸 camera)"]
        : ["AI text translation"];

    return (
        <div
            className="modalBackdrop"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                zIndex: 9999,
            }}
        >
            <div
                className="modalCard"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "min(520px, 100%)",
                    borderRadius: 16,
                    padding: 16,
                    background: "var(--card, #111)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
                        <div className="metaLine" style={{ marginTop: 6 }}>
                            {subtitle}
                        </div>
                    </div>

                    <button className="btn" onClick={onClose} disabled={loading} aria-label="Close">
                        x
                    </button>
                </div>

                <div className="hr" style={{ margin: "12px 0" }} />

                <div className="metaLine" style={{ fontWeight: 700 }}>
                    What you unlock
                </div>

                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
                    {includes.map((x) => (
                        <li key={x} className="metaLine" style={{ marginTop: 6 }}>
                            {x}
                        </li>
                    ))}
                </ul>

                <div style={{ marginTop: 12 }}>
                    <div className="metaLine" style={{ fontWeight: 700 }}>
                        Price
                    </div>
                    <div className="metaLine" style={{ marginTop: 6 }}>
                        {priceText || "Loading price..."}
                    </div>
                </div>

                {error && (
                    <div className="metaLine" style={{ marginTop: 10 }}>
                        ❌ {error}
                    </div>
                )}

                <div
                    className="flashRow"
                    style={{
                        marginTop: 14,
                        justifyContent: "center",
                        gap: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <button className="btn btnActive" onClick={onSubscribe} disabled={loading}>
                        {loading ? "Processing..." : isPro ? "Upgrade" : "Unlock"}
                    </button>
                    <button className="btn" onClick={onClose} disabled={loading}>
                        Not now
                    </button>
                </div>

                <div className="hr" style={{ margin: "12px 0" }} />

                <div className="metaLine" style={{ textAlign: "center" }}>
                    Already subscribed?
                </div>

                <div className="flashRow" style={{ marginTop: 10, justifyContent: "center" }}>
                    <button className="btn" onClick={onRestore} disabled={loading}>
                        Restore Purchases
                    </button>
                </div>
            </div>
        </div>
    );
}
