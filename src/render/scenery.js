/**
 * Card scenery.
 *
 * The printed illustration behind each figure. Every Vessel is staged in a place
 * that belongs to its element — a fortress gatehouse for Metal, a rootbound
 * grove for Wood, a drowned temple for Water, a furnace hall for Fire, a canyon
 * gate for Earth — rather than on a shared studio plinth.
 *
 * Value structure is deliberate and identical across elements, because that is
 * what makes a set look designed rather than assembled:
 *
 *   bright sky → dark side masses → a lit opening in the middle →
 *   fog at the ground line → floor → near-black framing in front
 *
 * The figure is drawn by `illustration.js` between the floor and the framing, so
 * it always stands inside the light rather than on top of a picture.
 *
 * Everything is seeded per card id: two Metal cards share a design language but
 * not a composition. Nothing here decides game state.
 */

const W = 400;
const H = 310;
/** Ground line: where the floor plane starts and figures stand. */
const FLOOR = 200;

/* ------------------------------------------------------------------ *
 * Palette
 * ------------------------------------------------------------------ */

/**
 * Each environment is a full material set, not one hue: a deep base, a mid
 * silhouette tone, a stone tone, a lit edge and a glow. Cards read as belonging
 * to an element through materials and architecture as well as colour.
 */
export const SCENERY = Object.freeze({
  wood: {
    sky: ["#0a1c12", "#38703a"], glow: "#b4ff86", deep: "#050f08", mid: "#122a17",
    stone: "#35402a", stoneLit: "#677a4c", ground: "#102014", dust: "#c6ffa8",
    accent: "#7fe06a", weather: "pollen",
  },
  fire: {
    sky: ["#1b0705", "#7a2a14"], glow: "#ff9a4c", deep: "#0e0404", mid: "#38160f",
    stone: "#46251c", stoneLit: "#7d4530", ground: "#180b09", dust: "#ffb066",
    accent: "#ff6a2a", weather: "embers",
  },
  earth: {
    sky: ["#2a1d0d", "#8a5c2c"], glow: "#ffdca0", deep: "#130d06", mid: "#332414",
    stone: "#5c4a30", stoneLit: "#9a7d52", ground: "#221809", dust: "#f0dcb0",
    accent: "#d8b274", weather: "dust",
  },
  metal: {
    sky: ["#0a1019", "#3a5a76"], glow: "#a8f4ff", deep: "#04090f", mid: "#17262f",
    stone: "#46586a", stoneLit: "#8ba3bb", ground: "#0d1620", dust: "#d2ecff",
    accent: "#8ad8f0", weather: "dust",
  },
  water: {
    sky: ["#061722", "#2a7593"], glow: "#8ff0ff", deep: "#030d15", mid: "#0f3040",
    stone: "#3a5c6c", stoneLit: "#7ea9bb", ground: "#0a2030", dust: "#bdf1ff",
    accent: "#5fd0f0", weather: "rain",
  },
});

const FALLBACK = SCENERY.metal;

export function sceneryFor(element) {
  return SCENERY[element] ?? FALLBACK;
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const n = (value) => Number(value).toFixed(1);

function poly(points, fill, extra = "") {
  return `<polygon points="${points.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" fill="${fill}"${extra}/>`;
}

function rect(x, y, w, h, fill, extra = "") {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"${extra}/>`;
}

function withOpacity(hex, opacity) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(opacity).toFixed(2)})`;
}

function shadeDark(hex, factor) {
  const value = hex.replace("#", "");
  const parts = [0, 2, 4].map((i) => Math.round(Number.parseInt(value.slice(i, i + 2), 16) * factor));
  return `#${parts.map((p) => Math.max(0, Math.min(255, p)).toString(16).padStart(2, "0")).join("")}`;
}

/* ------------------------------------------------------------------ *
 * Floor
 * ------------------------------------------------------------------ */

/**
 * A receding floor: courses that tighten towards the horizon, joints that fan
 * out from the centre, and the inlaid focus ring the miniature stands inside.
 */
function stoneFloor(env, random) {
  const out = [rect(0, FLOOR, W, H - FLOOR, "url(#ground-fill)")];
  for (let i = 0; i < 5; i += 1) {
    const t = (i + 1) / 6;
    const y = FLOOR + (H - FLOOR) * t * t;
    out.push(rect(0, y, W, 0.8, withOpacity(env.stoneLit, 0.14 + t * 0.18)));
  }
  for (let i = -4; i <= 4; i += 1) {
    out.push(
      `<path d="M${n(200 + i * 24)} ${FLOOR} L${n(200 + i * 150)} ${H}" stroke="${withOpacity(env.stoneLit, 0.11)}" stroke-width="1.2" fill="none"/>`,
    );
  }
  const major = 148;
  out.push(
    `<ellipse cx="200" cy="${FLOOR + 34}" rx="${major}" ry="${n(major * 0.23)}" fill="none" stroke="${withOpacity(env.glow, 0.34)}" stroke-width="2.2"/>`,
    `<ellipse cx="200" cy="${FLOOR + 34}" rx="${n(major * 0.72)}" ry="${n(major * 0.72 * 0.23)}" fill="none" stroke="${withOpacity(env.glow, 0.18)}" stroke-width="1.2"/>`,
  );
  const spin = random() * Math.PI * 2;
  for (let i = 0; i < 8; i += 1) {
    const a = spin + (i / 8) * Math.PI * 2;
    out.push(
      rect(
        200 + Math.cos(a) * major * 0.94 - 2,
        FLOOR + 34 + Math.sin(a) * major * 0.94 * 0.23 - 2,
        4,
        4,
        withOpacity(env.glow, 0.55),
      ),
    );
  }
  return out.join("");
}

/** Water: a mirrored glow under the figure, ripples, and a dark shore. */
function waterFloor(env, random) {
  const out = [rect(0, FLOOR, W, H - FLOOR, "url(#ground-fill)")];
  out.push(
    `<ellipse cx="200" cy="${FLOOR + 30}" rx="118" ry="22" fill="${withOpacity(env.glow, 0.18)}"/>`,
    `<ellipse cx="200" cy="${FLOOR + 30}" rx="152" ry="28" fill="none" stroke="${withOpacity(env.glow, 0.28)}" stroke-width="1.6"/>`,
  );
  for (let i = 0; i < 8; i += 1) {
    const y = FLOOR + 14 + i * 11 + random() * 4;
    const w = 44 + random() * 90;
    const x = 200 + (random() - 0.5) * 130 - w / 2;
    out.push(
      `<path d="M${n(x)} ${n(y)} q ${n(w / 2)} ${n(-1.6 - random() * 1.8)} ${n(w)} 0" stroke="${withOpacity(env.glow, 0.16 + random() * 0.14)}" stroke-width="1.2" fill="none"/>`,
    );
  }
  return out.join("");
}

/* ------------------------------------------------------------------ *
 * Distant silhouettes
 * ------------------------------------------------------------------ */

/** Crenellated keeps, three ranks deep, back ranks darker. */
function keeps(env, random) {
  const out = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const tone = layer === 0 ? env.mid : layer === 1 ? shadeDark(env.mid, 0.82) : env.deep;
    const count = 3 + layer;
    for (let i = 0; i < count; i += 1) {
      const w = 26 + random() * 34;
      const h = 40 + random() * (76 - layer * 12);
      const x = -24 + (i * (W + 48)) / count + random() * 16;
      const y = FLOOR - h;
      out.push(rect(x, y, w, h + 40, tone));
      for (let m = 0; m < 3; m += 1) out.push(rect(x + m * (w / 2.2), y - 8, w / 6, 9, tone));
      if (random() < 0.5) out.push(rect(x + w / 2 - 2, y - 22, 4, 16, tone));
    }
  }
  return out.join("");
}

/** Rounded canopy silhouettes: a grove seen from the ground. */
function canopy(env, random) {
  const out = [];
  for (let layer = 2; layer >= 0; layer -= 1) {
    const tone = layer === 2 ? shadeDark(env.mid, 0.75) : layer === 1 ? shadeDark(env.mid, 0.55) : env.deep;
    const trunks = 2 + layer;
    for (let i = 0; i < trunks; i += 1) {
      const x = -14 + (i * (W + 28)) / trunks + random() * 18;
      const h = 70 + random() * (86 - layer * 14);
      const w = 7 + random() * 7;
      out.push(rect(x, FLOOR - h, w, h + 40, tone));
      for (let b = 0; b < 2; b += 1) {
        out.push(
          `<ellipse cx="${n(x + w / 2 + (random() - 0.5) * 46)}" cy="${n(FLOOR - h + 14 + b * 16)}" rx="${n(12 + random() * 13)}" ry="${n(6 + random() * 6)}" fill="${tone}"/>`,
        );
      }
    }
  }
  return out.join("");
}

/** Layered mesas and hoodoos. */
function mesas(env, random) {
  const out = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const tone = layer === 0 ? env.mid : layer === 1 ? shadeDark(env.mid, 0.8) : env.deep;
    const count = 2 + layer;
    for (let i = 0; i < count; i += 1) {
      const w = 80 + random() * 90;
      const h = 26 + random() * (40 - layer * 8);
      const x = -30 + (i * (W + 60)) / count + random() * 26;
      const y = FLOOR - h;
      out.push(
        poly(
          [
            [x, FLOOR + 40], [x + w * 0.1, y + 10], [x + w * 0.28, y],
            [x + w * 0.72, y + 3], [x + w * 0.9, y + 14], [x + w, FLOOR + 40],
          ],
          tone,
        ),
      );
    }
  }
  out.push(rect(296, FLOOR - 84, 22, 84, env.deep), rect(290, FLOOR - 87, 34, 5, env.deep));
  return out.join("");
}

/** Broken towers half-sunk in the sea. */
function drownedTowers(env, random) {
  const out = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const tone = layer === 0 ? env.mid : layer === 1 ? shadeDark(env.mid, 0.8) : env.deep;
    const count = 2 + layer;
    for (let i = 0; i < count; i += 1) {
      const w = 20 + random() * 26;
      const h = 40 + random() * (74 - layer * 12);
      const x = -20 + (i * (W + 40)) / count + random() * 22;
      const top = FLOOR - h;
      out.push(rect(x, top, w, h + 40, tone));
      out.push(poly([[x, top], [x + w * 0.5, top - 12 - random() * 10], [x + w, top]], tone));
      if (random() < 0.6) out.push(rect(x + w * 0.38, top + 12, w * 0.24, 9, withOpacity(env.deep, 0.85)));
    }
  }
  return out.join("");
}

/** Smokestacks and cable gantries over a burning horizon. */
function foundry(env, random) {
  const out = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const tone = layer === 0 ? env.mid : layer === 1 ? shadeDark(env.mid, 0.8) : env.deep;
    const count = 4 + layer;
    for (let i = 0; i < count; i += 1) {
      const w = 14 + random() * 22;
      const h = 36 + random() * (66 - layer * 14);
      const x = -20 + (i * (W + 40)) / count + random() * 14;
      out.push(rect(x, FLOOR - h, w, h + 40, tone), rect(x - 3, FLOOR - h - 6, w + 6, 6, tone));
      if (random() < 0.45) {
        out.push(
          `<path d="M${n(x + 6)} ${n(FLOOR - h - 6)} q -12 -22 2 -38" stroke="${withOpacity(env.accent, 0.2)}" stroke-width="7" fill="none"/>`,
        );
      }
    }
  }
  return out.join("");
}

/* ------------------------------------------------------------------ *
 * Mid-ground architecture
 * ------------------------------------------------------------------ */

/** A fortress gatehouse: side towers, a lit arch, a raised portcullis. */
function gatehouse(env, random) {
  const out = [];
  const archW = 150 + Math.round(random() * 18);
  const x = 200 - archW / 2;
  const spring = FLOOR - 48;

  // A wide soft halo: the lit courtyard beyond the gate.
  out.push(`<ellipse cx="200" cy="${FLOOR - 54}" rx="132" ry="92" fill="${withOpacity(env.glow, 0.16)}"/>`);

  // Towers, taller than the frame is deep, so the gate reads as fortification.
  for (const side of [-1, 1]) {
    const tw = 78 + random() * 12;
    const tx = side < 0 ? -16 : W - tw + 16;
    out.push(rect(tx, 10, tw, FLOOR - 10, env.mid));
    out.push(rect(tx, 10, tw, 3, withOpacity(env.stoneLit, 0.5)));
    for (let i = 0; i < 3; i += 1) out.push(rect(tx + i * (tw / 2.4), -6, tw / 5, 18, env.mid));
    for (let i = 0; i < 6; i += 1) out.push(rect(tx, 46 + i * 24, tw, 0.9, withOpacity(env.deep, 0.5)));
    out.push(rect(tx + tw / 2 - 3, 76, 6, 34, withOpacity(env.glow, 0.6)));
    out.push(
      poly(
        [
          [tx + tw / 2 - 20, 126], [tx + tw / 2 + 20, 126], [tx + tw / 2 + 20, 172],
          [tx + tw / 2, 188], [tx + tw / 2 - 20, 172],
        ],
        withOpacity(env.accent, 0.3),
      ),
      poly([[tx + tw / 2 - 8, 138], [tx + tw / 2 + 8, 154], [tx + tw / 2 - 8, 168]], withOpacity(env.glow, 0.45)),
    );
  }

  // Curtain wall between the towers, kept low so the sky shows above it.
  out.push(rect(62, 126, W - 124, FLOOR - 126, env.mid));
  for (let i = 0; i < 4; i += 1) out.push(rect(62, 140 + i * 15, W - 124, 0.9, withOpacity(env.deep, 0.5)));
  for (let i = 0; i < 9; i += 1) out.push(rect(64 + i * 31, 118, 16, 10, env.mid));

  // The arch: lit from inside, so the figure is silhouetted against light.
  const arch =
    `M${n(x)} ${n(FLOOR)} L${n(x)} ${n(spring)} A ${n(archW / 2)} ${n(50)} 0 0 1 ` +
    `${n(x + archW)} ${n(spring)} L${n(x + archW)} ${n(FLOOR)} Z`;
  out.push(
    `<path d="${arch}" fill="${env.deep}"/>`,
    `<ellipse cx="200" cy="${FLOOR - 34}" rx="${n(archW * 0.4)}" ry="56" fill="${withOpacity(env.glow, 0.34)}"/>`,
    `<path d="${arch}" fill="none" stroke="${withOpacity(env.stoneLit, 0.85)}" stroke-width="9"/>`,
    `<path d="${arch}" fill="none" stroke="${withOpacity(env.glow, 0.45)}" stroke-width="2"/>`,
  );
  for (let i = -3; i <= 3; i += 1) {
    const px = 200 + i * (archW / 8);
    out.push(
      `<path d="M${n(px)} ${n(spring - 48 + Math.abs(i) * 5)} L${n(200 + (px - 200) * 0.78)} ${n(spring - 46 + Math.abs(i) * 6)}" stroke="${withOpacity(env.deep, 0.6)}" stroke-width="1.6" fill="none"/>`,
    );
  }
  out.push(poly([[192, spring - 62], [208, spring - 62], [212, spring - 36], [188, spring - 36]], withOpacity(env.stoneLit, 0.9)));

  // Raised portcullis teeth.
  for (let i = 1; i < 6; i += 1) out.push(rect(x + (archW / 6) * i, spring - 40, 3, 28, withOpacity(env.stoneLit, 0.55)));
  out.push(rect(x + 8, spring - 42, archW - 16, 3, withOpacity(env.stoneLit, 0.5)));
  return out.join("");
}

/** Two colossal trunks and a dark canopy arching over a lit clearing. */
function groveArch(env, random) {
  const out = [];
  // Dark foliage mass along the top edge, open in the middle.
  out.push(`<path d="M-10 0 H410 V58 Q340 74 300 46 Q250 18 200 40 Q150 18 100 46 Q60 74 -10 58 Z" fill="${env.deep}"/>`);
  for (let i = 0; i < 7; i += 1) {
    out.push(
      `<ellipse cx="${n(-10 + i * 70 + random() * 20)}" cy="${n(10 + random() * 26)}" rx="${n(30 + random() * 22)}" ry="${n(20 + random() * 14)}" fill="${env.deep}"/>`,
    );
  }

  // Trunks at the edges, in near-black silhouette, with visible taper.
  for (const side of [-1, 1]) {
    const w = 66 + random() * 10;
    const trunkX = side < 0 ? -8 : W - w + 8;
    out.push(
      poly(
        [
          [trunkX, FLOOR + 20], [trunkX + 8, 130], [trunkX + 20, 40],
          [trunkX + w - 16, 24], [trunkX + w - 2, 110], [trunkX + w + 6, FLOOR + 20],
        ],
        env.mid,
      ),
    );
    for (let i = 0; i < 6; i += 1) {
      out.push(
        `<path d="M${n(trunkX + 10)} ${n(34 + i * 30)} q ${n(w / 2)} ${n(6 - random() * 10)} ${n(w - 16)} ${n(-2)}" stroke="${withOpacity(env.deep, 0.55)}" stroke-width="2.6" fill="none"/>`,
      );
    }
    for (let i = 0; i < 4; i += 1) {
      out.push(
        `<path d="M${n(trunkX + (w / 3.4) * i + (side < 0 ? 0 : 6))} ${n(FLOOR)} q ${n((random() - 0.5) * 26)} 22 ${n((random() - 0.5) * 46)} 36" stroke="${env.mid}" stroke-width="${n(6 + random() * 4)}" fill="none" stroke-linecap="round"/>`,
      );
    }
  }

  // The clearing: light spilling through the canopy.
  out.push(
    `<g filter="url(#soft)"><ellipse cx="200" cy="${FLOOR - 40}" rx="104" ry="84" fill="${withOpacity(env.glow, 0.2)}"/></g>`,
    `<g filter="url(#soft)">${poly([[176, 40], [232, 40], [286, FLOOR + 30], [110, FLOOR + 30]], withOpacity(env.glow, 0.09))}</g>`,
  );

  // Hanging vines from the canopy edge.
  for (let i = 0; i < 8; i += 1) {
    const px = 40 + random() * 320;
    out.push(
      `<path d="M${n(px)} 56 q ${n(-3 + random() * 6)} 16 ${n(-4 + random() * 8)} ${n(18 + random() * 30)}" stroke="${withOpacity(env.accent, 0.3)}" stroke-width="2.2" fill="none"/>`,
    );
  }

  // Lantern on a branch: the warm counter-light.
  out.push(
    `<path d="M286 74 L286 96" stroke="${withOpacity(env.stoneLit, 0.7)}" stroke-width="1.6"/>`,
    `<ellipse cx="286" cy="112" rx="40" ry="36" fill="${withOpacity(env.glow, 0.18)}"/>`,
    `<rect x="279" y="100" width="14" height="20" rx="3" fill="${withOpacity(env.glow, 0.75)}"/>`,
  );
  return out.join("");
}

/** A drowned temple front: tall columns, a broken pediment, rain. */
function drownedTemple(env, random) {
  const out = [];
  // Dark side walls frame the colonnade.
  out.push(rect(0, 70, 54, FLOOR - 70, env.deep), rect(W - 54, 70, 54, FLOOR - 70, env.deep));
  // The lit interior the figure stands against.
  out.push(`<ellipse cx="200" cy="${FLOOR - 46}" rx="112" ry="94" fill="${withOpacity(env.glow, 0.24)}"/>`);

  for (const cx of [86, 168, 232, 314]) {
    const h = 104 + random() * 14;
    out.push(
      rect(cx - 19, FLOOR - h, 38, h, env.stone),
      rect(cx - 26, FLOOR - h - 12, 52, 12, env.stoneLit),
      rect(cx - 26, FLOOR - 6, 52, 8, env.stoneLit),
      rect(cx - 1.5, FLOOR - h + 10, 3, h - 24, withOpacity(env.glow, 0.3)),
    );
    for (let i = -2; i <= 2; i += 1) out.push(rect(cx + i * 8, FLOOR - h, 1.6, h, withOpacity(env.deep, 0.4)));
  }
  // Broken pediment: one raking cornice surviving.
  out.push(
    poly([[44, 74], [200, 26], [286, 58], [286, 70], [200, 40], [56, 86]], env.stoneLit),
    rect(44, 70, 222, 10, env.stone),
    poly([[286, 58], [372, 66], [372, 78], [286, 70]], withOpacity(env.stone, 0.9)),
  );
  for (let i = 0; i < 16; i += 1) {
    out.push(`<path d="M${n(random() * W)} ${n(random() * 170)} l -2 10" stroke="${withOpacity(env.dust, 0.2)}" stroke-width="1.2"/>`);
  }
  return out.join("");
}

/** Obsidian furnace arch with molten seams and hanging chains. */
function furnaceGate(env, random) {
  const out = [];
  const x = 108;
  const w = 184;
  const spring = FLOOR - 52;
  // Side masses only: the middle stays open and burning.
  out.push(rect(0, 52, 96, FLOOR - 52, env.mid), rect(W - 96, 52, 96, FLOOR - 52, env.mid));
  out.push(`<ellipse cx="200" cy="${FLOOR - 40}" rx="118" ry="86" fill="${withOpacity(env.accent, 0.24)}"/>`);
  const arch =
    `M${x} ${FLOOR} L${x} ${spring} A ${w / 2} 56 0 0 1 ${x + w} ${spring} ` + `L${x + w} ${FLOOR} Z`;
  out.push(
    `<path d="${arch}" fill="${env.deep}"/>`,
    `<ellipse cx="200" cy="${FLOOR - 30}" rx="76" ry="64" fill="${withOpacity(env.accent, 0.3)}"/>`,
    `<path d="${arch}" fill="none" stroke="${withOpacity(env.accent, 0.7)}" stroke-width="5"/>`,
    `<path d="${arch}" fill="none" stroke="${withOpacity(env.stoneLit, 0.45)}" stroke-width="1.4"/>`,
  );
  out.push(rect(0, 52, W, 10, withOpacity(env.deep, 0.5)));
  // Molten cracks.
  for (let i = 0; i < 8; i += 1) {
    const sx = 8 + random() * (W - 16);
    const sy = 70 + random() * 96;
    out.push(
      `<path d="M${n(sx)} ${n(sy)} l ${n((random() - 0.5) * 18)} ${n(9 + random() * 14)} l ${n((random() - 0.5) * 16)} ${n(10)}" stroke="${withOpacity(env.accent, 0.6)}" stroke-width="${n(1.6 + random() * 1.6)}" fill="none"/>`,
    );
  }
  // Chimneys rising past the top edge.
  for (const cx of [16, 62, 322, 360]) {
    const h = 46 + random() * 30;
    out.push(rect(cx, 52 - h, 22, h + 8, env.deep), rect(cx - 4, 52 - h - 6, 30, 6, env.deep));
    out.push(
      `<path d="M${n(cx + 11)} ${n(52 - h - 6)} q ${n(-6 + random() * 12)} -22 ${n(6)} -40" stroke="${withOpacity(env.dust, 0.22)}" stroke-width="9" fill="none"/>`,
    );
  }
  for (const cx of [146, 254]) {
    out.push(`<path d="M${cx} 0 L${cx} ${54 + random() * 24}" stroke="${withOpacity(env.stoneLit, 0.7)}" stroke-width="3" stroke-dasharray="7 5"/>`);
  }
  return out.join("");
}

/** Squared monolith gate in a canyon, with a sun disc above the gate. */
function canyonGate(env, random) {
  const out = [];
  out.push(`<ellipse cx="200" cy="${FLOOR - 70}" rx="132" ry="96" fill="${withOpacity(env.glow, 0.22)}"/>`);
  out.push(
    `<circle cx="200" cy="82" r="46" fill="${withOpacity(env.glow, 0.28)}"/>`,
    `<circle cx="200" cy="82" r="24" fill="${withOpacity(env.glow, 0.5)}"/>`,
  );
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    out.push(
      `<path d="M${n(200 + Math.cos(a) * 32)} ${n(82 + Math.sin(a) * 32)} L${n(200 + Math.cos(a) * 46)} ${n(82 + Math.sin(a) * 46)}" stroke="${withOpacity(env.glow, 0.45)}" stroke-width="3"/>`,
    );
  }

  const w = 74;
  for (const side of [-1, 1]) {
    const px = side < 0 ? 18 : W - w - 18;
    out.push(rect(px, 56, w, FLOOR - 56, env.stone));
    for (let i = 0; i < 5; i += 1) {
      out.push(
        rect(px, 56 + i * 29, w, 29, withOpacity(i % 2 ? env.stoneLit : env.deep, 0.26)),
        rect(px, 56 + i * 29, w, 1.4, withOpacity(env.deep, 0.7)),
      );
    }
    out.push(rect(px - 8, 44, w + 16, 16, env.stoneLit));
    out.push(rect(px + 10, 104, w - 20, 4, withOpacity(env.accent, 0.55)));
  }
  // Lintel and one fallen block.
  out.push(rect(10, 18, 380, 22, env.stoneLit), rect(10, 18, 380, 3, withOpacity(env.dust, 0.4)));
  out.push(poly([[288, FLOOR], [340, FLOOR], [330, FLOOR - 24], [280, FLOOR - 22]], withOpacity(env.stone, 0.95)));
  for (let i = 0; i < 5; i += 1) {
    out.push(
      `<path d="M${n(random() * 60)} ${n(140 + random() * 40)} q 60 ${n(-5)} 120 ${n(1)}" stroke="${withOpacity(env.dust, 0.16)}" stroke-width="3" fill="none"/>`,
    );
  }
  return out.join("");
}

/* ------------------------------------------------------------------ *
 * Foreground framing
 * ------------------------------------------------------------------ */

/**
 * Near-black shapes in front of the figure's feet. Without this the figure
 * floats on the backdrop; with it, the scene has a front and a back.
 */
function framing(env, random, kind) {
  const out = [];
  const dark = env.deep;
  if (kind === "stone") {
    // Only the near lip of the floor: rubble along the bottom edge, not black
    // wedges over the illustration.
    for (let i = 0; i < 9; i += 1) {
      const x = -10 + i * 48 + random() * 20;
      const w = 34 + random() * 34;
      const y = H - 2 - random() * 9;
      out.push(poly([[x, H], [x + w * 0.22, y - 7], [x + w * 0.6, y - 3], [x + w, H]], withOpacity(dark, 0.9)));
    }
  } else if (kind === "roots") {
    for (let i = 0; i < 10; i += 1) {
      const x = random() * W;
      const h = 16 + random() * 40;
      out.push(
        `<path d="M${n(x)} ${H} q ${n((random() - 0.5) * 16)} ${n(-h / 2)} ${n((random() - 0.5) * 30)} ${n(-h)}" stroke="${withOpacity(dark, 0.95)}" stroke-width="${n(2.4 + random() * 3.4)}" fill="none" stroke-linecap="round"/>`,
      );
    }
    out.push(
      `<path d="M0 ${H} q 46 -22 58 -56" stroke="${withOpacity(dark, 0.92)}" stroke-width="11" fill="none"/>`,
      `<path d="M${W} ${H} q -46 -22 -58 -56" stroke="${withOpacity(dark, 0.92)}" stroke-width="11" fill="none"/>`,
    );
  } else if (kind === "water") {
    for (let i = 0; i < 4; i += 1) {
      const y = 236 + i * 18;
      out.push(
        `<path d="M0 ${n(y)} q 50 ${n(-6)} 100 0 t 100 0 t 100 0 t 100 0" stroke="${withOpacity(dark, 0.72 - i * 0.12)}" stroke-width="${n(5 + i * 2.5)}" fill="none"/>`,
      );
    }
    for (let i = 0; i < 7; i += 1) {
      out.push(
        `<path d="M${n(random() * W)} ${H} q ${n((random() - 0.5) * 8)} -20 ${n(2 + random() * 5)} -34" stroke="${withOpacity(dark, 0.88)}" stroke-width="2.2" fill="none"/>`,
      );
    }
  } else if (kind === "rock") {
    for (let i = 0; i < 4; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = W / 2 + side * (134 + random() * 54);
      const y = H - 40 - random() * 26;
      const w = 44 + random() * 46;
      out.push(poly([[x - w / 2, H], [x - w * 0.32, y - 22], [x, y], [x + w * 0.36, y - 16], [x + w / 2, H]], withOpacity(dark, 0.95)));
    }
  } else {
    for (let i = 0; i < 5; i += 1) {
      out.push(
        `<ellipse cx="${n(random() * W)}" cy="${n(252 + random() * 34)}" rx="${n(20 + random() * 28)}" ry="${n(6 + random() * 5)}" fill="${withOpacity(dark, 0.92)}"/>`,
      );
    }
  }
  return out.join("");
}

/* ------------------------------------------------------------------ *
 * Atmosphere
 * ------------------------------------------------------------------ */

function weather(env, random) {
  const out = [];
  const kind = env.weather;
  if (kind === "embers") {
    for (let i = 0; i < 18; i += 1) {
      const x = random() * W;
      const y = random() * H;
      out.push(
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.9 + random() * 1.9)}" fill="${withOpacity(env.dust, 0.32 + random() * 0.5)}"/>`,
        `<path d="M${n(x)} ${n(y)} l ${n((random() - 0.5) * 4)} ${n(5 + random() * 9)}" stroke="${withOpacity(env.accent, 0.28)}" stroke-width="1"/>`,
      );
    }
  } else if (kind === "pollen") {
    for (let i = 0; i < 16; i += 1) {
      out.push(
        `<circle cx="${n(random() * W)}" cy="${n(20 + random() * 240)}" r="${n(0.9 + random() * 1.8)}" fill="${withOpacity(env.dust, 0.32 + random() * 0.46)}"/>`,
      );
    }
    for (let i = 0; i < 4; i += 1) {
      out.push(`<path d="M${n(random() * W)} ${n(70 + random() * 140)} q 9 7 16 2" stroke="${withOpacity(env.accent, 0.42)}" stroke-width="2" fill="none"/>`);
    }
  } else if (kind === "rain") {
    for (let i = 0; i < 18; i += 1) {
      out.push(`<path d="M${n(random() * W)} ${n(random() * (H - 60))} l -3 16" stroke="${withOpacity(env.dust, 0.22)}" stroke-width="1"/>`);
    }
  } else {
    for (let i = 0; i < 16; i += 1) {
      out.push(
        `<circle cx="${n(random() * W)}" cy="${n(random() * H)}" r="${n(0.7 + random() * 1.5)}" fill="${withOpacity(env.dust, 0.24 + random() * 0.34)}"/>`,
      );
    }
  }
  return out.join("");
}

/** Fog at the ground line: separates the architecture from the floor. */
function fog(env) {
  return (
    `<rect x="0" y="${FLOOR - 30}" width="${W}" height="34" fill="url(#fog-fill)"/>` +
    `<rect x="0" y="${FLOOR + 2}" width="${W}" height="18" fill="${withOpacity(env.glow, 0.07)}"/>`
  );
}

/* ------------------------------------------------------------------ *
 * Composition
 * ------------------------------------------------------------------ */

const FRAMING = { metal: "stone", wood: "roots", water: "water", fire: "ash", earth: "rock" };

/**
 * Scene markup for one card.
 *
 * @param {object} card    canonical card definition
 * @param {object} random  seeded RNG (one stream per card id)
 * @param {object} env     palette from `sceneryFor`
 * @returns {{markup: string, horizon: number}}
 */
export function sceneMarkup(card, random, env) {
  const element = SCENERY[card.element] ? card.element : "metal";
  const parts = [
    rect(0, 0, W, H, "url(#sky-fill)"),
    // The light source: a wide glow low in the frame, behind everything.
    `<ellipse cx="200" cy="${FLOOR - 34}" rx="250" ry="110" fill="url(#horizon-glow)"/>`,
  ];

  if (element === "metal") {
    parts.push(keeps(env, random), gatehouse(env, random));
  } else if (element === "wood") {
    parts.push(canopy(env, random), groveArch(env, random));
  } else if (element === "water") {
    parts.push(drownedTowers(env, random), drownedTemple(env, random));
  } else if (element === "fire") {
    parts.push(foundry(env, random), furnaceGate(env, random));
  } else {
    parts.push(mesas(env, random), canyonGate(env, random));
  }

  parts.push(element === "water" ? waterFloor(env, random) : stoneFloor(env, random));
  parts.push(fog(env));

  // Spirits and otherworldly creatures get cold mist and floating shards, so
  // their subtype is visible in the art rather than only in the emblem.
  if (["spirit", "otherworldly", "mystic"].includes(card.subtype)) {
    for (let i = 0; i < 3; i += 1) {
      parts.push(rect(0, FLOOR - 80 + i * 22, W, 7 + i * 3, withOpacity(env.glow, 0.07)));
    }
    for (let i = 0; i < 5; i += 1) {
      const x = 60 + random() * 280;
      const y = 60 + random() * 110;
      const s = 4 + random() * 9;
      parts.push(poly([[x, y], [x + s, y + s * 0.6], [x, y + s * 1.4], [x - s, y + s * 0.6]], withOpacity(env.glow, 0.24)));
    }
  }

  parts.push(weather(env, random));
  return { markup: parts.join(""), horizon: FLOOR };
}

/** Foreground layer, drawn in front of the figure. */
export function foregroundMarkup(card, random, env) {
  return framing(env, random, FRAMING[card.element] ?? "stone");
}
