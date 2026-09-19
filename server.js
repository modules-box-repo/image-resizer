// Local resize server backed by ImageMagick
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");

const PORT = process.env.PORT || 3000;
const HOST = "127.0.0.1";
const ROOT = __dirname;
const MAX_BODY = 64 * 1024 * 1024;

const MAGICK = detectMagick();
function detectMagick() {
  for (const bin of ["magick", "convert"]) {
    try {
      execFile(bin, ["-version"], { timeout: 5000 });
      return bin;
    } catch (e) {}
  }
  return null;
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const GEO_RE = /^(\d{1,5}x\d{1,5}!?|\d{1,5}x|x\d{1,5})$/;

function outExt(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  return "png";
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = Buffer.alloc(0);
    req.on("data", (c) => {
      data = Buffer.concat([data, c]);
      if (data.length > MAX_BODY) {
        reject(new Error("File too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function serveStatic(req, res, urlpath) {
  let file = urlpath === "/" ? "index.html" : urlpath.slice(1);
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("404 not found");
      return;
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

async function handleResize(req, res) {
  if (!MAGICK) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "ImageMagick (magick/convert) not found. Install it first." }));
    return;
  }
  let body;
  try {
    body = JSON.parse((await readBody(req)).toString("utf8"));
  } catch (e) {
    return json(res, 400, { error: "Bad request: " + e.message });
  }

  if (!body.dataUrl || typeof body.dataUrl !== "string" || !GEO_RE.test(body.geometry || "")) {
    return json(res, 400, { error: "Missing dataUrl or invalid dimensions." });
  }

  const b64 = body.dataUrl.split(",")[1];
  if (!b64) return json(res, 400, { error: "Invalid image data." });

  if (typeof body.savePath !== "string" || !body.savePath.trim()) {
    return json(res, 400, { error: "Missing save path." });
  }

  const mime = (body.mime || "image/jpeg").split(";")[0];
  const inExt = outExt(mime);
  const outE = outExt(mime);
  const id = crypto.randomBytes(8).toString("hex");
  const inFile = path.join(os.tmpdir(), `res-${id}.${inExt}`);

  const cleanName = String(body.name || "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\- .]+/g, "_");
  const derived = `${cleanName}-resized.${outE}`;
  const savePath = body.savePath.trim();
  let outFile = /\.(jpe?g|png|webp|gif)$/i.test(savePath)
    ? savePath
    : path.join(savePath, derived);

  try {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(inFile, Buffer.from(b64, "base64"));
    await run(MAGICK, [inFile, "-resize", body.geometry, "-strip", outFile]);
    const data = fs.readFileSync(outFile);
    const finalMime = outE === "jpg" ? "image/jpeg" : "image/" + outE;
    res.writeHead(200, {
      "Content-Type": finalMime,
      "Content-Length": data.length,
      "Cache-Control": "no-store",
      "X-Saved-Path": encodeURIComponent(outFile),
      "X-Output-Size": data.length,
    });
    res.end(data);
  } catch (e) {
    json(res, 500, { error: "ImageMagick failed: " + String(e.message || e).slice(0, 300) });
  } finally {
    fs.unlink(inFile, () => {});
  }
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (req.method === "POST" && url.pathname === "/resize") {
      return handleResize(req, res);
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, magick: MAGICK });
    }
    serveStatic(req, res, url.pathname);
  })
  .listen(PORT, HOST, () => {
    console.log("image resizer running at http://localhost:" + PORT);
    console.log("ImageMagick:", MAGICK ? "OK (" + MAGICK + ")" : "MISSING — install with: pkg install imagemagick");
  });