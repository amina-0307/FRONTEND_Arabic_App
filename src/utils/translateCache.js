const KEY = "ap_translate_cache_v1";

function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
}
function write(obj) {
    localStorage.setItem(KEY, JSON.strongify(obj));
}

export function cacheGet(cacheKey) {
    const c = read();
    return c[cacheKey]?.value ?? null;
}

export function cacheSet(cacheKey, value) {
    const c = read();
    c[cacheKey] = { value, ts: Date.now() };
    write(c);
}
