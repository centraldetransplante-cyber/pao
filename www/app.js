(function () {
  "use strict";

  const NAME = "Rafael";
  const STORAGE_PREFIX = "devocional:";
  const SERVER_URL = "http://163.176.30.222:3001";

  const state = {
    plano: null,
    reflexoes: null,
    bible: null,
    dayIndex: 1,
    lang: "original",
  };

  const $ = (sel) => document.querySelector(sel);

  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date - start;
    return Math.floor(diff / 86400000) + 1;
  }

  function todayIndex() {
    const doy = dayOfYear(new Date());
    return ((doy - 1) % 365) + 1;
  }

  function greetingByHour() {
    const h = new Date().getHours();
    if (h < 12) return `Bom dia, ${NAME}`;
    if (h < 18) return `Boa tarde, ${NAME}`;
    return `Boa noite, ${NAME}`;
  }

  async function loadData() {
    const [plano, reflexoes, bible] = await Promise.all([
      fetch("plano.json").then((r) => r.json()),
      fetch("reflexoes.json").then((r) => r.json()),
      fetch("bible-acf.json").then((r) => r.json()),
    ]);
    state.plano = plano;
    state.reflexoes = reflexoes;
    state.bible = bible;
    state.bibleByAbbrev = Object.fromEntries(bible.map((b) => [b.abbrev, b]));
  }

  function currentEntry() {
    const plan = state.plano[state.dayIndex - 1];
    const refl = state.reflexoes[state.dayIndex - 1];
    return { ...plan, ...refl };
  }

  function renderHome() {
    const entry = currentEntry();
    $("#greeting").textContent = greetingByHour();
    $("#date-label").textContent = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    $("#reference").textContent = entry.reference;
    $("#verse-text").textContent =
      state.lang === "modern" ? entry.modernText : entry.highlightText;
    $("#reflection-text").textContent = entry.reflection;

    const savedNote = localStorage.getItem(STORAGE_PREFIX + "note:" + state.dayIndex) || "";
    $("#notes").value = savedNote;
  }

  function renderChapter() {
    const entry = currentEntry();
    const book = state.bibleByAbbrev[entry.abbrev];
    const verses = book.chapters[entry.chapter - 1];
    $("#chapter-title").textContent = entry.reference;
    const body = $("#chapter-body");
    body.innerHTML = verses
      .map((v, i) => `<p><span class="vnum">${i + 1}</span>${escapeHtml(v)}</p>`)
      .join("");
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function renderProgress() {
    const idx = todayIndex();
    $("#progress-sub").textContent = `Dia ${idx} de 365 — ${Math.round((idx / 365) * 100)}% da jornada anual`;
    $("#progress-bar").style.width = `${(idx / 365) * 100}%`;

    const grid = $("#day-grid");
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let d = 1; d <= 365; d++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";
      if (d < idx) cell.classList.add("done");
      if (d === idx) cell.classList.add("today");
      cell.textContent = d;
      cell.addEventListener("click", () => {
        state.dayIndex = d;
        state.lang = "original";
        document.querySelectorAll(".lang-btn").forEach((b) => b.classList.toggle("active", b.dataset.lang === "original"));
        switchView("home");
      });
      frag.appendChild(cell);
    }
    grid.appendChild(frag);
  }

  function switchView(view) {
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));

    if (view === "home") {
      $("#view-home").classList.remove("hidden");
      document.querySelector('.tab-btn[data-view="home"]').classList.add("active");
      renderHome();
    } else if (view === "progress") {
      $("#view-progress").classList.remove("hidden");
      document.querySelector('.tab-btn[data-view="progress"]').classList.add("active");
      renderProgress();
    } else if (view === "settings") {
      $("#view-settings").classList.remove("hidden");
      document.querySelector('.tab-btn[data-view="settings"]').classList.add("active");
    } else if (view === "chapter") {
      $("#view-home").classList.add("hidden");
      $("#view-chapter").classList.remove("hidden");
      renderChapter();
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_PREFIX + "theme");
    const dark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    $("#toggle-dark").checked = dark;
    $("#theme-toggle").textContent = dark ? "☀️" : "🌙";
  }

  function toggleTheme(forceDark) {
    const dark =
      typeof forceDark === "boolean"
        ? forceDark
        : document.documentElement.getAttribute("data-theme") !== "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem(STORAGE_PREFIX + "theme", dark ? "dark" : "light");
    $("#toggle-dark").checked = dark;
    $("#theme-toggle").textContent = dark ? "☀️" : "🌙";
  }

  function initReminderSettings() {
    const enabled = localStorage.getItem(STORAGE_PREFIX + "reminder:on") === "1";
    const time = localStorage.getItem(STORAGE_PREFIX + "reminder:time") || "07:00";
    $("#toggle-reminder").checked = enabled;
    $("#reminder-time").value = time;
  }

  async function scheduleReminder() {
    const enabled = $("#toggle-reminder").checked;
    const time = $("#reminder-time").value || "07:00";
    localStorage.setItem(STORAGE_PREFIX + "reminder:on", enabled ? "1" : "0");
    localStorage.setItem(STORAGE_PREFIX + "reminder:time", time);

    const cap = window.Capacitor;
    if (!cap || !cap.Plugins || !cap.Plugins.LocalNotifications) return;
    const { LocalNotifications } = cap.Plugins;

    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    if (!enabled) return;

    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;

    const [hour, minute] = time.split(":").map(Number);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title: `Bom dia, ${NAME} ✦`,
          body: "Seu devocional de hoje já está pronto. Vamos buscar a Deus?",
          schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
          smallIcon: "ic_stat_devocional",
        },
      ],
    });
  }

  let noteTimer = null;
  function onNoteInput() {
    clearTimeout(noteTimer);
    $("#notes-status").textContent = "Salvando...";
    noteTimer = setTimeout(async () => {
      const text = $("#notes").value;
      localStorage.setItem(STORAGE_PREFIX + "note:" + state.dayIndex, text);
      $("#notes-status").textContent = "Salvo ✓";
      setTimeout(() => ($("#notes-status").textContent = ""), 1500);
      await syncNoteToServer(state.dayIndex, text);
    }, 500);
  }

  // --- Conta e sincronização ---

  let googleClientId = null;
  let socialLoginInitPromise = null;
  const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  async function loadGoogleConfig() {
    googleClientId = null;
    try {
      const res = await fetch(SERVER_URL.replace(/\/$/, "") + "/config");
      const cfg = await res.json();
      if (cfg && cfg.googleClientId) {
        googleClientId = cfg.googleClientId;
      }
    } catch (e) {
      $("#account-error").textContent = "Não foi possível contatar o servidor. Verifique sua internet.";
    }
  }

  function ensureSocialLoginInit() {
    const SocialLogin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin;
    if (!SocialLogin) return Promise.reject(new Error("SocialLogin indisponível"));
    if (!socialLoginInitPromise) {
      socialLoginInitPromise = SocialLogin.initialize({ google: { webClientId: googleClientId } });
    }
    return socialLoginInitPromise;
  }

  let gsiScriptPromise = null;
  function ensureGsiScriptLoaded() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    if (!gsiScriptPromise) {
      gsiScriptPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Falha ao carregar o script do Google."));
        document.head.appendChild(s);
      });
    }
    return gsiScriptPromise;
  }

  async function getGoogleIdTokenNative() {
    await ensureSocialLoginInit();
    const SocialLogin = window.Capacitor.Plugins.SocialLogin;
    const res = await SocialLogin.login({ provider: "google", options: {} });
    const idToken = res && res.result && res.result.idToken;
    if (!idToken) throw new Error("Falha na autenticação com Google.");
    return idToken;
  }

  async function getGoogleIdTokenWeb() {
    await ensureGsiScriptLoaded();
    return new Promise((resolve, reject) => {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response && response.credential) resolve(response.credential);
          else reject(new Error("Falha na autenticação com Google."));
        },
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification && (notification.isNotDisplayed() || notification.isSkippedMoment())) {
          reject(new Error("Login com Google cancelado ou bloqueado pelo navegador."));
        }
      });
    });
  }

  async function handleGoogleLogin() {
    const errEl = $("#account-error");
    errEl.textContent = "";

    if (!googleClientId) {
      await loadGoogleConfig();
      if (!googleClientId) return (errEl.textContent = "Login com Google indisponível no momento. Tente novamente.");
    }

    try {
      const idToken = isNativeApp ? await getGoogleIdTokenNative() : await getGoogleIdTokenWeb();
      const data = await apiCall(SERVER_URL, "/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });
      saveSession(SERVER_URL, data.token, data.user.name);
      await enterApp();
    } catch (e) {
      errEl.textContent = e.message;
    }
  }

  function getSession() {
    const server = localStorage.getItem(STORAGE_PREFIX + "server");
    const token = localStorage.getItem(STORAGE_PREFIX + "token");
    const name = localStorage.getItem(STORAGE_PREFIX + "account-name");
    return server && token ? { server, token, name } : null;
  }

  function saveSession(server, token, name) {
    localStorage.setItem(STORAGE_PREFIX + "server", server);
    localStorage.setItem(STORAGE_PREFIX + "token", token);
    localStorage.setItem(STORAGE_PREFIX + "account-name", name);
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_PREFIX + "server");
    localStorage.removeItem(STORAGE_PREFIX + "token");
    localStorage.removeItem(STORAGE_PREFIX + "account-name");
  }

  function renderAccountUI() {
    const session = getSession();
    if (session) {
      $("#account-name-display").textContent = session.name;
    }
  }

  function showLoginGate() {
    $("#view-login").classList.remove("hidden");
    $(".topbar").classList.add("hidden");
    $(".tabbar").classList.add("hidden");
    document.querySelectorAll("#app > main.view, #app > section.view").forEach((el) => {
      if (el.id !== "view-login") el.classList.add("hidden");
    });
  }

  function hideLoginGate() {
    $("#view-login").classList.add("hidden");
    $(".topbar").classList.remove("hidden");
    $(".tabbar").classList.remove("hidden");
  }

  async function apiCall(server, path, opts = {}) {
    const res = await fetch(server.replace(/\/$/, "") + path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro no servidor");
    return data;
  }

  function handleLogout() {
    clearSession();
    showLoginGate();
  }

  async function syncNoteToServer(day, text) {
    const session = getSession();
    if (!session) return;
    $("#sync-status").textContent = "Sincronizando...";
    try {
      await apiCall(session.server, "/notes/" + day, {
        method: "PUT",
        headers: { Authorization: "Bearer " + session.token },
        body: JSON.stringify({ text }),
      });
      $("#sync-status").textContent = "Sincronizado ✓";
    } catch (e) {
      $("#sync-status").textContent = "Falha ao sincronizar: " + e.message;
    }
  }

  async function pullNotesFromServer() {
    const session = getSession();
    if (!session) return;
    try {
      const rows = await apiCall(session.server, "/notes", {
        headers: { Authorization: "Bearer " + session.token },
      });
      for (const row of rows) {
        const localKey = STORAGE_PREFIX + "note:" + row.day;
        const localText = localStorage.getItem(localKey);
        if (localText === null || localText === "") {
          localStorage.setItem(localKey, row.text);
        }
      }
      if (!$("#view-home").classList.contains("hidden")) renderHome();
    } catch (e) {
      $("#sync-status").textContent = "Falha ao buscar anotações: " + e.message;
    }
  }

  function bindEvents() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    $("#btn-chapter").addEventListener("click", () => switchView("chapter"));
    $("#btn-back").addEventListener("click", () => switchView("home"));
    $("#theme-toggle").addEventListener("click", () => toggleTheme());
    $("#toggle-dark").addEventListener("change", (e) => toggleTheme(e.target.checked));
    $("#notes").addEventListener("input", onNoteInput);

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.lang = btn.dataset.lang;
        renderHome();
      });
    });

    $("#toggle-reminder").addEventListener("change", scheduleReminder);
    $("#reminder-time").addEventListener("change", scheduleReminder);

    $("#btn-google").addEventListener("click", handleGoogleLogin);
    $("#btn-logout").addEventListener("click", handleLogout);
  }

  async function enterApp() {
    hideLoginGate();
    renderAccountUI();
    state.dayIndex = todayIndex();
    await loadData();
    switchView("home");
    await pullNotesFromServer();
  }

  async function main() {
    initTheme();
    initReminderSettings();
    bindEvents();
    await loadGoogleConfig();
    const session = getSession();
    if (session) {
      await enterApp();
    } else {
      showLoginGate();
    }
  }

  document.addEventListener("DOMContentLoaded", main);
})();
