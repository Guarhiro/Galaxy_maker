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
const MAX_STARS = 20;
const DEFAULT_BACKGROUND_URL = backgroundUrl;

const STAR_NAMES = [
  "アルデラ",
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

function makeFeatureDefaults(name, index, description = "") {
  return {
    creatorName: index === 0 ? "星詠み工房" : `Creator ${String(index + 1).padStart(2, "0")}`,
    characterName: name,
    standingImageUrl: "",
    sceneImageUrl: "",
    pastedText:
      index === 0
        ? "黄金航路を渡る観測者。\n静かな光の奥に、まだ誰にも開かれていない記録を抱えている。"
        : `${name}の紹介テキストをここに貼り付けます。\n改行を入れた文章も、そのまま公開ポップアップに反映されます。`,
    workTitle: index === 0 ? "黄金航路の記録" : `${name}の作品`,
    workUrl: "",
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
      bgmUrl: "",
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
    characterName: star?.characterName ?? featureDefaults.characterName,
    standingImageUrl: star?.standingImageUrl ?? featureDefaults.standingImageUrl,
    sceneImageUrl: star?.sceneImageUrl ?? featureDefaults.sceneImageUrl,
    pastedText: star?.pastedText ?? featureDefaults.pastedText,
    workTitle: star?.workTitle ?? featureDefaults.workTitle,
    workUrl: star?.workUrl ?? featureDefaults.workUrl,
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
body {
  margin: 0;
  min-height: 100vh;
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
.star-label {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: calc(100% - 4px);
  transform: translateX(-50%);
  min-width: 28px;
  padding: 3px 7px;
  border-radius: 5px;
  border: 1px solid rgba(255,255,255,.22);
  background: rgba(2,7,13,.78);
  color: rgba(246,251,255,.9);
  font-size: 12px;
  line-height: 1;
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
  display: grid;
  grid-template-columns: minmax(230px, .92fr) minmax(320px, 1.08fr);
  gap: 22px;
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
.feature-overlay.is-closing .feature-modal { animation: featureCollapse .3s var(--ease-out) both; }
.feature-modal .feature-character,
.feature-modal .feature-kicker,
.feature-modal .feature-copy h2,
.feature-modal .feature-work,
.feature-modal .feature-text,
.feature-modal .feature-link {
  animation: featureContentIn .46s var(--ease-out) both;
}
.feature-modal .feature-character { animation-delay: 90ms; }
.feature-modal .feature-kicker { animation-delay: 150ms; }
.feature-modal .feature-copy h2 { animation-delay: 200ms; }
.feature-modal .feature-work { animation-delay: 255ms; }
.feature-modal .feature-text { animation-delay: 310ms; }
.feature-modal .feature-link { animation-delay: 365ms; }
.feature-overlay.is-closing .feature-character,
.feature-overlay.is-closing .feature-kicker,
.feature-overlay.is-closing .feature-copy h2,
.feature-overlay.is-closing .feature-work,
.feature-overlay.is-closing .feature-text,
.feature-overlay.is-closing .feature-link { animation: none; }
.feature-close {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 2;
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
.feature-character,
.feature-scene {
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
.feature-character {
  min-height: 460px;
}
.feature-character img {
  width: 100%;
  height: 100%;
  max-height: 62vh;
  object-fit: contain;
  filter: drop-shadow(0 22px 38px rgba(0,0,0,.45));
}
.feature-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 10px 6px 4px;
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
.feature-copy h2 {
  margin: 0;
  padding-right: 38px;
  color: #fff8d8;
  font-size: clamp(28px, 4.2vw, 52px);
  line-height: 1.05;
  overflow-wrap: anywhere;
}
.feature-work {
  display: grid;
  grid-template-columns: 142px 1fr;
  gap: 14px;
  align-items: stretch;
}
.feature-scene {
  aspect-ratio: 16 / 10;
}
.feature-scene img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.feature-work-meta {
  display: grid;
  align-content: center;
  gap: 6px;
  min-width: 0;
}
.feature-work-meta span {
  color: rgba(226,239,251,.58);
  font-size: 12px;
  font-weight: 800;
}
.feature-work-meta strong {
  color: #f7fbff;
  font-size: 18px;
  overflow-wrap: anywhere;
}
.feature-work-meta small {
  color: rgba(226,239,251,.62);
  overflow-wrap: anywhere;
}
.feature-text {
  min-height: 124px;
  padding: 16px;
  border-left: 3px solid color-mix(in srgb, var(--feature-color, #ffd34d), white 14%);
  color: rgba(226,239,251,.84);
  background: rgba(255,255,255,.045);
  line-height: 1.8;
  white-space: normal;
  overflow-wrap: anywhere;
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
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
  .feature-overlay, .feature-modal,
  .feature-modal .feature-character, .feature-modal .feature-kicker, .feature-modal .feature-copy h2,
  .feature-modal .feature-work, .feature-modal .feature-text, .feature-modal .feature-link {
    animation: featureFade .16s ease-out both;
  }
  .star-button.feature-active { transform: translate(-50%, -50%) scale(1.7); }
  .shooting-star { display: none; }
}
@media (max-width: 900px) {
  body { overflow: auto; }
  .public-shell { min-height: 100svh; }
  .public-top { align-items: flex-start; flex-direction: column; }
  .public-main { min-height: 940px; }
  .map { inset: 0 0 420px 0; }
  .public-detail {
    top: auto;
    bottom: 0;
    width: 100%;
    height: 420px;
    border-left: 0;
    border-top: 1px solid rgba(174,207,235,.2);
  }
  .feature-modal {
    grid-template-columns: 1fr;
  }
  .feature-character {
    min-height: 360px;
  }
  .feature-work {
    grid-template-columns: 1fr;
  }
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
  <main class="public-main">
    <section class="map" id="map">
      <span class="orbit" style="--w: 46vw; --h: 18vw; --r: -14deg; --d: 72s"></span>
      <span class="orbit" style="--w: 66vw; --h: 28vw; --r: 18deg; --d: 88s"></span>
      <span class="orbit" style="--w: 54vw; --h: 44vw; --r: 55deg; --d: 96s"></span>
    </section>
    <aside class="public-detail" id="detail"></aside>
  </main>
</div>
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
const globalBgmUrl = ${JSON.stringify(bgmUrl || "")};
const map = document.getElementById("map");
const detail = document.getElementById("detail");
const audio = document.getElementById("bgm");
const audioToggle = document.getElementById("audioToggle");
const featureOverlay = document.getElementById("featureOverlay");
const featureModal = document.getElementById("featureModal");
const featureBody = document.getElementById("featureBody");
const featureClose = document.getElementById("featureClose");

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

function setSelected(id) {
  selectedId = id;
  render();
}

function renderImageOrEmpty(src, className, label, alt) {
  if (!src) {
    return '<div class="' + className + '"><div class="feature-empty">' + escapeHtml(label) + '</div></div>';
  }
  return '<div class="' + className + '"><img alt="' + escapeAttr(alt) + '" src="' + escapeAttr(src) + '" /></div>';
}

function renderFeature(star) {
  const workUrl = safePublicUrl(star.workUrl);
  const linkHtml = workUrl
    ? '<a class="feature-link" href="' + escapeAttr(workUrl) + '" target="_blank" rel="noreferrer">作品へ移動</a>'
    : '<span class="feature-link is-disabled">作品URL未設定</span>';
  featureOverlay.style.setProperty("--feature-color", star.color || "#ffd34d");
  featureBody.innerHTML =
    renderImageOrEmpty(star.standingImageUrl, "feature-character", "立ち絵未設定", star.characterName || star.name) +
    '<div class="feature-copy">' +
      '<p class="feature-kicker">' + escapeHtml(star.creatorName || "Creator") + '</p>' +
      '<h2>' + escapeHtml(star.characterName || star.name) + '</h2>' +
      '<div class="feature-work">' +
        renderImageOrEmpty(star.sceneImageUrl, "feature-scene", "シーン画像未設定", star.workTitle || star.name) +
        '<div class="feature-work-meta">' +
          '<span>作品</span>' +
          '<strong>' + escapeHtml(star.workTitle || "未設定") + '</strong>' +
          '<small>' + escapeHtml(shortPublicUrl(star.workUrl)) + '</small>' +
        '</div>' +
      '</div>' +
      '<div class="feature-text">' + formatMultiline(star.pastedText || star.description) + '</div>' +
      linkHtml +
    '</div>';
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

function render() {
  const selected = pickStar();
  const currentBgm = selected.bgmUrl || globalBgmUrl;
  map.querySelectorAll(".star-button").forEach((node) => node.remove());
  stars.forEach((star, index) => {
    const button = document.createElement("button");
    button.className =
      "star-button" +
      (star.id === selected.id ? " selected" : "") +
      (star.id === featureId ? " feature-active" : "");
    button.style.setProperty("--x", star.x);
    button.style.setProperty("--y", star.y);
    button.style.setProperty("--s", star.size);
    button.style.setProperty("--c", star.color);
    button.style.animationDelay = (index % 6) * -.42 + "s";
    button.setAttribute("aria-label", star.name);
    button.dataset.starId = star.id;
    button.innerHTML = '<img alt="" src="' + escapeAttr(star.imageUrl) + '" /><span class="star-label">' + String(index + 1).padStart(2, "0") + '</span>';
    button.addEventListener("click", (event) => openFeature(star.id, event.currentTarget));
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
      <div class="meta-row"><span>色</span><strong><span class="swatch"></span>\${escapeHtml(selected.color)}</strong></div>
      <div class="meta-row"><span>サイズ</span><strong>\${Number(selected.size).toFixed(2)} R</strong></div>
      <div class="meta-row"><span>位置</span><strong>X \${selected.x} / Y \${selected.y} / Z \${selected.z}</strong></div>
      <div class="meta-row"><span>BGM</span><strong>\${escapeHtml(shortPublicUrl(currentBgm))}</strong></div>
    </div>\`;
  document.getElementById("audioLabel").textContent = shortPublicUrl(currentBgm);
  if (currentBgm && audio.dataset.current !== currentBgm) {
    audio.dataset.current = currentBgm;
    audio.src = currentBgm;
  }
  if (!currentBgm) {
    audio.removeAttribute("src");
    audio.dataset.current = "";
  }
}

audioToggle.addEventListener("click", async () => {
  if (!audio.src) return;
  if (audio.paused) {
    await audio.play();
    audioToggle.textContent = "BGM停止";
  } else {
    audio.pause();
    audioToggle.textContent = "BGM再生";
  }
});

featureClose.addEventListener("click", closeFeature);
featureOverlay.addEventListener("click", closeFeature);
featureModal.addEventListener("click", (event) => event.stopPropagation());

document.addEventListener("keydown", (event) => {
  if (featureOverlay.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeFeature();
    return;
  }
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
});

render();
</script>
</body>
</html>`;
}

function StarFeatureModal({ star, origin, onClose }) {
  const workUrl = safeExternalUrl(star.workUrl);
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

        <div className="feature-character">
          {star.standingImageUrl ? (
            <img alt={star.characterName || star.name} src={star.standingImageUrl} />
          ) : (
            <div className="feature-empty">立ち絵未設定</div>
          )}
        </div>

        <div className="feature-copy">
          <p className="feature-kicker">{star.creatorName || "Creator"}</p>
          <h2>{star.characterName || star.name}</h2>

          <div className="feature-work">
            <div className="feature-scene">
              {star.sceneImageUrl ? (
                <img alt={star.workTitle || `${star.name}のシーン`} src={star.sceneImageUrl} />
              ) : (
                <div className="feature-empty">シーン画像未設定</div>
              )}
            </div>
            <div className="feature-work-meta">
              <span>作品</span>
              <strong>{star.workTitle || "未設定"}</strong>
              <small>{shortUrl(star.workUrl)}</small>
            </div>
          </div>

          <div className="feature-text">{star.pastedText || star.description}</div>

          {workUrl ? (
            <a className="feature-link" href={workUrl} target="_blank" rel="noreferrer">
              作品へ移動
            </a>
          ) : (
            <span className="feature-link is-disabled">作品URL未設定</span>
          )}
        </div>
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
    return stored.globalBgmUrl || "";
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
  const audioRef = useRef(null);
  const spaceMapRef = useRef(null);
  const triggerElRef = useRef(null);

  const selectedStar = useMemo(
    () => stars.find((star) => star.id === selectedId) || stars[0],
    [selectedId, stars],
  );

  const activePopupStar = useMemo(
    () => stars.find((star) => star.id === activePopupStarId),
    [activePopupStarId, stars],
  );

  const effectiveBgmUrl = selectedStar?.bgmUrl || globalBgmUrl;

  useEffect(() => {
    setSaveState("保存中...");
    const handle = window.setTimeout(() => {
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
    }, 260);

    return () => window.clearTimeout(handle);
  }, [stars, globalBgmUrl, backgroundImageUrl]);

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
      return;
    }

    if (audio.src !== effectiveBgmUrl) {
      audio.src = effectiveBgmUrl;
    }

    if (isAudioEnabled) {
      audio.play().catch(() => setIsAudioEnabled(false));
    }
  }, [effectiveBgmUrl, isAudioEnabled]);

  useEffect(() => {
    if (activePopupStarId && !activePopupStar) {
      setActivePopupStarId("");
    }
  }, [activePopupStar, activePopupStarId]);

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

  async function uploadBackgroundFile(file) {
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl) {
      setBackgroundImageUrl(dataUrl);
    }
  }

  async function uploadSelectedStarImage(file) {
    if (!selectedStar) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl) {
      updateSelected({ imageUrl: dataUrl });
    }
  }

  async function uploadSelectedStandingImage(file) {
    if (!selectedStar) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl) {
      updateSelected({ standingImageUrl: dataUrl });
    }
  }

  async function uploadSelectedSceneImage(file) {
    if (!selectedStar) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl) {
      updateSelected({ sceneImageUrl: dataUrl });
    }
  }

  function setPreviewMode(nextValue) {
    setIsPreviewMode(nextValue);
    if (!nextValue) {
      setActivePopupStarId("");
    }
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
      openPopup(starId, event?.currentTarget);
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
          const [embeddedImage, embeddedStandingImage, embeddedSceneImage] = await Promise.all([
            embedAsset(star.imageUrl),
            embedAsset(star.standingImageUrl),
            embedAsset(star.sceneImageUrl),
          ]);
          return {
            ...star,
            imageUrl: embeddedImage.value,
            standingImageUrl: embeddedStandingImage.value,
            sceneImageUrl: embeddedSceneImage.value,
            imageEmbedded: embeddedImage.embedded,
            standingImageEmbedded: embeddedStandingImage.embedded || !star.standingImageUrl,
            sceneImageEmbedded: embeddedSceneImage.embedded || !star.sceneImageUrl,
          };
        }),
      );
      const missedAssets =
        (embeddedBackground.embedded ? 0 : 1) +
        embeddedStars.reduce(
          (total, star) =>
            total +
            (star.imageEmbedded ? 0 : 1) +
            (star.standingImageEmbedded ? 0 : 1) +
            (star.sceneImageEmbedded ? 0 : 1),
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

  return (
    <div
      className={`app-shell ${isPreviewMode ? "is-preview-mode" : ""}`}
      style={{ "--space-image": `url(${backgroundImageUrl || DEFAULT_BACKGROUND_URL})` }}
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
                value={backgroundImageUrl}
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
                <img alt="" src={star.imageUrl} />
                <strong>{star.name}</strong>
                {star.bgmUrl ? <MusicNotes size={15} weight="fill" /> : null}
              </button>
            ))}
          </div>
        </aside>

        <section
          className={`space-map ${activePopupStarId ? "is-feature-open" : ""}`}
          ref={spaceMapRef}
          aria-label="クリックできる星図"
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
              } ${activePopupStarId === star.id ? "is-popup-active" : ""}`}
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
              <img alt="" src={star.imageUrl} />
              <span>{String(index + 1).padStart(2, "0")}</span>
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
            <img alt={selectedStar.name} src={selectedStar.imageUrl} />
          </div>

          <p className="description">{selectedStar.description}</p>

          <div className="meta-table">
            <div>
              <span>制作者</span>
              <strong>{selectedStar.creatorName || "未設定"}</strong>
            </div>
            <div>
              <span>色</span>
              <strong>
                <i style={{ backgroundColor: selectedStar.color }} />
                {selectedStar.color}
              </strong>
            </div>
            <div>
              <span>サイズ</span>
              <strong>{Number(selectedStar.size).toFixed(2)} R</strong>
            </div>
            <div>
              <span>位置</span>
              <strong>
                X {selectedStar.x} / Y {selectedStar.y} / Z {selectedStar.z}
              </strong>
            </div>
            <div>
              <span>更新日</span>
              <strong>{formatDate(selectedStar.updatedAt)}</strong>
            </div>
            <div>
              <span>BGM</span>
              <strong>{shortUrl(selectedStar.bgmUrl || globalBgmUrl)}</strong>
            </div>
          </div>

          <section className="editor-form editor-only" aria-label="星の編集">
            <div className="form-title">
              <PencilSimple size={17} />
              <span>編集</span>
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
            <div className="form-grid">
              <label>
                クリエイター名
                <input
                  value={selectedStar.creatorName}
                  onChange={(event) => updateSelected({ creatorName: event.target.value })}
                  placeholder="例: Guarhiro"
                />
              </label>
              <label>
                キャラ名
                <input
                  value={selectedStar.characterName}
                  onChange={(event) => updateSelected({ characterName: event.target.value })}
                  placeholder="ポップアップ見出し"
                />
              </label>
            </div>
            <label>
              立ち絵画像URL
              <input
                value={selectedStar.standingImageUrl}
                onChange={(event) => updateSelected({ standingImageUrl: event.target.value })}
                placeholder="キャラ立ち絵のGitHub raw URL"
              />
            </label>
            <div className="file-row">
              <label className="file-button">
                <UploadSimple size={16} />
                立ち絵を選択
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadSelectedStandingImage(event.target.files?.[0])}
                />
              </label>
              <span className="hint-text">中央ポップアップ左側</span>
            </div>
            <label>
              シーン画像URL
              <input
                value={selectedStar.sceneImageUrl}
                onChange={(event) => updateSelected({ sceneImageUrl: event.target.value })}
                placeholder="縮小表示するシーン画像URL"
              />
            </label>
            <div className="file-row">
              <label className="file-button">
                <UploadSimple size={16} />
                シーンを選択
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadSelectedSceneImage(event.target.files?.[0])}
                />
              </label>
              <span className="hint-text">右側の縮小画像</span>
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
              貼り付けテキスト
              <textarea
                value={selectedStar.pastedText}
                onChange={(event) => updateSelected({ pastedText: event.target.value })}
                rows={6}
                placeholder="作品紹介文やキャプションを貼り付け"
              />
            </label>
            <label>
              星画像URL
              <input
                value={selectedStar.imageUrl}
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
      {activePopupStar ? (
        <StarFeatureModal star={activePopupStar} origin={popupOrigin} onClose={closePopup} />
      ) : null}
    </div>
  );
}

export { App };
