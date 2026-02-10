export async function toJpegBlob(file, maxDim = 1280, quality = 0.8) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
    });

    const { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
    );

    URL.revokeObjectURL(img.src);

    if (!blob) throw new Error("Failed to convert image");
    return blob;
}
