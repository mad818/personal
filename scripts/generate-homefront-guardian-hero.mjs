import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const imageDir = path.join(process.cwd(), "public", "images");
const heroPath = path.join(imageDir, "homefront-guardian-hero.webp");
const fallbackHeroPath = path.join(
  imageDir,
  "homefront-guardian-hero-fallback.webp",
);
const dronePath = path.join(imageDir, "homefront-drone-patrol-fallback.webp");
const photorealHomeSourcePath = path.join(
  imageDir,
  "homefront-guardian-home-photoreal-source.png",
);
const photorealDroneSourcePath = path.join(
  imageDir,
  "homefront-drone-patrol-photoreal-source.png",
);

const width = 1920;
const height = 1080;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const bokeh = [
  [118, 642, 68, "#f2b76d", 0.2],
  [282, 728, 34, "#89e9ff", 0.16],
  [438, 848, 84, "#f5d7a7", 0.16],
  [1195, 798, 76, "#79fff0", 0.14],
  [1420, 688, 94, "#ffbd71", 0.17],
  [1706, 630, 48, "#94edff", 0.14],
  [1605, 864, 40, "#ffe0aa", 0.16],
  [853, 760, 58, "#8cecff", 0.13],
];

const rain = Array.from({ length: 105 }, (_, index) => {
  const x = (index * 83) % width;
  const y = (index * 139) % height;
  const length = 28 + ((index * 17) % 74);
  const opacity = 0.045 + ((index % 7) * 0.011);
  return `<path d="M${x} ${y} l${16 + (index % 9)} ${length}" stroke="rgba(210,245,255,${opacity.toFixed(
    3,
  )})" stroke-width="1.2" stroke-linecap="round"/>`;
}).join("");

const grass = Array.from({ length: 190 }, (_, index) => {
  const x = (index * 47) % width;
  const base = 880 + ((index * 23) % 185);
  const bladeHeight = 38 + ((index * 19) % 150);
  const bend = -26 + ((index * 29) % 54);
  const opacity = 0.16 + ((index % 5) * 0.035);
  const tone =
    index % 7 === 0
      ? "rgba(195,238,200,"
      : index % 5 === 0
        ? "rgba(185,147,72,"
        : "rgba(87,128,95,";
  return `<path d="M${x} ${base} C${x + bend} ${base - bladeHeight * 0.42}, ${x + bend * 0.45} ${base - bladeHeight * 0.72}, ${x + bend * 0.85} ${base - bladeHeight}" stroke="${tone}${opacity.toFixed(
    3,
  )})" stroke-width="${1 + (index % 3) * 0.55}" stroke-linecap="round"/>`;
}).join("");

const foregroundLeaves = Array.from({ length: 62 }, (_, index) => {
  const x = (index * 113) % width;
  const y = 705 + ((index * 61) % 300);
  const rx = 30 + ((index * 11) % 82);
  const ry = 12 + ((index * 7) % 36);
  const rotate = -28 + ((index * 17) % 56);
  const opacity = 0.08 + ((index % 6) * 0.026);
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="rgba(50,93,64,${opacity.toFixed(
    3,
  )})" transform="rotate(${rotate} ${x} ${y})"/>`;
}).join("");

const droneSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="rotorGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#d8fbff" stop-opacity="0.3"/>
      <stop offset="0.44" stop-color="#72ecff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bodyMetal" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#effcff" stop-opacity="0.9"/>
      <stop offset="0.42" stop-color="#496067" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#10171b" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="carbon" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#b8f8ff" stop-opacity="0.65"/>
      <stop offset="0.28" stop-color="#26343a" stop-opacity="0.98"/>
      <stop offset="1" stop-color="#05080a" stop-opacity="1"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="shadow" x="-35%" y="-35%" width="170%" height="170%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.72"/>
    </filter>
  </defs>
  <ellipse cx="256" cy="292" rx="174" ry="82" fill="#000000" opacity="0.38" filter="url(#blur)"/>
  <g filter="url(#shadow)">
    <g opacity="0.9">
      <circle cx="122" cy="122" r="82" fill="url(#rotorGlow)"/>
      <circle cx="390" cy="122" r="82" fill="url(#rotorGlow)"/>
      <circle cx="122" cy="380" r="82" fill="url(#rotorGlow)"/>
      <circle cx="390" cy="380" r="82" fill="url(#rotorGlow)"/>
      <circle cx="122" cy="122" r="53" fill="none" stroke="#d5fbff" stroke-opacity="0.22" stroke-width="8"/>
      <circle cx="390" cy="122" r="53" fill="none" stroke="#d5fbff" stroke-opacity="0.22" stroke-width="8"/>
      <circle cx="122" cy="380" r="53" fill="none" stroke="#d5fbff" stroke-opacity="0.22" stroke-width="8"/>
      <circle cx="390" cy="380" r="53" fill="none" stroke="#d5fbff" stroke-opacity="0.22" stroke-width="8"/>
      <path d="M84 122 C108 104 138 104 160 122 C135 139 108 139 84 122Z" fill="#e7fbff" opacity="0.48"/>
      <path d="M352 122 C376 104 406 104 428 122 C403 139 376 139 352 122Z" fill="#e7fbff" opacity="0.48"/>
      <path d="M84 380 C108 362 138 362 160 380 C135 397 108 397 84 380Z" fill="#e7fbff" opacity="0.36"/>
      <path d="M352 380 C376 362 406 362 428 380 C403 397 376 397 352 380Z" fill="#e7fbff" opacity="0.36"/>
    </g>
    <path d="M165 158 L229 222 M347 158 L283 222 M164 348 L229 290 M348 348 L283 290" fill="none" stroke="url(#carbon)" stroke-width="22" stroke-linecap="round"/>
    <path d="M191 252 C191 198 219 166 256 166 C293 166 321 198 321 252 C321 306 292 346 256 346 C220 346 191 306 191 252Z" fill="url(#bodyMetal)" stroke="#d8fbff" stroke-opacity="0.28" stroke-width="3"/>
    <path d="M220 224 C226 200 240 188 256 188 C272 188 286 200 292 224 C281 216 270 212 256 212 C242 212 231 216 220 224Z" fill="#d8fbff" opacity="0.18"/>
    <rect x="228" y="258" width="56" height="70" rx="18" fill="#070b0e" stroke="#d8fbff" stroke-opacity="0.24" stroke-width="3"/>
    <circle cx="256" cy="293" r="21" fill="#020406" stroke="#a8f4ff" stroke-opacity="0.42" stroke-width="4"/>
    <circle cx="250" cy="286" r="6" fill="#d8fbff" opacity="0.72"/>
    <circle cx="206" cy="248" r="6" fill="#86f5ff" opacity="0.85"/>
    <circle cx="306" cy="248" r="6" fill="#ffd49a" opacity="0.8"/>
    <path d="M232 346 H280" stroke="#d8fbff" stroke-opacity="0.26" stroke-width="7" stroke-linecap="round"/>
  </g>
</svg>`;

const premiumDroneSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="720" viewBox="0 0 1120 720">
  <defs>
    <linearGradient id="stealthBody" x1="0.08" x2="0.92" y1="0.02" y2="0.98">
      <stop offset="0" stop-color="#f2fbfb"/>
      <stop offset="0.12" stop-color="#9fb0b3"/>
      <stop offset="0.34" stop-color="#39464b"/>
      <stop offset="0.62" stop-color="#131b20"/>
      <stop offset="0.86" stop-color="#05080b"/>
      <stop offset="1" stop-color="#000204"/>
    </linearGradient>
    <linearGradient id="lowerBody" x1="0.1" x2="0.9" y1="0" y2="1">
      <stop offset="0" stop-color="#53656a" stop-opacity="0.9"/>
      <stop offset="0.42" stop-color="#172227" stop-opacity="1"/>
      <stop offset="1" stop-color="#020406" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="carbonArm" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#d5f5fb" stop-opacity="0.42"/>
      <stop offset="0.2" stop-color="#465a60"/>
      <stop offset="0.58" stop-color="#0b1115"/>
      <stop offset="1" stop-color="#020305"/>
    </linearGradient>
    <linearGradient id="armRim" x1="0" x2="1">
      <stop offset="0" stop-color="#e4fbff" stop-opacity="0"/>
      <stop offset="0.52" stop-color="#e4fbff" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#e4fbff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="rotorDisc" cx="50%" cy="50%" r="52%">
      <stop offset="0" stop-color="#f4fdff" stop-opacity="0.18"/>
      <stop offset="0.32" stop-color="#83ecff" stop-opacity="0.1"/>
      <stop offset="0.68" stop-color="#111d22" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="blade" x1="0" x2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.2" stop-color="#dffbff" stop-opacity="0.34"/>
      <stop offset="0.52" stop-color="#82eaff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="lensGlass" cx="42%" cy="34%" r="64%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.16" stop-color="#9af6ff"/>
      <stop offset="0.42" stop-color="#1f6f82"/>
      <stop offset="0.7" stop-color="#06171d"/>
      <stop offset="1" stop-color="#000102"/>
    </radialGradient>
    <linearGradient id="cameraHousing" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#314349"/>
      <stop offset="0.42" stop-color="#0b1217"/>
      <stop offset="1" stop-color="#010204"/>
    </linearGradient>
    <filter id="renderShadow" x="-30%" y="-40%" width="160%" height="180%">
      <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#000000" flood-opacity="0.78"/>
      <feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="#63e8ff" flood-opacity="0.1"/>
    </filter>
    <filter id="rotorBlur" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="fineGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
    <filter id="microTexture" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="19"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.16"/>
      </feComponentTransfer>
    </filter>
  </defs>

  <ellipse cx="564" cy="500" rx="382" ry="86" fill="#000000" opacity="0.36" filter="url(#fineGlow)"/>

  <g filter="url(#renderShadow)">
    <g opacity="0.96">
      <ellipse cx="216" cy="202" rx="142" ry="54" fill="url(#rotorDisc)" filter="url(#rotorBlur)"/>
      <ellipse cx="888" cy="188" rx="150" ry="56" fill="url(#rotorDisc)" filter="url(#rotorBlur)"/>
      <ellipse cx="260" cy="476" rx="168" ry="68" fill="url(#rotorDisc)" filter="url(#rotorBlur)"/>
      <ellipse cx="866" cy="458" rx="174" ry="70" fill="url(#rotorDisc)" filter="url(#rotorBlur)"/>

      <g fill="none" stroke-linecap="round">
        <ellipse cx="216" cy="202" rx="114" ry="38" stroke="#e6fbff" stroke-opacity="0.24" stroke-width="8"/>
        <ellipse cx="888" cy="188" rx="120" ry="39" stroke="#e6fbff" stroke-opacity="0.22" stroke-width="8"/>
        <ellipse cx="260" cy="476" rx="134" ry="46" stroke="#e6fbff" stroke-opacity="0.22" stroke-width="9"/>
        <ellipse cx="866" cy="458" rx="140" ry="47" stroke="#e6fbff" stroke-opacity="0.2" stroke-width="9"/>
      </g>

      <g fill="url(#blade)" opacity="0.26">
        <path d="M82 202 C154 172 278 172 352 202 C280 232 154 232 82 202Z"/>
        <path d="M742 188 C818 156 958 156 1034 188 C956 221 818 221 742 188Z"/>
        <path d="M106 476 C194 438 326 438 414 476 C326 514 194 514 106 476Z"/>
        <path d="M702 458 C794 418 938 418 1030 458 C938 498 794 498 702 458Z"/>
      </g>

      <g fill="#020507" stroke="#d7faff" stroke-opacity="0.18" stroke-width="5">
        <circle cx="216" cy="202" r="31"/>
        <circle cx="888" cy="188" r="32"/>
        <circle cx="260" cy="476" r="36"/>
        <circle cx="866" cy="458" r="37"/>
      </g>
      <g fill="#e8fbff" opacity="0.2">
        <circle cx="206" cy="192" r="6"/>
        <circle cx="878" cy="177" r="6"/>
        <circle cx="248" cy="464" r="7"/>
        <circle cx="854" cy="446" r="7"/>
      </g>
    </g>

    <g fill="none" stroke="url(#carbonArm)" stroke-linecap="round" stroke-width="34">
      <path d="M252 222 C344 258 425 292 506 324"/>
      <path d="M850 208 C754 250 678 286 596 328"/>
      <path d="M300 456 C390 416 452 386 526 350"/>
      <path d="M824 440 C738 402 674 374 596 346"/>
    </g>
    <g fill="none" stroke="url(#armRim)" stroke-linecap="round" stroke-width="5" opacity="0.72">
      <path d="M286 234 C366 264 434 294 506 322"/>
      <path d="M814 220 C736 252 674 284 602 324"/>
      <path d="M336 444 C408 412 464 386 532 352"/>
      <path d="M786 430 C718 398 662 374 602 350"/>
    </g>

    <path d="M384 330 C386 242 456 184 566 178 C694 170 790 234 788 336 C786 432 690 496 556 494 C448 492 382 426 384 330Z" fill="url(#stealthBody)" stroke="#dffbff" stroke-opacity="0.22" stroke-width="6"/>
    <path d="M414 340 C472 298 606 270 760 306 C750 388 668 452 556 452 C468 452 416 410 414 340Z" fill="url(#lowerBody)" opacity="0.9"/>
    <path d="M438 252 C480 218 596 204 672 229 C614 222 514 224 438 252Z" fill="#f7fdff" opacity="0.18"/>
    <path d="M426 306 C500 280 646 276 748 316" fill="none" stroke="#e5fbff" stroke-opacity="0.12" stroke-width="10" stroke-linecap="round"/>
    <path d="M404 366 C476 412 642 424 766 368" fill="none" stroke="#000000" stroke-opacity="0.32" stroke-width="22" stroke-linecap="round"/>
    <rect x="412" y="294" width="306" height="148" rx="72" fill="#020507" opacity="0.2" filter="url(#microTexture)"/>

    <g transform="translate(484 306)">
      <rect x="0" y="0" width="170" height="128" rx="48" fill="url(#cameraHousing)" stroke="#d7faff" stroke-opacity="0.24" stroke-width="5"/>
      <rect x="18" y="14" width="134" height="100" rx="38" fill="#050a0e" stroke="#90ecff" stroke-opacity="0.18" stroke-width="4"/>
      <circle cx="85" cy="64" r="42" fill="#000102" stroke="#b6f7ff" stroke-opacity="0.44" stroke-width="7"/>
      <circle cx="85" cy="64" r="29" fill="url(#lensGlass)"/>
      <circle cx="73" cy="50" r="9" fill="#f3feff" opacity="0.9"/>
      <circle cx="100" cy="78" r="14" fill="#02080b" opacity="0.82"/>
      <path d="M38 106 C72 119 112 119 138 106" fill="none" stroke="#d8fbff" stroke-opacity="0.18" stroke-width="5" stroke-linecap="round"/>
    </g>

    <g fill="none" stroke-linecap="round">
      <path d="M436 494 C476 530 654 532 710 494" stroke="#d8fbff" stroke-opacity="0.2" stroke-width="10"/>
      <path d="M476 522 H670" stroke="#d8fbff" stroke-opacity="0.18" stroke-width="8"/>
      <path d="M424 486 L390 552 M724 486 L770 548" stroke="#1d2a30" stroke-width="14"/>
      <path d="M392 552 H482 M770 548 H678" stroke="#d8fbff" stroke-opacity="0.12" stroke-width="7"/>
    </g>

    <g>
      <path d="M398 332 C456 286 658 274 780 326" fill="none" stroke="#f7fdff" stroke-opacity="0.14" stroke-width="12" stroke-linecap="round"/>
      <path d="M424 396 C498 430 644 438 746 398" fill="none" stroke="#7de7ff" stroke-opacity="0.12" stroke-width="8" stroke-linecap="round"/>
      <path d="M404 372 C476 420 666 430 780 374" fill="none" stroke="#000000" stroke-opacity="0.34" stroke-width="16" stroke-linecap="round"/>
      <rect x="448" y="250" width="238" height="34" rx="17" fill="#000000" opacity="0.16"/>
      <rect x="470" y="256" width="58" height="7" rx="3.5" fill="#e6fbff" opacity="0.16"/>
      <rect x="596" y="254" width="62" height="7" rx="3.5" fill="#e6fbff" opacity="0.12"/>
      <circle cx="462" cy="322" r="8" fill="#63f2ff" opacity="0.95"/>
      <circle cx="710" cy="304" r="8" fill="#ffd19a" opacity="0.86"/>
      <circle cx="580" cy="198" r="5" fill="#edfaff" opacity="0.58"/>
      <path d="M516 204 C552 192 626 190 674 206" fill="none" stroke="#e7fbff" stroke-opacity="0.2" stroke-width="4" stroke-linecap="round"/>
      <path d="M396 374 C438 456 690 468 784 374" fill="none" stroke="#7de7ff" stroke-opacity="0.1" stroke-width="5"/>
    </g>
  </g>
</svg>`;

const heroSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="nightSky" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#010204"/>
      <stop offset="0.26" stop-color="#08151d"/>
      <stop offset="0.58" stop-color="#020607"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="stormMoon" cx="50%" cy="13%" r="48%">
      <stop offset="0" stop-color="#9df3ff" stop-opacity="0.36"/>
      <stop offset="0.2" stop-color="#3b8e9b" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="porchBloom" cx="43%" cy="56%" r="45%">
      <stop offset="0" stop-color="#ffd29a" stop-opacity="0.58"/>
      <stop offset="0.2" stop-color="#d48f4f" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="yardBloom" cx="58%" cy="70%" r="62%">
      <stop offset="0" stop-color="#b5fff0" stop-opacity="0.23"/>
      <stop offset="0.37" stop-color="#3b7d73" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="driveReflect" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f2d6a3" stop-opacity="0.05"/>
      <stop offset="0.44" stop-color="#7cecff" stop-opacity="0.17"/>
      <stop offset="0.76" stop-color="#effcff" stop-opacity="0.09"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="droneBeam" x1="0" x2="0.35" y1="0" y2="1">
      <stop offset="0" stop-color="#c7fbff" stop-opacity="0.38"/>
      <stop offset="0.28" stop-color="#63dce4" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glassWarm" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ffdba5" stop-opacity="0.48"/>
      <stop offset="1" stop-color="#5c3013" stop-opacity="0.22"/>
    </linearGradient>
    <linearGradient id="glassCool" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#b5fbff" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#0b2b34" stop-opacity="0.18"/>
    </linearGradient>
    <filter id="softBlur" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <filter id="farBlur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
    <filter id="filmGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.84" numOctaves="4" seed="23"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.16"/>
      </feComponentTransfer>
    </filter>
    <mask id="beamMask">
      <rect width="${width}" height="${height}" fill="black"/>
      <ellipse cx="1128" cy="736" rx="520" ry="380" fill="white" filter="url(#softBlur)"/>
    </mask>
    <radialGradient id="vignette" cx="50%" cy="48%" r="70%">
      <stop offset="45%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#nightSky)"/>
  <rect width="${width}" height="${height}" fill="url(#stormMoon)" opacity="0.88"/>
  <rect y="470" width="${width}" height="610" fill="url(#yardBloom)" opacity="0.95"/>

  <g opacity="0.62" filter="url(#farBlur)">
    ${bokeh
      .map(
        ([cx, cy, r, fill, opacity]) =>
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>`,
      )
      .join("")}
  </g>

  <g filter="url(#softBlur)" opacity="0.78">
    <path d="M0 460 C178 382 310 432 480 382 C654 330 805 398 978 360 C1168 319 1327 398 1487 364 C1654 328 1792 367 1920 320 L1920 733 L0 733 Z" fill="#020506"/>
    <path d="M-60 640 C260 560 418 665 624 590 C878 498 1072 642 1322 556 C1588 464 1742 556 1994 510 L1994 1080 L-60 1080 Z" fill="#000000" opacity="0.72"/>
  </g>

  <path d="M0 820 C260 690 500 770 780 682 C1010 610 1220 560 1454 575 C1634 586 1790 654 1920 730 L1920 1080 L0 1080 Z" fill="url(#driveReflect)" opacity="0.88"/>
  <path d="M-30 922 C280 775 596 822 880 744 C1190 659 1440 604 1920 744 L1920 1080 L-30 1080 Z" fill="#020304" opacity="0.52"/>
  <path d="M0 946 C270 830 592 875 890 796 C1208 711 1462 676 1920 815" fill="none" stroke="rgba(207,242,248,0.1)" stroke-width="34" stroke-linecap="round" filter="url(#softBlur)"/>

  <g transform="translate(386 272)" opacity="0.99">
    <path d="M15 376 H890 V680 H15 Z" fill="#030607" opacity="0.94"/>
    <path d="M-10 380 L292 118 L584 380 Z" fill="#050809"/>
    <path d="M420 378 L635 184 L912 378 Z" fill="#06090b"/>
    <path d="M-4 379 L295 119 L594 379" fill="none" stroke="rgba(236,249,246,0.22)" stroke-width="5" stroke-linecap="round"/>
    <path d="M418 379 L637 185 L920 379" fill="none" stroke="rgba(236,249,246,0.18)" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 414 H858" stroke="rgba(235,249,246,0.12)" stroke-width="3"/>
    <rect x="92" y="438" width="126" height="92" rx="10" fill="url(#glassWarm)" stroke="rgba(255,229,177,0.25)" stroke-width="2"/>
    <rect x="265" y="416" width="132" height="110" rx="10" fill="url(#glassCool)" stroke="rgba(194,249,255,0.2)" stroke-width="2"/>
    <rect x="466" y="438" width="112" height="88" rx="10" fill="url(#glassWarm)" stroke="rgba(255,229,177,0.2)" stroke-width="2"/>
    <rect x="642" y="466" width="146" height="214" rx="15" fill="#010304" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>
    <rect x="668" y="496" width="91" height="140" rx="12" fill="rgba(8,16,18,0.9)" stroke="rgba(212,250,255,0.14)" stroke-width="2"/>
    <circle cx="744" cy="566" r="6" fill="#ffdba0" opacity="0.9"/>
    <rect x="82" y="562" width="502" height="22" rx="11" fill="rgba(255,255,255,0.05)"/>
    <rect x="74" y="589" width="516" height="18" rx="9" fill="rgba(255,255,255,0.035)"/>
    <rect x="88" y="442" width="134" height="92" rx="12" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="7"/>
    <rect x="260" y="411" width="142" height="120" rx="12" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="7"/>
    <rect x="461" y="434" width="122" height="96" rx="12" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="7"/>
  </g>

  <ellipse cx="750" cy="608" rx="390" ry="250" fill="url(#porchBloom)" filter="url(#softBlur)" opacity="0.58"/>

  <g mask="url(#beamMask)" opacity="0.98">
    <path d="M1408 118 L1704 1074 L718 972 Z" fill="url(#droneBeam)"/>
    <ellipse cx="1120" cy="806" rx="410" ry="132" fill="#8cf4ea" opacity="0.13" filter="url(#softBlur)"/>
  </g>

  <g opacity="0.52">
    <path d="M312 908 C476 846 690 848 852 900" fill="none" stroke="rgba(124,231,255,0.16)" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 18"/>
    <path d="M1106 700 C1248 642 1432 650 1578 720" fill="none" stroke="rgba(255,210,128,0.14)" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 18"/>
    <circle cx="420" cy="890" r="58" fill="rgba(124,231,255,0.05)" stroke="rgba(124,231,255,0.18)" stroke-width="3"/>
    <circle cx="1418" cy="708" r="72" fill="rgba(255,210,128,0.05)" stroke="rgba(255,210,128,0.16)" stroke-width="3"/>
    <path d="M132 732 H278 M132 732 V854 M1714 602 H1842 M1842 602 V720" stroke="rgba(220,250,255,0.16)" stroke-width="3" stroke-linecap="round"/>
  </g>

  <g opacity="0.64">
    <path d="M1176 430 h72 q18 0 18 18 v20 q0 18 -18 18 h-72 q-18 0 -18 -18 v-20 q0 -18 18 -18Z" fill="#05090c" stroke="rgba(220,250,255,0.22)" stroke-width="3"/>
    <path d="M1158 458 h-42" stroke="rgba(220,250,255,0.18)" stroke-width="8" stroke-linecap="round"/>
    <circle cx="1228" cy="458" r="15" fill="#020406" stroke="rgba(124,231,255,0.26)" stroke-width="4"/>
    <path d="M1608 344 h74 q16 0 16 16 v18 q0 16 -16 16 h-74 q-16 0 -16 -16 v-18 q0 -16 16 -16Z" fill="#05090c" stroke="rgba(255,210,128,0.2)" stroke-width="3"/>
    <path d="M1696 370 h44" stroke="rgba(255,210,128,0.18)" stroke-width="8" stroke-linecap="round"/>
    <circle cx="1625" cy="369" r="14" fill="#020406" stroke="rgba(255,210,128,0.24)" stroke-width="4"/>
  </g>

  <g opacity="0.42">${foregroundLeaves}</g>
  <g opacity="0.82">${grass}</g>
  <g opacity="0.28">${rain}</g>
  <rect width="${width}" height="${height}" filter="url(#filmGrain)" opacity="0.58"/>
  <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.2)"/>
  <rect width="${width}" height="${height}" fill="rgba(0,0,0,0)" stroke="rgba(219,249,255,0.1)" stroke-width="2"/>
  <g opacity="0.18">
    <path d="M64 74 H210 M64 74 V222 M1856 74 H1710 M1856 74 V222 M64 1006 H210 M64 1006 V858 M1856 1006 H1710 M1856 1006 V858" stroke="#e7fbff" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;

await fs.mkdir(imageDir, { recursive: true });
const heroBuffer = (await fileExists(photorealHomeSourcePath))
  ? await sharp(photorealHomeSourcePath)
      .resize(width, height, { fit: "cover", position: "center" })
      .modulate({ brightness: 0.96, saturation: 0.94 })
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
              <defs>
                <linearGradient id="leftShade" x1="0" x2="1">
                  <stop offset="0" stop-color="#000000" stop-opacity="0.5"/>
                  <stop offset="0.52" stop-color="#000000" stop-opacity="0.1"/>
                  <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>
                </linearGradient>
                <linearGradient id="bottomShade" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#000000" stop-opacity="0"/>
                  <stop offset="0.64" stop-color="#000000" stop-opacity="0.16"/>
                  <stop offset="1" stop-color="#000000" stop-opacity="0.72"/>
                </linearGradient>
                <radialGradient id="coolWatch" cx="36%" cy="49%" r="56%">
                  <stop offset="0" stop-color="#74eaff" stop-opacity="0.14"/>
                  <stop offset="0.4" stop-color="#164e57" stop-opacity="0.08"/>
                  <stop offset="1" stop-color="#000000" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="vignette" cx="50%" cy="48%" r="72%">
                  <stop offset="42%" stop-color="#000000" stop-opacity="0"/>
                  <stop offset="100%" stop-color="#000000" stop-opacity="0.68"/>
                </radialGradient>
              </defs>
              <rect width="${width}" height="${height}" fill="url(#leftShade)"/>
              <rect width="${width}" height="${height}" fill="url(#coolWatch)"/>
              <rect width="${width}" height="${height}" fill="url(#bottomShade)"/>
              <rect width="${width}" height="${height}" fill="url(#vignette)"/>
              <rect width="${width}" height="${height}" fill="rgba(0,0,0,0)" stroke="rgba(219,249,255,0.08)" stroke-width="2"/>
            </svg>`,
          ),
          blend: "over",
        },
      ])
      .webp({ quality: 94, smartSubsample: true })
      .toBuffer()
  : await sharp(Buffer.from(heroSvg))
      .webp({ quality: 94, smartSubsample: true })
      .toBuffer();
await fs.writeFile(heroPath, heroBuffer);
await fs.writeFile(fallbackHeroPath, heroBuffer);
if (await fileExists(photorealDroneSourcePath)) {
  await sharp(photorealDroneSourcePath)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .extend({
      top: 28,
      bottom: 28,
      left: 28,
      right: 28,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(980, null, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 94, alphaQuality: 94, smartSubsample: true })
    .toFile(dronePath);
} else {
  await sharp(Buffer.from(premiumDroneSvg))
    .webp({ quality: 96, smartSubsample: true })
    .toFile(dronePath);
}

console.log(`Wrote ${heroPath}`);
console.log(`Wrote ${fallbackHeroPath}`);
console.log(`Wrote ${dronePath}`);
