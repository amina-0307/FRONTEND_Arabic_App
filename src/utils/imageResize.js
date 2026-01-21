export async function resizeImage(file, maxW = 1280, quality = 0.75) {
    const url = URL.createObjectURL(file);
    const img = new Image();

    await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
    });

    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);

    URL.revokeObjectURL(url);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    return new File[blob], "upload.jpg", { type: "image/jpeg" };
}
