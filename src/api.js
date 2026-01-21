const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5055";
console.log("API BASE_URL =", BASE_URL);

export async function translateText({ text, direction }) {
    const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5055";
    const url = `${BASE}/api/translate`;
    console.log("Calling:", url);

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        console.error("API error:", res.status, data);
        throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
}

export async function translateImage({ file, direction }) {
    const base = import.meta.env.VITE_API_BASE_URL;

    const fd = new FormData();
    fd.append("image", file);
    fd.append("direction", direction);

    const res = await fetch (`${base}/api/translate-image`, {
        method: "POST",
        body: fd,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Image translation failed");
    return data;
}
