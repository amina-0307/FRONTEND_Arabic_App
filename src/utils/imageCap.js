const KEY = "ap_img_cap_v1";
export const IMAGE_LIMIT = 30;

function monthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getUsage() {
    try {
        const data = JSON.parse(localStorage.getItem(KEY) || "{}");
        const mk = monthKey();
        if (data.month !== mk) return { month: mk, used: 0 };
        return data;
    } catch {
        return { month: monthKey(), used: 0 };
    }
}

export function canUseImage() {
    return getUsage().used < IMAGE_LIMIT;
}

export function incrementUsage() {
    const cur = getUsage();
    const next = { month: cur.month, used: cur.used + 1};
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
}
