// Handles image resize UI
const $ = (id) => document.getElementById(id);

const file = $("file");
const dropzone = $("dropzone");
const pick = $("pick");
const source = $("source");
const preview = $("preview");
const thumbs = $("thumbs");
const meta = $("meta");
const change = $("change");
const width = $("width");
const height = $("height");
const lock = $("lock");
const hint = $("hint");
const savepath = $("savepath");
const resizeBtn = $("resize");
const statusEl = $("status");
const resultEl = $("result");
const outthumbs = $("outthumbs");
const outmeta = $("outmeta");
const MAX_IMAGES = 30;

let images = [];

pick.onclick = () => file.click();
dropzone.onclick = () => file.click();
change.onclick = () => file.click();
file.onchange = () => file.files.length && load(file.files);

function load(fileList) {
  const picked = [...fileList].filter((f) => f.type.startsWith("image/"));
  if (!picked.length) return fail("no images in that selection");
  statusEl.classList.remove("hidden");
  statusEl.style.color = "var(--dim)";
  statusEl.textContent = `reading ${picked.length} image${picked.length > 1 ? "s" : ""}\u2026`;
  (async () => {
    const loaded = [];
    for (const f of picked) {
      try {
        const dataUrl = await readAsDataURL(f);
        const d = await loadDims(dataUrl);
        loaded.push({ name: f.name, mime: f.type || "image/jpeg", dataUrl, w: d.w, h: d.h });
        if (loaded.length >= MAX_IMAGES) break;
      } catch (e) {}
    }
    statusEl.classList.add("hidden");
    if (!loaded.length) return fail("couldn't read those images");
    images = loaded;
    renderSource();
  })();
}

function readAsDataURL(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

function loadDims(dataUrl) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = rej;
    im.src = dataUrl;
  });
}

function renderSource() {
  const first = images[0];
  if (images.length === 1) {
    preview.src = first.dataUrl;
    preview.classList.remove("hidden");
    thumbs.classList.add("hidden");
    meta.textContent = `${first.w} \u00d7 ${first.h} \u00b7 ${first.name}`;
  } else {
    preview.classList.add("hidden");
    thumbs.classList.remove("hidden");
    thumbs.innerHTML = images.map((i) => `<img src="${i.dataUrl}" />`).join("");
    meta.textContent = `${images.length} images selected \u00b7 e.g. ${first.name}`;
  }
  width.value = first.w;
  height.value = first.h;
  dropzone.classList.add("hidden");
  source.classList.remove("hidden");
  resizeBtn.disabled = false;
  statusEl.classList.add("hidden");
  resultEl.classList.add("hidden");
}

function singleRatio() {
  return images[0] ? images[0].w / images[0].h : 1;
}

width.addEventListener("input", () => {
  if (lock.checked && width.value) height.value = Math.round(width.value / singleRatio());
});
height.addEventListener("input", () => {
  if (lock.checked && height.value) width.value = Math.round(height.value * singleRatio());
});

[width, height].forEach((inp) =>
  inp.addEventListener("input", () => {
    statusEl.classList.add("hidden");
    hint.textContent = "";
  })
);

resizeBtn.onclick = async () => {
  const w = Math.max(1, Math.round(+width.value || 0));
  const h = Math.max(1, Math.round(+height.value || 0));
  const lockOn = lock.checked;
  const locked = lockOn && images.length === 1;

  let geoFn;
  if (!lockOn || !locked) {
    if (w && h) geoFn = () => `${w}x${h}!`;
    else if (lockOn) {
      if (w) geoFn = () => `${w}x`;
      else if (h) geoFn = () => `x${h}`;
    }
  } else {
    if (w && h) geoFn = (img) => `${w}x${Math.round((w * img.h) / img.w)}!`;
    else if (w) geoFn = () => `${w}x`;
    else if (h) geoFn = () => `x${h}`;
  }
  if (!geoFn) {
    hint.textContent = lockOn ? "enter a width and/or height" : "enter a width and height";
    return;
  }
  if (!savepath.value.trim()) {
    hint.textContent = "enter a save path";
    return;
  }

  resizeBtn.disabled = true;
  resizeBtn.classList.add("loading");
  statusEl.classList.remove("hidden");
  statusEl.style.color = "var(--dim)";
  resultEl.classList.add("hidden");

  const dir = savepath.value.trim();
  const results = [];
  try {
    for (let i = 0; i < images.length; i++) {
      statusEl.textContent =
        images.length === 1 ? "resizing\u2026" : `resizing ${i + 1} / ${images.length} \u2014 ${images[i].name}`;
      const res = await fetch("/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl: images[i].dataUrl,
          mime: images[i].mime,
          geometry: geoFn(images[i]),
          savePath: dir,
          name: images[i].name,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Something went wrong.");
      }
      const saved = decodeURIComponent(res.headers.get("X-Saved-Path") || "");
      const blob = await res.blob();
      results.push({ url: URL.createObjectURL(blob), saved, size: blob.size });
    }
    renderResult(results);
  } catch (e) {
    if (results.length) renderResult(results, true);
    else {
      resizeBtn.disabled = false;
      resizeBtn.classList.remove("loading");
      statusEl.style.color = "#ff9b9b";
      statusEl.textContent = e.message;
    }
  }
};

function renderResult(results, partial) {
  outthumbs.innerHTML = results.map((r) => `<img src="${r.url}" />`).join("");
  const dir = results[0].saved.slice(0, results[0].saved.lastIndexOf("/")) || results[0].saved;
  if (results.length === 1) {
    const im = outthumbs.querySelector("img");
    outmeta.textContent = `saved to ${results[0].saved}${partial ? " (partial)" : ""}`;
    im.onload = () => {
      outmeta.textContent = `saved to ${results[0].saved} \u00b7 ${im.naturalWidth} \u00d7 ${im.naturalHeight} \u00b7 ${formatBytes(results[0].size)}`;
    };
  } else {
    outmeta.textContent = `saved ${results.length} file${results.length > 1 ? "s" : ""} to ${dir}${partial ? " (partial)" : ""}`;
  }
  resizeBtn.disabled = false;
  resizeBtn.classList.remove("loading");
  statusEl.classList.add("hidden");
  resultEl.classList.remove("hidden");
  scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}

function fail(msg) {
  statusEl.classList.remove("hidden");
  statusEl.style.color = "#ff9b9b";
  statusEl.textContent = msg;
}