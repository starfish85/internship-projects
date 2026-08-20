#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const ASSET_HTML = path.join(ROOT, "assets", "request-workbench.html");
const TRIPCOM_SCRIPT = path.join(ROOT, "scripts", "tripcom_select_request.cjs");
const RUN_DIR = path.join(ROOT, "examples", "workbench-runs");
const UPLOAD_DIR = path.join(RUN_DIR, "uploads");
const NODE_BIN = process.execPath;
const PORT = Number(process.env.PORT || process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1] || 8787);
const MAX_BODY_BYTES = 15 * 1024 * 1024;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
    res.end(data);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("上传内容过大，请压缩图片或改用文本输入。"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("请求格式不是有效 JSON。"));
      }
    });
    req.on("error", reject);
  });
}

function slugTime() {
  const now = new Date();
  return now.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
}

function saveImageFromDataUrl(image) {
  if (!image || !image.dataUrl) return null;
  const match = String(image.dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("图片格式无效，请上传 png/jpg/webp 等常见图片。");

  const extByType = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  const ext = extByType[match[1].toLowerCase()] || ".png";
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const safeName = path.basename(image.name || `request-${slugTime()}${ext}`).replace(/[^\w.-]+/g, "_");
  const target = path.join(UPLOAD_DIR, `${slugTime()}-${safeName.endsWith(ext) ? safeName : safeName + ext}`);
  fs.writeFileSync(target, Buffer.from(match[2], "base64"));
  return target;
}

async function tryOcr(imagePath) {
  if (!imagePath) return { text: "", ok: false, reason: "no_image" };
  let Tesseract;
  try {
    Tesseract = require("tesseract.js");
  } catch (error) {
    return { text: "", ok: false, reason: `OCR 依赖不可用：${error.message}` };
  }

  try {
    const cachePath = path.join(ROOT, ".cache", "tesseract");
    fs.mkdirSync(cachePath, { recursive: true });
    const result = await Tesseract.recognize(imagePath, "chi_sim+chi_tra+eng", {
      cachePath,
      gzip: true,
    });
    const text = String(result?.data?.text || "").trim();
    return { text, ok: Boolean(text), reason: text ? null : "OCR 没有识别出文字" };
  } catch (error) {
    return { text: "", ok: false, reason: `OCR 失败：${error.message}` };
  }
}

function runNodeScript(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(NODE_BIN, [TRIPCOM_SCRIPT, ...args], {
      cwd: ROOT,
      windowsHide: true,
      env: { ...process.env, NODE_PATH: path.join(path.dirname(NODE_BIN), "..", "node_modules") },
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("查询超时，已停止本次任务。"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `脚本退出码 ${code}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function resolveInput(payload) {
  const imagePath = saveImageFromDataUrl(payload.image);
  const typedText = String(payload.text || "").trim();
  const inputSource = payload.inputSource === "image" ? "image" : "text";

  if (inputSource === "text" && typedText) {
    return { text: typedText, imagePath, ocr: imagePath ? { ok: false, text: "", reason: "本次按最新文本输入识别；图片未参与本次识别。" } : null, inputSource };
  }

  const ocr = await tryOcr(imagePath);
  if (!ocr.ok) {
    const message = imagePath
      ? `${ocr.reason}。请重新上传可辨识的需求截图，或改为输入文本需求。`
      : "请填写文本需求，或上传包含需求文字的图片。";
    const error = new Error(message);
    error.imagePath = imagePath;
    error.ocr = ocr;
    throw error;
  }
  return { text: ocr.text, imagePath, ocr, inputSource: "image" };
}

async function handleExtract(req, res) {
  try {
    const payload = await readRequestBody(req);
    const input = await resolveInput(payload);
    const { stdout } = await runNodeScript(["--text", input.text, "--extract-only"], 20000);
    const parsed = JSON.parse(stdout);
    sendJson(res, 200, {
      ok: true,
      sourceText: input.text,
      imagePath: input.imagePath,
      imageFileUrl: input.imagePath ? pathToFileURL(input.imagePath).href : null,
      ocr: input.ocr,
      inputSource: input.inputSource,
      request: parsed.request,
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message, imagePath: error.imagePath || null, ocr: error.ocr || null });
  }
}

async function handleQuery(req, res) {
  try {
    const payload = await readRequestBody(req);
    const input = await resolveInput(payload);
    fs.mkdirSync(RUN_DIR, { recursive: true });
    const id = `run-${slugTime()}`;
    const jsonPath = path.join(RUN_DIR, `${id}.json`);
    const htmlPath = path.join(RUN_DIR, `${id}.html`);
    const args = [
      "--text", input.text,
      "--output", jsonPath,
      "--html-output", htmlPath,
      "--max-trains", String(Number(payload.maxTrains || 12)),
    ];
    const { stdout } = await runNodeScript(args, Number(payload.timeoutMs || 180000));
    const result = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, "utf8")) : JSON.parse(stdout);
    sendJson(res, 200, {
      ok: true,
      sourceText: input.text,
      imagePath: input.imagePath,
      imageFileUrl: input.imagePath ? pathToFileURL(input.imagePath).href : null,
      ocr: input.ocr,
      inputSource: input.inputSource,
      result,
      jsonPath,
      htmlPath,
      htmlUrl: `/reports/${path.basename(htmlPath)}`,
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message, imagePath: error.imagePath || null, ocr: error.ocr || null });
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
    if (req.method === "GET" && url.pathname === "/") {
      sendFile(res, ASSET_HTML, "text/html; charset=utf-8");
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/reports/")) {
      const fileName = path.basename(decodeURIComponent(url.pathname.slice("/reports/".length)));
      sendFile(res, path.join(RUN_DIR, fileName), "text/html; charset=utf-8");
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/extract") {
      handleExtract(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/query") {
      handleQuery(req, res);
      return;
    }
    sendJson(res, 404, { ok: false, error: "not found" });
  });
}

if (require.main === module) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  createServer().listen(PORT, "127.0.0.1", () => {
    console.log(`Shinkansen workbench: http://127.0.0.1:${PORT}/`);
  });
}

module.exports = { createServer };
