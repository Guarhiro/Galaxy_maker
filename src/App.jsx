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
import hoshiyomiGingaLogoUrl from "./assets/hoshiyomi-ginga-logo.png";

const STORAGE_KEY = "a-plan-star-gallery-demo";
const IMAGE_DB_NAME = "a-plan-star-gallery-images";
const IMAGE_STORE_NAME = "images";
const IMAGE_REF_PREFIX = "indexeddb-image:";
const AUDIO_REF_PREFIX = "indexeddb-audio:";
const MAX_STARS = 20;
const DEFAULT_BACKGROUND_URL = backgroundUrl;
const DEFAULT_GLOBAL_BGM_URL = "assets/audio/gallery.mp3";
const PUBLIC_IMAGE_ASSET_DIR = "assets/images";
const PUBLIC_AUDIO_ASSET_DIR = "assets/audio";
const PUBLIC_EXPORT_FILENAME = "a-plan-star-gallery-public.zip";
const PUBLIC_IMAGE_TARGETS = {
  background: { maxSize: 1600, quality: 0.82 },
  star: { maxSize: 520, quality: 0.82 },
  scene: { maxSize: 960, quality: 0.82 },
  character: { maxSize: 768, quality: 0.82 },
};
const ETERNIA_TITLE = "エテルニア・ステラリア";
const ETERNIA_BGM_URL = "assets/audio/ginga-wa-warawa-no-teatime.mp3";
const ETERNIA_BGM_TITLE = "銀河はわらわのティータイム";
const INTRO_FADE_MS = 1000;
const INTRO_HOLD_MS = 850;
const INTRO_MOVE_MS = 900;
const INTRO_EXIT_MS = 180;
const LOGO_IMAGE_WIDTH = 2172;
const LOGO_IMAGE_HEIGHT = 724;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function getInitialIntroPhase() {
  return prefersReducedMotion() ? "done" : "intro";
}

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
  { key: "planetNotes", label: "備考" },
];
const MAX_CHARACTERS_PER_STAR = 12;
const MAX_CHARACTER_EXTRA_IMAGES = 6;

function normalizeImageList(values, maxItems = Number.POSITIVE_INFINITY) {
  if (!Array.isArray(values)) return [];
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const image = String(value || "").trim();
    if (!image || seen.has(image)) continue;
    seen.add(image);
    normalized.push(image);
    if (normalized.length >= maxItems) break;
  }

  return normalized;
}

function normalizeCharacterImages(images) {
  return normalizeImageList(images, MAX_CHARACTER_EXTRA_IMAGES);
}

function getCharacterImageSources(character) {
  return normalizeImageList([character?.imageUrl, ...(Array.isArray(character?.images) ? character.images : [])]);
}

function getCharacterExtraImages(character) {
  return normalizeCharacterImages(character?.images);
}

function makeCharacterDefaults(name, index = 0, description = "") {
  const fallbackName = name || `キャラクター ${index + 1}`;

  return {
    id: `character-${index + 1}`,
    name: fallbackName,
    imageUrl: "",
    images: [],
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
    images: normalizeCharacterImages(character?.images),
    description:
      character?.description ??
      character?.pastedText ??
      fallbackDescription ??
      `${name}の紹介テキストをここに入力します。`,
  };
}

function getPrimaryCharacterFields(characters, fallbackName = "", fallbackDescription = "") {
  const first = characters[0];

  if (!first) {
    return {
      characterName: "",
      standingImageUrl: "",
      pastedText: "",
    };
  }

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
  const sourceCharacters = Array.isArray(star?.characters) ? star.characters : [fallbackCharacter];

  return sourceCharacters.slice(0, MAX_CHARACTERS_PER_STAR).map((character, index) =>
    normalizeCharacter(
      character,
      index,
      index === 0 ? fallbackCharacter.name : `キャラクター ${index + 1}`,
      index === 0 ? fallbackCharacter.description : "",
    ),
  );
}

function normalizeCharacters2(star) {
  if (!Array.isArray(star?.characters2)) return [];

  return star.characters2.slice(0, MAX_CHARACTERS_PER_STAR).map((character, index) =>
    normalizeCharacter(character, index, `キャラクター ${index + 1}`, ""),
  );
}

function normalizeCharacters3(star) {
  if (!Array.isArray(star?.characters3)) return [];

  return star.characters3.slice(0, MAX_CHARACTERS_PER_STAR).map((character, index) =>
    normalizeCharacter(character, index, `キャラクター ${index + 1}`, ""),
  );
}

function getDisplayCharacters(star, workIndex = 1) {
  if (workIndex === 3) {
    return Array.isArray(star?.characters3) ? star.characters3 : [];
  }

  if (workIndex === 2) {
    return Array.isArray(star?.characters2) ? star.characters2 : [];
  }

  if (Array.isArray(star?.characters)) {
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

function hasSecondWork(star) {
  return (
    [star?.creatorName2, star?.sceneImageUrl2, star?.workTitle2, star?.workUrl2, star?.workDescription2].some((value) =>
      String(value || "").trim(),
    ) || getDisplayCharacters(star, 2).length > 0
  );
}

function hasThirdWork(star) {
  return (
    [star?.creatorName3, star?.sceneImageUrl3, star?.workTitle3, star?.workUrl3, star?.workDescription3].some((value) =>
      String(value || "").trim(),
    ) || getDisplayCharacters(star, 3).length > 0
  );
}

function getWorkFields(star, workIndex = 1) {
  if (workIndex === 3) {
    return {
      creatorName: star?.creatorName3 || "",
      sceneImageUrl: star?.sceneImageUrl3 || "",
      workTitle: star?.workTitle3 || "",
      workUrl: star?.workUrl3 || "",
      workDescription: star?.workDescription3 || "",
    };
  }

  if (workIndex === 2) {
    return {
      creatorName: star?.creatorName2 || "",
      sceneImageUrl: star?.sceneImageUrl2 || "",
      workTitle: star?.workTitle2 || "",
      workUrl: star?.workUrl2 || "",
      workDescription: star?.workDescription2 || "",
    };
  }

  return {
    creatorName: star?.creatorName || "",
    sceneImageUrl: star?.sceneImageUrl || "",
    workTitle: star?.workTitle || "",
    workUrl: star?.workUrl || "",
    workDescription: star?.workDescription || "",
  };
}

function workFallbackTitle(workIndex) {
  if (workIndex === 3) return "作品③";
  return workIndex === 2 ? "作品②" : "作品①";
}

function workButtonLabel(star, workIndex = 1) {
  const title = getWorkFields(star, workIndex).workTitle || workFallbackTitle(workIndex);
  return `作品詳細を見る「${title}」`;
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
    creatorName2: "",
    sceneImageUrl2: "",
    workTitle2: "",
    workUrl2: "",
    workDescription2: "",
    creatorName3: "",
    sceneImageUrl3: "",
    workTitle3: "",
    workUrl3: "",
    workDescription3: "",
    pastedText,
    characters: [makeCharacterDefaults(name, 0, pastedText)],
    characters2: [],
    characters3: [],
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
      bgmTitle: index === 0 || index === 13 ? ETERNIA_BGM_TITLE : "",
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
  const characters2 = normalizeCharacters2(star);
  const characters3 = normalizeCharacters3(star);
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
    bgmTitle: star?.bgmTitle || "",
    creatorName: star?.creatorName ?? featureDefaults.creatorName,
    characterName: primaryCharacter.characterName,
    standingImageUrl: primaryCharacter.standingImageUrl,
    sceneImageUrl: star?.sceneImageUrl ?? featureDefaults.sceneImageUrl,
    creatorName2: star?.creatorName2 ?? "",
    sceneImageUrl2: star?.sceneImageUrl2 ?? "",
    workTitle2: star?.workTitle2 ?? "",
    workUrl2: star?.workUrl2 ?? "",
    workDescription2: star?.workDescription2 ?? "",
    creatorName3: star?.creatorName3 ?? "",
    sceneImageUrl3: star?.sceneImageUrl3 ?? "",
    workTitle3: star?.workTitle3 ?? "",
    workUrl3: star?.workUrl3 ?? "",
    workDescription3: star?.workDescription3 ?? "",
    pastedText: primaryCharacter.pastedText,
    characters,
    characters2,
    characters3,
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
  if (isIndexedDbAudioRef(value)) return "アップロードBGM";
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

function isIndexedDbAudioRef(value) {
  return typeof value === "string" && value.startsWith(AUDIO_REF_PREFIX);
}

function isDataImageUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function isDataAudioUrl(value) {
  return typeof value === "string" && value.startsWith("data:audio/");
}

function imageRefFromId(id) {
  return `${IMAGE_REF_PREFIX}${id}`;
}

function audioRefFromId(id) {
  return `${AUDIO_REF_PREFIX}${id}`;
}

function imageIdFromRef(ref) {
  return isIndexedDbImageRef(ref) ? ref.slice(IMAGE_REF_PREFIX.length) : "";
}

function audioIdFromRef(ref) {
  return isIndexedDbAudioRef(ref) ? ref.slice(AUDIO_REF_PREFIX.length) : "";
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

async function putIndexedDbStoredAsset(dataUrl, refFromId, metadata = {}) {
  if (!dataUrl) return "";
  const db = await openImageDb();
  const id = makeImageStorageId();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, "readwrite");
    transaction.objectStore(IMAGE_STORE_NAME).put({
      id,
      dataUrl,
      ...metadata,
      updatedAt: new Date().toISOString(),
    });
    transaction.oncomplete = () => {
      db.close();
      resolve(refFromId(id));
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Failed to store asset"));
    };
  });
}

async function putIndexedDbImage(dataUrl) {
  return putIndexedDbStoredAsset(dataUrl, imageRefFromId, { kind: "image" });
}

async function putIndexedDbAudio(dataUrl, metadata = {}) {
  return putIndexedDbStoredAsset(dataUrl, audioRefFromId, { kind: "audio", ...metadata });
}

async function readIndexedDbStoredAsset(id) {
  if (!id) return null;
  const db = await openImageDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, "readonly");
    const request = transaction.objectStore(IMAGE_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Failed to read asset"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

async function readIndexedDbImage(ref) {
  const record = await readIndexedDbStoredAsset(imageIdFromRef(ref));
  return record?.dataUrl || "";
}

async function readIndexedDbAudio(ref) {
  const record = await readIndexedDbStoredAsset(audioIdFromRef(ref));
  const dataUrl = record?.dataUrl || "";
  return {
    dataUrl,
    fileName: record?.fileName || "",
    mimeType: record?.mimeType || mimeFromDataUrl(dataUrl) || "",
  };
}

async function storeFileAsIndexedDbImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  if (!dataUrl) return { ref: "", dataUrl: "" };
  const ref = await putIndexedDbImage(dataUrl);
  return { ref, dataUrl };
}

async function storeFileAsIndexedDbAudio(file) {
  const dataUrl = await readFileAsDataUrl(file);
  if (!dataUrl) return { ref: "", dataUrl: "", fileName: "", mimeType: "" };
  const fileName = file?.name || "";
  const mimeType = file?.type || mimeFromDataUrl(dataUrl) || "";
  const ref = await putIndexedDbAudio(dataUrl, { fileName, mimeType });
  return { ref, dataUrl, fileName, mimeType };
}

function collectImageValues(stars, backgroundImageUrl) {
  const values = [backgroundImageUrl];
  stars.forEach((star) => {
    values.push(star.imageUrl, star.sceneImageUrl, star.sceneImageUrl2, star.sceneImageUrl3, star.standingImageUrl);
    if (Array.isArray(star.characters)) {
      star.characters.forEach((character) => values.push(...getCharacterImageSources(character)));
    }
    if (Array.isArray(star.characters2)) {
      star.characters2.forEach((character) => values.push(...getCharacterImageSources(character)));
    }
    if (Array.isArray(star.characters3)) {
      star.characters3.forEach((character) => values.push(...getCharacterImageSources(character)));
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

function collectAudioValues(stars, bgmUrl) {
  const values = [bgmUrl];
  stars.forEach((star) => values.push(star.bgmUrl));
  return values.filter(Boolean);
}

function collectIndexedDbAudioRefs(stars, bgmUrl) {
  return Array.from(new Set(collectAudioValues(stars, bgmUrl).filter(isIndexedDbAudioRef)));
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
              images: await Promise.all(getCharacterExtraImages(character).map(migrateValue)),
            })),
          )
        : star.characters;
      const characters2 = Array.isArray(star.characters2)
        ? await Promise.all(
            star.characters2.map(async (character) => ({
              ...character,
              imageUrl: await migrateValue(character.imageUrl),
              images: await Promise.all(getCharacterExtraImages(character).map(migrateValue)),
            })),
          )
        : star.characters2;
      const characters3 = Array.isArray(star.characters3)
        ? await Promise.all(
            star.characters3.map(async (character) => ({
              ...character,
              imageUrl: await migrateValue(character.imageUrl),
              images: await Promise.all(getCharacterExtraImages(character).map(migrateValue)),
            })),
          )
        : star.characters3;
      const migratedStar = {
        ...star,
        imageUrl: await migrateValue(star.imageUrl),
        sceneImageUrl: await migrateValue(star.sceneImageUrl),
        sceneImageUrl2: await migrateValue(star.sceneImageUrl2),
        sceneImageUrl3: await migrateValue(star.sceneImageUrl3),
        standingImageUrl: await migrateValue(star.standingImageUrl),
        characters,
        characters2,
        characters3,
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

function resolveStoredAudioSource(value, audioCache) {
  if (!value) return "";
  if (isIndexedDbAudioRef(value)) return audioCache[value]?.dataUrl || "";
  return value;
}

function editableImageValue(value) {
  return isIndexedDbImageRef(value) ? "" : value || "";
}

function bgmTitleFromFileName(fileName) {
  const name = String(fileName || "").trim();
  if (!name) return "";
  return name.replace(/\.[^/.]+$/, "").trim() || name;
}

function bgmDisplayName(value, audioCache, title = "") {
  if (String(title || "").trim()) return String(title).trim();
  if (!value) return "未設定";
  if (isIndexedDbAudioRef(value)) return audioCache[value]?.fileName || "アップロードBGM";
  return shortUrl(value);
}

function globalBgmStatus(value, audioCache, title = "") {
  if (String(title || "").trim()) return String(title).trim();
  const label = bgmDisplayName(value, audioCache);
  return value === DEFAULT_GLOBAL_BGM_URL ? `デフォルト: ${label}` : label;
}

function starBgmStatus(starValue, globalValue, audioCache, starTitle = "", globalTitle = "") {
  if (starValue) return bgmDisplayName(starValue, audioCache, starTitle);
  return `全体BGM: ${globalBgmStatus(globalValue, audioCache, globalTitle)}`;
}

function readStoredConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

function sanitizeAssetName(value, fallback = "image") {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function extensionFromMime(mimeType) {
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "png";
}

function extensionFromAudioMime(mimeType, fileName = "") {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase();
  if (["mp3", "m4a", "wav", "ogg", "oga", "opus", "webm", "aac", "flac"].includes(extension)) {
    return extension;
  }

  const normalizedMime = String(mimeType || "").toLowerCase().split(";")[0].trim();
  const subtype = normalizedMime.startsWith("audio/") ? normalizedMime.slice("audio/".length).replace(/^x-/, "") : "";
  const extensionBySubtype = {
    mpeg: "mp3",
    mp3: "mp3",
    mp4: "m4a",
    m4a: "m4a",
    wav: "wav",
    wave: "wav",
    ogg: "oga",
    oga: "oga",
    opus: "opus",
    webm: "webm",
    aac: "aac",
    flac: "flac",
  };

  if (extensionBySubtype[subtype]) return extensionBySubtype[subtype];

  const inferred = subtype
    .replace(/^vnd\./, "")
    .split(/[.+]/)[0]
    .replace(/[^a-z0-9-]/g, "");
  if (/^[a-z0-9][a-z0-9-]{0,15}$/.test(inferred)) return inferred;

  return "mp3";
}

function mimeFromDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)[;,]/);
  return match?.[1] || "";
}

function fileBaseName(value, fallback) {
  return sanitizeAssetName(String(value || "").replace(/\.[^.]*$/, ""), fallback);
}

function uniqueAssetPath(directory, baseName, extension, usedPaths) {
  let index = 1;
  let path = `${directory}/${baseName}.${extension}`;
  while (usedPaths.has(path)) {
    index += 1;
    path = `${directory}/${baseName}-${index}.${extension}`;
  }
  usedPaths.add(path);
  return path;
}

function publicAudioPassThroughPath(value) {
  if (!value || isIndexedDbAudioRef(value) || isDataAudioUrl(value)) return "";
  const normalized = String(value).trim().replace(/^\.\/+/, "").split(/[?#]/)[0];
  return normalized.startsWith(`${PUBLIC_AUDIO_ASSET_DIR}/`) ? normalized : "";
}

function collectReservedPublicAudioPaths(stars, bgmUrl) {
  const values = [bgmUrl || DEFAULT_GLOBAL_BGM_URL];
  stars.forEach((star) => values.push(star.bgmUrl));
  return values.map(publicAudioPassThroughPath).filter(Boolean);
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function sourceToDataUrl(source) {
  if (!source) return "";
  if (source.startsWith("data:")) return source;
  if (isIndexedDbImageRef(source)) return readIndexedDbImage(source);
  return urlToDataUrl(source);
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

function canvasHasAlpha(context, width, height) {
  try {
    const pixels = context.getImageData(0, 0, width, height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 255) return true;
    }
  } catch {
    return true;
  }
  return false;
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function encodeCanvasImage(canvas, hasAlpha, quality) {
  const preferredTypes = hasAlpha ? ["image/webp", "image/png"] : ["image/webp", "image/jpeg", "image/png"];

  for (const mimeType of preferredTypes) {
    const blob = await canvasToBlob(canvas, mimeType, quality);
    if (blob && (!blob.type || blob.type === mimeType || mimeType === "image/png")) {
      return { blob, mimeType: blob.type || mimeType };
    }
  }

  throw new Error("Failed to encode image");
}

async function createPublicImageAsset(source, baseName, options) {
  if (!source) return { src: "", file: null, missed: false };

  try {
    const dataUrl = await sourceToDataUrl(source);
    if (!dataUrl) return { src: "", file: null, missed: true };

    const image = await loadImageElement(dataUrl);
    const maxSize = options.maxSize || 960;
    const sourceWidth = image.naturalWidth || image.width || maxSize;
    const sourceHeight = image.naturalHeight || image.height || maxSize;
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is not available");
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const sourceMime = mimeFromDataUrl(dataUrl);
    const hasAlpha = sourceMime !== "image/jpeg" && canvasHasAlpha(context, width, height);
    const { blob, mimeType } = await encodeCanvasImage(canvas, hasAlpha, options.quality || 0.82);
    const extension = extensionFromMime(mimeType);
    const path = `${PUBLIC_IMAGE_ASSET_DIR}/${baseName}.${extension}`;

    return {
      src: path,
      file: { path, blob },
      missed: false,
      originalBytes: Math.ceil((dataUrl.length * 3) / 4),
      outputBytes: blob.size,
    };
  } catch {
    return { src: source, file: null, missed: true };
  }
}

async function resolvePublicImageAsset(source, baseName, options, cache, files) {
  const normalizedSource = String(source || "").trim();
  if (!normalizedSource) return { src: "", missed: false };
  if (cache.has(normalizedSource)) return cache.get(normalizedSource);

  const pendingAsset = createPublicImageAsset(normalizedSource, baseName, options).then((asset) => {
    if (asset.file) files.push(asset.file);
    cache.set(normalizedSource, asset);
    return asset;
  });
  cache.set(normalizedSource, pendingAsset);
  return pendingAsset;
}

async function createPublicAudioAsset(source, baseName, usedPaths) {
  if (!source) return { src: "", file: null, missed: false };
  if (!isIndexedDbAudioRef(source) && !isDataAudioUrl(source)) {
    return { src: source, file: null, missed: false };
  }

  try {
    const audio = isIndexedDbAudioRef(source)
      ? await readIndexedDbAudio(source)
      : { dataUrl: source, fileName: "", mimeType: mimeFromDataUrl(source) };
    if (!audio.dataUrl) return { src: "", file: null, missed: true };

    const sourceMime = audio.mimeType || mimeFromDataUrl(audio.dataUrl) || "audio/mpeg";
    const blob = await dataUrlToBlob(audio.dataUrl);
    const extension = extensionFromAudioMime(sourceMime, audio.fileName);
    const assetName = fileBaseName(audio.fileName, baseName);
    const path = uniqueAssetPath(PUBLIC_AUDIO_ASSET_DIR, assetName, extension, usedPaths);
    const outputBlob =
      blob.type || !sourceMime ? blob : new Blob([await blob.arrayBuffer()], { type: sourceMime });

    return {
      src: path,
      file: { path, blob: outputBlob },
      missed: false,
      originalBytes: Math.ceil((audio.dataUrl.length * 3) / 4),
      outputBytes: outputBlob.size,
    };
  } catch {
    return { src: "", file: null, missed: true };
  }
}

async function resolvePublicAudioAsset(source, baseName, cache, files, usedPaths) {
  if (!source) return { src: "", missed: false };
  if (cache.has(source)) return cache.get(source);

  const asset = await createPublicAudioAsset(source, baseName, usedPaths);
  if (asset.file) files.push(asset.file);
  cache.set(source, asset);
  return asset;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function pushUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function pushUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

async function createZipBlob(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralRecords = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime();

  for (const file of files) {
    const pathBytes = encoder.encode(file.path);
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    const checksum = crc32(bytes);
    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);

    pushUint32(view, 0, 0x04034b50);
    pushUint16(view, 4, 20);
    pushUint16(view, 6, 0);
    pushUint16(view, 8, 0);
    pushUint16(view, 10, dosTime);
    pushUint16(view, 12, dosDate);
    pushUint32(view, 14, checksum);
    pushUint32(view, 18, bytes.length);
    pushUint32(view, 22, bytes.length);
    pushUint16(view, 26, pathBytes.length);
    pushUint16(view, 28, 0);

    chunks.push(header, pathBytes, bytes);
    centralRecords.push({ pathBytes, checksum, size: bytes.length, offset });
    offset += header.length + pathBytes.length + bytes.length;
  }

  const centralStart = offset;
  for (const record of centralRecords) {
    const header = new Uint8Array(46);
    const view = new DataView(header.buffer);
    pushUint32(view, 0, 0x02014b50);
    pushUint16(view, 4, 20);
    pushUint16(view, 6, 20);
    pushUint16(view, 8, 0);
    pushUint16(view, 10, 0);
    pushUint16(view, 12, dosTime);
    pushUint16(view, 14, dosDate);
    pushUint32(view, 16, record.checksum);
    pushUint32(view, 20, record.size);
    pushUint32(view, 24, record.size);
    pushUint16(view, 28, record.pathBytes.length);
    pushUint16(view, 30, 0);
    pushUint16(view, 32, 0);
    pushUint16(view, 34, 0);
    pushUint16(view, 36, 0);
    pushUint32(view, 38, 0);
    pushUint32(view, 42, record.offset);
    chunks.push(header, record.pathBytes);
    offset += header.length + record.pathBytes.length;
  }

  const centralSize = offset - centralStart;
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  pushUint32(endView, 0, 0x06054b50);
  pushUint16(endView, 4, 0);
  pushUint16(endView, 6, 0);
  pushUint16(endView, 8, centralRecords.length);
  pushUint16(endView, 10, centralRecords.length);
  pushUint32(endView, 12, centralSize);
  pushUint32(endView, 16, centralStart);
  pushUint16(endView, 20, 0);
  chunks.push(end);

  return new Blob(chunks, { type: "application/zip" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function buildExternalPublicExport({ stars, selectedId, bgmUrl, globalBgmTitle, backgroundImageUrl }) {
  const files = [];
  const imageCache = new Map();
  const audioCache = new Map();
  const usedAudioPaths = new Set(collectReservedPublicAudioPaths(stars, bgmUrl));
  const logoDataUrl = await urlToDataUrl(hoshiyomiGingaLogoUrl);
  const backgroundAsset = await resolvePublicImageAsset(
    backgroundImageUrl || DEFAULT_BACKGROUND_URL,
    "background",
    PUBLIC_IMAGE_TARGETS.background,
    imageCache,
    files,
  );
  const globalBgmAsset = await resolvePublicAudioAsset(
    bgmUrl || DEFAULT_GLOBAL_BGM_URL,
    "gallery",
    audioCache,
    files,
    usedAudioPaths,
  );
  async function resolvePublicCharacter(character, baseName) {
    const primaryImage = String(character.imageUrl || "").trim();
    const extraImages = getCharacterExtraImages(character).filter((imageUrl) => imageUrl !== primaryImage);
    const [characterAsset, imageAssets] = await Promise.all([
      resolvePublicImageAsset(
        primaryImage,
        baseName,
        PUBLIC_IMAGE_TARGETS.character,
        imageCache,
        files,
      ),
      Promise.all(
        extraImages.map((imageUrl, imageIndex) =>
          resolvePublicImageAsset(
            imageUrl,
            `${baseName}-${imageIndex + 2}`,
            PUBLIC_IMAGE_TARGETS.character,
            imageCache,
            files,
          ),
        ),
      ),
    ]);

    return {
      ...character,
      imageUrl: characterAsset.src,
      images: imageAssets.map((asset) => asset.src).filter(Boolean),
      imageEmbedded: !characterAsset.missed || !primaryImage,
      missedImageAssets: imageAssets.reduce((total, asset) => total + (asset.missed ? 1 : 0), 0),
    };
  }
  const publicStars = await Promise.all(
    stars.map(async (star, index) => {
      const starKey = sanitizeAssetName(star.id || `star-${index + 1}`, `star-${index + 1}`);
      const sourceCharacters = getDisplayCharacters(star, 1);
      const sourceCharacters2 = getDisplayCharacters(star, 2);
      const sourceCharacters3 = getDisplayCharacters(star, 3);
      const [starImage, sceneImage, sceneImage2, sceneImage3, starBgm, characters, characters2, characters3] = await Promise.all([
        resolvePublicImageAsset(
          star.imageUrl,
          `${String(index + 1).padStart(2, "0")}-${starKey}-star`,
          PUBLIC_IMAGE_TARGETS.star,
          imageCache,
          files,
        ),
        resolvePublicImageAsset(
          star.sceneImageUrl,
          `${String(index + 1).padStart(2, "0")}-${starKey}-scene`,
          PUBLIC_IMAGE_TARGETS.scene,
          imageCache,
          files,
        ),
        resolvePublicImageAsset(
          star.sceneImageUrl2,
          `${String(index + 1).padStart(2, "0")}-${starKey}-scene2`,
          PUBLIC_IMAGE_TARGETS.scene,
          imageCache,
          files,
        ),
        resolvePublicImageAsset(
          star.sceneImageUrl3,
          `${String(index + 1).padStart(2, "0")}-${starKey}-scene3`,
          PUBLIC_IMAGE_TARGETS.scene,
          imageCache,
          files,
        ),
        resolvePublicAudioAsset(
          star.bgmUrl,
          `${String(index + 1).padStart(2, "0")}-${starKey}-bgm`,
          audioCache,
          files,
          usedAudioPaths,
        ),
        Promise.all(
          sourceCharacters.map((character, characterIndex) =>
            resolvePublicCharacter(
              character,
              `${String(index + 1).padStart(2, "0")}-${starKey}-character-${String(characterIndex + 1).padStart(2, "0")}`,
            ),
          ),
        ),
        Promise.all(
          sourceCharacters2.map((character, characterIndex) =>
            resolvePublicCharacter(
              character,
              `${String(index + 1).padStart(2, "0")}-${starKey}-character2-${String(characterIndex + 1).padStart(2, "0")}`,
            ),
          ),
        ),
        Promise.all(
          sourceCharacters3.map((character, characterIndex) =>
            resolvePublicCharacter(
              character,
              `${String(index + 1).padStart(2, "0")}-${starKey}-character3-${String(characterIndex + 1).padStart(2, "0")}`,
            ),
          ),
        ),
      ]);
      return {
        ...star,
        ...getPrimaryCharacterFields(characters, star.name, star.description),
        characters,
        characters2,
        characters3,
        imageUrl: starImage.src,
        sceneImageUrl: sceneImage.src,
        sceneImageUrl2: sceneImage2.src,
        sceneImageUrl3: sceneImage3.src,
        bgmUrl: starBgm.src,
        imageEmbedded: !starImage.missed,
        sceneImageEmbedded: !sceneImage.missed || !star.sceneImageUrl,
        sceneImage2Embedded: !sceneImage2.missed || !star.sceneImageUrl2,
        sceneImage3Embedded: !sceneImage3.missed || !star.sceneImageUrl3,
        bgmEmbedded: !starBgm.missed || !star.bgmUrl,
        missedCharacterAssets:
          characters.reduce(
            (total, character) => total + (character.imageEmbedded ? 0 : 1) + (character.missedImageAssets || 0),
            0,
          ) +
          characters2.reduce(
            (total, character) => total + (character.imageEmbedded ? 0 : 1) + (character.missedImageAssets || 0),
            0,
          ) +
          characters3.reduce(
            (total, character) => total + (character.imageEmbedded ? 0 : 1) + (character.missedImageAssets || 0),
            0,
          ),
      };
    }),
  );
  const missedAssets =
    (backgroundAsset.missed ? 1 : 0) +
    publicStars.reduce(
      (total, star) =>
        total +
        (star.imageEmbedded ? 0 : 1) +
        (star.sceneImageEmbedded ? 0 : 1) +
        (star.sceneImage2Embedded ? 0 : 1) +
        (star.sceneImage3Embedded ? 0 : 1) +
        (star.bgmEmbedded ? 0 : 1) +
        (star.missedCharacterAssets || 0),
      0,
    ) +
    (globalBgmAsset.missed ? 1 : 0);
  const html = buildPublicHtml({
    stars: publicStars,
    selectedId,
    bgmUrl: globalBgmAsset.src,
    globalBgmTitle,
    backgroundDataUrl: backgroundAsset.src,
    logoDataUrl,
  });
  const htmlBlob = new Blob([html], { type: "text/html;charset=utf-8" });
  const zipBlob = await createZipBlob([{ path: "index.html", blob: htmlBlob }, ...files]);
  const imageAssetCount = files.filter((file) => file.path.startsWith(`${PUBLIC_IMAGE_ASSET_DIR}/`)).length;
  const audioAssetCount = files.filter((file) => file.path.startsWith(`${PUBLIC_AUDIO_ASSET_DIR}/`)).length;

  return {
    blob: zipBlob,
    assetCount: files.length,
    imageAssetCount,
    audioAssetCount,
    missedAssets,
  };
}

function escapeJsonForHtml(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function escapeHtmlForMarkup(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildPublicHtml({ stars, selectedId, bgmUrl, globalBgmTitle, backgroundDataUrl, logoDataUrl }) {
  const initialBgmLabel = String(globalBgmTitle || "").trim() || shortUrl(bgmUrl);
  const logoSrc = escapeHtmlForMarkup(logoDataUrl || hoshiyomiGingaLogoUrl);

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>星詠銀河・星図</title>
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
.brand-logo {
  display: block;
  width: auto;
  max-width: 100%;
  height: clamp(40px, 4.2vw, 48px);
  object-fit: contain;
  mix-blend-mode: screen;
  -webkit-mask-image: radial-gradient(115% 115% at 50% 50%, #000 66%, transparent 98%);
  mask-image: radial-gradient(115% 115% at 50% 50%, #000 66%, transparent 98%);
  filter: contrast(1.3) drop-shadow(0 0 18px rgba(246, 251, 255, 0.12));
  user-select: none;
}
.brand span,
.public-audio span {
  display: block;
  margin-top: 3px;
  color: rgba(226,239,251,.64);
  font-size: 12px;
}
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  overflow: hidden;
  background: #0a0b1a;
  cursor: pointer;
  opacity: 1;
  transition: opacity var(--intro-exit-ms) ease-out;
}
.intro-overlay.is-exiting {
  opacity: 0;
  pointer-events: none;
}
.intro-logo-frame {
  position: fixed;
  top: 50%;
  left: 50%;
  width: clamp(240px, 48vw, 520px);
  aspect-ratio: 2172 / 724;
  transform: translate(-50%, -50%) scale(1);
  transform-origin: center center;
  transition: transform var(--intro-move-ms) var(--ease-spring);
  will-change: transform;
}
.intro-overlay.is-moving .intro-logo-frame,
.intro-overlay.is-exiting .intro-logo-frame {
  transform: translate(calc(-50% + var(--intro-logo-x)), calc(-50% + var(--intro-logo-y))) scale(var(--intro-logo-scale));
}
.intro-overlay.is-exiting .intro-logo-frame {
  transition-duration: 0ms;
}
.intro-logo-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  mix-blend-mode: screen;
  -webkit-mask-image: radial-gradient(115% 115% at 50% 50%, #000 66%, transparent 98%);
  mask-image: radial-gradient(115% 115% at 50% 50%, #000 66%, transparent 98%);
  filter: contrast(1.3) drop-shadow(0 0 18px rgba(246, 251, 255, 0.12));
  opacity: 0;
  transform: scale(1.02);
  animation: introLogoReveal var(--intro-fade-ms) var(--ease-out) forwards;
  user-select: none;
  will-change: opacity, transform;
}
@keyframes introLogoReveal {
  from { opacity: 0; transform: scale(1.02); }
  to { opacity: 1; transform: scale(1); }
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
.map.is-feature-open .star-button,
.map.is-feature-open .star-button::before,
.map.is-feature-open .star-button.selected::after,
.map.is-feature-open .orbit {
  animation-play-state: paused;
}
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
  white-space: pre-line;
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
.meta-row.is-planet-notes {
  grid-template-columns: 1fr;
  align-items: start;
  gap: 6px;
}
.meta-row strong {
  color: #f6fbff;
  font-weight: 600;
}
.meta-row.is-planet-notes strong {
  line-height: 1.7;
  white-space: pre-line;
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
.feature-modal .feature-character-gallery,
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
.feature-modal .feature-character-gallery { animation-delay: 448ms; }
.feature-modal .feature-character-name { animation-delay: 475ms; }
.feature-modal .feature-character-text { animation-delay: 530ms; }
.feature-overlay.is-closing .feature-hero,
.feature-overlay.is-closing .feature-kicker,
.feature-overlay.is-closing .feature-work-details h2,
.feature-overlay.is-closing .feature-work-description,
.feature-overlay.is-closing .feature-link,
.feature-overlay.is-closing .feature-section-title,
.feature-overlay.is-closing .feature-character,
.feature-overlay.is-closing .feature-character-gallery,
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
.feature-character-media {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-character-gallery {
  display: flex;
  gap: 8px;
  max-width: 100%;
  min-width: 0;
  padding: 2px 1px 4px;
  overflow-x: auto;
  scrollbar-color: rgba(111,231,200,.46) rgba(255,255,255,.05);
}
.feature-character-thumb {
  flex: 0 0 54px;
  width: 54px;
  height: 54px;
  padding: 2px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 8px;
  background: rgba(3,8,15,.72);
  cursor: pointer;
  opacity: .72;
  transition: border-color 180ms ease, opacity 180ms ease, transform 180ms ease;
}
.feature-character-thumb:hover,
.feature-character-thumb.is-active {
  border-color: color-mix(in srgb, var(--feature-color, #ffd34d), white 16%);
  opacity: 1;
}
.feature-character-thumb.is-active {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--feature-color, #ffd34d), transparent 62%);
}
.feature-character-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
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
  white-space: pre-line;
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
  overflow-anchor: none;
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
  white-space: pre-line;
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
.star-detail-meta > div.is-planet-notes {
  grid-template-columns: 1fr;
  align-items: start;
  gap: 6px;
}
.star-detail-meta span { color: rgba(226,239,251,.64); font-size: 13px; }
.star-detail-meta strong { color: rgba(247,251,255,.9); font-size: 13px; font-weight: 650; }
.star-detail-meta > div.is-planet-notes strong {
  line-height: 1.7;
  white-space: pre-line;
}
.star-detail-work-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 28px; width: max-content; margin: 0 0 10px; padding: 0 10px;
  border: 1px solid rgba(255,211,77,.28); border-radius: 999px;
  color: #ffd34d; background: rgba(255,211,77,.08);
  font-size: 12px; font-weight: 850; letter-spacing: .08em;
}
.star-detail-work-actions { display: grid; gap: 10px; }
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
.star-detail-sheet .star-detail-work-count,
.star-detail-sheet .star-detail-work-actions,
.star-detail-sheet .star-detail-work-btn {
  animation: featureContentIn 460ms var(--ease-out) both;
}
.star-detail-sheet .star-detail-header { animation-delay: 50ms; }
.star-detail-sheet .star-detail-desc { animation-delay: 130ms; }
.star-detail-sheet .star-detail-meta { animation-delay: 210ms; }
.star-detail-sheet .star-detail-work-count,
.star-detail-sheet .star-detail-work-actions,
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
  .feature-modal .feature-character, .feature-modal .feature-character-gallery, .feature-modal .feature-character-name, .feature-modal .feature-character-text {
    animation: featureFade .16s ease-out both;
  }
  .star-button.feature-active { transform: translate(-50%, -50%) scale(1.7); }
  .shooting-star { display: none; }
  .intro-overlay { display: none; }
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
  .public-top,
  .public-detail,
  .feature-overlay,
  .star-detail-sheet {
    backdrop-filter: none;
  }
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
  .map.is-feature-open {
    visibility: hidden;
    opacity: 0;
    transform: none !important;
    transition: none !important;
  }
  .map.is-feature-open .orbit,
  .map.is-feature-open .star-button,
  .map.is-feature-open .star-button::before,
  .map.is-feature-open .star-button.selected::after {
    animation: none !important;
    transition: none !important;
    filter: none !important;
    box-shadow: none !important;
  }
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
  .feature-modal .feature-character-gallery,
  .feature-modal .feature-character-name,
  .feature-modal .feature-character-text {
    animation: none;
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
    filter: none;
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
      <img id="brand-logo" class="brand-logo" src="${logoSrc}" alt="星詠銀河・星図" width="${LOGO_IMAGE_WIDTH}" height="${LOGO_IMAGE_HEIGHT}" draggable="false" />
      <div>
        <span>公開表示 / ${stars.length} stars</span>
      </div>
    </div>
    <div class="public-audio">
      <button id="audioToggle">BGM再生</button>
      <span id="audioLabel">${escapeHtmlForMarkup(initialBgmLabel)}</span>
      <audio id="bgm" loop src="${escapeHtmlForMarkup(bgmUrl || "")}"></audio>
    </div>
  </header>
  <div
    class="intro-overlay"
    id="introOverlay"
    style="--intro-logo-x: 0px; --intro-logo-y: 0px; --intro-logo-scale: 1; --intro-fade-ms: ${INTRO_FADE_MS}ms; --intro-move-ms: ${INTRO_MOVE_MS}ms; --intro-exit-ms: ${INTRO_EXIT_MS}ms;"
    aria-hidden="true"
  >
    <div class="intro-logo-frame" id="introLogoFrame">
      <img class="intro-logo-image" src="${logoSrc}" alt="" width="${LOGO_IMAGE_WIDTH}" height="${LOGO_IMAGE_HEIGHT}" draggable="false" />
    </div>
  </div>
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
const planetFields = ${escapeJsonForHtml(PLANET_FIELDS)};
let selectedId = ${JSON.stringify(selectedId)};
let featureId = "";
let featureWorkIndex = 1;
let zoomedId = "";
let zoomDetailTimer = null;
const globalBgmUrl = ${escapeJsonForHtml(bgmUrl || "")};
const globalBgmTitle = ${escapeJsonForHtml(globalBgmTitle || "")};
const INTRO_FADE_MS = ${INTRO_FADE_MS};
const INTRO_HOLD_MS = ${INTRO_HOLD_MS};
const INTRO_MOVE_MS = ${INTRO_MOVE_MS};
const INTRO_EXIT_MS = ${INTRO_EXIT_MS};
const map = document.getElementById("map");
const detail = document.getElementById("detail");
const publicMain = document.getElementById("publicMain");
const brandLogo = document.getElementById("brand-logo");
const introOverlay = document.getElementById("introOverlay");
const introLogoFrame = document.getElementById("introLogoFrame");
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
let introPhase = "intro";
let introMoveTimer = 0;
let introExitTimer = 0;
let introRaf = 0;

function prefersReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function finishIntro() {
  if (introPhase === "done") return;
  introPhase = "done";
  if (introMoveTimer) window.clearTimeout(introMoveTimer);
  if (introExitTimer) window.clearTimeout(introExitTimer);
  if (introRaf) window.cancelAnimationFrame(introRaf);
  introMoveTimer = 0;
  introExitTimer = 0;
  introRaf = 0;
  if (introOverlay) introOverlay.remove();
}

function beginIntroExit() {
  if (introPhase !== "moving" || !introOverlay) return;
  introPhase = "exiting";
  introOverlay.classList.add("is-exiting");
  introExitTimer = window.setTimeout(finishIntro, INTRO_EXIT_MS);
}

function startIntroMove() {
  if (prefersReducedMotion()) {
    finishIntro();
    return;
  }
  if (!brandLogo || !introLogoFrame || !introOverlay) {
    finishIntro();
    return;
  }
  var dockedRect = brandLogo.getBoundingClientRect();
  var introRect = introLogoFrame.getBoundingClientRect();
  if (!dockedRect.width || !dockedRect.height || !introRect.width || !introRect.height) {
    finishIntro();
    return;
  }
  var x = dockedRect.left + dockedRect.width / 2 - (introRect.left + introRect.width / 2);
  var y = dockedRect.top + dockedRect.height / 2 - (introRect.top + introRect.height / 2);
  var scale = dockedRect.width / introRect.width;
  introOverlay.style.setProperty("--intro-logo-x", x + "px");
  introOverlay.style.setProperty("--intro-logo-y", y + "px");
  introOverlay.style.setProperty("--intro-logo-scale", String(scale));
  introRaf = window.requestAnimationFrame(function() {
    introRaf = 0;
    if (introPhase !== "intro") return;
    introPhase = "moving";
    introOverlay.classList.add("is-moving");
  });
}

function runIntro() {
  if (!introOverlay) return;
  if (prefersReducedMotion()) {
    finishIntro();
    return;
  }
  introOverlay.addEventListener("pointerdown", finishIntro);
  introLogoFrame?.addEventListener("transitionend", function(event) {
    if (event.target !== introLogoFrame || event.propertyName !== "transform") return;
    beginIntroExit();
  });
  introMoveTimer = window.setTimeout(startIntroMove, INTRO_FADE_MS + INTRO_HOLD_MS);
  window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change", function(event) {
    if (event.matches) finishIntro();
  });
  window.setTimeout(function() {
    if (introPhase === "moving") beginIntroExit();
  }, INTRO_FADE_MS + INTRO_HOLD_MS + INTRO_MOVE_MS + 80);
  window.setTimeout(finishIntro, INTRO_FADE_MS + INTRO_HOLD_MS + INTRO_MOVE_MS + INTRO_EXIT_MS + 400);
}

runIntro();

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

function publicBgmLabel(value, title) {
  var displayTitle = String(title || "").trim();
  return displayTitle || shortPublicUrl(value);
}

function publicStarBgmLabel(star) {
  var hasStarBgm = star && star.bgmUrl;
  var bgmUrl = hasStarBgm ? star.bgmUrl : globalBgmUrl;
  var bgmTitle = hasStarBgm ? star.bgmTitle : globalBgmTitle;
  return publicBgmLabel(bgmUrl, bgmTitle);
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
  const dimensions = className === "feature-hero"
    ? ' width="960" height="640"'
    : ' width="768" height="768"';
  return '<' + tag + ' class="' + className + '"><img loading="eager" decoding="sync" fetchpriority="high"' + dimensions + ' alt="' + escapeAttr(alt) + '" src="' + escapeAttr(src) + '" /></' + tag + '>';
}

function getCharacters(star, workIndex) {
  if (workIndex === 3) {
    return Array.isArray(star.characters3) ? star.characters3 : [];
  }

  if (workIndex === 2) {
    return Array.isArray(star.characters2) ? star.characters2 : [];
  }

  if (Array.isArray(star.characters)) {
    return star.characters;
  }

  return [{
    id: "character-1",
    name: star.characterName || star.name || "キャラクター 1",
    imageUrl: star.standingImageUrl || "",
    description: star.pastedText || star.description || ""
  }];
}

function getCharacterImageSources(character) {
  var sources = [character && character.imageUrl].concat(Array.isArray(character && character.images) ? character.images : []);
  var seen = {};
  var images = [];
  sources.forEach(function(value) {
    var image = String(value || "").trim();
    if (!image || seen[image]) return;
    seen[image] = true;
    images.push(image);
  });
  return images;
}

function hasSecondWork(star) {
  return [star.creatorName2, star.sceneImageUrl2, star.workTitle2, star.workUrl2, star.workDescription2].some(function(value) {
    return String(value || "").trim();
  }) || getCharacters(star, 2).length > 0;
}

function hasThirdWork(star) {
  return [star.creatorName3, star.sceneImageUrl3, star.workTitle3, star.workUrl3, star.workDescription3].some(function(value) {
    return String(value || "").trim();
  }) || getCharacters(star, 3).length > 0;
}

function getWork(star, workIndex) {
  if (workIndex === 3) {
    return {
      creatorName: star.creatorName3 || "",
      sceneImageUrl: star.sceneImageUrl3 || "",
      workTitle: star.workTitle3 || "",
      workUrl: star.workUrl3 || "",
      workDescription: star.workDescription3 || ""
    };
  }
  if (workIndex === 2) {
    return {
      creatorName: star.creatorName2 || "",
      sceneImageUrl: star.sceneImageUrl2 || "",
      workTitle: star.workTitle2 || "",
      workUrl: star.workUrl2 || "",
      workDescription: star.workDescription2 || ""
    };
  }
  return {
    creatorName: star.creatorName || "",
    sceneImageUrl: star.sceneImageUrl || "",
    workTitle: star.workTitle || "",
    workUrl: star.workUrl || "",
    workDescription: star.workDescription || ""
  };
}

function workFallbackTitle(workIndex) {
  if (workIndex === 3) return "作品③";
  return workIndex === 2 ? "作品②" : "作品①";
}

function workButtonLabel(star, workIndex) {
  var title = getWork(star, workIndex).workTitle || workFallbackTitle(workIndex);
  return '作品詳細を見る「' + title + '」';
}

function renderCharacter(character, index) {
  var imageSources = getCharacterImageSources(character);
  var selectedImage = imageSources[0] || "";
  var characterName = character.name || "キャラクター";
  var galleryHtml = imageSources.length > 1
    ? '<div class="feature-character-gallery" role="list" aria-label="' + escapeAttr(characterName + "の画像切替") + '">' +
        imageSources.map(function(src, imageIndex) {
          return '<button class="feature-character-thumb' + (imageIndex === 0 ? ' is-active' : '') + '" type="button" data-character-image="' + escapeAttr(src) + '" aria-label="' + escapeAttr(characterName + " 画像 " + String(imageIndex + 1)) + '">' +
            '<img loading="lazy" decoding="async" alt="" src="' + escapeAttr(src) + '" />' +
          '</button>';
        }).join('') +
      '</div>'
    : '';
  return '<article class="feature-character-card">' +
    '<div class="feature-character-media">' +
      renderImageOrEmpty(selectedImage, "feature-character", "キャラ画像未設定", characterName) +
      galleryHtml +
    '</div>' +
    '<div class="feature-character-copy">' +
      '<span class="feature-character-index">CHARACTER ' + String(index + 1).padStart(2, "0") + '</span>' +
      '<strong class="feature-character-name">' + escapeHtml(character.name || "未設定") + '</strong>' +
      '<div class="feature-text feature-character-text">' + formatMultiline(character.description || "") + '</div>' +
    '</div>' +
  '</article>';
}

function preloadFeatureImages(star, workIndex) {
  var work = getWork(star, workIndex);
  var imageSources = [work.sceneImageUrl];
  getCharacters(star, workIndex).forEach(function(character) {
    imageSources = imageSources.concat(getCharacterImageSources(character));
  });
  imageSources
    .filter(Boolean)
    .forEach(function(src) {
      const image = new Image();
      image.loading = "eager";
      image.decoding = "sync";
      image.src = src;
      if (image.decode) image.decode().catch(function() {});
    });
}

function renderFeature(star, workIndex) {
  const work = getWork(star, workIndex);
  const workUrl = safePublicUrl(work.workUrl);
  const linkHtml = workUrl
    ? '<a class="feature-link" href="' + escapeAttr(workUrl) + '" target="_blank" rel="noreferrer">作品へ移動</a>'
    : '<span class="feature-link is-disabled">作品URL未設定</span>';
  const characters = getCharacters(star, workIndex);
  const characterHtml = characters.length > 0
    ? '<section class="feature-character-intro">' +
        '<h3 class="feature-section-title">キャラクター紹介</h3>' +
        '<div class="feature-character-list">' + characters.map(renderCharacter).join('') + '</div>' +
      '</section>'
    : '';
  featureOverlay.style.setProperty("--feature-color", star.color || "#ffd34d");
  featureBody.innerHTML =
    renderImageOrEmpty(work.sceneImageUrl, "feature-hero", "作品タイトル画像未設定", work.workTitle || star.name, "section") +
    '<section class="feature-work-details">' +
      '<p class="feature-kicker">' + escapeHtml(work.creatorName || "Creator") + '</p>' +
      '<h2>' + escapeHtml(work.workTitle || "未設定") + '</h2>' +
      '<div class="feature-text feature-work-description">' + formatMultiline(work.workDescription) + '</div>' +
      linkHtml +
    '</section>' +
    characterHtml;
  featureBody.querySelectorAll(".feature-character-gallery").forEach(function(gallery) {
    gallery.addEventListener("click", function(event) {
      var button = event.target.closest(".feature-character-thumb");
      if (!button || !gallery.contains(button)) return;
      var card = button.closest(".feature-character-card");
      var image = card ? card.querySelector(".feature-character img") : null;
      var src = button.getAttribute("data-character-image") || "";
      if (!image || !src) return;
      image.src = src;
      gallery.querySelectorAll(".feature-character-thumb").forEach(function(thumb) {
        thumb.classList.toggle("is-active", thumb === button);
      });
    });
  });
  featureBody.querySelectorAll("img").forEach(function(image) {
    if (image.decode) image.decode().catch(function() {});
  });
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

function openFeature(id, originEl, workIndex) {
  selectedId = id;
  featureId = id;
  featureWorkIndex = workIndex === 3 ? 3 : workIndex === 2 ? 2 : 1;
  setFeatureOrigin(originEl);
  const star = pickStar();
  map.classList.add("is-feature-open");
  preloadFeatureImages(star, featureWorkIndex);
  render();
  renderFeature(star, featureWorkIndex);
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
    featureWorkIndex = 1;
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
  var planetRows = planetFields
    .filter(function(field) { return star[field.key]; })
    .map(function(field) {
      var className = field.key === "planetNotes" ? ' class="is-planet-notes"' : "";
      return '<div' + className + '><span>' + escapeHtml(field.label) + '</span><strong>' + escapeHtml(star[field.key]) + '</strong></div>';
    })
    .join('');
  var bgmLabel = publicStarBgmLabel(star);
  var hasSecond = hasSecondWork(star);
  var hasThird = hasThirdWork(star);
  var workButtons;
  if (hasThird) {
    workButtons = '<div class="star-detail-work-count">WORKS ×3</div>' +
      '<div class="star-detail-work-actions">' +
        '<button class="star-detail-work-btn" type="button" data-work-index="1">' + escapeHtml(workButtonLabel(star, 1)) + '</button>' +
        '<button class="star-detail-work-btn" type="button" data-work-index="2">' + escapeHtml(workButtonLabel(star, 2)) + '</button>' +
        '<button class="star-detail-work-btn" type="button" data-work-index="3">' + escapeHtml(workButtonLabel(star, 3)) + '</button>' +
      '</div>';
  } else if (hasSecond) {
    workButtons = '<div class="star-detail-work-count">WORKS ×2</div>' +
      '<div class="star-detail-work-actions">' +
        '<button class="star-detail-work-btn" type="button" data-work-index="1">' + escapeHtml(workButtonLabel(star, 1)) + '</button>' +
        '<button class="star-detail-work-btn" type="button" data-work-index="2">' + escapeHtml(workButtonLabel(star, 2)) + '</button>' +
      '</div>';
  } else {
    workButtons = '<button class="star-detail-work-btn" type="button" data-work-index="1">作品詳細を見る</button>';
  }
  starDetailSheet.innerHTML =
    '<button class="star-detail-close" id="starDetailClose" type="button" aria-label="閉じる">\\u00d7</button>' +
    '<div class="star-detail-header">' +
      '<span>STAR ' + String(stars.indexOf(star) + 1).padStart(2, "0") + '</span>' +
      '<h2>' + escapeHtml(star.name) + '</h2>' +
    '</div>' +
    '<p class="star-detail-desc">' + formatMultiline(star.description) + '</p>' +
    '<div class="star-detail-meta">' + planetRows +
      '<div><span>BGM</span><strong>' + escapeHtml(bgmLabel) + '</strong></div>' +
    '</div>' +
    workButtons;
  starDetailSheet.scrollTop = 0;
  starDetailSheet.hidden = false;
  starDetailSheet.classList.remove("is-closing");
  document.getElementById("starDetailClose").addEventListener("click", closeZoom);
  starDetailSheet.querySelectorAll("[data-work-index]").forEach(function(button) {
    button.addEventListener("click", function() {
      var s = stars.find(function(s) { return s.id === zoomedId; });
      if (!s) return;
      var btn = map.querySelector('[data-star-id="' + zoomedId + '"]');
      openFeature(zoomedId, btn, Number(button.dataset.workIndex) || 1);
    });
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
  const currentBgmTitle = workBgmUrl && workBgmStar ? workBgmStar.bgmTitle : globalBgmTitle;
  const currentBgm = workBgmUrl || globalBgmUrl;
  const currentBgmIsGallery = !workBgmUrl;
  const currentBgmLabel = publicBgmLabel(currentBgm, currentBgmTitle);
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
    button.innerHTML = '<img loading="lazy" decoding="async" alt="" src="' + escapeAttr(star.imageUrl) + '" />';
    button.addEventListener("click", (event) => zoomToStar(star.id, event.currentTarget));
    map.appendChild(button);
  });
  detail.style.setProperty("--c", selected.color);
  detail.innerHTML = \`
    <div class="detail-kicker">STAR \${String(stars.indexOf(selected) + 1).padStart(2, "0")}</div>
    <h2>\${escapeHtml(selected.name)}</h2>
    <img class="hero-star" loading="lazy" decoding="async" alt="\${escapeAttr(selected.name)}" src="\${escapeAttr(selected.imageUrl)}" />
    <p>\${escapeHtml(selected.description)}</p>
    <div class="meta-grid">
      <div class="meta-row"><span>制作者</span><strong>\${escapeHtml(selected.creatorName || "未設定")}</strong></div>
      \${planetFields.map(function(field) {
        if (!selected[field.key]) return "";
        var className = field.key === "planetNotes" ? " meta-row is-planet-notes" : " meta-row";
        return '<div class="' + className.trim() + '"><span>' + escapeHtml(field.label) + '</span><strong>' + escapeHtml(selected[field.key]) + '</strong></div>';
      }).join('')}
      <div class="meta-row"><span>BGM</span><strong>\${escapeHtml(currentBgmLabel)}</strong></div>
    </div>\`;
  document.getElementById("audioLabel").textContent = currentBgmLabel;
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

function StarFeatureModal({ star, origin, onClose, resolveImageSource = (value) => value || "", workIndex = 1 }) {
  const work = getWorkFields(star, workIndex);
  const workUrl = safeExternalUrl(work.workUrl);
  const characters = getDisplayCharacters(star, workIndex);
  const sceneImageSrc = resolveImageSource(work.sceneImageUrl);
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const [closing, setClosing] = useState(false);
  const [selectedCharacterImageIndexes, setSelectedCharacterImageIndexes] = useState({});
  const preloadImageSources = useMemo(
    () => [
      sceneImageSrc,
      ...characters.flatMap((character) => getCharacterImageSources(character).map((src) => resolveImageSource(src))),
    ].filter(Boolean),
    [characters, resolveImageSource, sceneImageSrc],
  );

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1440;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 900;
  const originX = origin?.x ?? viewportW / 2;
  const originY = origin?.y ?? viewportH / 2;
  const travelX = Math.round(originX - viewportW / 2);
  const travelY = Math.round(originY - viewportH / 2);

  const requestClose = useCallback(() => setClosing(true), []);

  useEffect(() => {
    preloadImageSources.forEach((src) => {
      const image = new window.Image();
      image.loading = "eager";
      image.decoding = "sync";
      image.src = src;
      image.decode?.().catch(() => {});
    });
  }, [preloadImageSources]);

  useEffect(() => {
    setSelectedCharacterImageIndexes({});
  }, [star.id, workIndex]);

  useEffect(() => {
    setSelectedCharacterImageIndexes((current) => {
      const next = {};
      let changed = false;

      characters.forEach((character, index) => {
        const characterKey = character.id || `${workIndex}-${index}`;
        const imageCount = getCharacterImageSources(character)
          .map((src) => resolveImageSource(src))
          .filter(Boolean).length;
        const currentIndex = current[characterKey];

        if (currentIndex === undefined) return;
        if (imageCount <= 1) {
          changed = true;
          return;
        }

        const nextIndex = Math.min(currentIndex, imageCount - 1);
        next[characterKey] = nextIndex;
        if (nextIndex !== currentIndex) changed = true;
      });

      if (!changed) {
        changed = Object.keys(current).some((key) => !(key in next));
      }

      return changed ? next : current;
    });
  }, [characters, resolveImageSource, workIndex]);

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
            <img
              alt={work.workTitle || star.name}
              src={sceneImageSrc}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              width="960"
              height="640"
            />
          ) : (
            <div className="feature-empty">作品タイトル画像未設定</div>
          )}
        </section>

        <section className="feature-work-details">
          <p className="feature-kicker">{work.creatorName || "Creator"}</p>
          <h2>{work.workTitle || "未設定"}</h2>
          <div className="feature-text feature-work-description">{work.workDescription}</div>

          {workUrl ? (
            <a className="feature-link" href={workUrl} target="_blank" rel="noreferrer">
              作品へ移動
            </a>
          ) : (
            <span className="feature-link is-disabled">作品URL未設定</span>
          )}
        </section>

        {characters.length > 0 ? (
          <section className="feature-character-intro">
            <h3 className="feature-section-title">キャラクター紹介</h3>
            <div className="feature-character-list">
              {characters.map((character, index) => {
                const characterKey = character.id || `${workIndex}-${index}`;
                const characterImageSources = getCharacterImageSources(character)
                  .map((src) => resolveImageSource(src))
                  .filter(Boolean);
                const selectedIndex = Math.min(
                  selectedCharacterImageIndexes[characterKey] ?? 0,
                  Math.max(characterImageSources.length - 1, 0),
                );
                const characterImageSrc = characterImageSources[selectedIndex] || "";
                return (
                  <article className="feature-character-card" key={character.id || `${character.name}-${index}`}>
                    <div className="feature-character-media">
                      <div className="feature-character">
                        {characterImageSrc ? (
                          <img
                            alt={character.name || "キャラクター"}
                            src={characterImageSrc}
                            loading="eager"
                            decoding="sync"
                            fetchPriority="high"
                            width="768"
                            height="768"
                          />
                        ) : (
                          <div className="feature-empty">キャラ画像未設定</div>
                        )}
                      </div>
                      {characterImageSources.length > 1 ? (
                        <div className="feature-character-gallery" aria-label={`${character.name || "キャラクター"}の画像切替`}>
                          {characterImageSources.map((src, imageIndex) => (
                            <button
                              className={`feature-character-thumb ${imageIndex === selectedIndex ? "is-active" : ""}`}
                              type="button"
                              key={`${src}-${imageIndex}`}
                              onClick={() =>
                                setSelectedCharacterImageIndexes((current) => ({
                                  ...current,
                                  [characterKey]: imageIndex,
                                }))
                              }
                              aria-label={`${character.name || "キャラクター"} 画像 ${imageIndex + 1}`}
                            >
                              <img alt="" src={src} loading="lazy" decoding="async" />
                            </button>
                          ))}
                        </div>
                      ) : null}
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
        ) : null}
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
  const [globalBgmTitle, setGlobalBgmTitle] = useState(() => {
    const stored = readStoredConfig();
    return stored.globalBgmTitle || "";
  });
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(() => {
    const stored = readStoredConfig();
    return stored.backgroundImageUrl || DEFAULT_BACKGROUND_URL;
  });
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(0.68);
  const [saveState, setSaveState] = useState("保存済み");
  const [characterImageStatus, setCharacterImageStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [draggingStarId, setDraggingStarId] = useState("");
  const [activePopupStarId, setActivePopupStarId] = useState("");
  const [activePopupWorkIndex, setActivePopupWorkIndex] = useState(1);
  const [popupOrigin, setPopupOrigin] = useState(null);
  const [zoomedStarId, setZoomedStarId] = useState("");
  const [showStarDetail, setShowStarDetail] = useState(false);
  const [zoomClosing, setZoomClosing] = useState(false);
  const [indexedDbImages, setIndexedDbImages] = useState({});
  const [indexedDbAudios, setIndexedDbAudios] = useState({});
  const [isSecondWorkEditorOpen, setIsSecondWorkEditorOpen] = useState(false);
  const [isThirdWorkEditorOpen, setIsThirdWorkEditorOpen] = useState(false);
  const [introPhase, setIntroPhase] = useState(getInitialIntroPhase);
  const [introTransform, setIntroTransform] = useState({ x: "0px", y: "0px", scale: 1 });
  const audioRef = useRef(null);
  const brandLogoRef = useRef(null);
  const introLogoFrameRef = useRef(null);
  const introRafRef = useRef(0);
  const spaceMapRef = useRef(null);
  const triggerElRef = useRef(null);
  const starDetailSheetRef = useRef(null);
  const characterImageStatusTimerRef = useRef(null);
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
  const effectiveBgmPlaybackUrl = resolveStoredAudioSource(effectiveBgmUrl, indexedDbAudios);
  const effectiveBgmIsGallery = !activeWorkBgmUrl;
  const globalBgmLabel = globalBgmStatus(globalBgmUrl, indexedDbAudios, globalBgmTitle);
  const selectedBgmLabel = selectedStar
    ? starBgmStatus(selectedStar.bgmUrl, globalBgmUrl, indexedDbAudios, selectedStar.bgmTitle, globalBgmTitle)
    : "";
  const hasPendingDataImageMigration = useMemo(
    () => hasDataImageAssets(stars, backgroundImageUrl),
    [stars, backgroundImageUrl],
  );
  const resolveImageSource = useCallback(
    (value) => resolveStoredImageSource(value, indexedDbImages),
    [indexedDbImages],
  );
  const displayBackgroundImageUrl = resolveImageSource(backgroundImageUrl) || DEFAULT_BACKGROUND_URL;

  const finishIntro = useCallback(() => {
    if (introRafRef.current) {
      window.cancelAnimationFrame(introRafRef.current);
      introRafRef.current = 0;
    }
    setIntroPhase("done");
  }, []);

  const startIntroMove = useCallback(() => {
    if (prefersReducedMotion()) {
      finishIntro();
      return;
    }

    const dockedLogo = brandLogoRef.current;
    const introLogo = introLogoFrameRef.current;
    if (!dockedLogo || !introLogo) {
      finishIntro();
      return;
    }

    const dockedRect = dockedLogo.getBoundingClientRect();
    const introRect = introLogo.getBoundingClientRect();
    if (!dockedRect.width || !dockedRect.height || !introRect.width || !introRect.height) {
      finishIntro();
      return;
    }

    const x = dockedRect.left + dockedRect.width / 2 - (introRect.left + introRect.width / 2);
    const y = dockedRect.top + dockedRect.height / 2 - (introRect.top + introRect.height / 2);
    const scale = dockedRect.width / introRect.width;
    setIntroTransform({ x: `${x}px`, y: `${y}px`, scale });

    introRafRef.current = window.requestAnimationFrame(() => {
      introRafRef.current = 0;
      setIntroPhase((current) => (current === "intro" ? "moving" : current));
    });
  }, [finishIntro]);

  const handleIntroMoveEnd = useCallback((event) => {
    if (event.target !== introLogoFrameRef.current || event.propertyName !== "transform") return;
    setIntroPhase((current) => (current === "moving" ? "exiting" : current));
  }, []);

  function showCharacterImageStatus(message) {
    setCharacterImageStatus(message);
    if (characterImageStatusTimerRef.current) {
      window.clearTimeout(characterImageStatusTimerRef.current);
    }
    characterImageStatusTimerRef.current = window.setTimeout(() => {
      setCharacterImageStatus("");
      characterImageStatusTimerRef.current = null;
    }, 4200);
  }

  useEffect(() => {
    // 画像・音声は IndexedDB に保存している。永続化を要求しておかないと、
    // ブラウザがストレージ逼迫時に「best-effort」扱いで中身を退避（削除）し、
    // 公開ZIP書き出し時にアセットが欠落する（音声が丸ごと消える等）。
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.storage?.persist) return;
        const alreadyPersisted = navigator.storage.persisted
          ? await navigator.storage.persisted()
          : false;
        if (!cancelled && !alreadyPersisted) {
          await navigator.storage.persist();
        }
      } catch {
        // 永続化要求に失敗しても致命的ではないので無視する
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (characterImageStatusTimerRef.current) {
        window.clearTimeout(characterImageStatusTimerRef.current);
      }
    },
    [],
  );

  useEffect(
    () => () => {
      if (introRafRef.current) {
        window.cancelAnimationFrame(introRafRef.current);
        introRafRef.current = 0;
      }
    },
    [],
  );

  useEffect(() => {
    if (introPhase === "done") return undefined;

    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;
    if (media.matches) {
      finishIntro();
      return undefined;
    }

    function handleMotionPreferenceChange(event) {
      if (event.matches) finishIntro();
    }

    media.addEventListener?.("change", handleMotionPreferenceChange);
    return () => media.removeEventListener?.("change", handleMotionPreferenceChange);
  }, [finishIntro, introPhase]);

  useEffect(() => {
    if (introPhase !== "intro") return undefined;
    const handle = window.setTimeout(startIntroMove, INTRO_FADE_MS + INTRO_HOLD_MS);
    return () => window.clearTimeout(handle);
  }, [introPhase, startIntroMove]);

  useEffect(() => {
    if (introPhase !== "moving") return undefined;
    const handle = window.setTimeout(() => {
      setIntroPhase((current) => (current === "moving" ? "exiting" : current));
    }, INTRO_MOVE_MS);
    return () => window.clearTimeout(handle);
  }, [introPhase]);

  useEffect(() => {
    if (introPhase !== "exiting") return undefined;
    const handle = window.setTimeout(finishIntro, INTRO_EXIT_MS);
    return () => window.clearTimeout(handle);
  }, [finishIntro, introPhase]);

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
            globalBgmTitle,
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
  }, [stars, globalBgmUrl, globalBgmTitle, backgroundImageUrl, hasPendingDataImageMigration]);

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
    const missingRefs = collectIndexedDbAudioRefs(stars, globalBgmUrl).filter((ref) => !indexedDbAudios[ref]);
    if (missingRefs.length === 0) return undefined;
    let cancelled = false;

    Promise.all(
      missingRefs.map(async (ref) => {
        try {
          return [ref, await readIndexedDbAudio(ref)];
        } catch {
          return [ref, null];
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const loadedAudios = Object.fromEntries(entries.filter(([, value]) => value?.dataUrl));
      if (Object.keys(loadedAudios).length > 0) {
        setIndexedDbAudios((current) => ({ ...current, ...loadedAudios }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [stars, globalBgmUrl, indexedDbAudios]);

  useEffect(() => {
    setIsSecondWorkEditorOpen(false);
  }, [selectedId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const previousUrl = currentAudioUrlRef.current;
    const previousWasGallery = currentAudioIsGalleryRef.current;
    const isChangingTrack = previousUrl !== effectiveBgmUrl;

    if (!effectiveBgmUrl || !effectiveBgmPlaybackUrl) {
      if (
        effectiveBgmUrl &&
        isChangingTrack &&
        previousWasGallery &&
        previousUrl === globalBgmUrl &&
        !effectiveBgmIsGallery &&
        Number.isFinite(audio.currentTime)
      ) {
        galleryResumeTimeRef.current = audio.currentTime;
      }
      audio.pause();
      setIsAudioEnabled(false);
      currentAudioUrlRef.current = "";
      currentAudioIsGalleryRef.current = true;
      return;
    }

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
      audio.src = effectiveBgmPlaybackUrl;
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
  }, [effectiveBgmUrl, effectiveBgmPlaybackUrl, effectiveBgmIsGallery, globalBgmUrl, isAudioEnabled]);

  useEffect(() => {
    if (activePopupStarId && !activePopupStar) {
      setActivePopupStarId("");
      setActivePopupWorkIndex(1);
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
    if (!showStarDetail) return;
    if (starDetailSheetRef.current) {
      starDetailSheetRef.current.scrollTop = 0;
    }
  }, [showStarDetail, zoomedStarId]);

  useEffect(() => {
    if (!zoomedStarId || activePopupStarId) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setZoomClosing(true);
        setActivePopupStarId("");
        setActivePopupWorkIndex(1);
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

  function commitSelectedCharacters(nextCharacters, workIndex = 1) {
    if (!selectedStar) return;
    const characters = nextCharacters.slice(0, MAX_CHARACTERS_PER_STAR);

    if (workIndex === 3) {
      updateSelected({ characters3: characters });
      return;
    }

    if (workIndex === 2) {
      updateSelected({ characters2: characters });
      return;
    }

    updateSelected({
      characters,
      ...getPrimaryCharacterFields(characters, selectedStar.name, selectedStar.description),
    });
  }

  function updateSelectedCharacter(characterId, patch, workIndex = 1) {
    if (!selectedStar) return;
    commitSelectedCharacters(
      getDisplayCharacters(selectedStar, workIndex).map((character) =>
        character.id === characterId ? { ...character, ...patch } : character,
      ),
      workIndex,
    );
  }

  function addSelectedCharacter(workIndex = 1) {
    if (!selectedStar) return;
    const currentCharacters = getDisplayCharacters(selectedStar, workIndex);
    if (currentCharacters.length >= MAX_CHARACTERS_PER_STAR) return;
    const index = currentCharacters.length;
    const character = {
      ...makeCharacterDefaults(`キャラクター ${index + 1}`, index),
      id: `character${workIndex === 3 ? "3" : workIndex === 2 ? "2" : ""}-${Date.now()}-${index}`,
    };
    commitSelectedCharacters([...currentCharacters, character], workIndex);
  }

  function deleteSelectedCharacter(characterId, workIndex = 1) {
    if (!selectedStar) return;
    const currentCharacters = getDisplayCharacters(selectedStar, workIndex);
    commitSelectedCharacters(
      currentCharacters.filter((character) => character.id !== characterId),
      workIndex,
    );
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

  async function uploadSelectedCharacterImage(characterId, file, workIndex = 1) {
    if (!selectedStar || !file) return;
    try {
      const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
      if (ref) {
        setIndexedDbImages((current) => ({ ...current, [ref]: dataUrl }));
        updateSelectedCharacter(characterId, { imageUrl: ref }, workIndex);
      }
    } catch {
      setSaveState("画像保存に失敗");
    }
  }

  async function uploadSelectedCharacterExtraImages(characterId, files, workIndex = 1) {
    const selectedFiles = Array.from(files || []).filter(Boolean);
    if (!selectedStar || selectedFiles.length === 0) return;

    const character = getDisplayCharacters(selectedStar, workIndex).find((item) => item.id === characterId);
    if (!character) return;

    const currentImages = getCharacterExtraImages(character);
    const remainingSlots = MAX_CHARACTER_EXTRA_IMAGES - currentImages.length;
    if (remainingSlots <= 0) {
      showCharacterImageStatus(`追加画像は最大${MAX_CHARACTER_EXTRA_IMAGES}枚です。新しい画像は追加されませんでした。`);
      return;
    }

    const uploadFiles = selectedFiles.slice(0, remainingSlots);
    const ignoredCount = selectedFiles.length - uploadFiles.length;

    try {
      const nextImageRefs = [];
      const nextImageCache = {};

      for (const file of uploadFiles) {
        const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
        if (ref) {
          nextImageRefs.push(ref);
          nextImageCache[ref] = dataUrl;
        }
      }

      if (nextImageRefs.length > 0) {
        setIndexedDbImages((current) => ({ ...current, ...nextImageCache }));
        updateSelectedCharacter(
          characterId,
          { images: normalizeCharacterImages([...currentImages, ...nextImageRefs]) },
          workIndex,
        );
      }

      if (ignoredCount > 0) {
        showCharacterImageStatus(
          `追加画像は最大${MAX_CHARACTER_EXTRA_IMAGES}枚です。${ignoredCount}件は追加されませんでした。`,
        );
      }
    } catch {
      setSaveState("画像保存に失敗");
      showCharacterImageStatus("追加画像の保存に失敗しました。");
    }
  }

  function deleteSelectedCharacterExtraImage(characterId, imageIndex, workIndex = 1) {
    if (!selectedStar) return;
    const character = getDisplayCharacters(selectedStar, workIndex).find((item) => item.id === characterId);
    if (!character) return;
    updateSelectedCharacter(
      characterId,
      {
        images: getCharacterExtraImages(character).filter((_, index) => index !== imageIndex),
      },
      workIndex,
    );
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

  async function uploadSelectedSceneImage2(file) {
    if (!selectedStar || !file) return;
    try {
      const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
      if (ref) {
        setIndexedDbImages((current) => ({ ...current, [ref]: dataUrl }));
        updateSelected({ sceneImageUrl2: ref });
      }
    } catch {
      setSaveState("画像保存に失敗");
    }
  }

  async function uploadSelectedSceneImage3(file) {
    if (!selectedStar || !file) return;
    try {
      const { ref, dataUrl } = await storeFileAsIndexedDbImage(file);
      if (ref) {
        setIndexedDbImages((current) => ({ ...current, [ref]: dataUrl }));
        updateSelected({ sceneImageUrl3: ref });
      }
    } catch {
      setSaveState("画像保存に失敗");
    }
  }

  async function uploadGlobalBgm(file) {
    if (!file) return;
    setSaveState("BGM保存中...");
    try {
      const audio = await storeFileAsIndexedDbAudio(file);
      if (audio.ref) {
        setIndexedDbAudios((current) => ({
          ...current,
          [audio.ref]: {
            dataUrl: audio.dataUrl,
            fileName: audio.fileName,
            mimeType: audio.mimeType,
          },
        }));
        setGlobalBgmUrl(audio.ref);
        setGlobalBgmTitle((current) => current.trim() || bgmTitleFromFileName(audio.fileName));
      }
    } catch {
      setSaveState("BGM保存に失敗");
    }
  }

  async function uploadSelectedStarBgm(file) {
    if (!selectedStar || !file) return;
    setSaveState("BGM保存中...");
    try {
      const audio = await storeFileAsIndexedDbAudio(file);
      if (audio.ref) {
        setIndexedDbAudios((current) => ({
          ...current,
          [audio.ref]: {
            dataUrl: audio.dataUrl,
            fileName: audio.fileName,
            mimeType: audio.mimeType,
          },
        }));
        updateSelected({
          bgmUrl: audio.ref,
          ...(!selectedStar.bgmTitle?.trim() ? { bgmTitle: bgmTitleFromFileName(audio.fileName) } : {}),
        });
      }
    } catch {
      setSaveState("BGM保存に失敗");
    }
  }

  function clearGlobalBgm() {
    setGlobalBgmUrl(DEFAULT_GLOBAL_BGM_URL);
    setGlobalBgmTitle("");
  }

  function clearSelectedStarBgm() {
    updateSelected({ bgmUrl: "", bgmTitle: "" });
  }

  function clearSecondWork() {
    if (!selectedStar) return;
    if (!window.confirm("作品②の入力内容とキャラクターを削除しますか？")) return;
    updateSelected({
      creatorName2: "",
      sceneImageUrl2: "",
      workTitle2: "",
      workUrl2: "",
      workDescription2: "",
      characters2: [],
    });
    setIsSecondWorkEditorOpen(false);
  }

  function clearThirdWork() {
    if (!selectedStar) return;
    if (!window.confirm("作品③の入力内容とキャラクターを削除しますか？")) return;
    updateSelected({
      creatorName3: "",
      sceneImageUrl3: "",
      workTitle3: "",
      workUrl3: "",
      workDescription3: "",
      characters3: [],
    });
    setIsThirdWorkEditorOpen(false);
  }

  function setPreviewMode(nextValue) {
    setIsPreviewMode(nextValue);
    if (!nextValue) {
      setActivePopupStarId("");
      setActivePopupWorkIndex(1);
      setZoomedStarId("");
      setShowStarDetail(false);
      setZoomClosing(false);
    }
  }

  const closeZoomView = useCallback(() => {
    setZoomClosing(true);
    setActivePopupStarId("");
    setActivePopupWorkIndex(1);
    setTimeout(() => {
      setZoomedStarId("");
      setShowStarDetail(false);
      setZoomClosing(false);
    }, 900);
  }, []);

  function openWorkFromZoom(workIndex = 1) {
    if (!zoomedStar) return;
    const node = spaceMapRef.current?.querySelector(`[data-star-id="${zoomedStarId}"]`);
    openPopup(zoomedStarId, node, workIndex);
  }

  function originFromElement(element) {
    if (!element || typeof element.getBoundingClientRect !== "function") return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function openPopup(starId, element, workIndex = 1) {
    setPopupOrigin(originFromElement(element));
    triggerElRef.current = element || null;
    setActivePopupWorkIndex(workIndex === 3 ? 3 : workIndex === 2 ? 2 : 1);
    setActivePopupStarId(starId);
  }

  function openPopupForSelected() {
    const node = spaceMapRef.current?.querySelector(`[data-star-id="${selectedStar.id}"]`);
    openPopup(selectedStar.id, node);
  }

  function closePopup() {
    const trigger = triggerElRef.current;
    setActivePopupStarId("");
    setActivePopupWorkIndex(1);
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
      bgmTitle: "",
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
    if (!audio || !effectiveBgmPlaybackUrl) return;

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
      const publicExport = await buildExternalPublicExport({
        stars,
        selectedId: selectedStar?.id,
        bgmUrl: globalBgmUrl,
        globalBgmTitle,
        backgroundImageUrl,
      });
      if (publicExport.missedAssets > 0) {
        // アセットが欠落したまま書き出すと、音声や画像が抜けた不完全なZIPになる。
        // ブラウザによる IndexedDB 退避などでアセットが失われている可能性が高いので、
        // 無言で壊れたZIPを作らず、明示的に確認する。
        const proceed = window.confirm(
          `⚠️ アセットが ${publicExport.missedAssets} 件見つからず、公開ZIPに同梱できません。\n` +
            `（同梱できる分: 画像 ${publicExport.imageAssetCount}件 / 音声 ${publicExport.audioAssetCount}件）\n\n` +
            `ブラウザのストレージ退避などで画像・音声が失われている可能性があります。\n` +
            `このまま書き出すと欠落したまま不完全なZIPになります。書き出しますか？`,
        );
        if (!proceed) {
          setExportStatus(`書き出しを中止しました（未同梱 ${publicExport.missedAssets}件）`);
          window.setTimeout(() => setExportStatus(""), 4000);
          return;
        }
      }
      downloadBlob(publicExport.blob, PUBLIC_EXPORT_FILENAME);
      setExportStatus(
        publicExport.missedAssets > 0
          ? `公開ZIPを生成しました（画像 ${publicExport.imageAssetCount}件 / 音声 ${publicExport.audioAssetCount}件 / 一部未同梱 ${publicExport.missedAssets}件）`
          : `公開ZIPを生成しました（画像 ${publicExport.imageAssetCount}件 / 音声 ${publicExport.audioAssetCount}件）`,
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

  const selectedCharacters = getDisplayCharacters(selectedStar, 1);
  const selectedCharacters2 = getDisplayCharacters(selectedStar, 2);
  const selectedCharacters3 = getDisplayCharacters(selectedStar, 3);
  const showSecondWorkEditor = hasSecondWork(selectedStar) || isSecondWorkEditorOpen;
  const showThirdWorkEditor = hasThirdWork(selectedStar) || isThirdWorkEditorOpen;
  const zoomedHasSecondWork = zoomedStar ? hasSecondWork(zoomedStar) : false;
  const zoomedHasThirdWork = zoomedStar ? hasThirdWork(zoomedStar) : false;

  function renderCharacterEditor(workIndex = 1) {
    const characters = workIndex === 3 ? selectedCharacters3 : workIndex === 2 ? selectedCharacters2 : selectedCharacters;
    const workLabel = workIndex === 3 ? "作品③" : workIndex === 2 ? "作品②" : "作品①";

    return (
      <div className={`form-section character-section ${workIndex === 2 || workIndex === 3 ? "is-secondary-work" : ""}`}>
        <div className="form-title form-title-row">
          <span className="form-title-label">
            <PencilSimple size={17} />
            <span>キャラクター（{workLabel}）</span>
          </span>
          <button
            className="mini-action"
            type="button"
            onClick={() => addSelectedCharacter(workIndex)}
            disabled={characters.length >= MAX_CHARACTERS_PER_STAR}
          >
            <Plus size={16} weight="bold" />
            追加
          </button>
        </div>
        {characterImageStatus ? <span className="hint-text character-image-status">{characterImageStatus}</span> : null}
        <div className="character-editor-list">
          {characters.length === 0 ? <div className="character-empty">キャラクター未登録</div> : null}
          {characters.map((character, index) => {
            const extraImages = getCharacterExtraImages(character);

            return (
              <article className="character-editor-card" key={character.id}>
                <div className="character-editor-head">
                  <strong>CHARACTER {String(index + 1).padStart(2, "0")}</strong>
                  <button
                    className="character-remove"
                    type="button"
                    onClick={() => deleteSelectedCharacter(character.id, workIndex)}
                    aria-label={`${character.name || "キャラクター"}を削除`}
                  >
                    <Trash size={16} />
                  </button>
                </div>
                <label>
                  キャラ名
                  <input
                    value={character.name}
                    onChange={(event) => updateSelectedCharacter(character.id, { name: event.target.value }, workIndex)}
                    placeholder="キャラクター名"
                  />
                </label>
                <label>
                  キャラ画像URL
                  <input
                    value={editableImageValue(character.imageUrl)}
                    onChange={(event) => updateSelectedCharacter(character.id, { imageUrl: event.target.value }, workIndex)}
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
                      onChange={(event) => uploadSelectedCharacterImage(character.id, event.target.files?.[0], workIndex)}
                    />
                  </label>
                  <span className="hint-text">このキャラだけに反映</span>
                </div>
                <div className="file-row">
                  <label className="file-button">
                    <UploadSimple size={16} />
                    追加画像をアップロード
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        uploadSelectedCharacterExtraImages(character.id, files, workIndex);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <span className="hint-text">追加画像は最大{MAX_CHARACTER_EXTRA_IMAGES}枚</span>
                </div>
                {extraImages.length > 0 ? (
                  <div className="character-extra-images" aria-label={`${character.name || "キャラクター"}の追加画像`}>
                    {extraImages.map((imageUrl, imageIndex) => {
                      const previewSrc = resolveImageSource(imageUrl);

                      return (
                        <div className="character-extra-image" key={`${imageUrl}-${imageIndex}`}>
                          {previewSrc ? <img alt="" src={previewSrc} loading="lazy" decoding="async" /> : <span>画像</span>}
                          <button
                            className="character-extra-remove"
                            type="button"
                            onClick={() => deleteSelectedCharacterExtraImage(character.id, imageIndex, workIndex)}
                            aria-label={`追加画像${imageIndex + 1}を削除`}
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <label>
                  キャラ詳細文
                  <textarea
                    value={character.description}
                    onChange={(event) => updateSelectedCharacter(character.id, { description: event.target.value }, workIndex)}
                    rows={5}
                    placeholder="キャラクター紹介文やキャプションを貼り付け"
                  />
                </label>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

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
          <img
            id="brand-logo"
            ref={brandLogoRef}
            className="brand-logo"
            src={hoshiyomiGingaLogoUrl}
            alt="星詠銀河・星図"
            width={LOGO_IMAGE_WIDTH}
            height={LOGO_IMAGE_HEIGHT}
            draggable="false"
          />
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

        <div className="bgm-field editor-only">
          <span>全体BGM</span>
          <div className="bgm-actions">
            <label className="file-button">
              <UploadSimple size={16} />
              BGMを選択
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => {
                  uploadGlobalBgm(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <button className="mini-action" type="button" onClick={clearGlobalBgm}>
              クリア
            </button>
          </div>
          <div className="form-grid bgm-title-grid">
            <label className="bgm-title-field">
              BGMタイトル
              <input
                value={globalBgmTitle}
                onChange={(event) => setGlobalBgmTitle(event.target.value)}
                placeholder="表示するBGM名"
              />
            </label>
          </div>
          <strong className="bgm-status">現在: {globalBgmLabel}</strong>
        </div>

        <div className="audio-controls">
          <button
            className="icon-button"
            type="button"
            onClick={toggleAudio}
            aria-label={isAudioEnabled ? "BGMを停止" : "BGMを再生"}
            disabled={!effectiveBgmPlaybackUrl}
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
            {isExporting ? "生成中" : "公開ZIP"}
          </button>
        </div>

        {isPreviewMode ? (
          <button className="subtle-button preview-return" type="button" onClick={() => setPreviewMode(false)}>
            <PencilSimple size={18} />
            編集表示
          </button>
        ) : null}
      </header>

      {introPhase !== "done" ? (
        <div
          className={`intro-overlay ${introPhase === "moving" ? "is-moving" : ""} ${
            introPhase === "exiting" ? "is-exiting" : ""
          }`}
          style={{
            "--intro-logo-x": introTransform.x,
            "--intro-logo-y": introTransform.y,
            "--intro-logo-scale": introTransform.scale,
            "--intro-fade-ms": `${INTRO_FADE_MS}ms`,
            "--intro-move-ms": `${INTRO_MOVE_MS}ms`,
            "--intro-exit-ms": `${INTRO_EXIT_MS}ms`,
          }}
          onPointerDown={finishIntro}
          aria-hidden="true"
        >
          <div ref={introLogoFrameRef} className="intro-logo-frame" onTransitionEnd={handleIntroMoveEnd}>
            <img
              className="intro-logo-image"
              src={hoshiyomiGingaLogoUrl}
              alt=""
              width={LOGO_IMAGE_WIDTH}
              height={LOGO_IMAGE_HEIGHT}
              draggable="false"
            />
          </div>
        </div>
      ) : null}

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
                <div className={key === "planetNotes" ? "is-planet-notes" : undefined} key={key}>
                  <span>{label}</span>
                  <strong>{selectedStar[key]}</strong>
                </div>
              ) : null,
            )}
            <div>
              <span>BGM</span>
              <strong>{selectedBgmLabel}</strong>
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
                <span className="hint-text">公開ZIPでは画像をassetsに分離します</span>
              </div>
              <div className="bgm-upload-field">
                <span>この星のBGM</span>
                <div className="bgm-actions">
                  <label className="file-button">
                    <UploadSimple size={16} />
                    BGMを選択
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(event) => {
                        uploadSelectedStarBgm(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button className="mini-action" type="button" onClick={clearSelectedStarBgm}>
                    クリア
                  </button>
                </div>
                <div className="form-grid bgm-title-grid">
                  <label>
                    BGMタイトル
                    <input
                      value={selectedStar.bgmTitle}
                      onChange={(event) => updateSelected({ bgmTitle: event.target.value })}
                      placeholder="表示するBGM名"
                    />
                  </label>
                </div>
                <span className="hint-text">現在: {selectedBgmLabel}</span>
              </div>
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
                  <textarea
                    value={selectedStar.workTitle}
                    onChange={(event) => updateSelected({ workTitle: event.target.value })}
                    rows={2}
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

            {renderCharacterEditor(1)}

            {showSecondWorkEditor ? (
              <>
                <div className="form-section is-secondary-work">
                  <div className="form-title form-title-row">
                    <span className="form-title-label">
                      <ImageSquare size={17} />
                      <span>作品情報②</span>
                    </span>
                    <button className="mini-action is-danger" type="button" onClick={clearSecondWork}>
                      <Trash size={16} />
                      作品②を削除
                    </button>
                  </div>
                  <label>
                    クリエイター名
                    <input
                      value={selectedStar.creatorName2}
                      onChange={(event) => updateSelected({ creatorName2: event.target.value })}
                      placeholder="例: Guarhiro"
                    />
                  </label>
                  <label>
                    作品タイトル画像URL
                    <input
                      value={editableImageValue(selectedStar.sceneImageUrl2)}
                      onChange={(event) => updateSelected({ sceneImageUrl2: event.target.value })}
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
                        onChange={(event) => uploadSelectedSceneImage2(event.target.files?.[0])}
                      />
                    </label>
                    <span className="hint-text">2作品目のポップアップ上部</span>
                  </div>
                  <div className="form-grid">
                    <label>
                      作品タイトル
                      <textarea
                        value={selectedStar.workTitle2}
                        onChange={(event) => updateSelected({ workTitle2: event.target.value })}
                        rows={2}
                        placeholder="リンク先作品名"
                      />
                    </label>
                    <label>
                      作品URL
                      <input
                        value={selectedStar.workUrl2}
                        onChange={(event) => updateSelected({ workUrl2: event.target.value })}
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                  <label>
                    作品詳細
                    <textarea
                      value={selectedStar.workDescription2}
                      onChange={(event) => updateSelected({ workDescription2: event.target.value })}
                      rows={4}
                      placeholder="作品の紹介文・あらすじなど"
                    />
                  </label>
                </div>
                {renderCharacterEditor(2)}
              </>
            ) : (
              <button className="add-secondary-work" type="button" onClick={() => setIsSecondWorkEditorOpen(true)}>
                <Plus size={16} weight="bold" />
                作品②を追加
              </button>
            )}

            {showSecondWorkEditor ? (
              showThirdWorkEditor ? (
                <>
                  <div className="form-section is-secondary-work">
                    <div className="form-title form-title-row">
                      <span className="form-title-label">
                        <ImageSquare size={17} />
                        <span>作品情報③</span>
                      </span>
                      <button className="mini-action is-danger" type="button" onClick={clearThirdWork}>
                        <Trash size={16} />
                        作品③を削除
                      </button>
                    </div>
                    <label>
                      クリエイター名
                      <input
                        value={selectedStar.creatorName3}
                        onChange={(event) => updateSelected({ creatorName3: event.target.value })}
                        placeholder="例: Guarhiro"
                      />
                    </label>
                    <label>
                      作品タイトル画像URL
                      <input
                        value={editableImageValue(selectedStar.sceneImageUrl3)}
                        onChange={(event) => updateSelected({ sceneImageUrl3: event.target.value })}
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
                          onChange={(event) => uploadSelectedSceneImage3(event.target.files?.[0])}
                        />
                      </label>
                      <span className="hint-text">3作品目のポップアップ上部</span>
                    </div>
                    <div className="form-grid">
                      <label>
                        作品タイトル
                        <textarea
                          value={selectedStar.workTitle3}
                          onChange={(event) => updateSelected({ workTitle3: event.target.value })}
                          rows={2}
                          placeholder="リンク先作品名"
                        />
                      </label>
                      <label>
                        作品URL
                        <input
                          value={selectedStar.workUrl3}
                          onChange={(event) => updateSelected({ workUrl3: event.target.value })}
                          placeholder="https://..."
                        />
                      </label>
                    </div>
                    <label>
                      作品詳細
                      <textarea
                        value={selectedStar.workDescription3}
                        onChange={(event) => updateSelected({ workDescription3: event.target.value })}
                        rows={4}
                        placeholder="作品の紹介文・あらすじなど"
                      />
                    </label>
                  </div>
                  {renderCharacterEditor(3)}
                </>
              ) : (
                <button className="add-secondary-work" type="button" onClick={() => setIsThirdWorkEditorOpen(true)}>
                  <Plus size={16} weight="bold" />
                  作品③を追加
                </button>
              )
            ) : null}

            <div className="form-section">
              <div className="form-title">
                <Planet size={17} />
                <span>惑星データ</span>
              </div>
              <div className="form-grid">
                {PLANET_FIELDS.map(({ key, label }) => (
                  <label key={key}>
                    {label}
                    {key === "planetNotes" ? (
                      <textarea
                        value={selectedStar[key]}
                        onChange={(event) => updateSelected({ [key]: event.target.value })}
                        placeholder={label}
                        rows={3}
                      />
                    ) : (
                      <input
                        value={selectedStar[key]}
                        onChange={(event) => updateSelected({ [key]: event.target.value })}
                        placeholder={label}
                      />
                    )}
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
            <div ref={starDetailSheetRef} className="star-detail-sheet">
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
                  <div className={key === "planetNotes" ? "is-planet-notes" : undefined} key={key}>
                    <span>{label}</span>
                    <strong>{zoomedStar[key]}</strong>
                  </div>
                ))}
                <div>
                  <span>BGM</span>
                  <strong>
                    {starBgmStatus(zoomedStar.bgmUrl, globalBgmUrl, indexedDbAudios, zoomedStar.bgmTitle, globalBgmTitle)}
                  </strong>
                </div>
              </div>
              {zoomedHasThirdWork ? (
                <>
                  <div className="star-detail-work-count">WORKS ×3</div>
                  <div className="star-detail-work-actions">
                    <button className="star-detail-work-btn" type="button" onClick={() => openWorkFromZoom(1)}>
                      {workButtonLabel(zoomedStar, 1)}
                    </button>
                    <button className="star-detail-work-btn" type="button" onClick={() => openWorkFromZoom(2)}>
                      {workButtonLabel(zoomedStar, 2)}
                    </button>
                    <button className="star-detail-work-btn" type="button" onClick={() => openWorkFromZoom(3)}>
                      {workButtonLabel(zoomedStar, 3)}
                    </button>
                  </div>
                </>
              ) : zoomedHasSecondWork ? (
                <>
                  <div className="star-detail-work-count">WORKS ×2</div>
                  <div className="star-detail-work-actions">
                    <button className="star-detail-work-btn" type="button" onClick={() => openWorkFromZoom(1)}>
                      {workButtonLabel(zoomedStar, 1)}
                    </button>
                    <button className="star-detail-work-btn" type="button" onClick={() => openWorkFromZoom(2)}>
                      {workButtonLabel(zoomedStar, 2)}
                    </button>
                  </div>
                </>
              ) : (
                <button className="star-detail-work-btn" type="button" onClick={() => openWorkFromZoom(1)}>
                  作品詳細を見る
                </button>
              )}
            </div>
          )}
        </div>
      ) : null}
      {activePopupStar ? (
        <StarFeatureModal
          star={activePopupStar}
          origin={popupOrigin}
          onClose={closePopup}
          resolveImageSource={resolveImageSource}
          workIndex={activePopupWorkIndex}
        />
      ) : null}
    </div>
  );
}

export { App };
