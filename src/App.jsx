import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsClockwise,
  DownloadSimple,
  FloppyDisk,
  ImageSquare,
  MagnifyingGlassPlus,
  MusicNotes,
  Pause,
  PencilSimple,
  Planet,
  Play,
  Plus,
  SpeakerHigh,
  SpeakerSlash,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import backgroundUrl from "./assets/stellar-map-background.png";

const STORAGE_KEY = "a-plan-star-gallery-demo";
const IMAGE_DB_NAME = "a-plan-star-gallery-images";
const IMAGE_STORE_NAME = "images";
const IMAGE_REF_PREFIX = "indexeddb-image:";
const MAX_STARS = 20;
const DEFAULT_BACKGROUND_URL = backgroundUrl;
const DEFAULT_GLOBAL_BGM_URL = "assets/audio/gallery.mp3";
const ETERNIA_TITLE = "エテルニア・ステラリア";
const ETERNIA_BGM_URL = "assets/audio/ginga-wa-warawa-no-teatime.mp3";

const STAR_NAMES = [
  ETERNIA_TITLE,
  "ティアマト",
  "ルミナス",
  "カルデア",
  "ネビュラ",
  "オリオンス",
  "ヴェリタス",
  "クレシェンド",
  "アストレイア",
  "イクリプス",
  "ソルナ",
  "プリムローズ",
  "ノクターン",
  "エクリュス",
  "シリウス・ノヴァ",
  "ミラージュ",
  "ハーモニア",
  "ゼフィール",
  "グラビティ",
  "アンセム",
];

const STAR_COLORS = [
  "#ffd34d",
  "#7bd8ff",
  "#f8fbff",
  "#ff7a45",
  "#ffb0df",
  "#59d5ff",
  "#8da7ff",
  "#7ff4dc",
  "#e8d3ad",
  "#f8aa3d",
  "#d4ff95",
  "#f06b7a",
  "#b49cff",
  "#fdedc8",
  "#74e7ff",
  "#ff9f62",
  "#6ee6c7",
  "#cceaff",
  "#ff596d",
  "#e4f5ff",
];

const STAR_POSITIONS = [
  [48, 48],
  [42, 23],
  [25, 34],
  [73, 32],
  [63, 24],
  [60, 37],
  [34, 46],
  [27, 22],
  [63, 56],
  [71, 62],
  [38, 38],
  [22, 54],
  [41, 63],
  [56, 70],
  [68, 75],
  [24, 71],
  [36, 72],
  [31, 80],
  [47, 86],
  [66, 87],
];

const PARTICLES = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 53) % 100}%`,
  delay: `${(index % 9) * -0.8}s`,
  duration: `${9 + (index % 7)}s`,
}));

const PLANET_FIELDS = [
  { key: "planetClass", label: "惑星分類" },
  { key: "planetRadius", label: "半径" },
  { key: "planetGravity", label: "重力" },
  { key: "planetSeaLandRatio", label: "海陸比" },
  { key: "planetAtmosphereColor", label: "大気色" },
  { key: "planetOceanColor", label: "海の色" },
  { key: "planetCloudCover", label: "雲量" },
  { key: "planetIceCaps", label: "氷冠" },
  { key: "planetRotation", label: "自転周期" },
  { key: "planetOrbitalPeriod", label: "公転周期" },
  { key: "planetMoons", label: "衛星" },
  { key: "planetRings", label: "環" },
];
const MAX_CHARACTERS_PER_STAR = 12;

function makeCharacterDefaults(name, index = 0, description = "") {
  const fallbackName = name || `キャラクター ${index + 1}`;

  return {
    id: `character-${index + 1}`,
    name: fallbackName,
    imageUrl: "",
    description:
      description ||
      `${fallbackName}の紹介テキストをここに入力します。\n画像と詳細文はキャラクターごとに管理できます。`,
  };
}

function normalizeCharacter(character, index, fallbackName, fallbackDescription = "") {
  const name = character?.name ?? fallbackName ?? `キャラクター ${index + 1}`;

  return {
    id: character?.id || `character-${index + 1}`,
    name,
    imageUrl: character?.imageUrl ?? character?.standingImageUrl ?? "",
    description:
      character?.description ??
      character?.pastedText ??
      fallbackDescription ??
      `${name}の紹介テキストをここに入力します。`,
  };
}

function getPrimaryCharacterFields(characters, fallbackName = "", fallbackDescription = "") {
  const first = characters[0] || makeCharacterDefaults(fallbackName, 0, fallbackDescription);

  return {
    characterName: first.name,
    standingImageUrl: first.imageUrl,
    pastedText: first.description,
  };
}

function normalizeCharacters(star, featureDefaults) {
  const fallbackCharacter = {
    id: "character-1",
    name: star?.characterName ?? featureDefaults.characterName,
    imageUrl: star?.standingImageUrl ?? featureDefaults.standingImageUrl,
    description: star?.pastedText ?? featureDefaults.pastedText,
  };
  const sourceCharacters =
    Array.isArray(star?.characters) && star.characters.length > 0 ? star.characters : [fallbackCharacter];

  return sourceCharacters.slice(0, MAX_CHARACTERS_PER_STAR).map((character, index) =>
    normalizeCharacter(
      character,
      index,
      index === 0 ? fallbackCharacter.name : `キャラクター ${index + 1}`,
      index === 0 ? fallbackCharacter.description : "",
    ),
  );
}

function getDisplayCharacters(star) {
  if (Array.isArray(star?.characters) && star.characters.length > 0) {
    return star.characters;
  }

  return [
    normalizeCharacter(
      {
        id: "character-1",
        name: star?.characterName || star?.name || "キャラクター 1",
        imageUrl: star?.standingImageUrl || "",
        description: star?.pastedText || star?.description || "",
      },
      0,
      star?.name || "キャラクター 1",
      star?.description || "",
    ),
  ];
}

function makeFeatureDefaults(name, index, description = "") {
  const pastedText =
    index === 0
      ? "黄金航路を渡る観測者。\n静かな光の奥に、まだ誰にも開かれていない記録を抱えている。"
      : `${name}の紹介テキストをここに貼り付けます。\n改行を入れた文章も、そのまま公開ポップアップに反映されます。`;

  return {
    creatorName: index === 0 ? "星詠み工房" : `Creator ${String(index + 1).padStart(2, "0")}`,
    characterName: name,
    standingImageUrl: "",
    sceneImageUrl: "",
    pastedText,
    characters: [makeCharacterDefaults(name, 0, pastedText)],
    workDescription:
      index === 0
        ? "銀河の奥でひらかれる、気高く甘いティータイム。星を選ぶと専用BGMに切り替わります。"
        : `${name}の作品紹介文をここに入力します。`,
    workTitle: index === 0 ? ETERNIA_TITLE : `${name}の作品`,
    workUrl: "",
    ...Object.fromEntries(PLANET_FIELDS.map(({ key }) => [key, ""])),
  };
}

function makeStarImage(color, index) {
  if (typeof document === "undefined") {
    return "";
  }

  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 220;
  const context = canvas.getContext("2d");
  const center = 110;
  const flareCount = 7 + (index % 4);

  context.clearRect(0, 0, 220, 220);
  context.globalCompositeOperation = "lighter";

  // Soft radial flare rays
  for (let ray = 0; ray < flareCount; ray += 1) {
    const angle = (Math.PI * 2 * ray) / flareCount + index * 0.13;
    const gradient = context.createLinearGradient(
      center,
      center,
      center + Math.cos(angle) * 104,
      center + Math.sin(angle) * 104,
    );
    gradient.addColorStop(0, `${color}cc`);
    gradient.addColorStop(0.34, `${color}40`);
    gradient.addColorStop(1, `${color}00`);
    context.strokeStyle = gradient;
    context.lineWidth = ray % 3 === 0 ? 3.4 : 1.4;
    context.beginPath();
    context.moveTo(center, center);
    context.lineTo(center + Math.cos(angle) * 104, center + Math.sin(angle) * 104);
    context.stroke();
  }

  // Outer aura — softer, wider bloom
  const aura = context.createRadialGradient(center, center, 2, center, center, 100);
  aura.addColorStop(0, "#ffffff");
  aura.addColorStop(0.12, color);
  aura.addColorStop(0.4, `${color}78`);
  aura.addColorStop(0.74, `${color}1e`);
  aura.addColorStop(1, `${color}00`);
  context.fillStyle = aura;
  context.beginPath();
  context.arc(center, center, 100, 0, Math.PI * 2);
  context.fill();

  // Diffraction sparkle cross (lens-spike highlight)
  for (let i = 0; i < 2; i += 1) {
    const vertical = i === 0;
    const grad = vertical
      ? context.createLinearGradient(center, center - 104, center, center + 104)
      : context.createLinearGradient(center - 104, center, center + 104, center);
    grad.addColorStop(0, `${color}00`);
    grad.addColorStop(0.5, "rgba(255,255,255,.82)");
    grad.addColorStop(1, `${color}00`);
    context.fillStyle = grad;
    if (vertical) {
      context.fillRect(center - 1.1, center - 104, 2.2, 208);
    } else {
      context.fillRect(center - 104, center - 1.1, 208, 2.2);
    }
  }

  // Bright core
  const core = context.createRadialGradient(center - 12, center - 16, 3, center, center, 42);
  core.addColorStop(0, "#fffdf4");
  core.addColorStop(0.34, color);
  core.addColorStop(0.7, `${color}b0`);
  core.addColorStop(1, `${color}00`);
  context.fillStyle = core;
  context.beginPath();
  context.arc(center, center, 42, 0, Math.PI * 2);
  context.fill();

  // Faint orbital ring
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = "rgba(255,255,255,.32)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.ellipse(center, center, 76, 17 + (index % 3) * 5, -0.35, 0, Math.PI * 2);
  context.stroke();

  return canvas.toDataURL("image/png");
}

function makeDefaultStars() {
  return STAR_NAMES.map((name, index) => {
    const id = `star-${index + 1}`;
    const color = STAR_COLORS[index];
    const [x, y] = STAR_POSITIONS[index];
    const description =
      index === 0
        ? "黄金色に輝く主星。穏やかな光を放ち、その周囲には微細なチリの帯が円環を描いている。"
        : `${name}は、ゆっくり瞬く光と独自の軌道を持つ観測対象。クリックすると星の記録がここに表示されます。`;

    return {
      id,
      name,
      description,
      color,
      size: 0.85 + (index % 5) * 0.14,
      x,
      y,
      z: Number((1 + index * 0.17).toFixed(2)),
      imageUrl: makeStarImage(color, index),
      bgmUrl: index === 0 || index === 13 ? ETERNIA_BGM_URL : "",
      ...makeFeatureDefaults(name, index, description),
      updatedAt: new Date(Date.now() - index * 900000).toISOString(),
    };
  });
}

function normalizeStar(star, index) {
  const color = star?.color || STAR_COLORS[index % STAR_COLORS.length];
  const [fallbackX, fallbackY] = STAR_POSITIONS[index % STAR_POSITIONS.length] || [50, 50];
  const name = star?.name || STAR_NAMES[index % STAR_NAMES.length] || `星 ${index + 1}`;
  const description = star?.description || `${name}の説明をここに入力できます。`;
  const featureDefaults = makeFeatureDefaults(name, index, description);
  const characters = normalizeCharacters(star, featureDefaults);
  const primaryCharacter = getPrimaryCharacterFields(
    characters,
    featureDefaults.characterName,
    featureDefaults.pastedText,
  );

  return {
    id: star?.id || `star-${index + 1}`,
    name,
    description,
    color,
    size: star?.size ?? 1,
    x: star?.x ?? fallbackX,
    y: star?.y ?? fallbackY,
    z: star?.z ?? Number((1 + index * 0.17).toFixed(2)),
    imageUrl: star?.imageUrl || makeStarImage(color, index),
    bgmUrl: star?.bgmUrl || "",
    creatorName: star?.creatorName ?? featureDefaults.creatorName,
    characterName: primaryCharacter.characterName,
    standingImageUrl: primaryCharacter.standingImageUrl,
    sceneImageUrl: star?.sceneImageUrl ?? featureDefaults.sceneImageUrl,
    pastedText: primaryCharacter.pastedText,
    characters,
    workDescription: star?.workDescription ?? featureDefaults.workDescription,
    workTitle: star?.workTitle ?? featureDefaults.workTitle,
    workUrl: star?.workUrl ?? featureDefaults.workUrl,
    ...Object.fromEntries(PLANET_FIELDS.map(({ key }) => [key, star?.[key] ?? ""])),
    updatedAt: star?.updatedAt || new Date().toISOString(),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未記録";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortUrl(value) {
  if (!value) return "未設定";
  if (isIndexedDbImageRef(value)) return "ローカル画像";
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) || url.hostname;
  } catch {
    return value.length > 34 ? `${value.slice(0, 31)}...` : value;
  }
}

function safeExternalUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

async function urlToDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function readFileAsDataUrl(file) {
  if (!file) return Promise.resolve("");
  return blobToDataUrl(file);
}

function isIndexedDbImageRef(value) {
  return typeof value === "string" && value.startsWith(IMAGE_REF_PREFIX);
}

function isDataImageUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function imageRefFromId(id) {
  return `${IMAGE_REF_PREFIX}${id}`;
}

function imageIdFromRef(ref) {
  return isIndexedDbImageRef(ref) ? ref.slice(IMAGE_REF_PREFIX.length) : "";
}

function makeImageStorageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openImageDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open image database"));
  });
}

async function putIndexedDbImage(dataUrl) {
  if (!dataUrl) return "";
  const db = await openImageDb();
  const id = makeImageStorageId();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, "readwrite");
    transaction.objectStore(IMAGE_STORE_NAME).put({
      id,
      dataUrl,
      updatedAt: new Date().toISOString(),
    });
    transaction.oncomplete = () => {
      db.close();
      resolve(imageRefFromId(id));
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Failed to store image"));
    };
  });
}

async function readIndexedDbImage(ref) {
  const id = imageIdFromRef(ref);
  if (!id) return "";
  const db = await openImageDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, "readonly");
    const request = transaction.objectStore(IMAGE_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.dataUrl || "");
    request.onerror = () => reject(request.error || new Error("Failed to read image"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

async function storeFileAsIndexedDbImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  if (!dataUrl) return { ref: "", dataUrl: "" };
  const ref = await putIndexedDbImage(dataUrl);
  return { ref, dataUrl };
}

function collectImageValues(stars, backgroundImageUrl) {
  const values = [backgroundImageUrl];
  stars.forEach((star) => {
    values.push(star.imageUrl, star.sceneImageUrl, star.standingImageUrl);
    if (Array.isArray(star.characters)) {
      star.characters.forEach((character) => values.push(character.imageUrl));
    }
  });
  return values.filter(Boolean);
}

function hasDataImageAssets(stars, backgroundImageUrl) {
  return collectImageValues(stars, backgroundImageUrl).some(isDataImageUrl);
}

function collectIndexedDbImageRefs(stars, backgroundImageUrl) {
  return Array.from(new Set(collectImageValues(stars, backgroundImageUrl).filter(isIndexedDbImageRef)));
}

async function migrateDataImageAssets(stars, backgroundImageUrl) {
  const dataUrlToRef = new Map();
  const imageCache = {};
  let changed = false;

  async function migrateValue(value) {
    if (!isDataImageUrl(value)) return value;
    if (!dataUrlToRef.has(value)) {
      const ref = await putIndexedDbImage(value);
      dataUrlToRef.set(value, ref);
      imageCache[ref] = value;
    }
    changed = true;
    return dataUrlToRef.get(value);
  }

  const migratedBackgroundImageUrl = await migrateValue(backgroundImageUrl);
  const migratedStars = await Promise.all(
    stars.map(async (star) => {
      const characters = Array.isArray(star.characters)
        ? await Promise.all(
            star.characters.map(async (character) => ({
              ...character,
              imageUrl: await migrateValue(character.imageUrl),
            })),
          )
        : star.characters;
      const migratedStar = {
        ...star,
        imageUrl: await migrateValue(star.imageUrl),
        sceneImageUrl: await migrateValue(star.sceneImageUrl),
        standingImageUrl: await migrateValue(star.standingImageUrl),
        characters,
      };
      if (Array.isArray(characters) && characters.length > 0) {
        Object.assign(migratedStar, getPrimaryCharacterFields(characters, star.name, star.description));
      }
      return migratedStar;
    }),
  );

  return {
    changed,
    stars: migratedStars,
    backgroundImageUrl: migratedBackgroundImageUrl,
    imageCache,
  };
}

function resolveStoredImageSource(value, imageCache) {
  if (!value) return "";
  if (isIndexedDbImageRef(value)) return imageCache[value] || "";
  return value;
}

function editableImageValue(value) {
  return isIndexedDbImageRef(value) ? "" : value || "";
}

function readStoredConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

async function embedAsset(source) {
  if (!source || source.startsWith("data:")) {
    return { value: source || "", embedded: Boolean(source) };
  }

  if (isIndexedDbImageRef(source)) {
    try {
      const value = await readIndexedDbImage(source);
      return { value, embedded: Boolean(value) };
    } catch {
      return { value: "", embedded: false };
    }
  }

  try {
    const value = await urlToDataUrl(source);
    return { value, embedded: true };
  } catch {
    return { value: source, embedded: false };
  }
}

function escapeJsonForHtml(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function buildPublicHtml({ stars, selectedId, bgmUrl, backgroundDataUrl }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>A-plan 星図ギャラリー</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Noto+Sans+JP:wght@400;500;700;800&display=swap" rel="stylesheet" />
<style>
:root {
  color-scheme: dark;
  --font-body: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-celestial: "Cinzel", "Noto Serif JP", "Times New Roman", serif;
  --aqua: #6fe7c8;
  --r-xl: 24px;
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  font-family: var(--font-body);
  background: #02050b;
  color: #f6fbff;
}
* { box-sizing: border-box; }
html {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}
body {
  margin: 0;
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  background: #03070d;
}
button { font: inherit; }
.public-shell {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  background-color: #02050b;
  background-image:
    radial-gradient(120% 90% at 50% 8%, rgba(18,30,52,.5), transparent 60%),
    linear-gradient(90deg, rgba(2,5,11,.9), rgba(2,5,11,.28) 46%, rgba(2,5,11,.88)),
    url("${backgroundDataUrl}");
  background-size: cover;
  background-position: center;
}
.public-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(closest-side at 15% 24%, rgba(255,211,77,.14), transparent 70%),
    radial-gradient(closest-side at 80% 28%, rgba(111,231,200,.13), transparent 72%),
    radial-gradient(circle at center, transparent 38%, rgba(1,3,7,.62) 92%),
    linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.016) 1px, transparent 1px);
  background-size: 46% 46%, 52% 52%, auto, 96px 96px, 96px 96px;
  background-repeat: no-repeat, no-repeat, no-repeat, repeat, repeat;
  mix-blend-mode: screen;
  pointer-events: none;
}
.shooting-star {
  position: absolute;
  z-index: 1;
  top: -6%;
  left: -12%;
  width: 190px;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.9) 60%, #fff);
  border-radius: 999px;
  filter: drop-shadow(0 0 6px rgba(190,224,255,.85));
  opacity: 0;
  transform: rotate(28deg);
  pointer-events: none;
  animation: shootingStar 11s ease-in infinite;
}
.shooting-star::after {
  content: "";
  position: absolute;
  right: -3px;
  top: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff;
  transform: translateY(-50%);
  box-shadow: 0 0 12px 2px rgba(214,235,255,.9);
}
.shooting-star.two { top: 18%; width: 140px; animation-duration: 14s; animation-delay: 6.5s; }
.public-top {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(174,207,235,.18);
  background: rgba(4,10,18,.58);
  backdrop-filter: blur(18px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,.72);
  box-shadow: 0 0 24px rgba(255,211,77,.2), inset 0 0 14px rgba(124,215,255,.18);
}
.brand h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
}
.brand span,
.public-audio span {
  display: block;
  margin-top: 3px;
  color: rgba(226,239,251,.64);
  font-size: 12px;
}
.public-audio {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(246,251,255,.86);
}
.public-audio button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112px;
  height: 38px;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 8px;
  color: #061019;
  background: linear-gradient(135deg, #ffd34d, #6fe7c8);
  cursor: pointer;
}
.public-main {
  position: relative;
  z-index: 2;
  min-height: 0;
}
.map {
  position: absolute;
  inset: 0 360px 0 0;
  transition: transform 0.8s var(--ease-spring);
}
.orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--w);
  height: var(--h);
  border: 1px solid rgba(255,211,77,.15);
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(var(--r));
  animation: orbitDrift var(--d) linear infinite;
}
.star-button {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: calc(var(--y) * 1%);
  width: calc(var(--s) * 64px);
  height: calc(var(--s) * 64px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  transform: translate(-50%, -50%);
  cursor: pointer;
  filter: drop-shadow(0 0 16px var(--c));
  animation: starFloat 5.6s ease-in-out infinite;
  transition: transform 360ms var(--ease-spring), filter 320ms var(--ease-out), opacity 260ms ease;
  will-change: transform, filter;
}
.star-button::before {
  content: "";
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  box-shadow: 0 0 22px var(--c), 0 0 42px rgba(255,255,255,.16);
  opacity: .6;
  pointer-events: none;
  animation: starTwinkle 4.4s ease-in-out infinite;
  animation-delay: calc(var(--x, 50) * -0.05s);
}
.star-button img {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.star-button.selected::after {
  content: "";
  position: absolute;
  inset: -12px;
  border: 1px solid var(--c);
  border-radius: 50%;
  box-shadow: 0 0 28px var(--c);
  animation: pulse 1.8s ease-out infinite;
}
.star-button.feature-active {
  z-index: 12;
  transform: translate(-50%, -50%) scale(2.7);
  animation: none;
  filter: drop-shadow(0 0 34px var(--c)) drop-shadow(0 0 72px rgba(255,255,255,.32)) brightness(1.35);
}
.star-button.feature-active::before {
  animation: none;
  opacity: 1;
  inset: 4%;
  box-shadow: 0 0 34px var(--c), 0 0 70px rgba(255,255,255,.4);
}
.map.is-feature-open .star-button:not(.feature-active) {
  opacity: .32;
  filter: drop-shadow(0 0 10px var(--c)) blur(2px) saturate(.85);
}
.map.is-feature-open .orbit { opacity: .25; transition: opacity 260ms ease; }
.public-detail {
  position: absolute;
  right: 0;
  top: 0;
  width: 360px;
  height: 100%;
  padding: 26px 22px;
  border-left: 1px solid rgba(174,207,235,.2);
  background: linear-gradient(180deg, rgba(6,13,23,.9), rgba(4,9,16,.78));
  backdrop-filter: blur(20px);
  overflow: auto;
}
.detail-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffd34d;
  font-family: var(--font-celestial);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .22em;
}
.public-detail h2 {
  margin: 10px 0 16px;
  font-size: 26px;
}
.hero-star {
  width: 100%;
  aspect-ratio: 1 / .76;
  object-fit: contain;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 8px;
  background: rgba(0,0,0,.28);
  box-shadow: inset 0 0 48px rgba(255,255,255,.04);
}
.public-detail p {
  color: rgba(226,239,251,.78);
  font-size: 14px;
  line-height: 1.8;
}
.meta-grid {
  display: grid;
  gap: 12px;
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid rgba(255,255,255,.14);
}
.meta-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  color: rgba(226,239,251,.78);
  font-size: 13px;
}
.meta-row strong {
  color: #f6fbff;
  font-weight: 600;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  background: var(--c);
  box-shadow: 0 0 16px var(--c);
}
.feature-overlay[hidden] {
  display: none;
}
.feature-overlay {
  --origin-x: 50vw;
  --origin-y: 50vh;
  --travel-x: 0px;
  --travel-y: 0px;
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at var(--origin-x) var(--origin-y), color-mix(in srgb, var(--feature-color, #ffd34d), transparent 82%), transparent 38%),
    rgba(1,4,9,.7);
  backdrop-filter: blur(16px) saturate(1.1);
  animation: featureFade .26s var(--ease-out);
}
.feature-overlay::before {
  content: "";
  position: absolute;
  left: var(--origin-x);
  top: var(--origin-y);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, #fff 0%, var(--feature-color, #ffd34d) 26%, transparent 70%);
  box-shadow: 0 0 60px 20px color-mix(in srgb, var(--feature-color, #ffd34d), transparent 40%);
  pointer-events: none;
  animation: featureBurst .62s var(--ease-out) forwards;
}
.feature-overlay.is-closing { animation: featureFade .28s var(--ease-out) reverse forwards; }
.feature-overlay.is-closing::before { animation: none; opacity: 0; }
.feature-modal {
  position: relative;
  width: min(960px, calc(100vw - 44px));
  max-height: calc(100svh - 48px);
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: var(--r-xl);
  color: #f7fbff;
  background:
    linear-gradient(150deg, rgba(14,23,39,.97), rgba(5,10,19,.95)),
    radial-gradient(120% 90% at 18% 12%, color-mix(in srgb, var(--feature-color, #ffd34d), transparent 74%), transparent 46%);
  box-shadow: 0 36px 110px rgba(0,0,0,.56), 0 0 90px color-mix(in srgb, var(--feature-color, #ffd34d), transparent 76%), 0 1px 0 rgba(255,255,255,.08) inset;
  overflow: auto;
  transform-origin: center;
  animation: featureEmanate .46s var(--ease-spring) both;
}
.feature-modal::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--feature-color, #ffd34d), white 10%), transparent 42%, color-mix(in srgb, var(--aqua), transparent 30%));
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: .5;
  pointer-events: none;
}
.feature-overlay.is-closing .feature-modal { animation: featureCollapse .3s var(--ease-out) both; }
.feature-modal .feature-hero,
.feature-modal .feature-kicker,
.feature-modal .feature-work-details h2,
.feature-modal .feature-work-description,
.feature-modal .feature-link,
.feature-modal .feature-section-title,
.feature-modal .feature-character,
.feature-modal .feature-character-name,
.feature-modal .feature-character-text {
  animation: featureContentIn .46s var(--ease-out) both;
}
.feature-modal .feature-hero { animation-delay: 90ms; }
.feature-modal .feature-kicker { animation-delay: 150ms; }
.feature-modal .feature-work-details h2 { animation-delay: 200ms; }
.feature-modal .feature-work-description { animation-delay: 255ms; }
.feature-modal .feature-link { animation-delay: 310ms; }
.feature-modal .feature-section-title { animation-delay: 365ms; }
.feature-modal .feature-character { animation-delay: 420ms; }
.feature-modal .feature-character-name { animation-delay: 475ms; }
.feature-modal .feature-character-text { animation-delay: 530ms; }
.feature-overlay.is-closing .feature-hero,
.feature-overlay.is-closing .feature-kicker,
.feature-overlay.is-closing .feature-work-details h2,
.feature-overlay.is-closing .feature-work-description,
.feature-overlay.is-closing .feature-link,
.feature-overlay.is-closing .feature-section-title,
.feature-overlay.is-closing .feature-character,
.feature-overlay.is-closing .feature-character-name,
.feature-overlay.is-closing .feature-character-text { animation: none; }
.feature-close {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 2;
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 8px;
  color: #f7fbff;
  background: rgba(3,8,15,.68);
  cursor: pointer;
}
#featureBody {
  display: contents;
}
.feature-hero,
.feature-character {
  display: grid;
  place-items: center;
  min-height: 0;
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 8px;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--feature-color, #ffd34d), transparent 76%), transparent 56%),
    rgba(0,0,0,.28);
  overflow: hidden;
}
.feature-hero {
  width: 100%;
  flex: 0 0 auto;
  min-height: clamp(280px, 52vw, 560px);
  padding: 12px;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--feature-color, #ffd34d), transparent 70%), transparent 62%),
    color-mix(in srgb, var(--feature-color, #ffd34d), #050a13 84%);
}
.feature-hero img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: min(72svh, 760px);
  object-fit: contain;
}
.feature-character {
  min-height: 420px;
}
.feature-character img {
  display: block;
  width: 100%;
  height: min(58svh, 560px);
  max-height: 58svh;
  object-fit: contain;
  filter: drop-shadow(0 22px 38px rgba(0,0,0,.45));
}
.feature-work-details,
.feature-character-intro,
.feature-character-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.feature-work-details {
  padding: 0 6px;
}
.feature-character-intro {
  padding: 4px 6px 0;
}
.feature-character-copy {
  gap: 10px;
}

.feature-character-list {
  display: grid;
  gap: 16px;
}

.feature-character-card {
  display: grid;
  grid-template-columns: minmax(220px, 0.78fr) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  padding: 14px;
  border: 1px solid rgba(247, 251, 255, 0.12);
  border-radius: 8px;
  background: rgba(247, 251, 255, 0.035);
}

.feature-character-card .feature-character {
  min-height: 300px;
}

.feature-character-card .feature-character img {
  height: min(42svh, 420px);
  max-height: 42svh;
}

.feature-character-index {
  color: var(--aqua);
  font-family: var(--font-celestial);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
}
.feature-kicker {
  margin: 0;
  color: var(--aqua);
  font-family: var(--font-celestial);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .26em;
  text-transform: uppercase;
}
.feature-work-details h2 {
  margin: 0;
  color: #fff8d8;
  font-size: clamp(28px, 3rem, 46px);
  line-height: 1.05;
  overflow-wrap: anywhere;
}
.feature-section-title {
  margin: 0;
  color: #f7fbff;
  font-size: 16px;
  font-weight: 850;
  overflow-wrap: anywhere;
}
.feature-character-name {
  color: #fff8d8;
  font-size: 24px;
  font-weight: 850;
  overflow-wrap: anywhere;
}
.feature-text {
  min-height: 124px;
  padding: 16px;
  border-left: 3px solid color-mix(in srgb, var(--feature-color, #ffd34d), white 14%);
  color: rgba(226,239,251,.84);
  background: rgba(255,255,255,.045);
  line-height: 1.8;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.feature-work-description {
  min-height: 112px;
}
.feature-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  color: #061018;
  background: linear-gradient(135deg, #ffd34d, #6fe7c8);
  font-weight: 850;
  text-decoration: none;
}
.feature-link.is-disabled {
  color: rgba(247,251,255,.56);
  background: rgba(255,255,255,.08);
}
.feature-empty {
  color: rgba(226,239,251,.58);
  font-size: 13px;
  font-weight: 800;
}
@keyframes starFloat {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -8px; }
}
@keyframes orbitDrift {
  to { transform: translate(-50%, -50%) rotate(calc(var(--r) + 360deg)); }
}
@keyframes pulse {
  from { opacity: .9; scale: .72; }
  to { opacity: 0; scale: 1.3; }
}
@keyframes featureFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes featureRise {
  from { opacity: 0; transform: translateY(18px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes featureEmanate {
  0% { opacity: 0; transform: translate(var(--travel-x), var(--travel-y)) scale(.16) rotate(-1.5deg); }
  55% { opacity: 1; }
  100% { opacity: 1; transform: translate(0, 0) scale(1) rotate(0deg); }
}
@keyframes featureCollapse {
  from { opacity: 1; transform: translate(0, 0) scale(1); }
  to { opacity: 0; transform: translate(calc(var(--travel-x) * .7), calc(var(--travel-y) * .7)) scale(.2); }
}
@keyframes featureBurst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.2); }
  18% { opacity: .95; }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(46); }
}
@keyframes featureContentIn {
  from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes starTwinkle {
  0%, 100% { opacity: .4; transform: scale(.92); }
  50% { opacity: .85; transform: scale(1.06); }
}
@keyframes shootingStar {
  0% { opacity: 0; transform: translate(0, 0) rotate(28deg); }
  4% { opacity: 0; }
  7% { opacity: 1; }
  16% { opacity: 0; transform: translate(150vw, 80vh) rotate(28deg); }
  100% { opacity: 0; transform: translate(150vw, 80vh) rotate(28deg); }
}
.map.is-zoomed {
  transform-origin: calc(var(--zoom-x) * 1%) calc(var(--zoom-y) * 1%);
  transform: scale(3.5);
}
.map.is-zoomed .star-button:not(.zoom-target) {
  opacity: .12;
  filter: blur(4px) saturate(.6);
  pointer-events: none;
  transition: opacity 700ms ease, filter 700ms ease;
}
.map.is-zoomed .star-button.zoom-target {
  z-index: 12;
  animation: none;
  filter: drop-shadow(0 0 40px var(--c)) drop-shadow(0 0 90px rgba(255,255,255,.3)) brightness(1.4);
  pointer-events: none;
}
.map.is-zoomed .star-button.zoom-target::before {
  animation: none; opacity: 1; inset: 2%;
  box-shadow: 0 0 40px var(--c), 0 0 80px rgba(255,255,255,.35);
}
.map.is-zoomed .orbit { opacity: .1; transition: opacity 700ms ease; }
.public-main.is-zoomed .map { inset: 0; }
.public-main.is-zoomed .public-detail { display: none; }
.star-zoom-backdrop {
  position: fixed; z-index: 15; inset: 0;
  background: rgba(1,3,8,.3);
  animation: featureFade 800ms ease-out;
}
.star-zoom-backdrop.is-closing { animation: featureFade 400ms ease-out reverse forwards; }
.star-zoom-backdrop[hidden] { display: none; }
.star-detail-sheet {
  position: fixed; z-index: 16; bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: min(520px, calc(100vw - 32px));
  max-height: 55vh;
  padding: 28px 24px 24px;
  border: 1px solid rgba(255,255,255,.16);
  border-bottom: none;
  border-radius: 24px 24px 0 0;
  color: #f6fbff;
  background: linear-gradient(180deg, rgba(8,14,24,.95), rgba(4,8,16,.92));
  backdrop-filter: blur(24px) saturate(1.15);
  box-shadow: 0 -20px 60px rgba(0,0,0,.4), 0 -1px 0 rgba(255,255,255,.06) inset;
  overflow-y: auto;
  animation: sheetSlideUp 600ms var(--ease-spring);
}
.star-detail-sheet.is-closing { animation: sheetSlideDown 400ms var(--ease-out) forwards; }
.star-detail-sheet[hidden] { display: none; }
.star-detail-close {
  position: absolute; z-index: 2; top: 14px; right: 14px;
  display: inline-grid; place-items: center;
  width: 38px; height: 38px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 8px; color: #f7fbff;
  background: rgba(3,8,15,.68); cursor: pointer;
}
.star-detail-header { margin-bottom: 14px; }
.star-detail-header span {
  color: #ffd34d; font-family: var(--font-celestial);
  font-size: 13px; font-weight: 600; letter-spacing: .24em;
}
.star-detail-header h2 {
  margin: 8px 0 0; padding-right: 42px;
  font-size: 26px; font-weight: 700; line-height: 1.25;
}
.star-detail-desc {
  margin: 14px 0 18px; color: rgba(226,239,251,.78);
  font-size: 14px; line-height: 1.8;
}
.star-detail-meta {
  display: grid; gap: 10px; padding: 18px 0;
  border-top: 1px solid rgba(255,255,255,.12);
  border-bottom: 1px solid rgba(255,255,255,.12);
  margin-bottom: 20px;
}
.star-detail-meta > div {
  display: grid; grid-template-columns: 80px 1fr;
  align-items: center; gap: 12px;
}
.star-detail-meta span { color: rgba(226,239,251,.64); font-size: 13px; }
.star-detail-meta strong { color: rgba(247,251,255,.9); font-size: 13px; font-weight: 650; }
.star-detail-work-btn {
  display: flex; align-items: center; justify-content: center;
  width: 100%; min-height: 48px; border: none; border-radius: 10px;
  color: #061018; font-size: 15px; font-weight: 850;
  background: linear-gradient(135deg, #ffd34d, #6fe7c8);
  box-shadow: 0 0 28px rgba(255,211,77,.16); cursor: pointer;
}
.star-detail-work-btn:hover { transform: translateY(-1px); box-shadow: 0 0 34px rgba(111,231,200,.22); }
.star-detail-sheet .star-detail-header,
.star-detail-sheet .star-detail-desc,
.star-detail-sheet .star-detail-meta,
.star-detail-sheet .star-detail-work-btn {
  animation: featureContentIn 460ms var(--ease-out) both;
}
.star-detail-sheet .star-detail-header { animation-delay: 50ms; }
.star-detail-sheet .star-detail-desc { animation-delay: 130ms; }
.star-detail-sheet .star-detail-meta { animation-delay: 210ms; }
.star-detail-sheet .star-detail-work-btn { animation-delay: 290ms; }
@keyframes sheetSlideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(100%); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes sheetSlideDown {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(100%); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
  .feature-overlay, .feature-modal,
  .feature-modal .feature-hero, .feature-modal .feature-kicker, .feature-modal .feature-work-details h2,
  .feature-modal .feature-work-description, .feature-modal .feature-link, .feature-modal .feature-section-title,
  .feature-modal .feature-character, .feature-modal .feature-character-name, .feature-modal .feature-character-text {
    animation: featureFade .16s ease-out both;
  }
  .star-button.feature-active { transform: translate(-50%, -50%) scale(1.7); }
  .shooting-star { display: none; }
  .map { transition-duration: .001ms !important; }
  .star-detail-sheet { animation: featureFade .16s ease-out !important; }
}
@media (max-width: 900px) {
  html { overflow-x: hidden; }
  body { overflow-x: hidden; overflow-y: auto; }
  .public-shell {
    width: 100%;
    max-width: 100%;
    min-height: 100svh;
    overflow-x: clip;
  }
  .public-top { align-items: flex-start; flex-direction: column; }
  .public-audio { flex-wrap: wrap; max-width: 100%; }
  .public-audio button { min-width: 0; }
  .public-main {
    width: 100%;
    max-width: 100%;
    min-height: 940px;
    overflow-x: clip;
  }
  .map { inset: 0 0 420px 0; }
  .public-detail {
    top: auto;
    bottom: 0;
    width: 100%;
    height: 420px;
    border-left: 0;
    border-top: 1px solid rgba(174,207,235,.2);
  }
  .shooting-star { display: none; }
  .feature-modal {
    width: min(760px, calc(100vw - 28px));
    max-height: calc(100svh - 28px);
    gap: 18px;
    padding: 18px;
  }
  .feature-hero {
    min-height: clamp(260px, 64vw, 520px);
    padding: 10px;
  }
  .feature-hero img {
    max-height: min(62svh, 620px);
  }
  .feature-character {
    min-height: 360px;
  }
  .feature-character img {
    height: min(52svh, 500px);
  }


  .feature-character-card {
    grid-template-columns: 1fr;
  }

  .feature-character-card .feature-character img {
    height: min(46svh, 430px);
    max-height: 46svh;
  }
  .star-detail-sheet { width: 100%; max-height: 50vh; border-radius: 20px 20px 0 0; }
  .map.is-zoomed { transform: scale(2.5); }
}
</style>
</head>
<body>
<div class="public-shell">
  <span class="shooting-star" aria-hidden="true"></span>
  <span class="shooting-star two" aria-hidden="true"></span>
  <header class="public-top">
    <div class="brand">
      <div class="brand-mark"></div>
      <div>
        <h1>A-plan 星図ギャラリー</h1>
        <span>公開表示 / ${stars.length} stars</span>
      </div>
    </div>
    <div class="public-audio">
      <button id="audioToggle">BGM再生</button>
      <span id="audioLabel">${shortUrl(bgmUrl)}</span>
      <audio id="bgm" loop src="${bgmUrl || ""}"></audio>
    </div>
  </header>
  <main class="public-main" id="publicMain">
    <section class="map" id="map">
      <span class="orbit" style="--w: 46vw; --h: 18vw; --r: -14deg; --d: 72s"></span>
      <span class="orbit" style="--w: 66vw; --h: 28vw; --r: 18deg; --d: 88s"></span>
      <span class="orbit" style="--w: 54vw; --h: 44vw; --r: 55deg; --d: 96s"></span>
    </section>
    <aside class="public-detail" id="detail"></aside>
  </main>
</div>
<div class="star-zoom-backdrop" id="zoomBackdrop" hidden></div>
<div class="star-detail-sheet" id="starDetailSheet" hidden></div>
<div class="feature-overlay" id="featureOverlay" hidden>
  <section class="feature-modal" id="featureModal" role="dialog" aria-modal="true" aria-label="作品詳細">
    <button class="feature-close" id="featureClose" type="button" aria-label="閉じる">×</button>
    <div id="featureBody"></div>
  </section>
</div>
<script>
const stars = ${escapeJsonForHtml(stars)};
let selectedId = ${JSON.stringify(selectedId)};
let featureId = "";
let zoomedId = "";
let zoomDetailTimer = null;
const globalBgmUrl = ${JSON.stringify(bgmUrl || "")};
const map = document.getElementById("map");
const detail = document.getElementById("detail");
const publicMain = document.getElementById("publicMain");
const zoomBackdrop = document.getElementById("zoomBackdrop");
const starDetailSheet = document.getElementById("starDetailSheet");
const audio = document.getElementById("bgm");
const audioToggle = document.getElementById("audioToggle");
const featureOverlay = document.getElementById("featureOverlay");
const featureModal = document.getElementById("featureModal");
const featureBody = document.getElementById("featureBody");
const featureClose = document.getElementById("featureClose");
let audioEnabled = false;
let galleryResumeTime = 0;
let currentAudioUrl = "";
let currentAudioIsGallery = true;

function shortPublicUrl(value) {
  if (!value) return "未設定";
  try {
    const parsed = new URL(value);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.at(-1) || parsed.hostname;
  } catch {
    return value.length > 34 ? value.slice(0, 31) + "..." : value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll(String.fromCharCode(96), "&#096;");
}

function safePublicUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? value : "";
  } catch {
    return "";
  }
}

function formatMultiline(value) {
  return escapeHtml(value || "").replaceAll("\\n", "<br />");
}

function pickStar() {
  return stars.find((star) => star.id === selectedId) || stars[0];
}

function pickFeatureStar() {
  return stars.find((star) => star.id === featureId);
}

function pickZoomedStar() {
  return stars.find((star) => star.id === zoomedId);
}

function setSelected(id) {
  selectedId = id;
  render();
}

function renderImageOrEmpty(src, className, label, alt, tagName = "div") {
  const tag = tagName === "section" ? "section" : "div";
  if (!src) {
    return '<' + tag + ' class="' + className + '"><div class="feature-empty">' + escapeHtml(label) + '</div></' + tag + '>';
  }
  return '<' + tag + ' class="' + className + '"><img alt="' + escapeAttr(alt) + '" src="' + escapeAttr(src) + '" /></' + tag + '>';
}

function getCharacters(star) {
  if (Array.isArray(star.characters) && star.characters.length > 0) {
    return star.characters;
  }
  return [{
    id: "character-1",
    name: star.characterName || star.name || "キャラクター 1",
    imageUrl: star.standingImageUrl || "",
    description: star.pastedText || star.description || ""
  }];
}

function renderCharacter(character, index) {
  return '<article class="feature-character-card">' +
    renderImageOrEmpty(character.imageUrl, "feature-character", "キャラ画像未設定", character.name || "キャラクター") +
    '<div class="feature-character-copy">' +
      '<span class="feature-character-index">CHARACTER ' + String(index + 1).padStart(2, "0") + '</span>' +
      '<strong class="feature-character-name">' + escapeHtml(character.name || "未設定") + '</strong>' +
      '<div class="feature-text feature-character-text">' + formatMultiline(character.description || "") + '</div>' +
    '</div>' +
  '</article>';
}

function renderFeature(star) {
  const workUrl = safePublicUrl(star.workUrl);
  const linkHtml = workUrl
    ? '<a class="feature-link" href="' + escapeAttr(workUrl) + '" target="_blank" rel="noreferrer">作品へ移動</a>'
    : '<span class="feature-link is-disabled">作品URL未設定</span>';
  const characterHtml = getCharacters(star).map(renderCharacter).join('');
  featureOverlay.style.setProperty("--feature-color", star.color || "#ffd34d");
  featureBody.innerHTML =
    renderImageOrEmpty(star.sceneImageUrl, "feature-hero", "作品タイトル画像未設定", star.workTitle || star.name, "section") +
    '<section class="feature-work-details">' +
      '<p class="feature-kicker">' + escapeHtml(star.creatorName || "Creator") + '</p>' +
      '<h2>' + escapeHtml(star.workTitle || "未設定") + '</h2>' +
      '<div class="feature-text feature-work-description">' + formatMultiline(star.workDescription) + '</div>' +
      linkHtml +
    '</section>' +
    '<section class="feature-character-intro">' +
      '<h3 class="feature-section-title">キャラクター紹介</h3>' +
      '<div class="feature-character-list">' + characterHtml + '</div>' +
    '</section>';
}

function setFeatureOrigin(originEl) {
  if (originEl && originEl.getBoundingClientRect) {
    const rect = originEl.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    featureOverlay.style.setProperty("--origin-x", ox + "px");
    featureOverlay.style.setProperty("--origin-y", oy + "px");
    featureOverlay.style.setProperty("--travel-x", Math.round(ox - window.innerWidth / 2) + "px");
    featureOverlay.style.setProperty("--travel-y", Math.round(oy - window.innerHeight / 2) + "px");
  } else {
    featureOverlay.style.setProperty("--origin-x", "50vw");
    featureOverlay.style.setProperty("--origin-y", "50vh");
    featureOverlay.style.setProperty("--travel-x", "0px");
    featureOverlay.style.setProperty("--travel-y", "0px");
  }
}

function openFeature(id, originEl) {
  selectedId = id;
  featureId = id;
  setFeatureOrigin(originEl);
  const star = pickStar();
  map.classList.add("is-feature-open");
  render();
  renderFeature(star);
  featureOverlay.classList.remove("is-closing");
  featureOverlay.hidden = false;
  featureClose.focus();
}

function closeFeature() {
  if (featureOverlay.hidden || featureOverlay.classList.contains("is-closing")) return;
  const restoreId = featureId;
  featureOverlay.classList.add("is-closing");
  const finish = () => {
    featureOverlay.hidden = true;
    featureOverlay.classList.remove("is-closing");
    featureId = "";
    map.classList.remove("is-feature-open");
    render();
    const target = map.querySelector('[data-star-id="' + restoreId + '"]');
    if (target) target.focus();
  };
  const onEnd = (event) => {
    if (event.target !== featureOverlay) return;
    featureOverlay.removeEventListener("animationend", onEnd);
    finish();
  };
  featureOverlay.addEventListener("animationend", onEnd);
  window.setTimeout(() => {
    featureOverlay.removeEventListener("animationend", onEnd);
    if (featureOverlay.classList.contains("is-closing")) finish();
  }, 460);
}

function zoomToStar(id) {
  if (zoomedId) return;
  selectedId = id;
  zoomedId = id;
  var star = stars.find(function(s) { return s.id === id; });
  if (!star) return;
  map.style.setProperty("--zoom-x", star.x);
  map.style.setProperty("--zoom-y", star.y);
  map.classList.add("is-zoomed");
  publicMain.classList.add("is-zoomed");
  render();
  zoomBackdrop.hidden = false;
  zoomBackdrop.classList.remove("is-closing");
  zoomDetailTimer = window.setTimeout(function() { showStarDetail(star); }, 1000);
}

function showStarDetail(star) {
  var planetRows = [["planetClass","惑星分類"],["planetRadius","半径"],["planetGravity","重力"],["planetSeaLandRatio","海陸比"],["planetAtmosphereColor","大気色"],["planetOceanColor","海の色"],["planetCloudCover","雲量"],["planetIceCaps","氷冠"],["planetRotation","自転周期"],["planetOrbitalPeriod","公転周期"],["planetMoons","衛星"],["planetRings","環"]]
    .filter(function(pair) { return star[pair[0]]; })
    .map(function(pair) { return '<div><span>' + escapeHtml(pair[1]) + '</span><strong>' + escapeHtml(star[pair[0]]) + '</strong></div>'; })
    .join('');
  var bgmLabel = shortPublicUrl(star.bgmUrl || globalBgmUrl);
  starDetailSheet.innerHTML =
    '<button class="star-detail-close" id="starDetailClose" type="button" aria-label="閉じる">\\u00d7</button>' +
    '<div class="star-detail-header">' +
      '<span>STAR ' + String(stars.indexOf(star) + 1).padStart(2, "0") + '</span>' +
      '<h2>' + escapeHtml(star.name) + '</h2>' +
    '</div>' +
    '<p class="star-detail-desc">' + escapeHtml(star.description) + '</p>' +
    '<div class="star-detail-meta">' + planetRows +
      '<div><span>BGM</span><strong>' + escapeHtml(bgmLabel) + '</strong></div>' +
    '</div>' +
    '<button class="star-detail-work-btn" id="starDetailWorkBtn" type="button">作品詳細を見る</button>';
  starDetailSheet.hidden = false;
  starDetailSheet.classList.remove("is-closing");
  document.getElementById("starDetailClose").addEventListener("click", closeZoom);
  document.getElementById("starDetailWorkBtn").addEventListener("click", function() {
    var s = stars.find(function(s) { return s.id === zoomedId; });
    if (!s) return;
    var btn = map.querySelector('[data-star-id="' + zoomedId + '"]');
    openFeature(zoomedId, btn);
  });
}

function closeZoom() {
  if (!zoomedId) return;
  if (zoomDetailTimer) { window.clearTimeout(zoomDetailTimer); zoomDetailTimer = null; }
  starDetailSheet.classList.add("is-closing");
  zoomBackdrop.classList.add("is-closing");
  map.classList.remove("is-zoomed");
  window.setTimeout(function() {
    starDetailSheet.hidden = true;
    starDetailSheet.classList.remove("is-closing");
    zoomBackdrop.hidden = true;
    zoomBackdrop.classList.remove("is-closing");
    zoomedId = "";
    publicMain.classList.remove("is-zoomed");
    render();
  }, 900);
}

function render() {
  const selected = pickStar();
  const workBgmStar = pickFeatureStar() || pickZoomedStar();
  const workBgmUrl = workBgmStar && workBgmStar.bgmUrl ? workBgmStar.bgmUrl : "";
  const currentBgm = workBgmUrl || globalBgmUrl;
  const currentBgmIsGallery = !workBgmUrl;
  map.querySelectorAll(".star-button").forEach((node) => node.remove());
  stars.forEach((star, index) => {
    const button = document.createElement("button");
    button.className =
      "star-button" +
      (star.id === selected.id ? " selected" : "") +
      (star.id === featureId ? " feature-active" : "") +
      (star.id === zoomedId ? " zoom-target" : "");
    button.style.setProperty("--x", star.x);
    button.style.setProperty("--y", star.y);
    button.style.setProperty("--s", star.size);
    button.style.setProperty("--c", star.color);
    button.style.animationDelay = (index % 6) * -.42 + "s";
    button.setAttribute("aria-label", star.name);
    button.dataset.starId = star.id;
    button.innerHTML = '<img alt="" src="' + escapeAttr(star.imageUrl) + '" />';
    button.addEventListener("click", (event) => zoomToStar(star.id, event.currentTarget));
    map.appendChild(button);
  });
  detail.style.setProperty("--c", selected.color);
  detail.innerHTML = \`
    <div class="detail-kicker">STAR \${String(stars.indexOf(selected) + 1).padStart(2, "0")}</div>
    <h2>\${escapeHtml(selected.name)}</h2>
    <img class="hero-star" alt="\${escapeAttr(selected.name)}" src="\${escapeAttr(selected.imageUrl)}" />
    <p>\${escapeHtml(selected.description)}</p>
    <div class="meta-grid">
      <div class="meta-row"><span>制作者</span><strong>\${escapeHtml(selected.creatorName || "未設定")}</strong></div>
      \${[["planetClass","惑星分類"],["planetRadius","半径"],["planetGravity","重力"],["planetSeaLandRatio","海陸比"],["planetAtmosphereColor","大気色"],["planetOceanColor","海の色"],["planetCloudCover","雲量"],["planetIceCaps","氷冠"],["planetRotation","自転周期"],["planetOrbitalPeriod","公転周期"],["planetMoons","衛星"],["planetRings","環"]].map(([k,l]) => selected[k] ? '<div class="meta-row"><span>' + escapeHtml(l) + '</span><strong>' + escapeHtml(selected[k]) + '</strong></div>' : '').join('')}
      <div class="meta-row"><span>BGM</span><strong>\${escapeHtml(shortPublicUrl(currentBgm))}</strong></div>
    </div>\`;
  document.getElementById("audioLabel").textContent = shortPublicUrl(currentBgm);
  if (
    currentAudioUrl &&
    currentAudioIsGallery &&
    currentAudioUrl === globalBgmUrl &&
    !currentBgmIsGallery &&
    Number.isFinite(audio.currentTime)
  ) {
    galleryResumeTime = audio.currentTime;
  }

  if (currentBgm && audio.dataset.current !== currentBgm) {
    const seekTime = currentBgmIsGallery ? galleryResumeTime : 0;
    audio.dataset.current = currentBgm;
    audio.src = currentBgm;
    audio.load();
    currentAudioUrl = currentBgm;
    currentAudioIsGallery = currentBgmIsGallery;

    const seekAudio = function() {
      const duration = audio.duration;
      const targetTime = Number.isFinite(duration)
        ? Math.min(seekTime, Math.max(duration - 0.05, 0))
        : seekTime;
      try {
        audio.currentTime = Math.max(targetTime, 0);
      } catch {}
    };

    if (audio.readyState >= 1) {
      seekAudio();
    } else {
      audio.addEventListener("loadedmetadata", seekAudio, { once: true });
    }

    if (audioEnabled) {
      audio.play().catch(function() {
        audioEnabled = false;
        audioToggle.textContent = "BGM再生";
      });
    }
  }
  if (!currentBgm) {
    audio.removeAttribute("src");
    audio.dataset.current = "";
    currentAudioUrl = "";
    currentAudioIsGallery = true;
    audioEnabled = false;
    audioToggle.textContent = "BGM再生";
  }
}

audioToggle.addEventListener("click", async () => {
  if (!audio.src) return;
  if (audio.paused) {
    await audio.play();
    audioEnabled = true;
    audioToggle.textContent = "BGM停止";
  } else {
    audio.pause();
    audioEnabled = false;
    audioToggle.textContent = "BGM再生";
  }
});

featureClose.addEventListener("click", closeFeature);
featureOverlay.addEventListener("click", closeFeature);
featureModal.addEventListener("click", (event) => event.stopPropagation());
zoomBackdrop.addEventListener("click", closeZoom);

document.addEventListener("keydown", (event) => {
  if (!featureOverlay.hidden) {
    if (event.key === "Escape") { event.preventDefault(); closeFeature(); return; }
    if (event.key !== "Tab") return;
    const focusables = featureModal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (zoomedId && event.key === "Escape") {
    event.preventDefault(); closeZoom();
  }
});

render();
</script>
</body>
</html>`;
}

function StarFeatureModal({ star, origin, onClose, resolveImageSource = (value) => value || "" }) {
  const workUrl = safeExternalUrl(star.workUrl);
  const characters = getDisplayCharacters(star);
  const sceneImageSrc = resolveImageSource(star.sceneImageUrl);
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const [closing, setClosing] = useState(false);

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1440;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 900;
  const originX = origin?.x ?? viewportW / 2;
  const originY = origin?.y ?? viewportH / 2;
  const travelX = Math.round(originX - viewportW / 2);
  const travelY = Math.round(originY - viewportH / 2);

  const requestClose = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (!closing) return undefined;
    const handle = window.setTimeout(onClose, 300);
    return () => window.clearTimeout(handle);
  }, [closing, onClose]);

  useEffect(() => {
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setClosing(true);
        return;
      }
      if (event.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusables = modal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className={`feature-overlay ${closing ? "is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${star.name}の作品詳細`}
      style={{
        "--feature-color": star.color,
        "--origin-x": `${originX}px`,
        "--origin-y": `${originY}px`,
        "--travel-x": `${travelX}px`,
        "--travel-y": `${travelY}px`,
      }}
      onMouseDown={requestClose}
    >
      <section ref={modalRef} className="feature-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button ref={closeRef} className="feature-close" type="button" onClick={requestClose} aria-label="ポップアップを閉じる">
          <X size={20} weight="bold" />
        </button>

        <section className="feature-hero">
          {sceneImageSrc ? (
            <img alt={star.workTitle || star.name} src={sceneImageSrc} />
          ) : (
            <div className="feature-empty">作品タイトル画像未設定</div>
          )}
        </section>

        <section className="feature-work-details">
          <p className="feature-kicker">{star.creatorName || "Creator"}</p>
          <h2>{star.workTitle || "未設定"}</h2>
          <div className="feature-text feature-work-description">{star.workDescription}</div>

          {workUrl ? (
            <a className="feature-link" href={workUrl} target="_blank" rel="noreferrer">
              作品へ移動
            </a>
          ) : (
            <span className="feature-link is-disabled">作品URL未設定</span>
          )}
        </section>

        <section className="feature-character-intro">
          <h3 className="feature-section-title">キャラクター紹介</h3>
          <div className="feature-character-list">
            {characters.map((character, index) => {
              const characterImageSrc = resolveImageSource(character.imageUrl);
              return (
                <article className="feature-character-card" key={character.id || `${character.name}-${index}`}>
                  <div className="feature-character">
                    {characterImageSrc ? (
                      <img alt={character.name || "キャラクター"} src={characterImageSrc} />
                    ) : (
                      <div className="feature-empty">キャラ画像未設定</div>
                    )}
                  </div>
                  <div className="feature-character-copy">
                    <span className="feature-character-index">CHARACTER {String(index + 1).padStart(2, "0")}</span>
                    <strong className="feature-character-name">{character.name || "未設定"}</strong>
                    <div className="feature-text feature-character-text">{character.description}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}

function App() {
  const [stars, setStars] = useState(() => {
    const stored = readStoredConfig();
    if (Array.isArray(stored.stars) && stored.stars.length > 0) {
      return stored.stars.slice(0, MAX_STARS).map((star, index) => normalizeStar(star, index));
    }

    return makeDefaultStars();
  });
  const [selectedId, setSelectedId] = useState(() => stars[0]?.id || "");
  const [globalBgmUrl, setGlobalBgmUrl] = useState(() => {
    const stored = readStoredConfig();
    return stored.globalBgmUrl || DEFAULT_GLOBAL_BGM_URL;
  });
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(() => {
    const stored = readStoredConfig();
    return stored.backgroundImageUrl || DEFAULT_BACKGROUND_URL;
  });
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(0.68);
  const [saveState, setSaveState] = useState("保存済み");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [draggingStarId, setDraggingStarId] = useState("");
  const [activePopupStarId, setActivePopupStarId] = useState("");
  const [popupOrigin, setPopupOrigin] = useState(null);
  const [zoomedStarId, setZoomedStarId] = useState("");
  const [showStarDetail, setShowStarDetail] = useState(false);
  const [zoomClosing, setZoomClosing] = useState(false);
  const [indexedDbImages, setIndexedDbImages] = useState({});
  const audioRef = useRef(null);
  const spaceMapRef = useRef(null);
  const triggerElRef = useRef(null);
  const galleryResumeTimeRef = useRef(0);
  const currentAudioUrlRef = useRef("");
  const currentAudioIsGalleryRef = useRef(true);

  const selectedStar = useMemo(
    () => stars.find((star) => star.id === selectedId) || stars[0],
    [selectedId, stars],
  );

  const activePopupStar = useMemo(
    () => stars.find((star) => star.id === activePopupStarId),
    [activePopupStarId, stars],
  );

  const zoomedStar = useMemo(
    () => stars.find((star) => star.id === zoomedStarId),
    [zoomedStarId, stars],
  );

  const activeWorkBgmUrl = activePopupStar?.bgmUrl || zoomedStar?.bgmUrl || "";
  const effectiveBgmUrl = activeWorkBgmUrl || globalBgmUrl;
  const effectiveBgmIsGallery = !activeWorkBgmUrl;
  const hasPendingDataImageMigration = useMemo(
    () => hasDataImageAssets(stars, backgroundImageUrl),
    [stars, backgroundImageUrl],
  );
  const resolveImageSource = useCallback(
    (value) => resolveStoredImageSource(value, indexedDbImages),
    [indexedDbImages],
  );
  const displayBackgroundImageUrl = resolveImageSource(backgroundImageUrl) || DEFAULT_BACKGROUND_URL;

  useEffect(() => {
    if (hasPendingDataImageMigration) {
      setSaveState("画像保存中...");
      return undefined;
    }

    setSaveState("保存中...");
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            stars,
            globalBgmUrl,
            backgroundImageUrl,
            updatedAt: new Date().toISOString(),
          }),
        );
        setSaveState("保存済み");
      } catch {
        setSaveState("保存に失敗");
      }
    }, 260);

    return () => window.clearTimeout(handle);
  }, [stars, globalBgmUrl, backgroundImageUrl, hasPendingDataImageMigration]);

  useEffect(() => {
    if (!hasPendingDataImageMigration) return undefined;
    let cancelled = false;

    migrateDataImageAssets(stars, backgroundImageUrl)
      .then((result) => {
        if (cancelled || !result.changed) return;
        if (Object.keys(result.imageCache).length > 0) {
          setIndexedDbImages((current) => ({ ...current, ...result.imageCache }));
        }
        setStars(result.stars);
        setBackgroundImageUrl(result.backgroundImageUrl);
      })
      .catch(() => setSaveState("画像保存に失敗"));

    return () => {
      cancelled = true;
    };
  }, [stars, backgroundImageUrl, hasPendingDataImageMigration]);

  useEffect(() => {
    const missingRefs = collectIndexedDbImageRefs(stars, backgroundImageUrl).filter((ref) => !indexedDbImages[ref]);
    if (missingRefs.length === 0) return undefined;
    let cancelled = false;

    Promise.all(
      missingRefs.map(async (ref) => {
        try {
          return [ref, await readIndexedDbImage(ref)];
        } catch {
          return [ref, ""];
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const loadedImages = Object.fromEntries(entries.filter(([, value]) => value));
      if (Object.keys(loadedImages).length > 0) {
        setIndexedDbImages((current) => ({ ...current, ...loadedImages }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [stars, backgroundImageUrl, indexedDbImages]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!effectiveBgmUrl) {
      audio.pause();
      setIsAudioEnabled(false);
      currentAudioUrlRef.current = "";
      currentAudioIsGalleryRef.current = true;
      return;
    }

    const previousUrl = currentAudioUrlRef.current;
    const previousWasGallery = currentAudioIsGalleryRef.current;
    const isChangingTrack = previousUrl !== effectiveBgmUrl;

    if (
      isChangingTrack &&
      previousWasGallery &&
      previousUrl === globalBgmUrl &&
      !effectiveBgmIsGallery &&
      Number.isFinite(audio.currentTime)
    ) {
      galleryResumeTimeRef.current = audio.currentTime;
    }

    if (isChangingTrack) {
      audio.src = effectiveBgmUrl;
      audio.load();
      currentAudioUrlRef.current = effectiveBgmUrl;
      currentAudioIsGalleryRef.current = effectiveBgmIsGallery;

      const seekTime = effectiveBgmIsGallery ? galleryResumeTimeRef.current : 0;
      const seekAudio = () => {
        const duration = audio.duration;
        const targetTime = Number.isFinite(duration)
          ? Math.min(seekTime, Math.max(duration - 0.05, 0))
          : seekTime;
        try {
          audio.currentTime = Math.max(targetTime, 0);
        } catch {
          // Metadata can be unavailable until the browser finishes loading the file.
        }
      };

      if (audio.readyState >= 1) {
        seekAudio();
      } else {
        audio.addEventListener("loadedmetadata", seekAudio, { once: true });
      }
    }

    if (isAudioEnabled) {
      audio.play().catch(() => setIsAudioEnabled(false));
    }
  }, [effectiveBgmUrl, effectiveBgmIsGallery, globalBgmUrl, isAudioEnabled]);

  useEffect(() => {
    if (activePopupStarId && !activePopupStar) {
      setActivePopupStarId("");
    }
  }, [activePopupStar, activePopupStarId]);

  useEffect(() => {
    if (zoomedStarId && !zoomedStar) {
      setZoomedStarId("");
      setShowStarDetail(false);
      setZoomClosing(false);
    }
  }, [zoomedStar, zoomedStarId]);

  useEffect(() => {
    if (!zoomedStarId || zoomClosing) return undefined;
    const handle = setTimeout(() => setShowStarDetail(true), 1000);
    return () => clearTimeout(handle);
  }, [zoomedStarId, zoomClosing]);

  useEffect(() => {
    if (!zoomedStarId || activePopupStarId) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setZoomClosing(true);
        setActivePopupStarId("");
        setTimeout(() => {
          setZoomedStarId("");
          setShowStarDetail(false);
          setZoomClosing(false);
        }, 900);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [zoomedStarId, activePopupStarId]);

  function updateStar(starId, patch) {
    setStars((current) =>
      current.map((star) =>
        star.id === starId
          ? {
              ...star,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : star,
      ),
    );
  }

  function updateSelected(patch) {
    if (!selectedStar) return;
    updateStar(selectedStar.id, patch);
  }

  function commitSelectedCharacters(nextCharacters) {
    if (!selectedStar) return;
    const characters = nextCharacters.length
      ? nextCharacters.slice(0, MAX_CHARACTERS_PER_STAR)
      : [
          {
            ...makeCharacterDefaults(selectedStar.name, 0, selectedStar.description),
            id: `character-${Date.now()}-0`,
          },
        ];
    updateSelected({
      characters,
      ...getPrimaryCharacterFields(characters, selectedStar.name, selectedStar.description),
    });
  }

  function updateSelectedCharacter(characterId, patch) {
    if (!selectedStar) return;
    commitSelectedCharacters(
      getDisplayCharacters(selectedStar).map((character) =>
        character.id === characterId ? { ...character, ...patch } : character,
      ),
    );
  }

  function addSelectedCharacter() {
    if (!selectedStar) return;
    const currentCharacters = getDisplayCharacters(selectedStar);
    if (currentCharacters.length >= MAX_CHARACTERS_PER_STAR) return;
    const index = currentCharacters.length;
    const character = {
      ...makeCharacterDefaults(`キャラクター ${index + 1}`, index),
      id: `character-${Date.now()}-${index}`,
    };
    commitSelectedCharacters([...currentCharacters, character]);
  }

  function deleteSelectedCharacter(characterId) {
    if (!selectedStar) return;
    const currentCharacters = getDisplayCharacters(selectedStar);
    if (currentCharacters.length <= 1) return;
    commitSelectedCharacters(currentCharacters.filter((character) => character.id !== characterId));
  }

  async function uploadBackgroundFile(file) {
    if (!file) return;
    try {
      const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
      if (ref) {
        setIndexedDbImages((current) => ({ ...current, [ref]: dataUrl }));
        setBackgroundImageUrl(ref);
      }
    } catch {
      setSaveState("画像保存に失敗");
    }
  }

  async function uploadSelectedStarImage(file) {
    if (!selectedStar || !file) return;
    try {
      const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
      if (ref) {
        setIndexedDbImages((current) => ({ ...current, [ref]: dataUrl }));
        updateSelected({ imageUrl: ref });
      }
    } catch {
      setSaveState("画像保存に失敗");
    }
  }

  async function uploadSelectedCharacterImage(characterId, file) {
    if (!selectedStar || !file) return;
    try {
      const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
      if (ref) {
        setIndexedDbImages((current) => ({ ...current, [ref]: dataUrl }));
        updateSelectedCharacter(characterId, { imageUrl: ref });
      }
    } catch {
      setSaveState("画像保存に失敗");
    }
  }

  async function uploadSelectedSceneImage(file) {
    if (!selectedStar || !file) return;
    try {
      const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
      if (ref) {
        setIndexedDbImages((current) => ({ ...current, [ref]: dataUrl }));
        updateSelected({ sceneImageUrl: ref });
      }
    } catch {
      setSaveState("画像保存に失敗");
    }
  }

  function setPreviewMode(nextValue) {
    setIsPreviewMode(nextValue);
    if (!nextValue) {
      setActivePopupStarId("");
      setZoomedStarId("");
      setShowStarDetail(false);
      setZoomClosing(false);
    }
  }

  const closeZoomView = useCallback(() => {
    setZoomClosing(true);
    setActivePopupStarId("");
    setTimeout(() => {
      setZoomedStarId("");
      setShowStarDetail(false);
      setZoomClosing(false);
    }, 900);
  }, []);

  function openWorkFromZoom() {
    if (!zoomedStar) return;
    const node = spaceMapRef.current?.querySelector(`[data-star-id="${zoomedStarId}"]`);
    openPopup(zoomedStarId, node);
  }

  function originFromElement(element) {
    if (!element || typeof element.getBoundingClientRect !== "function") return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function openPopup(starId, element) {
    setPopupOrigin(originFromElement(element));
    triggerElRef.current = element || null;
    setActivePopupStarId(starId);
  }

  function openPopupForSelected() {
    const node = spaceMapRef.current?.querySelector(`[data-star-id="${selectedStar.id}"]`);
    openPopup(selectedStar.id, node);
  }

  function closePopup() {
    const trigger = triggerElRef.current;
    setActivePopupStarId("");
    setPopupOrigin(null);
    if (trigger && typeof trigger.focus === "function") {
      window.requestAnimationFrame(() => trigger.focus());
    }
  }

  function handleStarActivate(starId, event) {
    setSelectedId(starId);
    if (isPreviewMode) {
      if (zoomedStarId) return;
      setZoomedStarId(starId);
      setShowStarDetail(false);
      setZoomClosing(false);
    }
  }

  function positionFromPointer(event) {
    const map = spaceMapRef.current;
    if (!map) return null;

    const bounds = map.getBoundingClientRect();
    return {
      x: Math.round(clamp(((event.clientX - bounds.left) / bounds.width) * 100, 3, 97) * 10) / 10,
      y: Math.round(clamp(((event.clientY - bounds.top) / bounds.height) * 100, 5, 95) * 10) / 10,
    };
  }

  function moveStarToPointer(event, starId) {
    const position = positionFromPointer(event);
    if (!position) return;
    updateStar(starId, position);
  }

  function beginStarDrag(event, starId) {
    if (isPreviewMode) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedId(starId);
    setDraggingStarId(starId);
    moveStarToPointer(event, starId);
  }

  function continueStarDrag(event, starId) {
    if (draggingStarId !== starId) return;
    moveStarToPointer(event, starId);
  }

  function endStarDrag() {
    setDraggingStarId("");
  }

  function addStar() {
    if (stars.length >= MAX_STARS) return;
    const index = stars.length;
    const color = STAR_COLORS[index % STAR_COLORS.length];
    const name = `新しい星 ${index + 1}`;
    const description = "新しく登録された星。名前、説明、画像URL、位置、BGMを編集できます。";
    const newStar = {
      id: `star-${Date.now()}`,
      name,
      description,
      color,
      size: 1,
      x: 18 + ((index * 11) % 68),
      y: 18 + ((index * 17) % 68),
      z: 1.4,
      imageUrl: makeStarImage(color, index),
      bgmUrl: "",
      ...makeFeatureDefaults(name, index, description),
      updatedAt: new Date().toISOString(),
    };

    setStars((current) => [...current, newStar]);
    setSelectedId(newStar.id);
  }

  function duplicateStar() {
    if (!selectedStar || stars.length >= MAX_STARS) return;
    const clone = {
      ...selectedStar,
      id: `star-${Date.now()}`,
      name: `${selectedStar.name} コピー`,
      x: clamp(selectedStar.x + 7, 5, 95),
      y: clamp(selectedStar.y + 7, 5, 95),
      updatedAt: new Date().toISOString(),
    };

    setStars((current) => [...current, clone]);
    setSelectedId(clone.id);
  }

  function deleteStar() {
    if (!selectedStar || stars.length <= 1) return;
    const nextStars = stars.filter((star) => star.id !== selectedStar.id);
    setStars(nextStars);
    setSelectedId(nextStars[0].id);
  }

  async function toggleAudio() {
    const audio = audioRef.current;
    if (!audio || !effectiveBgmUrl) return;

    if (isAudioEnabled) {
      audio.pause();
      setIsAudioEnabled(false);
      return;
    }

    try {
      await audio.play();
      setIsAudioEnabled(true);
    } catch {
      setIsAudioEnabled(false);
    }
  }

  async function exportPublicPage() {
    setIsExporting(true);
    setExportStatus("");
    try {
      const embeddedBackground = await embedAsset(backgroundImageUrl || DEFAULT_BACKGROUND_URL);
      const embeddedStars = await Promise.all(
        stars.map(async (star) => {
          const sourceCharacters = getDisplayCharacters(star);
          const [embeddedImage, embeddedSceneImage, embeddedCharacters] = await Promise.all([
            embedAsset(star.imageUrl),
            embedAsset(star.sceneImageUrl),
            Promise.all(
              sourceCharacters.map(async (character) => {
                const embeddedCharacterImage = await embedAsset(character.imageUrl);
                return {
                  ...character,
                  imageUrl: embeddedCharacterImage.value,
                  imageEmbedded: embeddedCharacterImage.embedded || !character.imageUrl,
                };
              }),
            ),
          ]);
          return {
            ...star,
            ...getPrimaryCharacterFields(embeddedCharacters, star.name, star.description),
            characters: embeddedCharacters,
            imageUrl: embeddedImage.value,
            sceneImageUrl: embeddedSceneImage.value,
            imageEmbedded: embeddedImage.embedded,
            sceneImageEmbedded: embeddedSceneImage.embedded || !star.sceneImageUrl,
            missedCharacterAssets: embeddedCharacters.reduce(
              (total, character) => total + (character.imageEmbedded ? 0 : 1),
              0,
            ),
          };
        }),
      );
      const missedAssets =
        (embeddedBackground.embedded ? 0 : 1) +
        embeddedStars.reduce(
          (total, star) =>
            total +
            (star.imageEmbedded ? 0 : 1) +
            (star.sceneImageEmbedded ? 0 : 1) +
            (star.missedCharacterAssets || 0),
          0,
        );
      const html = buildPublicHtml({
        stars: embeddedStars,
        selectedId: selectedStar?.id,
        bgmUrl: globalBgmUrl,
        backgroundDataUrl: embeddedBackground.value,
      });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "a-plan-star-gallery-public.html";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportStatus(
        missedAssets > 0
          ? `公開HTMLを生成しました（一部URL参照 ${missedAssets}件）`
          : "公開HTMLを生成しました",
      );
      window.setTimeout(() => setExportStatus(""), 3200);
    } catch {
      setExportStatus("生成に失敗しました");
    } finally {
      setIsExporting(false);
    }
  }

  if (!selectedStar) {
    return null;
  }

  const selectedCharacters = getDisplayCharacters(selectedStar);

  return (
    <div
      className={`app-shell ${isPreviewMode ? "is-preview-mode" : ""} ${zoomedStarId && !zoomClosing ? "is-star-zoomed" : ""}`}
      style={{ "--space-image": `url(${displayBackgroundImageUrl})` }}
    >
      <audio ref={audioRef} loop />
      <span className="shooting-star" aria-hidden="true" />
      <span className="shooting-star two" aria-hidden="true" />
      <header className="topbar" aria-label="星図ギャラリー操作バー">
        <div className="brand">
          <span className="brand-orbit" aria-hidden="true">
            <Planet size={28} weight="duotone" />
          </span>
          <div>
            <p>A-plan</p>
            <h1>星図ギャラリー</h1>
          </div>
        </div>

        <div className="top-actions editor-only">
          <button className="ghost-button" type="button" onClick={addStar} disabled={stars.length >= MAX_STARS}>
            <Plus size={18} weight="bold" />
            星を追加
          </button>
          <span className="save-pill">
            <FloppyDisk size={16} weight="duotone" />
            {saveState}
          </span>
        </div>

        <label className="bgm-field editor-only">
          <span>BGM GitHub URL</span>
          <input
            value={globalBgmUrl}
            onChange={(event) => setGlobalBgmUrl(event.target.value)}
            placeholder="https://raw.githubusercontent.com/user/repo/main/ambient.mp3"
          />
        </label>

        <div className="audio-controls">
          <button
            className="icon-button"
            type="button"
            onClick={toggleAudio}
            aria-label={isAudioEnabled ? "BGMを停止" : "BGMを再生"}
            disabled={!effectiveBgmUrl}
          >
            {isAudioEnabled ? <Pause size={19} weight="fill" /> : <Play size={19} weight="fill" />}
          </button>
          <label className="volume editor-only">
            {volume === 0 ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
            <span>{Math.round(volume * 100)}%</span>
          </label>
        </div>

        <div className="publish-actions editor-only">
          <button className="subtle-button" type="button" onClick={() => setPreviewMode(!isPreviewMode)}>
            <MagnifyingGlassPlus size={18} />
            {isPreviewMode ? "編集表示" : "公開表示"}
          </button>
          <button className="primary-button" type="button" onClick={exportPublicPage} disabled={isExporting}>
            <DownloadSimple size={18} weight="bold" />
            {isExporting ? "生成中" : "公開HTML"}
          </button>
        </div>

        {isPreviewMode ? (
          <button className="subtle-button preview-return" type="button" onClick={() => setPreviewMode(false)}>
            <PencilSimple size={18} />
            編集表示
          </button>
        ) : null}
      </header>

      {exportStatus ? <div className="export-toast editor-only">{exportStatus}</div> : null}

      <main className="workspace">
        <aside className="star-catalog editor-only" aria-label="登録済みの星">
          <div className="panel-heading">
            <div>
              <span>登録済みの星</span>
              <strong>
                {stars.length} / {MAX_STARS}
              </strong>
            </div>
            <button type="button" onClick={() => setStars(makeDefaultStars())}>
              <ArrowsClockwise size={17} />
              初期化
            </button>
          </div>

          <section className="background-tools" aria-label="背景の差し替え">
            <div className="form-title">
              <ImageSquare size={17} />
              <span>背景</span>
            </div>
            <label>
              背景画像URL
              <input
                value={editableImageValue(backgroundImageUrl)}
                onChange={(event) => setBackgroundImageUrl(event.target.value)}
                placeholder="GitHub raw URL または画像URL"
              />
            </label>
            <div className="file-row">
              <label className="file-button">
                <UploadSimple size={16} />
                画像を選択
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadBackgroundFile(event.target.files?.[0])}
                />
              </label>
              <button type="button" onClick={() => setBackgroundImageUrl(DEFAULT_BACKGROUND_URL)}>
                初期背景
              </button>
            </div>
          </section>

          <div className="star-list">
            {stars.map((star, index) => (
              <button
                className={`star-row ${star.id === selectedStar.id ? "is-active" : ""}`}
                key={star.id}
                type="button"
                onClick={() => setSelectedId(star.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <img alt="" src={resolveImageSource(star.imageUrl)} />
                <strong>{star.name}</strong>
                {star.bgmUrl ? <MusicNotes size={15} weight="fill" /> : null}
              </button>
            ))}
          </div>
        </aside>

        <section
          className={`space-map ${activePopupStarId ? "is-feature-open" : ""} ${zoomedStarId && !zoomClosing ? "is-zoomed" : ""}`}
          ref={spaceMapRef}
          aria-label="クリックできる星図"
          style={zoomedStar ? { "--zoom-x": zoomedStar.x, "--zoom-y": zoomedStar.y } : undefined}
        >
          <div className="map-grid" aria-hidden="true" />
          <span className="orbit orbit-one" aria-hidden="true" />
          <span className="orbit orbit-two" aria-hidden="true" />
          <span className="orbit orbit-three" aria-hidden="true" />
          <span className="compass-line horizontal" aria-hidden="true" />
          <span className="compass-line vertical" aria-hidden="true" />
          {PARTICLES.map((particle) => (
            <span
              className="space-particle"
              key={particle.id}
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            />
          ))}

          {stars.map((star, index) => (
            <button
              className={`star-node ${star.id === selectedStar.id ? "is-selected" : ""} ${
                draggingStarId === star.id ? "is-dragging" : ""
              } ${activePopupStarId === star.id ? "is-popup-active" : ""} ${zoomedStarId === star.id ? "is-zoom-target" : ""}`}
              key={star.id}
              type="button"
              data-star-id={star.id}
              style={{
                "--star-x": star.x,
                "--star-y": star.y,
                "--star-size": star.size,
                "--star-color": star.color,
                animationDelay: `${(index % 7) * -0.42}s`,
              }}
              onClick={(event) => handleStarActivate(star.id, event)}
              onPointerDown={(event) => beginStarDrag(event, star.id)}
              onPointerMove={(event) => continueStarDrag(event, star.id)}
              onPointerUp={endStarDrag}
              onPointerCancel={endStarDrag}
              aria-label={`${star.name}の詳細を表示`}
              title={isPreviewMode ? "作品ポップアップを表示" : "ドラッグで配置"}
            >
              <img alt="" src={resolveImageSource(star.imageUrl)} />
              <span className="editor-only">{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}

          <div className="map-zoom editor-only" aria-label="マップ表示ツール">
            <button type="button" aria-label="中央へ戻す">
              <Planet size={18} />
            </button>
            <button type="button" aria-label="拡大">
              <Plus size={18} />
            </button>
            <button type="button" aria-label="縮小">
              <X size={17} />
            </button>
          </div>
        </section>

        <aside className="detail-panel" aria-label="選択中の星の詳細">
          <div className="detail-top">
            <span>STAR {String(stars.indexOf(selectedStar) + 1).padStart(2, "0")}</span>
            <h2>{selectedStar.name}</h2>
          </div>

          <div className="star-preview" style={{ "--preview-color": selectedStar.color }}>
            <img alt={selectedStar.name} src={resolveImageSource(selectedStar.imageUrl)} />
          </div>

          <p className="description">{selectedStar.description}</p>

          <div className="meta-table">
            <div>
              <span>制作者</span>
              <strong>{selectedStar.creatorName || "未設定"}</strong>
            </div>
            <div className="editor-only">
              <span>色</span>
              <strong>
                <i style={{ backgroundColor: selectedStar.color }} />
                {selectedStar.color}
              </strong>
            </div>
            <div className="editor-only">
              <span>サイズ</span>
              <strong>{Number(selectedStar.size).toFixed(2)} R</strong>
            </div>
            <div className="editor-only">
              <span>位置</span>
              <strong>
                X {selectedStar.x} / Y {selectedStar.y} / Z {selectedStar.z}
              </strong>
            </div>
            <div className="editor-only">
              <span>更新日</span>
              <strong>{formatDate(selectedStar.updatedAt)}</strong>
            </div>
            {PLANET_FIELDS.map(({ key, label }) =>
              selectedStar[key] ? (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{selectedStar[key]}</strong>
                </div>
              ) : null,
            )}
            <div>
              <span>BGM</span>
              <strong>{shortUrl(selectedStar.bgmUrl || globalBgmUrl)}</strong>
            </div>
          </div>

          <section className="editor-form editor-only" aria-label="星の編集">
            <div className="form-section">
              <div className="form-title">
                <PencilSimple size={17} />
                <span>星の基本情報</span>
              </div>
              <label>
                名前
                <input value={selectedStar.name} onChange={(event) => updateSelected({ name: event.target.value })} />
              </label>
              <label>
                説明
                <textarea
                  value={selectedStar.description}
                  onChange={(event) => updateSelected({ description: event.target.value })}
                  rows={4}
                />
              </label>
              <label>
                星画像URL
                <input
                  value={editableImageValue(selectedStar.imageUrl)}
                  onChange={(event) => updateSelected({ imageUrl: event.target.value })}
                  placeholder="GitHubのraw画像URL"
                />
              </label>
              <div className="file-row">
                <label className="file-button">
                  <UploadSimple size={16} />
                  星画像を選択
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadSelectedStarImage(event.target.files?.[0])}
                  />
                </label>
                <span className="hint-text">公開HTMLでは画像を埋め込みます</span>
              </div>
              <label>
                この星のBGM URL
                <input
                  value={selectedStar.bgmUrl}
                  onChange={(event) => updateSelected({ bgmUrl: event.target.value })}
                  placeholder="未設定なら全体BGMを使用"
                />
              </label>
              <div className="form-grid">
                <label>
                  色
                  <input
                    type="color"
                    value={selectedStar.color}
                    onChange={(event) => updateSelected({ color: event.target.value })}
                  />
                </label>
                <label>
                  サイズ
                  <input
                    type="range"
                    min="0.55"
                    max="1.8"
                    step="0.01"
                    value={selectedStar.size}
                    onChange={(event) => updateSelected({ size: Number(event.target.value) })}
                  />
                </label>
                <label>
                  X
                  <input
                    type="number"
                    min="3"
                    max="97"
                    value={selectedStar.x}
                    onChange={(event) => updateSelected({ x: clamp(event.target.value, 3, 97) })}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    min="5"
                    max="95"
                    value={selectedStar.y}
                    onChange={(event) => updateSelected({ y: clamp(event.target.value, 5, 95) })}
                  />
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-title">
                <ImageSquare size={17} />
                <span>作品情報</span>
              </div>
              <label>
                クリエイター名
                <input
                  value={selectedStar.creatorName}
                  onChange={(event) => updateSelected({ creatorName: event.target.value })}
                  placeholder="例: Guarhiro"
                />
              </label>
              <label>
                作品タイトル画像URL
                <input
                  value={editableImageValue(selectedStar.sceneImageUrl)}
                  onChange={(event) => updateSelected({ sceneImageUrl: event.target.value })}
                  placeholder="作品タイトル画像・キービジュアルURL"
                />
              </label>
              <div className="file-row">
                <label className="file-button">
                  <UploadSimple size={16} />
                  作品画像を選択
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadSelectedSceneImage(event.target.files?.[0])}
                  />
                </label>
                <span className="hint-text">作品詳細ポップアップ上部</span>
              </div>
              <div className="form-grid">
                <label>
                  作品タイトル
                  <input
                    value={selectedStar.workTitle}
                    onChange={(event) => updateSelected({ workTitle: event.target.value })}
                    placeholder="リンク先作品名"
                  />
                </label>
                <label>
                  作品URL
                  <input
                    value={selectedStar.workUrl}
                    onChange={(event) => updateSelected({ workUrl: event.target.value })}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <label>
                作品詳細
                <textarea
                  value={selectedStar.workDescription}
                  onChange={(event) => updateSelected({ workDescription: event.target.value })}
                  rows={4}
                  placeholder="作品の紹介文・あらすじなど"
                />
              </label>
            </div>

            <div className="form-section character-section">
              <div className="form-title form-title-row">
                <span className="form-title-label">
                  <PencilSimple size={17} />
                  <span>キャラクター</span>
                </span>
                <button
                  className="mini-action"
                  type="button"
                  onClick={addSelectedCharacter}
                  disabled={selectedCharacters.length >= MAX_CHARACTERS_PER_STAR}
                >
                  <Plus size={16} weight="bold" />
                  追加
                </button>
              </div>
              <div className="character-editor-list">
                {selectedCharacters.map((character, index) => (
                  <article className="character-editor-card" key={character.id}>
                    <div className="character-editor-head">
                      <strong>CHARACTER {String(index + 1).padStart(2, "0")}</strong>
                      <button
                        className="character-remove"
                        type="button"
                        onClick={() => deleteSelectedCharacter(character.id)}
                        disabled={selectedCharacters.length <= 1}
                        aria-label={`${character.name || "キャラクター"}を削除`}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                    <label>
                      キャラ名
                      <input
                        value={character.name}
                        onChange={(event) => updateSelectedCharacter(character.id, { name: event.target.value })}
                        placeholder="キャラクター名"
                      />
                    </label>
                    <label>
                      キャラ画像URL
                      <input
                        value={editableImageValue(character.imageUrl)}
                        onChange={(event) => updateSelectedCharacter(character.id, { imageUrl: event.target.value })}
                        placeholder="キャラ画像のGitHub raw URL"
                      />
                    </label>
                    <div className="file-row">
                      <label className="file-button">
                        <UploadSimple size={16} />
                        キャラ画像を選択
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => uploadSelectedCharacterImage(character.id, event.target.files?.[0])}
                        />
                      </label>
                      <span className="hint-text">このキャラだけに反映</span>
                    </div>
                    <label>
                      キャラ詳細文
                      <textarea
                        value={character.description}
                        onChange={(event) => updateSelectedCharacter(character.id, { description: event.target.value })}
                        rows={5}
                        placeholder="キャラクター紹介文やキャプションを貼り付け"
                      />
                    </label>
                  </article>
                ))}
              </div>
            </div>

            <div className="form-section">
              <div className="form-title">
                <Planet size={17} />
                <span>惑星データ</span>
              </div>
              <div className="form-grid">
                {PLANET_FIELDS.map(({ key, label }) => (
                  <label key={key}>
                    {label}
                    <input
                      value={selectedStar[key]}
                      onChange={(event) => updateSelected({ [key]: event.target.value })}
                      placeholder={label}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

          <div className="detail-actions editor-only">
            <button type="button" onClick={openPopupForSelected}>
              ポップアップ確認
            </button>
            <button type="button" onClick={duplicateStar} disabled={stars.length >= MAX_STARS}>
              複製
            </button>
            <button className="danger" type="button" onClick={deleteStar} disabled={stars.length <= 1}>
              <Trash size={17} />
              削除
            </button>
          </div>
        </aside>
      </main>
      {zoomedStar ? (
        <div className={`star-zoom-overlay ${zoomClosing ? "is-closing" : ""}`}>
          <div className="star-zoom-backdrop" onClick={closeZoomView} />
          {showStarDetail && (
            <div className="star-detail-sheet">
              <button className="star-detail-close" type="button" onClick={closeZoomView} aria-label="閉じる">
                <X size={20} weight="bold" />
              </button>
              <div className="star-detail-header">
                <span>STAR {String(stars.indexOf(zoomedStar) + 1).padStart(2, "0")}</span>
                <h2>{zoomedStar.name}</h2>
              </div>
              <p className="star-detail-desc">{zoomedStar.description}</p>
              <div className="star-detail-meta">
                {PLANET_FIELDS.filter(({ key }) => zoomedStar[key]).map(({ key, label }) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>{zoomedStar[key]}</strong>
                  </div>
                ))}
                <div>
                  <span>BGM</span>
                  <strong>{shortUrl(zoomedStar.bgmUrl || globalBgmUrl)}</strong>
                </div>
              </div>
              <button className="star-detail-work-btn" type="button" onClick={openWorkFromZoom}>
                作品詳細を見る
              </button>
            </div>
          )}
        </div>
      ) : null}
      {activePopupStar ? (
        <StarFeatureModal star={activePopupStar} origin={popupOrigin} onClose={closePopup} resolveImageSource={resolveImageSource} />
      ) : null}
    </div>
  );
}

export { App };
