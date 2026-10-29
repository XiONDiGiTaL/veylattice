/**
 * Veylattice soundtrack — central manifest + audio manager.
 *
 * This module is the ONLY place that knows about soundtrack files. Screens
 * never construct audio elements or hardcode paths; they call
 * `playBackground(role)` / `playStinger(role, matchKey)` on the manager.
 *
 * ---------------------------------------------------------------------------
 * ASSET STATUS (2026-10-29, verified — do not overclaim):
 * At session start the repo contained NO music files. During the session
 * commit f51cec5 ("music") landed on origin/main supplying exactly the six
 * tracks below; this manifest now names them. Filenames, formats and
 * durations were verified with ffprobe + a full ffmpeg decode (all clean);
 * the musical character of each track was NOT auditioned, so role mapping
 * rests on the filenames plus the duration signature (both stingers land
 * at ~10-12 s, all four backgrounds run 2+ minutes), which matches the
 * directive's role descriptions exactly. Do NOT rename, regenerate, or
 * re-point these files: if a track is ever replaced, re-verify format and
 * duration and update this manifest in the same change.
 *
 * Verified 2026-10-29 (MP3, 48 kHz stereo, browser-compatible):
 * - menu:         "Veylattice_ Main Menu.mp3"  174.0 s, 4,004,186 bytes
 * - battle:       "Veylattice_ Battle.mp3"     153.6 s, 3,735,339 bytes
 * - preparations: "Veylattice_ Planning.mp3"   137.6 s, 3,397,241 bytes
 * - shop:         "Veylattice_ Shop.mp3"       172.0 s, 4,276,127 bytes
 * - victory:      "Veylattice_ Victory.mp3"     12.4 s,   318,839 bytes
 * - defeat:       "Veylattice_ Defeat.mp3"      11.0 s,   275,583 bytes
 * Backgrounds loop; stingers never loop. There is no draw cue: draws play
 * neither sting (see playStinger callers). A manifest entry with
 * `file: null` means "nothing to play" (no element, no download, no crash,
 * status "unavailable") — that path is still fully supported if a track is
 * ever removed.
 *
 * NOTE on the directive's premise: it describes the Deck Builder and Shop
 * as "planned, not currently functional". That was true of an older tree.
 * In this tree (2026-10-29) both screens ARE functional (Deck Builder and
 * Shop views with real validation, persistence and purchases), so their
 * themes are wired to real screens, not placeholders.
 *
 * URL safety: tracks resolve against the page's base URL
 * (`music/<file>` under the document base), so they work at the repo root,
 * under a local `/veylattice/` subpath server, and at
 * https://xiondigital.net/veylattice/ alike. Never use a root-relative
 * `/music/...` path — it would break the GitHub Pages subpath deployment.
 */

/** Canonical soundtrack manifest. `file` is a basename under `music/`, or null. */
export const SOUNDTRACK = Object.freeze({
  menu: Object.freeze({
    role: "menu",
    label: "Main menu theme",
    description: "Legendary fantasy RPG theme, piano and harp led.",
    file: "Veylattice_ Main Menu.mp3",
    status: "supplied",
    loop: true,
    kind: "background",
  }),
  battle: Object.freeze({
    role: "battle",
    label: "Battle theme",
    description: "Dramatic, energetic combat music with escalating tension.",
    file: "Veylattice_ Battle.mp3",
    status: "supplied",
    loop: true,
    kind: "background",
  }),
  preparations: Object.freeze({
    role: "preparations",
    label: "Preparations theme",
    description: "Thoughtful, measured Deck Builder music.",
    file: "Veylattice_ Planning.mp3",
    status: "supplied",
    loop: true,
    kind: "background",
  }),
  shop: Object.freeze({
    role: "shop",
    label: "Shop theme",
    description: "Relaxed, warm, slightly rhythmic shop music.",
    file: "Veylattice_ Shop.mp3",
    status: "supplied",
    loop: true,
    kind: "background",
  }),
  victory: Object.freeze({
    role: "victory",
    label: "Victory fanfare",
    description: "Short triumphant fanfare, ~10 s.",
    file: "Veylattice_ Victory.mp3",
    status: "supplied",
    loop: false,
    kind: "stinger",
  }),
  defeat: Object.freeze({
    role: "defeat",
    label: "Defeat sting",
    description: "Short melancholic piano-and-harp sting, ~10 s.",
    file: "Veylattice_ Defeat.mp3",
    status: "supplied",
    loop: false,
    kind: "stinger",
  }),
});

/** Roles that are background music (looped) vs one-shot stingers. */
export const BACKGROUND_ROLES = Object.freeze(["menu", "battle", "preparations", "shop"]);
export const STINGER_ROLES = Object.freeze(["victory", "defeat"]);

/**
 * Pure mapping from app view state to the background role that should play.
 * Returns null when no background music should be (re)started — notably the
 * result screen (battle view with a finished match), where the result policy
 * is silence until the user returns to the menu.
 */
export function viewMusicRole(view, { matchOver = false } = {}) {
  if (view === "decks") return "preparations";
  if (view === "shop") return "shop";
  if (view === "battle") return matchOver ? null : "battle";
  return "menu";
}

/** Resolve a manifest basename to a URL that survives the Pages subpath. */
export function resolveTrackUrl(baseUrl, file) {
  if (!file) return null;
  const base = baseUrl || "";
  if (!base) return `music/${file}`;
  // Treat the base as a directory: without the trailing slash, URL resolution
  // would treat the last segment (e.g. "veylattice") as a file and drop it.
  // ...but a document URL such as ".../veylattice/index.html" (or one with a
  // query/hash) names a file: resolve against it normally, exactly as the
  // browser resolves "./src/..." for the rest of the page. Forcing a slash
  // there produced ".../index.html/music/..." (404) — found 2026-10-29 in a
  // real-browser pass loading /veylattice/index.html.
  let dirBase = base;
  try {
    const parsed = new URL(base);
    const lastSegment = parsed.pathname.split("/").pop();
    const namesFile = lastSegment.includes(".") || parsed.search !== "" || parsed.hash !== "";
    if (!namesFile && !parsed.pathname.endsWith("/")) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    dirBase = parsed.href;
  } catch {
    dirBase = base.endsWith("/") ? base : `${base}/`;
  }
  try {
    return new URL(`music/${file}`, dirBase).href;
  } catch {
    return `${dirBase}music/${file}`;
  }
}

function clamp01(value, fallback) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

/** Default audio preferences (also the shape stored in profile.settings.audio). */
export function defaultAudioSettings() {
  return { master: 1, music: 0.8, sfx: 0.8, muted: false };
}

export function sanitizeAudioSettings(raw) {
  const base = defaultAudioSettings();
  if (!raw || typeof raw !== "object") return base;
  return {
    master: clamp01(raw.master, base.master),
    music: clamp01(raw.music, base.music),
    sfx: clamp01(raw.sfx, base.sfx),
    muted: raw.muted === true,
  };
}

/**
 * Create the central audio manager.
 *
 * Options (all optional, all injectable for tests):
 * - createAudio: () => audio-like element ({ play, pause, volume, loop, src,
 *   addEventListener, removeEventListener }). Defaults to `new Audio()`.
 * - baseUrl: base for track URLs. Defaults to the document base URL.
 * - fadeMs: crossfade duration for background switches (0 = instant; tests).
 * - onStatus: (status) => void, called whenever the reported status changes.
 *   Status values: "idle" | "playing" | "paused" | "muted" | "blocked" |
 *   "unavailable" | "error". "blocked" means the browser refused playback
 *   (autoplay policy) — the pending track retries on unlock().
 * - manifest: override of SOUNDTRACK (tests supply fake files).
 *
 * Guarantees: at most ONE background element and at most ONE stinger element
 * ever exist; switching background roles reuses the background element (no
 * duplicate instances, no overlapping copies of the same track); a
 * background role already playing is never restarted; a stinger plays at
 * most once per matchKey; missing files and rejected play() calls never
 * throw and never crash the caller.
 */
export function createAudioManager(options = {}) {
  const manifest = options.manifest ?? SOUNDTRACK;
  const baseUrl =
    options.baseUrl ?? (typeof document !== "undefined" ? document.baseURI : "");
  const fadeMs = options.fadeMs ?? 250;
  const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
  const createAudio =
    options.createAudio ??
    (() => {
      if (typeof Audio === "undefined") return null;
      return new Audio();
    });

  let settings = sanitizeAudioSettings(options.settings);
  let background = null; // audio element, reused across background roles
  let stinger = null;
  let currentRole = null; // background role currently loaded (or null)
  let currentStatus = "idle";
  let unlocked = false;
  let userPaused = false;
  let wasPlayingBeforeHide = false;
  let pendingRole = null; // background role waiting on unlock/unmute
  let stingerKey = null; // matchKey that already heard its stinger
  let backgroundStarted = false; // true once play() has resolved for this role
  let fadeTimer = null;
  let backgroundListeners = [];
  let stingerListeners = [];

  function setStatus(status) {
    if (status !== currentStatus) {
      currentStatus = status;
      onStatus(status);
    }
  }

  function effectiveMusicVolume() {
    return settings.muted ? 0 : settings.master * settings.music;
  }

  function clearFade() {
    if (fadeTimer !== null) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function detach(listeners, element) {
    for (const [type, handler] of listeners) {
      try {
        element.removeEventListener(type, handler);
      } catch {
        /* element may be a minimal fake */
      }
    }
    listeners.length = 0;
  }

  function attachBackgroundError(element) {
    const onError = () => {
      currentRole = null;
      setStatus("error");
    };
    element.addEventListener("error", onError);
    backgroundListeners.push(["error", onError]);
  }

  function ensureBackground() {
    if (background) return background;
    const element = createAudio();
    if (!element) return null;
    background = element;
    attachBackgroundError(background);
    return background;
  }

  function stopElement(element) {
    if (!element) return;
    try {
      element.pause();
    } catch {
      /* ignore */
    }
    try {
      element.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  /** Start (or resume) the background element for `role`; caller checked file. */
  function startBackground(role, entry) {
    const element = ensureBackground();
    if (!element) {
      setStatus("unavailable");
      return "unavailable";
    }
    const url = resolveTrackUrl(baseUrl, entry.file);
    clearFade();
    if (currentRole === role && element.src === url && !element.ended) {
      // Same track already loaded: never restart it on re-render/navigation.
      element.volume = effectiveMusicVolume();
      if (!userPaused && settings.muted === false) {
        const attempt = tryPlay(element);
        return attempt;
      }
      return currentStatus;
    }
    silenceStinger();
    element.loop = entry.loop !== false;
    element.volume = effectiveMusicVolume();
    if (element.src !== url) {
      element.src = url;
      backgroundStarted = false;
    }
    currentRole = role;
    pendingRole = null;
    if (settings.muted) {
      setStatus("muted");
      return "muted";
    }
    if (userPaused) {
      setStatus("paused");
      return "paused";
    }
    return tryPlay(element);
  }

  function tryPlay(element) {
    let result;
    try {
      result = element.play();
    } catch {
      setStatus("error");
      return "error";
    }
    // Optimistic: a play() attempt counts as started until a rejection proves
    // otherwise. This keeps the no-restart guard synchronous across rapid
    // re-renders; the rejection handler below corrects it.
    backgroundStarted = true;
    if (result && typeof result.catch === "function") {
      result.then(
        () => {
          backgroundStarted = true;
        },
        (error) => {
          const name = error?.name;
          if (name === "AbortError") {
            // play() interrupted by a newer src/pause (rapid navigation): a
            // newer attempt owns the element now; do not flag it blocked.
            return;
          }
          backgroundStarted = false;
          if (name === "NotSupportedError" || element.error) {
            // The file itself failed (404, decode, unsupported). Retrying on
            // the next gesture cannot help; report the error honestly
            // instead of claiming the browser blocked playback.
            pendingRole = null;
            setStatus("error");
            return;
          }
          // Autoplay blocked (or another transient refusal): keep the pending
          // role so the next genuine gesture retries it; never show "playing".
          pendingRole = currentRole;
          setStatus("blocked");
        },
      );
      // Optimistically report playing; a rejection corrects it above.
      setStatus("playing");
      return "playing";
    }
    setStatus("playing");
    return "playing";
  }

  /** Stinger playback: never touches the background role/started flags. */
  function playStingerElement(element) {
    let result;
    try {
      result = element.play();
    } catch {
      setStatus("error");
      return "error";
    }
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        if (error?.name === "AbortError") return;
        setStatus(error?.name === "NotSupportedError" || element.error ? "error" : "blocked");
      });
    }
    setStatus("playing");
    return "playing";
  }

  /** A background track is about to start: end any result stinger first so
   *  two cues never overlap (seen 2026-10-29: Defeat over the menu theme). */
  function silenceStinger() {
    if (stinger && !stinger.paused && !stinger.ended) stopElement(stinger);
  }

  function fadeOutThen(action) {
    const element = background;
    if (!element || fadeMs <= 0) {
      action();
      return;
    }
    clearFade();
    const startVolume = element.volume || 0;
    if (startVolume <= 0) {
      action();
      return;
    }
    const steps = 10;
    let step = 0;
    fadeTimer = setInterval(() => {
      step += 1;
      try {
        element.volume = Math.max(0, startVolume * (1 - step / steps));
      } catch {
        /* ignore */
      }
      if (step >= steps) {
        clearFade();
        action();
      }
    }, Math.max(1, Math.floor(fadeMs / steps)));
  }

  const manager = {
    get status() {
      return currentStatus;
    },
    get currentRole() {
      return currentRole;
    },
    get pendingRole() {
      return pendingRole;
    },
    get settings() {
      return { ...settings };
    },

    /** Apply (partial) settings; persists via the caller's own save path. */
    applySettings(patch) {
      settings = sanitizeAudioSettings({ ...settings, ...(patch ?? {}) });
      if (background) {
        try {
          background.volume = effectiveMusicVolume();
        } catch {
          /* ignore */
        }
      }
      if (settings.muted) {
        if (background && currentRole) {
          try {
            background.pause();
          } catch {
            /* ignore */
          }
        }
        pendingRole = pendingRole ?? currentRole;
        setStatus("muted");
      } else if (pendingRole) {
        const role = pendingRole;
        pendingRole = null;
        userPaused = false;
        this.playBackground(role);
      }
      return { ...settings };
    },

    /** Play background music for a role; no-op if it is already playing. */
    playBackground(role) {
      const entry = manifest[role];
      if (!entry || entry.kind !== "background") return "ignored";
      if (!entry.file) {
        currentRole = null;
        setStatus("unavailable");
        return "unavailable";
      }
      if (settings.muted) {
        pendingRole = role;
        setStatus("muted");
        return "muted";
      }
      if (userPaused) {
        pendingRole = role;
        setStatus("paused");
        return "paused";
      }
      if (currentRole === role && background && !background.ended && backgroundStarted) {
        // Re-render / re-navigation must never restart the track.
        return currentStatus;
      }
      if (currentRole === role && background && !background.ended && !backgroundStarted) {
        // Never actually started (e.g. autoplay rejection): retry on the
        // same element instead of fading or reporting success.
        return startBackground(role, entry);
      }
      if (currentRole && background) {
        // Fade the old track out, then start the new one on the same element.
        const next = role;
        fadeOutThen(() => startBackground(next, entry));
        return currentStatus;
      }
      return startBackground(role, entry);
    },

    /** Stop background music (fade when configured). Does not touch stingers. */
    stopBackground() {
      clearFade();
      pendingRole = null;
      if (background) stopElement(background);
      currentRole = null;
      backgroundStarted = false;
      if (currentStatus === "playing" || currentStatus === "blocked") setStatus("idle");
      return "idle";
    },

    pause() {
      userPaused = true;
      if (background) {
        try {
          background.pause();
        } catch {
          /* ignore */
        }
      }
      setStatus("paused");
    },

    resume() {
      userPaused = false;
      if (pendingRole) {
        const role = pendingRole;
        pendingRole = null;
        return this.playBackground(role);
      }
      if (currentRole && background) return tryPlay(background);
      return currentStatus;
    },

    /**
     * Play a result stinger at most once per matchKey. Draws never call this.
     * Battle music should already be stopped by the caller before the sting.
     */
    playStinger(role, matchKey) {
      const entry = manifest[role];
      if (!entry || entry.kind !== "stinger") return "ignored";
      if (matchKey !== undefined && matchKey !== null && stingerKey === matchKey) {
        return "already-played";
      }
      if (matchKey !== undefined && matchKey !== null) stingerKey = matchKey;
      if (!entry.file) {
        setStatus("unavailable");
        return "unavailable";
      }
      if (settings.muted) {
        setStatus("muted");
        return "muted";
      }
      if (!stinger) {
        stinger = createAudio();
        if (!stinger) {
          setStatus("unavailable");
          return "unavailable";
        }
        const onEnded = () => setStatus("idle");
        const onError = () => setStatus("error");
        stinger.addEventListener("ended", onEnded);
        stinger.addEventListener("error", onError);
        stingerListeners.push(["ended", onEnded], ["error", onError]);
      } else {
        stopElement(stinger);
      }
      stinger.loop = false;
      try {
        stinger.volume = settings.master * settings.music;
      } catch {
        /* ignore */
      }
      stinger.src = resolveTrackUrl(baseUrl, entry.file);
      return playStingerElement(stinger);
    },

    /** A genuine user gesture: retry any playback the browser blocked. */
    unlock() {
      unlocked = true;
      if (pendingRole && !settings.muted && !userPaused) {
        const role = pendingRole;
        pendingRole = null;
        return this.playBackground(role);
      }
      return currentStatus;
    },
    get unlocked() {
      return unlocked;
    },

    /** Tab hidden: pause background, remembering to resume on return. */
    handleHidden() {
      wasPlayingBeforeHide = currentStatus === "playing";
      if (background && wasPlayingBeforeHide) {
        try {
          background.pause();
        } catch {
          /* ignore */
        }
      }
    },

    /** Tab visible again: resume only if it was playing and user never paused. */
    handleVisible() {
      if (wasPlayingBeforeHide && !userPaused && !settings.muted && currentRole) {
        wasPlayingBeforeHide = false;
        if (background) tryPlay(background);
      } else {
        wasPlayingBeforeHide = false;
      }
    },

    /** Release timers, listeners and elements. Call once on teardown. */
    dispose() {
      clearFade();
      if (background) {
        detach(backgroundListeners, background);
        stopElement(background);
      }
      if (stinger) {
        detach(stingerListeners, stinger);
        stopElement(stinger);
      }
      background = null;
      stinger = null;
      currentRole = null;
      backgroundStarted = false;
      pendingRole = null;
      setStatus("idle");
    },
  };
  return manager;
}
