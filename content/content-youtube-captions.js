// AI Translator YouTube Caption Translation
(function() {
  'use strict';

  const ctx = window.AI_TRANSLATOR_CONTENT;
  if (!ctx) return;

  const PREFETCH_MS = 120000;
  const PREFETCH_INTERVAL_MS = 1000;
  const BATCH_SIZE = 12;
  const DELIMITER = '<<<>>>';

  const state = {
    active: false,
    overlay: null,
    cues: [],
    cueCache: new Map(),
    pendingKeys: new Set(),
    track: null,
    trackId: '',
    skipTranslation: false,
    captionsPoll: null,
    video: null,
    lastNowMs: 0,
    trackRequestInFlight: false,
  };

  function isYouTube() {
    return window.location.hostname.includes('youtube.com');
  }

  function isCaptionsEnabled() {
    const button = document.querySelector('.ytp-subtitles-button');
    if (button) {
      return button.getAttribute('aria-pressed') === 'true';
    }
    return !!document.querySelector('.ytp-caption-window-container');
  }

  function getVideoElement() {
    return document.querySelector('video');
  }

  function resetState() {
    state.cues = [];
    state.cueCache.clear();
    state.pendingKeys.clear();
    state.track = null;
    state.trackId = '';
    state.skipTranslation = false;
    state.lastNowMs = 0;
    state.trackRequestInFlight = false;
    if (state.captionsPoll) {
      clearInterval(state.captionsPoll);
      state.captionsPoll = null;
    }
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
    if (state.video) {
      state.video.removeEventListener('timeupdate', handleTimeUpdate);
      state.video = null;
    }
  }

  function cleanup() {
    state.active = false;
    resetState();
  }

  function ensureOverlay() {
    const container = document.querySelector('.ytp-caption-window-container');
    if (!container) return null;

    if (state.overlay && container.contains(state.overlay)) {
      return state.overlay;
    }

    const overlay = document.createElement('div');
    overlay.id = 'ai-translator-youtube-caption-overlay';
    const line = document.createElement('div');
    line.className = 'ai-translator-caption-line';
    overlay.appendChild(line);
    container.appendChild(overlay);
    state.overlay = overlay;
    return overlay;
  }

  function setOverlayText(text) {
    if (!state.overlay) return;
    const line = state.overlay.querySelector('.ai-translator-caption-line');
    if (!line) return;
    line.textContent = text || '';
  }

  function setOverlayVisible(visible) {
    if (!state.overlay) return;
    state.overlay.style.display = visible ? 'flex' : 'none';
  }

  async function requestCaptionTracks() {
    if (state.track) return;
    if (state.trackRequestInFlight) return;
    state.trackRequestInFlight = true;
    try {
      const inlineTracks = getTracksFromInlineScripts();
      if (inlineTracks && inlineTracks.length) {
        handleTracks(inlineTracks);
        return;
      }
      const fetchedTracks = await fetchTracksFromWatchPage();
      if (fetchedTracks && fetchedTracks.length) {
        handleTracks(fetchedTracks);
      }
    } finally {
      state.trackRequestInFlight = false;
    }
  }

  function getTrackLanguage(track) {
    const lang = track?.languageCode || '';
    return ctx.getLangBase ? ctx.getLangBase(lang) : lang.split('-')[0];
  }

  function getTargetLanguageBase() {
    const target = ctx.getEffectiveTargetLang ? ctx.getEffectiveTargetLang() : '';
    return ctx.getLangBase ? ctx.getLangBase(target) : target.split('-')[0];
  }

  function selectTrack(tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    return tracks[0];
  }

  function extractArrayLiteral(source, anchorIndex) {
    const bracketStart = source.indexOf('[', anchorIndex);
    if (bracketStart === -1) return null;
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;
    for (let i = bracketStart; i < source.length; i += 1) {
      const char = source[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\\\') {
        isEscaped = true;
        continue;
      }
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (inSingleQuote || inDoubleQuote) continue;
      if (char === '[') {
        depth += 1;
      } else if (char === ']') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(bracketStart, i + 1);
        }
      }
    }
    return null;
  }

  function extractJsonObject(source, anchorIndex) {
    const braceStart = source.indexOf('{', anchorIndex);
    if (braceStart === -1) return null;
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;
    for (let i = braceStart; i < source.length; i += 1) {
      const char = source[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\\\') {
        isEscaped = true;
        continue;
      }
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (inSingleQuote || inDoubleQuote) continue;
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(braceStart, i + 1);
        }
      }
    }
    return null;
  }

  function splitTopLevelObjects(source) {
    const items = [];
    let start = null;
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\\\') {
        isEscaped = true;
        continue;
      }
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (inSingleQuote || inDoubleQuote) continue;
      if (char === '{') {
        if (depth === 0) start = i;
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start !== null) {
          items.push(source.slice(start, i + 1));
          start = null;
        }
      }
    }
    return items;
  }

  function decodeTrackValue(value) {
    if (!value) return value;
    return value
      .replace(/\\u0026/g, '&')
      .replace(/\\u003d/g, '=')
      .replace(/\\u003f/g, '?')
      .replace(/\\u002f/g, '/');
  }

  function extractTracksFromResponse(data) {
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    if (!Array.isArray(tracks) || !tracks.length) return null;
    return tracks;
  }

  function parseTracksFromScriptText(text) {
    const responseIndex = text.indexOf('ytInitialPlayerResponse');
    if (responseIndex !== -1) {
      const json = extractJsonObject(text, responseIndex);
      if (json) {
        try {
          const data = JSON.parse(json);
          const tracks = extractTracksFromResponse(data);
          if (tracks) return tracks;
        } catch (error) {
          // Fall back to lightweight parsing.
        }
      }
    }

    // Parse captionTracks without eval to avoid CSP restrictions.
    const anchorIndex = text.indexOf('captionTracks');
    if (anchorIndex === -1) return null;
    const arrayLiteral = extractArrayLiteral(text, anchorIndex);
    if (!arrayLiteral) return null;
    const objects = splitTopLevelObjects(arrayLiteral.slice(1, -1));
    const tracks = [];
    for (const objText of objects) {
      const langMatch = objText.match(/languageCode\s*:\s*['"]([^'"]+)['"]/);
      const baseUrlMatch = objText.match(/baseUrl\s*:\s*['"]([^'"]+)['"]/);
      if (!langMatch || !baseUrlMatch) continue;
      tracks.push({
        languageCode: langMatch[1],
        baseUrl: decodeTrackValue(baseUrlMatch[1]),
      });
    }
    return tracks.length ? tracks : null;
  }

  function getTracksFromInlineScripts() {
    const scripts = Array.from(document.scripts || []);
    for (const script of scripts) {
      const text = script.textContent || '';
      const tracks = parseTracksFromScriptText(text);
      if (tracks) return tracks;
    }
    return null;
  }

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('v') || '';
  }

  async function fetchTracksFromWatchPage() {
    const videoId = getVideoId();
    if (!videoId) return null;
    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      if (!response.ok) return null;
      const html = await response.text();
      return parseTracksFromScriptText(html);
    } catch (error) {
      return null;
    }
  }

  async function fetchTimedText(track) {
    if (!track?.baseUrl) return [];
    try {
      const url = new URL(track.baseUrl);
      if (!url.searchParams.get('fmt')) {
        url.searchParams.set('fmt', 'json3');
      }
      const response = await fetch(url.toString());
      if (!response.ok) return [];
      const data = await response.json();
      return parseTimedText(data);
    } catch (error) {
      console.warn('AI Translator: Failed to fetch timedtext', error);
      return [];
    }
  }

  function parseTimedText(data) {
    const events = Array.isArray(data?.events) ? data.events : [];
    const cues = [];
    for (const event of events) {
      const startMs = Number(event.tStartMs);
      const durationMs = Number(event.dDurationMs);
      if (!Number.isFinite(startMs) || !Number.isFinite(durationMs) || durationMs <= 0) continue;
      const text = (event.segs || [])
        .map((seg) => seg.utf8 || '')
        .join('')
        .trim();
      if (!text) continue;
      cues.push({
        startMs,
        endMs: startMs + durationMs,
        text,
      });
    }
    return cues;
  }

  function getCueKey(cue) {
    return `${state.trackId}|${cue.startMs}|${cue.text}`;
  }

  function getCuesInWindow(nowMs) {
    const windowEnd = nowMs + PREFETCH_MS;
    return state.cues.filter((cue) => cue.startMs <= windowEnd && cue.endMs >= nowMs);
  }

  function getActiveCue(nowMs) {
    return state.cues.find((cue) => nowMs >= cue.startMs && nowMs <= cue.endMs);
  }

  async function translateCues(cues) {
    if (state.skipTranslation) return;
    if (!cues.length) return;

    const texts = cues.map((cue) => cue.text);
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE_BATCH_FAST',
      texts,
      targetLang: ctx.getEffectiveTargetLang ? ctx.getEffectiveTargetLang() : '',
      delimiter: DELIMITER,
    });

    if (!response || response.error || !Array.isArray(response.translations)) {
      return;
    }

    response.translations.forEach((translation, index) => {
      const cue = cues[index];
      if (!cue) return;
      const key = getCueKey(cue);
      state.cueCache.set(key, translation || cue.text);
      state.pendingKeys.delete(key);
    });

    renderActiveCue(state.lastNowMs);
  }

  async function scheduleTranslations(nowMs) {
    if (state.skipTranslation) return;
    const upcoming = getCuesInWindow(nowMs);
    const queue = [];

    for (const cue of upcoming) {
      const key = getCueKey(cue);
      if (state.cueCache.has(key) || state.pendingKeys.has(key)) continue;
      state.pendingKeys.add(key);
      queue.push(cue);
    }

    if (!queue.length) return;

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      await translateCues(batch);
    }
  }

  function renderActiveCue(nowMs) {
    if (!state.overlay) return;
    const cue = getActiveCue(nowMs);
    if (!cue) {
      setOverlayText('');
      return;
    }
    const key = getCueKey(cue);
    const translation = state.cueCache.get(key);
    setOverlayText(translation || '');
  }

  async function handleTimeUpdate() {
    if (!state.active) return;
    if (!state.cues.length) return;

    if (!isCaptionsEnabled()) {
      setOverlayVisible(false);
      return;
    }

    ensureOverlay();
    setOverlayVisible(true);

    const nowMs = Math.floor((state.video?.currentTime || 0) * 1000);
    state.lastNowMs = nowMs;
    renderActiveCue(nowMs);
    await scheduleTranslations(nowMs);
  }

  async function startTimedTextFlow(track) {
    state.track = track;
    state.trackId = track?.baseUrl || track?.languageCode || 'track';
    const cues = await fetchTimedText(track);
    state.cues = cues;

    state.video = getVideoElement();
    if (state.video) {
      state.video.addEventListener('timeupdate', handleTimeUpdate);
      handleTimeUpdate();
    }
  }

  function ensureCaptionsReady(track) {
    if (!isCaptionsEnabled()) {
      if (!state.captionsPoll) {
        state.captionsPoll = setInterval(() => {
          if (isCaptionsEnabled()) {
            clearInterval(state.captionsPoll);
            state.captionsPoll = null;
            ensureOverlay();
            startTimedTextFlow(track);
          }
        }, PREFETCH_INTERVAL_MS);
      }
      return;
    }

    ensureOverlay();
    startTimedTextFlow(track);
  }

  function handleTracks(tracks) {
    if (state.track) return;
    const track = selectTrack(tracks);
    if (!track) return;

    state.track = track;
    const trackLang = getTrackLanguage(track);
    const targetLang = getTargetLanguageBase();

    if (trackLang && targetLang && trackLang === targetLang) {
      state.skipTranslation = true;
      return;
    }

    ensureCaptionsReady(track);
  }

  function start() {
    if (state.active) return;
    state.active = true;
    resetState();
    requestCaptionTracks();
  }

  function handleYouTubeNavigation() {
    if (!state.active) return;
    resetState();
    requestCaptionTracks();
  }

  ctx.setupYouTubeCaptionTranslation = function() {
    if (!isYouTube()) return;
    if (!ctx.settings?.enableYoutubeCaptionTranslation) return;
    start();
    window.addEventListener('yt-navigate-finish', handleYouTubeNavigation);
  };

  ctx.stopYouTubeCaptionTranslation = function() {
    window.removeEventListener('yt-navigate-finish', handleYouTubeNavigation);
    cleanup();
  };
})();
