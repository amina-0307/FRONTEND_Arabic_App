const BASE = import.meta.env.VITE_BACKEND_URL;

export async function translateText({ text, direction }) {
    const res = await fetch(`${BASE}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction }),
    });

    if (!res.ok) throw new Error("Translation failed");
    return res.json();
}

export async function translateImage({ file, direction }) {
    const res = await fetch(`${BASE}/api/translate-image`, {
        method: "POST",
        body: fd,
    });

    if (!res.ok) throw new Error("Image translation failed");
    return res.json;
}
