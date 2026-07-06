import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const docsPath = path.join(root, "docs", "index.html");
const assetDir = path.join(root, "docs", "assets", "images");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "galaxy-maker-images-"));
const readFromHead = process.argv.includes("--from-head");

const targets = {
  background: { maxSize: 1600, quality: "82" },
  logo: { maxSize: 1200, quality: "82" },
  star: { maxSize: 520, quality: "82" },
  standing: { maxSize: 768, quality: "82" },
  scene: { maxSize: 960, quality: "82" },
  character: { maxSize: 768, quality: "82" },
};

function runSips(args) {
  const result = spawnSync("sips", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `sips failed: ${args.join(" ")}`);
  }
}

function sanitize(value, fallback = "image") {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64"),
  };
}

function pngInfo(buffer) {
  if (buffer.length < 33 || buffer.toString("ascii", 12, 16) !== "IHDR") {
    return { width: 0, height: 0, hasAlpha: false };
  }

  let offset = 8;
  let hasTransparencyChunk = false;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "tRNS") hasTransparencyChunk = true;
    offset += 12 + length;
  }

  const colorType = buffer[25];
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6 || hasTransparencyChunk,
  };
}

function relativeAssetPath(filePath) {
  return path.posix.join("assets", "images", path.basename(filePath));
}

function convertImage(dataUrl, baseName, kind) {
  if (!dataUrl) return "";
  if (assetCache.has(dataUrl)) return assetCache.get(dataUrl);

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;

  const info = parsed.mimeType === "image/png" ? pngInfo(parsed.buffer) : { hasAlpha: false };
  const target = targets[kind] || targets.character;
  const rawExt = parsed.mimeType.split("/")[1] || "png";
  const rawPath = path.join(tmpDir, `${baseName}.${rawExt}`);
  fs.writeFileSync(rawPath, parsed.buffer);

  const canUseJpeg = !info.hasAlpha && (kind === "background" || kind === "scene");
  const finalExt = canUseJpeg ? "jpg" : "png";
  const finalPath = path.join(assetDir, `${baseName}.${finalExt}`);

  if (canUseJpeg) {
    runSips(["-s", "format", "jpeg", "-s", "formatOptions", target.quality, "-Z", String(target.maxSize), rawPath, "--out", finalPath]);
  } else {
    runSips(["-Z", String(target.maxSize), rawPath, "--out", finalPath]);
    if (fs.statSync(finalPath).size > parsed.buffer.length) {
      fs.copyFileSync(rawPath, finalPath);
    }
  }

  const relativePath = relativeAssetPath(finalPath);
  assetCache.set(dataUrl, relativePath);
  stats.push({
    path: relativePath,
    kind,
    sourceBytes: parsed.buffer.length,
    outputBytes: fs.statSync(finalPath).size,
    width: info.width,
    height: info.height,
  });
  return relativePath;
}

function replacePublicRuntime(html) {
  return html
    .replace(
      `return '<' + tag + ' class="' + className + '"><img alt="' + escapeAttr(alt) + '" src="' + escapeAttr(src) + '" /></' + tag + '>';`,
      `return '<' + tag + ' class="' + className + '"><img loading="lazy" decoding="async" alt="' + escapeAttr(alt) + '" src="' + escapeAttr(src) + '" /></' + tag + '>';`,
    )
    .replace(
      `button.innerHTML = '<img alt="" src="' + escapeAttr(star.imageUrl) + '" />';`,
      `button.innerHTML = '<img loading="lazy" decoding="async" alt="" src="' + escapeAttr(star.imageUrl) + '" />';`,
    )
    .replace(
      `<img class="hero-star" alt="\${escapeAttr(selected.name)}" src="\${escapeAttr(selected.imageUrl)}" />`,
      `<img class="hero-star" loading="lazy" decoding="async" alt="\${escapeAttr(selected.name)}" src="\${escapeAttr(selected.imageUrl)}" />`,
    )
    .replace(
      `  .public-top { align-items: flex-start; flex-direction: column; }
  .public-audio { flex-wrap: wrap; max-width: 100%; }
  .public-audio button { min-width: 0; }`,
      `  .public-top { align-items: flex-start; flex-direction: column; }
  .public-audio { flex-wrap: wrap; max-width: 100%; }
  .public-audio button { min-width: 0; }
  .public-top,
  .public-detail,
  .feature-overlay,
  .star-detail-sheet {
    backdrop-filter: none;
  }`,
    )
    .replace(
      `  .shooting-star { display: none; }
  .feature-modal {
    width: min(760px, calc(100vw - 28px));
    max-height: calc(100svh - 28px);
    gap: 18px;
    padding: 18px;
  }`,
      `  .shooting-star { display: none; }
  .feature-overlay {
    background: rgba(1,4,9,.84);
  }
  .feature-overlay::before {
    display: none;
  }
  .feature-modal {
    width: min(760px, calc(100vw - 28px));
    max-height: calc(100svh - 28px);
    gap: 18px;
    padding: 18px;
    border-radius: 18px;
    box-shadow: 0 18px 50px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.08) inset;
    animation: featureFade .18s var(--ease-out) both;
  }
  .feature-modal::after {
    opacity: .26;
  }
  .feature-modal .feature-hero,
  .feature-modal .feature-kicker,
  .feature-modal .feature-work-details h2,
  .feature-modal .feature-work-description,
  .feature-modal .feature-link,
  .feature-modal .feature-section-title,
  .feature-modal .feature-character,
  .feature-modal .feature-character-name,
  .feature-modal .feature-character-text {
    animation: none;
  }`,
    )
    .replace(
      `  .feature-character img {
    height: min(52svh, 500px);
  }`,
      `  .feature-character img {
    height: min(52svh, 500px);
    filter: none;
  }`,
    );
}

fs.mkdirSync(assetDir, { recursive: true });

let html = fs.readFileSync(docsPath, "utf8");
if (readFromHead) {
  const result = spawnSync("git", ["show", "HEAD:docs/index.html"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Could not read docs/index.html from HEAD");
  }
  html = result.stdout;
}
const starMatch = html.match(/const stars = (\[.*?\]);\nlet selectedId/s);
if (!starMatch) throw new Error("Could not find public stars JSON");

const assetCache = new Map();
const stats = [];
const stars = JSON.parse(starMatch[1]);

html = html.replace(/url\("(data:image\/[^"]+)"\)/, (_match, dataUrl) => {
  const backgroundPath = convertImage(dataUrl, "background", "background");
  return `url("${backgroundPath}")`;
});

html = html.replace(/(<img[^>]+class="(?:brand-logo|intro-logo-image)"[^>]+src=")(data:image\/[^"]+)(")/g, (_match, prefix, dataUrl, suffix) => {
  const logoPath = convertImage(dataUrl, "hoshiyomi-ginga-logo", "logo");
  return `${prefix}${logoPath}${suffix}`;
});

const convertedStars = stars.map((star, index) => {
  const starKey = `${String(index + 1).padStart(2, "0")}-${sanitize(star.id, `star-${index + 1}`)}`;
  const convertCharacter = (character, characterIndex, prefix) => ({
    ...character,
    imageUrl: convertImage(
      character.imageUrl,
      `${starKey}-${prefix}-${String(characterIndex + 1).padStart(2, "0")}`,
      "character",
    ),
    images: Array.isArray(character.images)
      ? character.images.map((imageUrl, imageIndex) =>
          convertImage(
            imageUrl,
            `${starKey}-${prefix}-${String(characterIndex + 1).padStart(2, "0")}-${imageIndex + 2}`,
            "character",
          ),
        )
      : character.images,
  });
  const converted = {
    ...star,
    imageUrl: convertImage(star.imageUrl, `${starKey}-star`, "star"),
    standingImageUrl: convertImage(star.standingImageUrl, `${starKey}-standing`, "standing"),
    sceneImageUrl: convertImage(star.sceneImageUrl, `${starKey}-scene`, "scene"),
    sceneImageUrl2: convertImage(star.sceneImageUrl2, `${starKey}-scene2`, "scene"),
  };
  if (Array.isArray(star.characters)) {
    converted.characters = star.characters.map((character, characterIndex) =>
      convertCharacter(character, characterIndex, "character"),
    );
  }
  if (Array.isArray(star.characters2)) {
    converted.characters2 = star.characters2.map((character, characterIndex) =>
      convertCharacter(character, characterIndex, "character2"),
    );
  }
  return converted;
});

html = html.replace(starMatch[1], JSON.stringify(convertedStars).replace(/</g, "\\u003c"));
html = replacePublicRuntime(html);
fs.writeFileSync(docsPath, html);

const beforeBytes = stats.reduce((total, item) => total + item.sourceBytes, 0);
const afterBytes = stats.reduce((total, item) => total + item.outputBytes, 0);

console.log(
  JSON.stringify(
    {
      imageCount: stats.length,
      sourceBytes: beforeBytes,
      outputBytes: afterBytes,
      sourceMiB: Number((beforeBytes / 1024 / 1024).toFixed(2)),
      outputMiB: Number((afterBytes / 1024 / 1024).toFixed(2)),
      largest: stats.sort((a, b) => b.outputBytes - a.outputBytes).slice(0, 8),
    },
    null,
    2,
  ),
);
