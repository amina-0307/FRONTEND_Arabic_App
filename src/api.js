const BASE = import.meta.env.VITE_BACKEND_URL;

function requireBase() {
    if (!BASE) {
        throw new Error(
            "VITE_BACKEND_URL is missing. Add it to .env locally and Vercel project env vars, then redeploy."
        );
    }
}

export async function translateText({ text, direction }) {
    requireBase();

    const res = await fetch(`${BASE}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
        throw new Error(bodyText || "Translation failed");
    }

    return JSON.parse(bodyText);
}

export async function translateImage({ file, direction }) {
    requireBase();

    const fd = new FormData();
    fd.append("image", file);
    fd.append("direction", direction);

    const res = await fetch(`${BASE}/api/translate-image`, {
        method: "POST",
        body: fd,
    });

    const bodyText = await res.text();
    if (!res.ok) {
        throw new Error(bodyText || "Image translation failed");
    }

    return JSON.parse(bodyText);
}
