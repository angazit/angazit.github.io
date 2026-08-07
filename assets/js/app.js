// Hebrew Language Islands app: island grid -> per-island Listen & Repeat / Active Recall modes.
const STORAGE_KEY = "hebrewIslands.mastered";
const SETTINGS_KEY = "hebrewIslands.settings";

const DEFAULT_SETTINGS = {
  repetitions: 3,
  pauseBetweenRepeats: 1,
  pauseBetweenWords: 0.5,
  playbackSpeed: 1,
  textSize: 1, // index into TEXT_SIZE_SCALES
  wordOrder: "original", // "original" | "shuffled"
  showTransliteration: true,
  showEnglish: true,
  autoplayOnOpen: false,
  loopPlayback: true,
};

const TEXT_SIZE_SCALES = [0.85, 1, 1.15, 1.3];

const gridView = document.getElementById("grid-view");
const detailView = document.getElementById("detail-view");
const islandGridEl = document.getElementById("island-grid");
const backButton = document.getElementById("back-button");
const islandTitleEl = document.getElementById("island-title");
const modeListenBtn = document.getElementById("mode-listen");
const modeRecallBtn = document.getElementById("mode-recall");
const listenPanel = document.getElementById("listen-panel");
const recallPanel = document.getElementById("recall-panel");
const settingsButton = document.getElementById("settings-button");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsClose = document.getElementById("settings-close");
const settingsReset = document.getElementById("settings-reset");

let state = {
  islandId: null,
  mode: "listen",
  listenOrder: [],
  listenIndex: 0,
  recallQueue: [],
  recallIndex: 0,
};

let autoplayActive = false;
let autoplayTimer = null;

// --- Persistence ---

function loadMastered() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveMastered(mastered) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mastered));
}

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
  applyTextSize();
  return settings;
}

function applyTextSize() {
  const settings = loadSettings();
  document.documentElement.style.setProperty("--hebrew-scale", TEXT_SIZE_SCALES[settings.textSize]);
}

// --- Island helpers ---

function getIsland(id) {
  return ISLANDS.find((island) => island.id === id);
}

function islandProgress(island) {
  const mastered = loadMastered();
  const total = island.items.length;
  const done = island.items.filter((item) => mastered[item.id]).length;
  return { done, total };
}

function shuffledCopy(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildListenOrder(island) {
  const settings = loadSettings();
  return settings.wordOrder === "shuffled" ? shuffledCopy(island.items) : [...island.items];
}

// --- Grid view ---

function renderGrid() {
  islandGridEl.innerHTML = "";
  ISLANDS.forEach((island) => {
    const { done, total } = islandProgress(island);
    const pct = total ? Math.round((done / total) * 100) : 0;

    const card = document.createElement("button");
    card.className = "island-card";
    card.innerHTML = `
      <span class="island-emoji">${island.emoji}</span>
      <h3>${island.name}</h3>
      <p class="hebrew-name">${island.hebrewName}</p>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <p class="progress-label">${done} / ${total} mastered</p>
    `;
    card.addEventListener("click", () => openIsland(island.id));
    islandGridEl.appendChild(card);
  });
}

function openIsland(id) {
  state.islandId = id;
  gridView.classList.add("hidden");
  detailView.classList.remove("hidden");
  const island = getIsland(id);
  islandTitleEl.textContent = `${island.emoji} ${island.name} · ${island.hebrewName}`;
  setMode("listen");
}

function closeIsland() {
  stopAutoplaySequence();
  window.speechSynthesis && window.speechSynthesis.cancel();
  detailView.classList.add("hidden");
  gridView.classList.remove("hidden");
  renderGrid();
}

function setMode(mode) {
  stopAutoplaySequence();
  window.speechSynthesis && window.speechSynthesis.cancel();
  state.mode = mode;
  modeListenBtn.classList.toggle("active", mode === "listen");
  modeRecallBtn.classList.toggle("active", mode === "recall");
  listenPanel.classList.toggle("hidden", mode !== "listen");
  recallPanel.classList.toggle("hidden", mode !== "recall");

  if (mode === "listen") {
    const island = getIsland(state.islandId);
    state.listenOrder = buildListenOrder(island);
    state.listenIndex = 0;
    renderListenCard();
  } else {
    startRecallSession();
  }
}

// --- Audio engine (respects repetitions / pauses / speed) ---

function speakOnce(text, rate, onEnd) {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  utterance.rate = rate;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function playWithRepetitions(text, onComplete) {
  const settings = loadSettings();
  let remaining = settings.repetitions;

  function step() {
    remaining -= 1;
    speakOnce(text, settings.playbackSpeed, () => {
      if (remaining > 0) {
        autoplayTimer = setTimeout(step, settings.pauseBetweenRepeats * 1000);
      } else if (onComplete) {
        onComplete();
      }
    });
  }

  step();
}

// --- Listen & Repeat mode ---

function renderListenCard() {
  const island = getIsland(state.islandId);
  const settings = loadSettings();
  const item = state.listenOrder[state.listenIndex];

  listenPanel.innerHTML = `
    <div class="listen-top-bar">
      <button class="autoplay-toggle" id="autoplay-toggle">▶ Auto-play island</button>
      <p class="progress-dots">${state.listenIndex + 1} / ${state.listenOrder.length}</p>
    </div>
    <div class="practice-card">
      <p class="hebrew-word">${item.hebrew}</p>
      ${settings.showTransliteration ? `<p class="transliteration">${item.transliteration}</p>` : ""}
      ${settings.showEnglish ? `<p class="english-word">${item.english}</p>` : ""}
      <button class="primary" id="play-audio">🔊 Play ×${settings.repetitions}</button>
      <div class="nav-row">
        <button class="secondary" id="listen-prev">← Prev</button>
        <button class="secondary" id="listen-next">Next →</button>
      </div>
    </div>
  `;

  document.getElementById("autoplay-toggle").addEventListener("click", toggleAutoplaySequence);
  updateAutoplayButton();

  document.getElementById("play-audio").addEventListener("click", () => {
    stopAutoplaySequence();
    playWithRepetitions(item.hebrew);
  });
  document.getElementById("listen-prev").addEventListener("click", () => {
    stopAutoplaySequence();
    state.listenIndex = (state.listenIndex - 1 + state.listenOrder.length) % state.listenOrder.length;
    renderListenCard();
  });
  document.getElementById("listen-next").addEventListener("click", () => {
    stopAutoplaySequence();
    state.listenIndex = (state.listenIndex + 1) % state.listenOrder.length;
    renderListenCard();
  });

  if (settings.autoplayOnOpen && !autoplayActive) {
    playWithRepetitions(item.hebrew);
  }
}

function updateAutoplayButton() {
  const button = document.getElementById("autoplay-toggle");
  if (!button) return;
  button.textContent = autoplayActive ? "⏸ Stop auto-play" : "▶ Auto-play island";
  button.classList.toggle("stop", autoplayActive);
}

function toggleAutoplaySequence() {
  if (autoplayActive) {
    stopAutoplaySequence();
  } else {
    startAutoplaySequence();
  }
}

function startAutoplaySequence() {
  autoplayActive = true;
  updateAutoplayButton();
  runAutoplayStep();
}

function stopAutoplaySequence() {
  autoplayActive = false;
  if (autoplayTimer) {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }
  updateAutoplayButton();
}

function runAutoplayStep() {
  if (!autoplayActive) return;
  const item = state.listenOrder[state.listenIndex];
  renderListenCard();

  playWithRepetitions(item.hebrew, () => {
    if (!autoplayActive) return;
    const settings = loadSettings();
    autoplayTimer = setTimeout(() => {
      if (!autoplayActive) return;
      const isLast = state.listenIndex >= state.listenOrder.length - 1;
      if (isLast && !settings.loopPlayback) {
        stopAutoplaySequence();
        return;
      }
      state.listenIndex = isLast ? 0 : state.listenIndex + 1;
      runAutoplayStep();
    }, settings.pauseBetweenWords * 1000);
  });
}

// --- Active Recall mode ---

function startRecallSession() {
  const island = getIsland(state.islandId);
  state.recallQueue = shuffledCopy(island.items);
  state.recallIndex = 0;
  renderRecallCard();
}

function renderRecallCard() {
  const island = getIsland(state.islandId);
  const settings = loadSettings();

  if (state.recallIndex >= state.recallQueue.length) {
    const { done, total } = islandProgress(island);
    recallPanel.innerHTML = `
      <div class="session-complete">
        <h3>Nice work! 🎉</h3>
        <p>${done} / ${total} words mastered on this island.</p>
        <button class="primary" id="recall-again">Practice again</button>
      </div>
    `;
    document.getElementById("recall-again").addEventListener("click", startRecallSession);
    return;
  }

  const item = state.recallQueue[state.recallIndex];

  recallPanel.innerHTML = `
    <div class="flashcard" id="flashcard">
      <div class="flashcard-inner">
        <div class="flashcard-face front">
          <p class="english-word">${item.english}</p>
          <p class="flip-hint">Tap to reveal</p>
        </div>
        <div class="flashcard-face back">
          <p class="hebrew-word">${item.hebrew}</p>
          ${settings.showTransliteration ? `<p class="transliteration">${item.transliteration}</p>` : ""}
        </div>
      </div>
    </div>
    <div class="recall-actions hidden" id="recall-actions">
      <button class="recall-wrong" id="recall-miss">😵 Still learning</button>
      <button class="recall-right" id="recall-hit">✅ Got it</button>
    </div>
    <p class="progress-dots">${state.recallIndex + 1} / ${state.recallQueue.length}</p>
  `;

  const flashcardEl = document.getElementById("flashcard");
  const actionsEl = document.getElementById("recall-actions");

  flashcardEl.addEventListener("click", () => {
    flashcardEl.classList.toggle("flipped");
    actionsEl.classList.toggle("hidden", !flashcardEl.classList.contains("flipped"));
  });

  document.getElementById("recall-hit").addEventListener("click", (e) => {
    e.stopPropagation();
    markRecall(item, true);
  });
  document.getElementById("recall-miss").addEventListener("click", (e) => {
    e.stopPropagation();
    markRecall(item, false);
  });
}

function markRecall(item, correct) {
  const mastered = loadMastered();
  mastered[item.id] = correct;
  saveMastered(mastered);
  state.recallIndex += 1;
  renderRecallCard();
}

// --- Settings panel ---

function buildSegmented(container, values, labels, current, onSelect) {
  container.innerHTML = "";
  values.forEach((value, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = labels[i];
    button.className = value === current ? "active" : "";
    button.addEventListener("click", () => {
      onSelect(value);
      renderSettingsPanel();
    });
    container.appendChild(button);
  });
}

function renderSettingsPanel() {
  const settings = loadSettings();

  buildSegmented(
    document.getElementById("setting-repetitions"),
    [1, 2, 3, 4, 5],
    ["1×", "2×", "3×", "4×", "5×"],
    settings.repetitions,
    (value) => updateSetting("repetitions", value)
  );

  const pauseValues = [0, 0.5, 1, 1.5, 2, 2.5, 3];
  const pauseLabels = pauseValues.map((v) => `${v}s`);

  buildSegmented(
    document.getElementById("setting-pause-repeats"),
    pauseValues,
    pauseLabels,
    settings.pauseBetweenRepeats,
    (value) => updateSetting("pauseBetweenRepeats", value)
  );

  buildSegmented(
    document.getElementById("setting-pause-words"),
    pauseValues,
    pauseLabels,
    settings.pauseBetweenWords,
    (value) => updateSetting("pauseBetweenWords", value)
  );

  buildSegmented(
    document.getElementById("setting-textsize"),
    [0, 1, 2, 3],
    ["A-", "A", "A+", "A++"],
    settings.textSize,
    (value) => updateSetting("textSize", value)
  );

  buildSegmented(
    document.getElementById("setting-order"),
    ["original", "shuffled"],
    ["Original order", "Shuffled"],
    settings.wordOrder,
    (value) => updateSetting("wordOrder", value)
  );

  const speedInput = document.getElementById("setting-speed");
  speedInput.value = settings.playbackSpeed;
  document.getElementById("speed-readout").textContent =
    settings.playbackSpeed === 1 ? "1× Normal" : `${settings.playbackSpeed.toFixed(1)}×`;

  document.getElementById("setting-transliteration").checked = settings.showTransliteration;
  document.getElementById("setting-english").checked = settings.showEnglish;
  document.getElementById("setting-autoplay").checked = settings.autoplayOnOpen;
  document.getElementById("setting-loop").checked = settings.loopPlayback;
}

function openSettings() {
  renderSettingsPanel();
  settingsOverlay.classList.remove("hidden");
}

function closeSettings() {
  settingsOverlay.classList.add("hidden");
  // Re-render the current mode so display toggles (transliteration/English/text size) take effect.
  if (!detailView.classList.contains("hidden")) {
    if (state.mode === "listen") {
      renderListenCard();
    } else {
      renderRecallCard();
    }
  }
}

// --- Wiring ---

backButton.addEventListener("click", closeIsland);
modeListenBtn.addEventListener("click", () => setMode("listen"));
modeRecallBtn.addEventListener("click", () => setMode("recall"));

settingsButton.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

document.getElementById("setting-speed").addEventListener("input", (e) => {
  updateSetting("playbackSpeed", parseFloat(e.target.value));
  document.getElementById("speed-readout").textContent =
    parseFloat(e.target.value) === 1 ? "1× Normal" : `${parseFloat(e.target.value).toFixed(1)}×`;
});
document.getElementById("setting-transliteration").addEventListener("change", (e) =>
  updateSetting("showTransliteration", e.target.checked)
);
document.getElementById("setting-english").addEventListener("change", (e) =>
  updateSetting("showEnglish", e.target.checked)
);
document.getElementById("setting-autoplay").addEventListener("change", (e) =>
  updateSetting("autoplayOnOpen", e.target.checked)
);
document.getElementById("setting-loop").addEventListener("change", (e) => updateSetting("loopPlayback", e.target.checked));

settingsReset.addEventListener("click", () => {
  saveSettings({ ...DEFAULT_SETTINGS });
  applyTextSize();
  renderSettingsPanel();
});

applyTextSize();
renderGrid();
