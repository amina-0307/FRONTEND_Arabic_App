const BASE =
    import.meta.env.VITE_API_BASE_URL || "https://backendarabicappupdated.vercel.app/";

console.log("API BASE_URL =", BASE);

export async function translateText({ text, direction }) {
    const url = `${BASE}/api/translate`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

export async function translateImage({ file, direction }) {
    const url = `${BASE}/api/translate-image`;

    const fd = new FormData();
    fd.append("image", file);
    fd.append("direction", direction);

    const res = await fetch(url, {
        method: "POST",
        body: fd,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Image translation failed");
    return data;
}
