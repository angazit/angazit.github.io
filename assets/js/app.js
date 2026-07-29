// Hebrew Language Islands app: island grid -> per-island Listen & Repeat / Active Recall modes.
const STORAGE_KEY = "hebrewIslands.mastered";

const gridView = document.getElementById("grid-view");
const detailView = document.getElementById("detail-view");
const islandGridEl = document.getElementById("island-grid");
const backButton = document.getElementById("back-button");
const islandTitleEl = document.getElementById("island-title");
const modeListenBtn = document.getElementById("mode-listen");
const modeRecallBtn = document.getElementById("mode-recall");
const listenPanel = document.getElementById("listen-panel");
const recallPanel = document.getElementById("recall-panel");

let state = {
  islandId: null,
  mode: "listen",
  listenIndex: 0,
  recallQueue: [],
  recallIndex: 0,
  flipped: false,
};

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

function getIsland(id) {
  return ISLANDS.find((island) => island.id === id);
}

function islandProgress(island) {
  const mastered = loadMastered();
  const total = island.items.length;
  const done = island.items.filter((item) => mastered[item.id]).length;
  return { done, total };
}

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
  state.mode = "listen";
  state.listenIndex = 0;
  gridView.classList.add("hidden");
  detailView.classList.remove("hidden");
  const island = getIsland(id);
  islandTitleEl.textContent = `${island.emoji} ${island.name} · ${island.hebrewName}`;
  setMode("listen");
}

function closeIsland() {
  detailView.classList.add("hidden");
  gridView.classList.remove("hidden");
  renderGrid();
}

function setMode(mode) {
  state.mode = mode;
  modeListenBtn.classList.toggle("active", mode === "listen");
  modeRecallBtn.classList.toggle("active", mode === "recall");
  listenPanel.classList.toggle("hidden", mode !== "listen");
  recallPanel.classList.toggle("hidden", mode !== "recall");

  if (mode === "listen") {
    state.listenIndex = 0;
    renderListenCard();
  } else {
    startRecallSession();
  }
}

// --- Listen & Repeat mode ---

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function renderListenCard() {
  const island = getIsland(state.islandId);
  const item = island.items[state.listenIndex];

  listenPanel.innerHTML = `
    <div class="practice-card">
      <p class="hebrew-word">${item.hebrew}</p>
      <p class="transliteration">${item.transliteration}</p>
      <p class="english-word">${item.english}</p>
      <button class="primary" id="play-audio">🔊 Play & repeat</button>
      <div class="nav-row">
        <button class="secondary" id="listen-prev">← Prev</button>
        <button class="secondary" id="listen-next">Next →</button>
      </div>
      <p class="progress-dots">${state.listenIndex + 1} / ${island.items.length}</p>
    </div>
  `;

  document.getElementById("play-audio").addEventListener("click", () => speak(item.hebrew));
  document.getElementById("listen-prev").addEventListener("click", () => {
    state.listenIndex = (state.listenIndex - 1 + island.items.length) % island.items.length;
    renderListenCard();
  });
  document.getElementById("listen-next").addEventListener("click", () => {
    state.listenIndex = (state.listenIndex + 1) % island.items.length;
    renderListenCard();
  });
}

// --- Active Recall mode ---

function startRecallSession() {
  const island = getIsland(state.islandId);
  state.recallQueue = [...island.items].sort(() => Math.random() - 0.5);
  state.recallIndex = 0;
  state.flipped = false;
  renderRecallCard();
}

function renderRecallCard() {
  const island = getIsland(state.islandId);

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
          <p class="transliteration">${item.transliteration}</p>
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

// --- Wiring ---

backButton.addEventListener("click", closeIsland);
modeListenBtn.addEventListener("click", () => setMode("listen"));
modeRecallBtn.addEventListener("click", () => setMode("recall"));

renderGrid();
