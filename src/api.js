import { toJpegBlob } from "./utils/imageResize.js";

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

    // convert iPhone image + resize to JPEG //
    const jpegBlob = await toJpegBlob(file);

    // build FormData correctly //
    const form = new FormData();
    form.append("image", jpegBlob, "upload.jpg");
    form.append("direction", direction);

    // send request //
    const res = await fetch(`${BASE}/api/translate-image`, {
        method: "POST",
        body: form,
    });

    // read response text FIRST (for debugging) //
    let details = "";
    try {
        details = await res.text();
    } catch {}

    // if backend failed, show REAL reason //
    if (!res.ok) {
        throw new Error(`Image translate failed (${res.status}): ${details}`);
    }

    // parse JSON only after we know it's ok //
    return JSON.parse(details);
}
