/**
 * ═══════════════════════════════════════════════════════════════
 * STUDY DOST — GenZ Animated Task Roadmap Tracker
 * The Chairman Show (https://thechairmanshow.in)
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─── CONFIGURATION & FIREBASE SETUP ───
  const CONFIG = {
    AI_PROXY: "https://tcs-ai-proxy.sumitshrivas24.workers.dev/",
    STORAGE_KEY: "study_dost_state_v2",
    HISTORY_KEY: "study_dost_history_v2",
    XP_KEY: "study_dost_xp_v2",
    BADGES_KEY: "study_dost_badges_v2",
    STREAK_KEY: "study_dost_streak_v2"
  };

  const firebaseConfig = {
    apiKey: "AIzaSyA3T1Yp8nFQuHb-_63bfzbd3L2r2wn-01I",
    authDomain: "the-chairman-show-7c839.firebaseapp.com",
    databaseURL: "https://the-chairman-show-7c839-default-rtdb.firebaseio.com",
    projectId: "the-chairman-show-7c839",
    storageBucket: "the-chairman-show-7c839.firebasestorage.app",
    messagingSenderId: "667528459671",
    appId: "1:667528459671:web:696a5aeda14ba2391fc0d2"
  };

  let auth = window.auth || null;
  let db = window.db || null;
  let currentUser = null;

  try {
    if (!auth || !db) {
      if (window.firebase && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      if (window.firebase) {
        auth = firebase.auth();
        db = firebase.firestore();
      }
    }
  } catch (err) {
    console.warn('[Study Dost] Firebase initialization notice:', err.message);
  }

  // ─── MOTIVATIONAL QUOTES FOR FOCUS ZONE ───
  const FOCUS_QUOTES = [
    "\"Discipline is choosing between what you want now and what you want most.\" — Abraham Lincoln",
    "\"Sapne wo nahi jo hum sote waqt dekhte hain, sapne wo hain jo hume sone nahi dete.\" — Dr. A.P.J. Abdul Kalam",
    "\"Arise, awake, and stop not until the goal is reached.\" — Swami Vivekananda",
    "\"You don't have to be extreme, just consistent. 1% better every single day.\" — The Chairman",
    "\"Pain of discipline is far lighter than the pain of regret.\" — GenZ Hustle Mantra",
    "\"Turn doubts into execution. Deep focus creates extraordinary breakthroughs.\""
  ];

  // ─── BADGES CATALOG ───
  const BADGES_CATALOG = [
    {
      id: "first_task",
      title: "First Task 🎯",
      icon: "🎯",
      desc: "Complete your first task milestone on the roadmap."
    },
    {
      id: "streak_3",
      title: "3-Day Streak 🔥",
      icon: "🔥",
      desc: "Maintain your study mission 3 days in a row."
    },
    {
      id: "speed_demon",
      title: "Speed Demon ⚡",
      icon: "⚡",
      desc: "Complete a task milestone in under 5 minutes."
    },
    {
      id: "consistency_king",
      title: "Consistency King 💪",
      icon: "💪",
      desc: "Conquer a total of 10 tasks across your study journeys."
    },
    {
      id: "marathon",
      title: "Marathon 🏆",
      icon: "🏆",
      desc: "Study for 2 hours (120 minutes) in focus mode."
    },
    {
      id: "perfect_day",
      title: "Perfect Day 🌟",
      icon: "🌟",
      desc: "Complete all milestone tasks in a single roadmap."
    }
  ];

  const LEVEL_TITLES = ["Rookie", "Learner", "Scholar", "Master", "Chairman"];

  // ─── APP STATE ───
  let state = {
    screen: "input", // "input" | "roadmap" | "super-revision"
    rawTasks: [],    // strings in input screen
    roadmap: null,   // { id, createdAt, title, tasks: [] }
    activeTaskId: null,
    timer: {
      taskId: null,
      secondsRemaining: 25 * 60,
      totalSeconds: 25 * 60,
      isRunning: false,
      intervalId: null,
      sessionStartTimestamp: null
    },
    xp: 0,
    streak: 3,
    badges: [],
    totalMinutesSpent: 0,
    totalTasksCompletedCount: 0,
    history: [],
    sr: {
      notesText: "",
      uploadedImages: [],
      currentMindmap: null,
      layout: "radial",
      theme: "chairman",
      depth: "comprehensive",
      activeRecall: false,
      collapsedNodes: new Set(),
      zoom: 1,
      panX: 0,
      panY: 0,
      isPanning: false,
      startPanX: 0,
      startPanY: 0,
      savedMindmaps: []
    }
  };

  // ─── SOUND & WEB AUDIO ENGINE ───
  let audioCtx = null;
  let ambientOsc1 = null;
  let ambientOsc2 = null;
  let ambientGain = null;
  let isAmbientPlaying = false;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq = 587.33, type = "sine", duration = 0.35, gainVal = 0.18) {
    try {
      initAudioContext();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playSuccessChime() {
    playTone(523.25, "triangle", 0.15, 0.2); // C5
    setTimeout(() => playTone(659.25, "triangle", 0.18, 0.22), 110); // E5
    setTimeout(() => playTone(783.99, "triangle", 0.22, 0.25), 220); // G5
    setTimeout(() => playTone(1046.50, "triangle", 0.45, 0.3), 330); // C6
  }

  function playUnlockChime() {
    playTone(440, "sine", 0.12, 0.15);
    setTimeout(() => playTone(554.37, "sine", 0.15, 0.18), 100);
    setTimeout(() => playTone(659.25, "sine", 0.28, 0.2), 200);
  }

  function playTimerAlertSound() {
    // 3 rapid warning beeps
    playTone(880, "square", 0.15, 0.25);
    setTimeout(() => playTone(880, "square", 0.15, 0.25), 180);
    setTimeout(() => playTone(1046.50, "square", 0.35, 0.3), 360);

    // Voice announcement using SpeechSynthesis
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Time's up! Task complete kar bhai! 💪");
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        utterance.lang = 'hi-IN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.log('Voice synthesis notification unavailable');
    }
  }

  function toggleAmbientMusic() {
    initAudioContext();
    if (!audioCtx) return false;

    if (isAmbientPlaying) {
      if (ambientOsc1) ambientOsc1.stop();
      if (ambientOsc2) ambientOsc2.stop();
      isAmbientPlaying = false;
      return false;
    } else {
      try {
        const now = audioCtx.currentTime;
        ambientOsc1 = audioCtx.createOscillator();
        ambientOsc2 = audioCtx.createOscillator();
        ambientGain = audioCtx.createGain();

        // 136.1 Hz (Om / Earth frequency) + 432 Hz gentle harmonic
        ambientOsc1.type = 'sine';
        ambientOsc1.frequency.setValueAtTime(136.1, now);

        ambientOsc2.type = 'triangle';
        ambientOsc2.frequency.setValueAtTime(272.2, now);

        ambientGain.gain.setValueAtTime(0.03, now);

        ambientOsc1.connect(ambientGain);
        ambientOsc2.connect(ambientGain);
        ambientGain.connect(audioCtx.destination);

        ambientOsc1.start();
        ambientOsc2.start();
        isAmbientPlaying = true;
        return true;
      } catch (err) {
        console.warn('Ambient synthesis error:', err);
        return false;
      }
    }
  }

  // ─── DOM SELECTORS ───
  const $ = (id) => document.getElementById(id);

  // Screen containers
  const screenTaskInput = $('screenTaskInput');
  const screenRoadmapView = $('screenRoadmapView');

  // Input screen elements
  const addTaskForm = $('addTaskForm');
  const taskTextInput = $('taskTextInput');
  const addTaskBtn = $('addTaskBtn');
  const taskListContainer = $('taskListContainer');
  const emptyTasksNotice = $('emptyTasksNotice');
  const taskCountLabel = $('taskCountLabel');
  const clearAllTasksBtn = $('clearAllTasksBtn');
  const generateRoadmapBtn = $('generateRoadmapBtn');

  // Roadmap screen topbar
  const backToInputBtn = $('backToInputBtn');
  const roadmapRingFill = $('roadmapRingFill');
  const ringPctLabel = $('ringPctLabel');
  const ringCountLabel = $('ringCountLabel');
  const roadmapStreakNum = $('roadmapStreakNum');
  const roadmapTotalTimeLabel = $('roadmapTotalTimeLabel');
  const roadmapXpNum = $('roadmapXpNum');
  const roadmapMilestonesPath = $('roadmapMilestonesPath');

  // Stats Bottom Panel
  const statCompletedToday = $('statCompletedToday');
  const statTimeSpent = $('statTimeSpent');
  const statCompletionRate = $('statCompletionRate');
  const statLongestStreak = $('statLongestStreak');

  // Floating Mini Clock
  const floatingTimerWidget = $('floatingTimerWidget');
  const floatingTimerHandle = $('floatingTimerHandle');
  const ftTaskNameShort = $('ftTaskNameShort');
  const ftDigitalTime = $('ftDigitalTime');
  const ftRingFill = $('ftRingFill');
  const ftToggleBtn = $('ftToggleBtn');
  const ftDoneBtn = $('ftDoneBtn');
  const ftExpandBtn = $('ftExpandBtn');
  const ftCloseBtn = $('ftCloseBtn');

  // Full Screen Focus Mode
  const focusModeOverlay = $('focusModeOverlay');
  const focusTaskCategory = $('focusTaskCategory');
  const focusTaskTitle = $('focusTaskTitle');
  const focusDigitsTime = $('focusDigitsTime');
  const focusStatusTag = $('focusStatusTag');
  const focusRingFill = $('focusRingFill');
  const focusPlayPauseBtn = $('focusPlayPauseBtn');
  const focusDoneBtn = $('focusDoneBtn');
  const focusAmbientMusicBtn = $('focusAmbientMusicBtn');
  const ambientSoundLabel = $('ambientSoundLabel');
  const focusQuoteText = $('focusQuoteText');
  const exitFocusModeBtn = $('exitFocusModeBtn');

  // Floating Chat Drawer
  const floatingChatDostBtn = $('floatingChatDostBtn');
  const studyDostChatDrawer = $('studyDostChatDrawer');
  const chatDrawerOverlay = $('chatDrawerOverlay');
  const closeChatDrawerBtn = $('closeChatDrawerBtn');
  const chatDostMessages = $('chatDostMessages');
  const chatDostForm = $('chatDostForm');
  const chatDostInput = $('chatDostInput');
  const chatQuickChips = $('chatQuickChips');

  // Badges & History Modals
  const viewBadgesBtn = $('viewBadgesBtn');
  const badgesModal = $('badgesModal');
  const closeBadgesModalBtn = $('closeBadgesModalBtn');
  const badgesGridContainer = $('badgesGridContainer');
  const navBadgeCountPill = $('navBadgeCountPill');

  const viewHistoryBtn = $('viewHistoryBtn');
  const historyModal = $('historyModal');
  const closeHistoryModalBtn = $('closeHistoryModalBtn');
  const historyListContainer = $('historyListContainer');

  // Level & XP Bar in Nav
  const navLevelBadge = $('navLevelBadge');
  const navLevelTitle = $('navLevelTitle');
  const navLevelNum = $('navLevelNum');
  const navXpFill = $('navXpFill');
  const navXpText = $('navXpText');

  // Badge Popup
  const badgePopup = $('badgePopup');
  const badgePopupIcon = $('badgePopupIcon');
  const badgePopupTitle = $('badgePopupTitle');
  const badgePopupDesc = $('badgePopupDesc');

  // Toast Stack & Confetti Canvas
  const toastStack = $('toastStack');
  const confettiCanvas = $('confettiCanvas');

  // ─── INITIALIZATION ───
  function init() {
    loadPersistentState();
    setupEventListeners();
    setupAuthObserver();
    setupThemeToggle();
    startQuoteRotation();
    renderInputTasks();
    updateGamificationUI();

    // Check if we already have an active roadmap
    if (state.roadmap && state.roadmap.tasks && state.roadmap.tasks.length > 0) {
      showScreen("roadmap");
      renderRoadmap();
    } else {
      showScreen("input");
    }
  }

  // ─── STORAGE & SYNC ───
  function loadPersistentState() {
    try {
      const savedState = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.rawTasks) state.rawTasks = parsed.rawTasks;
        if (parsed.roadmap) state.roadmap = parsed.roadmap;
        if (parsed.activeTaskId) state.activeTaskId = parsed.activeTaskId;
        if (parsed.totalMinutesSpent) state.totalMinutesSpent = parsed.totalMinutesSpent;
        if (parsed.totalTasksCompletedCount) state.totalTasksCompletedCount = parsed.totalTasksCompletedCount;
      }

      const savedXp = localStorage.getItem(CONFIG.XP_KEY);
      if (savedXp) state.xp = parseInt(savedXp, 10) || 0;

      const savedStreak = localStorage.getItem(CONFIG.STREAK_KEY);
      if (savedStreak) state.streak = parseInt(savedStreak, 10) || 3;

      const savedBadges = localStorage.getItem(CONFIG.BADGES_KEY);
      if (savedBadges) state.badges = JSON.parse(savedBadges) || [];

      const savedHistory = localStorage.getItem(CONFIG.HISTORY_KEY);
      if (savedHistory) state.history = JSON.parse(savedHistory) || [];
    } catch (e) {
      console.warn('[Study Dost] Could not read local state:', e);
    }
  }

  function saveState() {
    try {
      const stateToSave = {
        rawTasks: state.rawTasks,
        roadmap: state.roadmap,
        activeTaskId: state.activeTaskId,
        totalMinutesSpent: state.totalMinutesSpent,
        totalTasksCompletedCount: state.totalTasksCompletedCount
      };
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stateToSave));
      localStorage.setItem(CONFIG.XP_KEY, state.xp.toString());
      localStorage.setItem(CONFIG.STREAK_KEY, state.streak.toString());
      localStorage.setItem(CONFIG.BADGES_KEY, JSON.stringify(state.badges));
      localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(state.history));

      // Sync with Firestore if authenticated
      if (db && currentUser && state.roadmap) {
        db.collection("users")
          .doc(currentUser.uid)
          .collection("roadmaps")
          .doc(state.roadmap.id || "current")
          .set({
            ...state.roadmap,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            uid: currentUser.uid
          }, { merge: true })
          .catch((err) => console.log('Firestore sync skip:', err.message));
      }
    } catch (e) {
      console.warn('[Study Dost] Storage save error:', e);
    }
  }

  function setupAuthObserver() {
    if (!auth) return;
    auth.onAuthStateChanged((user) => {
      currentUser = user;
      if (user && db) {
        // Fetch saved roadmaps from Firestore
        db.collection("users")
          .doc(user.uid)
          .collection("roadmaps")
          .orderBy("createdAt", "desc")
          .limit(10)
          .get()
          .then((snapshot) => {
            if (!snapshot.empty) {
              const remoteList = [];
              snapshot.forEach((doc) => remoteList.push(doc.data()));
              if (remoteList.length > 0) {
                state.history = remoteList;
                localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(remoteList));
              }
            }
          })
          .catch((err) => console.log('Remote roadmap fetch note:', err.message));
      }
    });
  }

  // ─── SCREEN NAVIGATION ───
  function showScreen(screenName) {
    state.screen = screenName;
    const tabRoadmapMode = $('tabRoadmapMode');
    const tabSuperRevisionMode = $('tabSuperRevisionMode');
    const screenSuperRevision = $('screenSuperRevision');

    if (screenName === "super-revision") {
      screenTaskInput.classList.remove('active');
      screenRoadmapView.classList.remove('active');
      if (screenSuperRevision) screenSuperRevision.classList.add('active');
      if (tabRoadmapMode) tabRoadmapMode.classList.remove('active');
      if (tabSuperRevisionMode) tabSuperRevisionMode.classList.add('active');
      if (floatingTimerWidget) floatingTimerWidget.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (screenSuperRevision) screenSuperRevision.classList.remove('active');
    if (tabRoadmapMode) tabRoadmapMode.classList.add('active');
    if (tabSuperRevisionMode) tabSuperRevisionMode.classList.remove('active');

    if (screenName === "input") {
      screenTaskInput.classList.add('active');
      screenRoadmapView.classList.remove('active');
      if (floatingTimerWidget) floatingTimerWidget.style.display = 'none';
    } else {
      screenTaskInput.classList.remove('active');
      screenRoadmapView.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ─── ICON DETECTOR (As specified in prompt) ───
  function detectTaskIcon(taskText) {
    const text = (taskText || '').toLowerCase();
    if (text.includes("python") || text.includes("java") || text.includes("code") || text.includes("dsa") || text.includes("programming") || text.includes("c++") || text.includes("sql")) {
      return "💻";
    }
    if (text.includes("read") || text.includes("study") || text.includes("learn") || text.includes("chapter") || text.includes("theory") || text.includes("ncert") || text.includes("polity")) {
      return "📚";
    }
    if (text.includes("solve") || text.includes("practice") || text.includes("problems") || text.includes("exercises") || text.includes("numericals") || text.includes("mcq")) {
      return "🧩";
    }
    if (text.includes("install") || text.includes("setup") || text.includes("configure") || text.includes("download") || text.includes("env")) {
      return "⚡";
    }
    if (text.includes("test") || text.includes("quiz") || text.includes("mock") || text.includes("exam") || text.includes("assessment")) {
      return "✅";
    }
    if (text.includes("watch") || text.includes("video") || text.includes("lecture") || text.includes("webinar") || text.includes("stream")) {
      return "🎬";
    }
    return "✨";
  }

  // ─── SCREEN 1: INPUT HANDLING ───
  function renderInputTasks() {
    taskListContainer.innerHTML = '';

    if (state.rawTasks.length === 0) {
      if (emptyTasksNotice) emptyTasksNotice.style.display = 'block';
      taskListContainer.appendChild(emptyTasksNotice);
      taskCountLabel.textContent = "0 tasks added";
      clearAllTasksBtn.style.display = 'none';
      generateRoadmapBtn.disabled = true;
      return;
    }

    if (emptyTasksNotice) emptyTasksNotice.style.display = 'none';
    taskCountLabel.textContent = `${state.rawTasks.length} task${state.rawTasks.length > 1 ? 's' : ''} added`;
    clearAllTasksBtn.style.display = 'inline-block';
    generateRoadmapBtn.disabled = false;

    state.rawTasks.forEach((taskStr, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'sd-task-pill-item';
      itemEl.style.animationDelay = `${index * 0.05}s`;

      const icon = detectTaskIcon(taskStr);

      itemEl.innerHTML = `
        <div class="sd-tpi-left">
          <span class="sd-tpi-num">${index + 1}</span>
          <span class="sd-tpi-icon">${icon}</span>
          <span class="sd-tpi-text">${escapeHtml(taskStr)}</span>
        </div>
        <button type="button" class="sd-tpi-del" data-index="${index}" title="Remove task">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      const delBtn = itemEl.querySelector('.sd-tpi-del');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTaskInput(index);
      });

      taskListContainer.appendChild(itemEl);
    });
  }

  function addTaskInput(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    state.rawTasks.push(trimmed);
    renderInputTasks();
    saveState();
    playTone(600, 'sine', 0.08, 0.1);
  }

  function removeTaskInput(index) {
    state.rawTasks.splice(index, 1);
    renderInputTasks();
    saveState();
  }

  // ─── AI ROADMAP GENERATOR (Cloudflare Worker Integration) ───
  async function generateRoadmapFromTasks() {
    if (state.rawTasks.length === 0) return;

    // Loading State on Button
    const originalBtnHtml = generateRoadmapBtn.innerHTML;
    generateRoadmapBtn.disabled = true;
    generateRoadmapBtn.innerHTML = `
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>AI Engineering Your Journey...</span>
    `;

    showToast("AI is analyzing task dependencies and ordering easiest first...", "info");

    const promptText = `Analyze these student tasks and provide: 1) Suggested order (easiest first), 2) Estimated time for each (in minutes), 3) Category for each (like: setup, learning, practice, revision, project). Tasks: ${state.rawTasks.map((t, idx) => `${idx + 1}. ${t}`).join(', ')}`;

    let aiTasks = null;

    try {
      const response = await fetch(CONFIG.AI_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: promptText,
          subject: "Task Analysis",
          mode: "task-analysis"
        })
      });

      if (response.ok) {
        const data = await response.json();
        // The worker may return { tasks: [...] } or a text message with JSON
        if (data && Array.isArray(data.tasks) && data.tasks.length > 0) {
          aiTasks = data.tasks;
        } else if (data && typeof data === 'object') {
          // Look for nested tasks
          const possibleArray = data.tasks || data.roadmap || data.data;
          if (Array.isArray(possibleArray)) {
            aiTasks = possibleArray;
          } else if (data.response || data.text || data.answer) {
            // Try parsing JSON block from raw text
            const rawText = data.response || data.text || data.answer;
            aiTasks = tryParseJsonArrayFromText(rawText);
          }
        }
      }
    } catch (err) {
      console.warn('[Study Dost] Worker call fallback triggered:', err.message);
    }

    // Heuristic Fallback Engine if worker times out or provides non-JSON
    if (!aiTasks || !Array.isArray(aiTasks) || aiTasks.length === 0) {
      aiTasks = generateSmartHeuristicTasks(state.rawTasks);
    }

    // Build the finalized Roadmap object
    const finalizedTasks = aiTasks.map((t, i) => {
      const orig = t.original || t.title || state.rawTasks[i] || `Task ${i + 1}`;
      const icon = t.icon || detectTaskIcon(orig);
      const estMin = parseInt(t.estimatedMinutes, 10) || guessEstimatedMinutes(orig);
      const category = t.category || guessCategory(orig);
      const hint = t.hint || `Break down "${orig}" into manageable mini-steps. Stay hyper-focused for ${estMin} minutes.`;
      
      let substeps = [];
      if (Array.isArray(t.substeps) && t.substeps.length > 0) {
        substeps = t.substeps.map(s => ({
          text: typeof s === 'string' ? s : (s.text || 'Step'),
          done: false
        }));
      } else {
        substeps = [
          { text: "Review concepts and setup materials", done: false },
          { text: "Core active execution & practice", done: false },
          { text: "Quick self-check and note down learnings", done: false }
        ];
      }

      return {
        id: `t_${Date.now()}_${i}`,
        original: orig,
        title: orig,
        icon: icon,
        category: category,
        estimatedMinutes: estMin,
        hint: hint,
        substeps: substeps,
        notes: "",
        status: i === 0 ? "in-progress" : "locked",
        timeSpentSeconds: 0,
        completedAt: null,
        timerRunning: false
      };
    });

    state.roadmap = {
      id: "rdm_" + Date.now(),
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      title: `Mission ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      tasks: finalizedTasks
    };

    state.activeTaskId = finalizedTasks[0].id;

    // Reset button
    generateRoadmapBtn.innerHTML = originalBtnHtml;
    generateRoadmapBtn.disabled = false;

    // Add to history
    state.history.unshift({
      id: state.roadmap.id,
      date: state.roadmap.date,
      title: state.roadmap.title,
      taskCount: state.roadmap.tasks.length,
      completedCount: 0
    });

    saveState();
    playUnlockChime();
    showToast("Roadmap generated! Your mission has begun 🚀", "success");

    showScreen("roadmap");
    renderRoadmap();
  }

  function tryParseJsonArrayFromText(text) {
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const raw = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.tasks)) return parsed.tasks;
    } catch (e) {
      // not strict JSON
    }
    return null;
  }

  function guessEstimatedMinutes(taskStr) {
    const text = taskStr.toLowerCase();
    if (text.includes("install") || text.includes("setup") || text.includes("quick") || text.includes("revise")) return 15;
    if (text.includes("solve") || text.includes("practice") || text.includes("dsa") || text.includes("10")) return 35;
    if (text.includes("chapter") || text.includes("mock") || text.includes("paper")) return 45;
    if (text.includes("read") || text.includes("notes")) return 25;
    return 30;
  }

  function guessCategory(taskStr) {
    const text = taskStr.toLowerCase();
    if (text.includes("install") || text.includes("setup") || text.includes("env")) return "setup";
    if (text.includes("solve") || text.includes("problem") || text.includes("code") || text.includes("dsa")) return "practice";
    if (text.includes("read") || text.includes("learn") || text.includes("theory") || text.includes("ncert")) return "learning";
    if (text.includes("revise") || text.includes("revision") || text.includes("quiz")) return "revision";
    return "project";
  }

  function generateSmartHeuristicTasks(taskList) {
    // Sort easiest (setup/reading) first
    const sorted = [...taskList].sort((a, b) => {
      const getPriority = (str) => {
        const s = str.toLowerCase();
        if (s.includes("install") || s.includes("setup")) return 1;
        if (s.includes("read") || s.includes("learn")) return 2;
        if (s.includes("solve") || s.includes("practice")) return 3;
        return 4;
      };
      return getPriority(a) - getPriority(b);
    });

    return sorted.map((t) => {
      const icon = detectTaskIcon(t);
      const est = guessEstimatedMinutes(t);
      const cat = guessCategory(t);
      return {
        original: t,
        category: cat,
        estimatedMinutes: est,
        icon: icon,
        hint: `Focus on mastering ${t} with zero distractions. Tackle the fundamentals before deep execution.`,
        substeps: [
          `Read / Gather materials for: ${t.slice(0, 32)}`,
          `Execute main requirements step-by-step`,
          `Verify output and note key insights`
        ]
      };
    });
  }

  // ─── SCREEN 2: ROADMAP VIEW RENDERING ───
  function renderRoadmap() {
    if (!state.roadmap || !state.roadmap.tasks) return;

    const tasks = state.roadmap.tasks;
    roadmapMilestonesPath.innerHTML = '';

    const completedCount = tasks.filter(t => t.status === "done").length;
    const totalCount = tasks.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Update Top Overview Widgets
    ringPctLabel.textContent = `${pct}%`;
    ringCountLabel.textContent = `${completedCount} of ${totalCount}`;

    // SVG Ring calculation: r=35, circumference = 2 * PI * 35 ≈ 219.91
    const circumference = 219.91;
    const offset = circumference - (pct / 100) * circumference;
    roadmapRingFill.style.strokeDashoffset = offset;

    roadmapStreakNum.textContent = state.streak;
    roadmapTotalTimeLabel.textContent = `${state.totalMinutesSpent} min`;
    roadmapXpNum.textContent = `+${completedCount * 10}`;

    // Render Each Milestone & Connector
    tasks.forEach((task, index) => {
      // Create Milestone Card
      const card = document.createElement('div');
      card.className = `sd-milestone-card ${task.status}`;
      card.id = `milestoneCard_${task.id}`;

      const isDone = task.status === "done";
      const isInProgress = task.status === "in-progress";
      const isLocked = task.status === "locked";

      let statusBadgeHtml = '';
      if (isDone) {
        statusBadgeHtml = `<span class="sd-status-badge done"><i class="fa-solid fa-check"></i> DONE ✅</span>`;
      } else if (isInProgress) {
        statusBadgeHtml = `<span class="sd-status-badge in-progress"><i class="fa-solid fa-fire"></i> IN PROGRESS</span>`;
      } else {
        statusBadgeHtml = `<span class="sd-status-badge locked"><i class="fa-solid fa-lock"></i> LOCKED</span>`;
      }

      // Substeps progress calculation
      const doneSubs = task.substeps.filter(s => s.done).length;
      const totalSubs = task.substeps.length;
      const subPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
      const cardProgressBarWidth = isDone ? 100 : subPct;

      card.innerHTML = `
        <div class="sd-mc-header">
          <div class="sd-mc-left">
            <div class="sd-node-circle">${isDone ? '✓' : index + 1}</div>
            <div class="sd-mc-info">
              <div class="sd-mc-title-row">
                <span class="sd-mc-icon">${task.icon}</span>
                <h3 class="sd-mc-title">${escapeHtml(task.title)}</h3>
              </div>
              <div class="sd-mc-meta">
                <span class="sd-mc-meta-item"><i class="fa-solid fa-tag text-gold"></i> ${capitalize(task.category)}</span>
                <span class="sd-mc-meta-item"><i class="fa-regular fa-clock"></i> ${task.estimatedMinutes} min</span>
                ${task.completedAt ? `<span class="sd-mc-meta-item text-green"><i class="fa-solid fa-sparkles"></i> Completed at ${task.completedAt}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="sd-mc-right">
            ${statusBadgeHtml}
          </div>
        </div>

        <!-- Animated Progress Bar -->
        <div class="sd-mc-progress-bar">
          <div class="sd-mc-progress-fill" style="width: ${cardProgressBarWidth}%;"></div>
        </div>

        <!-- Expanded Drawer / Interactive Body -->
        <div class="sd-mc-expanded-body" id="expandedBody_${task.id}" style="${isLocked ? 'display:none;' : 'display:flex;'}">
          <!-- AI Hint Box -->
          <div class="sd-hint-box">
            <i class="fa-solid fa-lightbulb"></i>
            <span><strong>Dost Hint:</strong> ${escapeHtml(task.hint)}</span>
          </div>

          <!-- Sub-Checklist -->
          <div class="sd-substeps-wrap">
            <div class="sd-substeps-title">Action Milestones (${doneSubs}/${totalSubs})</div>
            ${task.substeps.map((sub, sIdx) => `
              <div class="sd-substep-item ${sub.done ? 'checked' : ''}" data-task-id="${task.id}" data-sub-idx="${sIdx}">
                <button type="button" class="sd-substep-checkbox"><i class="fa-solid fa-check"></i></button>
                <span>${escapeHtml(sub.text)}</span>
              </div>
            `).join('')}
          </div>

          <!-- Notes Area -->
          <textarea
            class="sd-notes-input"
            data-task-id="${task.id}"
            placeholder="Quick notes or doubts for this task... (auto-saved)"
            rows="2"
          >${escapeHtml(task.notes || '')}</textarea>

          <!-- Interactive Action Buttons -->
          <div class="sd-mc-action-btns">
            ${isInProgress ? `
              <button type="button" class="sd-act-btn start" data-action="focus" data-task-id="${task.id}">
                <i class="fa-solid fa-play"></i> <span>Launch Focus Mode</span>
              </button>
              <button type="button" class="sd-act-btn complete" data-action="complete" data-task-id="${task.id}">
                <i class="fa-solid fa-circle-check"></i> <span>Mark Complete ✅</span>
              </button>
            ` : ''}

            ${isDone ? `
              <button type="button" class="sd-act-btn restart" data-action="restart" data-task-id="${task.id}" style="background:var(--bg-surface-3);color:var(--text-secondary);border:1px solid var(--border-subtle);">
                <i class="fa-solid fa-rotate-left"></i> <span>Re-open Task</span>
              </button>
            ` : ''}

            ${!isLocked ? `
              <button type="button" class="sd-act-btn ask-dost" data-action="ask-ai" data-task-id="${task.id}">
                <i class="fa-solid fa-robot"></i> <span>Ask Study Dost</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      // Card Click Handler (Expand/Collapse or Locked Alert)
      card.addEventListener('click', (e) => {
        // Ignore if clicking inner controls directly
        if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('.sd-substep-item')) return;

        if (isLocked) {
          showToast(`Milestone ${index + 1} is locked! Complete previous milestone first 🔒`, "warning");
          playTone(280, 'sawtooth', 0.12, 0.15);
          return;
        }

        const expBody = $(`expandedBody_${task.id}`);
        if (expBody) {
          expBody.style.display = expBody.style.display === 'none' ? 'flex' : 'none';
        }
      });

      roadmapMilestonesPath.appendChild(card);

      // Add Connecting Line between milestones (if not the last task)
      if (index < tasks.length - 1) {
        const nextTask = tasks[index + 1];
        const connector = document.createElement('div');
        connector.className = 'sd-connector-line';
        if (isDone) {
          connector.classList.add('done');
        } else if (isInProgress) {
          connector.classList.add('pulse');
        }
        roadmapMilestonesPath.appendChild(connector);
      }
    });

    // Wire up dynamic events in newly rendered roadmap
    wireRoadmapInteractiveEvents();

    // Update Bottom Statistics Panel
    updateStatisticsPanel();
  }

  function wireRoadmapInteractiveEvents() {
    // Substeps checkboxes
    document.querySelectorAll('.sd-substep-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = item.getAttribute('data-task-id');
        const subIdx = parseInt(item.getAttribute('data-sub-idx'), 10);
        toggleSubstep(taskId, subIdx);
      });
    });

    // Notes auto-save
    document.querySelectorAll('.sd-notes-input').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const taskId = textarea.getAttribute('data-task-id');
        saveTaskNotes(taskId, textarea.value);
      });
    });

    // Action buttons
    document.querySelectorAll('.sd-act-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const taskId = btn.getAttribute('data-task-id');

        if (action === 'focus') {
          openFocusMode(taskId);
        } else if (action === 'complete') {
          completeTask(taskId);
        } else if (action === 'restart') {
          reopenTask(taskId);
        } else if (action === 'ask-ai') {
          openChatDrawerWithTaskContext(taskId);
        }
      });
    });
  }

  function toggleSubstep(taskId, subIdx) {
    if (!state.roadmap) return;
    const task = state.roadmap.tasks.find(t => t.id === taskId);
    if (!task || !task.substeps[subIdx]) return;

    task.substeps[subIdx].done = !task.substeps[subIdx].done;
    playTone(task.substeps[subIdx].done ? 750 : 450, 'sine', 0.08, 0.12);
    saveState();
    renderRoadmap();
  }

  function saveTaskNotes(taskId, notes) {
    if (!state.roadmap) return;
    const task = state.roadmap.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.notes = notes;
    saveState();
  }

  // ─── TASK COMPLETION & FLOW ANIMATION ───
  function completeTask(taskId) {
    if (!state.roadmap) return;
    const taskIndex = state.roadmap.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = state.roadmap.tasks[taskIndex];
    if (task.status === "done") return;

    // Mark done
    task.status = "done";
    const now = new Date();
    task.completedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.totalTasksCompletedCount += 1;

    // Check early completion bonus (< estimated time)
    let bonusXp = 0;
    const sessionMins = Math.round((task.timeSpentSeconds || 0) / 60);
    if (sessionMins > 0 && sessionMins < task.estimatedMinutes) {
      bonusXp = 5;
    }

    const earnedXp = 10 + bonusXp;
    addXp(earnedXp);

    // Stop timer if running for this task
    if (state.timer.taskId === taskId) {
      pauseTimer();
      if (floatingTimerWidget) floatingTimerWidget.style.display = 'none';
      if (focusModeOverlay) focusModeOverlay.style.display = 'none';
    }

    // Unlock next task if exists
    if (taskIndex + 1 < state.roadmap.tasks.length) {
      const nextTask = state.roadmap.tasks[taskIndex + 1];
      nextTask.status = "in-progress";
      state.activeTaskId = nextTask.id;
      showToast(`Next milestone unlocked: ${nextTask.title} 🔓`, "info");
      playUnlockChime();
    }

    // Audio & Confetti burst
    playSuccessChime();
    triggerConfetti();

    // Check Achievements
    checkAchievements(task, bonusXp);

    showToast(`Task Complete! +${earnedXp} XP 🚀`, "success");

    saveState();
    renderRoadmap();
  }

  function reopenTask(taskId) {
    if (!state.roadmap) return;
    const task = state.roadmap.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.status = "in-progress";
    task.completedAt = null;
    state.activeTaskId = task.id;
    saveState();
    renderRoadmap();
  }

  // ─── GAMIFICATION: XP & BADGES ───
  function addXp(amount) {
    const oldLevel = Math.floor(state.xp / 100) + 1;
    state.xp += amount;
    const newLevel = Math.floor(state.xp / 100) + 1;

    updateGamificationUI();

    if (newLevel > oldLevel) {
      const title = LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)];
      showAchievementPopup("LEVEL UP! ⚡", `You reached Level ${newLevel}: ${title}!`, "⚡");
      playSuccessChime();
    }
  }

  function updateGamificationUI() {
    const level = Math.floor(state.xp / 100) + 1;
    const xpInLevel = state.xp % 100;
    const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

    if (navLevelTitle) navLevelTitle.textContent = title;
    if (navLevelNum) navLevelNum.textContent = `Lv. ${level}`;
    if (navXpFill) navXpFill.style.width = `${xpInLevel}%`;
    if (navXpText) navXpText.textContent = `${xpInLevel} / 100 XP`;
    if (navBadgeCountPill) navBadgeCountPill.textContent = `${state.badges.length}/${BADGES_CATALOG.length}`;
  }

  function unlockBadge(badgeId) {
    if (state.badges.includes(badgeId)) return;
    state.badges.push(badgeId);
    saveState();
    updateGamificationUI();

    const badge = BADGES_CATALOG.find(b => b.id === badgeId);
    if (badge) {
      showAchievementPopup(badge.title, badge.desc, badge.icon);
      playSuccessChime();
    }
  }

  function checkAchievements(completedTask, bonusXp) {
    // 🎯 First Task
    if (state.totalTasksCompletedCount >= 1) {
      unlockBadge("first_task");
    }

    // ⚡ Speed Demon (< 5 min)
    if (completedTask && completedTask.timeSpentSeconds > 0 && completedTask.timeSpentSeconds < 300) {
      unlockBadge("speed_demon");
    }

    // 💪 Consistency King (10 tasks)
    if (state.totalTasksCompletedCount >= 10) {
      unlockBadge("consistency_king");
    }

    // 🔥 3-Day Streak
    if (state.streak >= 3) {
      unlockBadge("streak_3");
    }

    // 🏆 Marathon (>= 120 min total study time)
    if (state.totalMinutesSpent >= 120) {
      unlockBadge("marathon");
    }

    // 🌟 Perfect Day (all tasks in current roadmap done)
    if (state.roadmap && state.roadmap.tasks.every(t => t.status === "done")) {
      unlockBadge("perfect_day");
      addXp(30); // Bonus for full completion!
    }
  }

  function showAchievementPopup(title, desc, icon) {
    if (!badgePopup) return;
    badgePopupIcon.textContent = icon || "🏆";
    badgePopupTitle.textContent = title;
    badgePopupDesc.textContent = desc;

    badgePopup.style.display = 'block';
    setTimeout(() => {
      badgePopup.style.display = 'none';
    }, 4500);
  }

  // ─── BOTTOM STATISTICS PANEL ───
  function updateStatisticsPanel() {
    if (!state.roadmap) return;
    const tasks = state.roadmap.tasks;
    const completed = tasks.filter(t => t.status === "done").length;
    const total = tasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (statCompletedToday) statCompletedToday.textContent = completed;
    if (statTimeSpent) statTimeSpent.textContent = `${state.totalMinutesSpent} min`;
    if (statCompletionRate) statCompletionRate.textContent = `${rate}%`;
    if (statLongestStreak) statLongestStreak.textContent = `${state.streak} days`;
  }

  // ─── TIMER ENGINE (FLOATING MINI CLOCK & FOCUS MODE) ───
  function startTimer(taskId) {
    initAudioContext();
    const task = state.roadmap ? state.roadmap.tasks.find(t => t.id === taskId) : null;
    if (!task) return;

    if (state.timer.taskId !== taskId) {
      const minutes = task.estimatedMinutes || 25;
      state.timer.taskId = taskId;
      state.timer.totalSeconds = minutes * 60;
      state.timer.secondsRemaining = minutes * 60;
      state.timer.sessionStartTimestamp = Date.now();
    }

    if (state.timer.intervalId) clearInterval(state.timer.intervalId);

    state.timer.isRunning = true;
    updateTimerDisplays();

    // Show floating mini clock widget
    if (floatingTimerWidget) {
      floatingTimerWidget.style.display = 'block';
      if (ftTaskNameShort) ftTaskNameShort.textContent = task.title;
    }

    state.timer.intervalId = setInterval(() => {
      if (state.timer.secondsRemaining > 0) {
        state.timer.secondsRemaining -= 1;
        task.timeSpentSeconds = (task.timeSpentSeconds || 0) + 1;

        // Every 60 seconds, increment totalMinutesSpent
        if (task.timeSpentSeconds % 60 === 0) {
          state.totalMinutesSpent += 1;
          saveState();
          updateStatisticsPanel();
          if (roadmapTotalTimeLabel) roadmapTotalTimeLabel.textContent = `${state.totalMinutesSpent} min`;
        }

        updateTimerDisplays();
      } else {
        // Timer completed!
        pauseTimer();
        playTimerAlertSound();
        showToast(`Time's up for: ${task.title}! Complete kar bhai! 💪`, "warning");
      }
    }, 1000);
  }

  function pauseTimer() {
    if (state.timer.intervalId) clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;
    updateTimerDisplays();
  }

  function toggleTimer() {
    if (state.timer.isRunning) {
      pauseTimer();
    } else {
      if (state.timer.taskId) {
        startTimer(state.timer.taskId);
      } else if (state.activeTaskId) {
        startTimer(state.activeTaskId);
      }
    }
  }

  function formatTime(totalSecs) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateTimerDisplays() {
    const formatted = formatTime(state.timer.secondsRemaining);
    const total = state.timer.totalSeconds || (25 * 60);
    const pct = total > 0 ? (state.timer.secondsRemaining / total) : 0;

    // Mini Floating Clock
    if (ftDigitalTime) ftDigitalTime.textContent = formatted;
    if (ftRingFill) {
      // Circumference = 2 * PI * 22 ≈ 138.2
      const circ = 138.2;
      ftRingFill.style.strokeDashoffset = circ * (1 - pct);
    }
    if (ftToggleBtn) {
      ftToggleBtn.innerHTML = state.timer.isRunning ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }

    // Full Screen Focus Mode
    if (focusDigitsTime) focusDigitsTime.textContent = formatted;
    if (focusRingFill) {
      // Circumference = 2 * PI * 120 ≈ 753.98
      const circLarge = 753.98;
      focusRingFill.style.strokeDashoffset = circLarge * (1 - pct);
    }
    if (focusPlayPauseBtn) {
      focusPlayPauseBtn.innerHTML = state.timer.isRunning
        ? '<i class="fa-solid fa-pause"></i> <span>Pause</span>'
        : '<i class="fa-solid fa-play"></i> <span>Resume Focus</span>';
    }
  }

  // ─── FULL SCREEN FOCUS MODE ───
  function openFocusMode(taskId) {
    if (!state.roadmap) return;
    const task = state.roadmap.tasks.find(t => t.id === taskId);
    if (!task) return;

    state.activeTaskId = taskId;
    if (focusTaskTitle) focusTaskTitle.textContent = task.title;
    if (focusTaskCategory) focusTaskCategory.textContent = `${task.icon} ${capitalize(task.category)}`;

    focusModeOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    startTimer(taskId);

    // Auto-hide cursor in focus mode
    setupCursorInactivity();
  }

  function closeFocusMode() {
    focusModeOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  let cursorTimer = null;
  function setupCursorInactivity() {
    window.addEventListener('mousemove', () => {
      if (focusModeOverlay.style.display === 'flex') {
        document.body.style.cursor = 'default';
        if (cursorTimer) clearTimeout(cursorTimer);
        cursorTimer = setTimeout(() => {
          if (focusModeOverlay.style.display === 'flex') {
            document.body.style.cursor = 'none';
          }
        }, 3000);
      }
    });
  }

  function startQuoteRotation() {
    let quoteIdx = 0;
    setInterval(() => {
      quoteIdx = (quoteIdx + 1) % FOCUS_QUOTES.length;
      if (focusQuoteText) {
        focusQuoteText.style.opacity = '0';
        setTimeout(() => {
          focusQuoteText.textContent = FOCUS_QUOTES[quoteIdx];
          focusQuoteText.style.opacity = '1';
        }, 400);
      }
    }, 30000);
  }

  // ─── FLOATING TIMER DRAGGING ENGINE ───
  function setupDraggableFloatingTimer() {
    if (!floatingTimerWidget || !floatingTimerHandle) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    floatingTimerHandle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = floatingTimerWidget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      floatingTimerWidget.style.right = 'auto';
      floatingTimerWidget.style.bottom = 'auto';
      floatingTimerWidget.style.left = `${initialLeft}px`;
      floatingTimerWidget.style.top = `${initialTop}px`;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      floatingTimerWidget.style.left = `${Math.max(10, Math.min(window.innerWidth - 230, initialLeft + dx))}px`;
      floatingTimerWidget.style.top = `${Math.max(60, Math.min(window.innerHeight - 180, initialTop + dy))}px`;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch Support for Mobile
    floatingTimerHandle.addEventListener('touchstart', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = floatingTimerWidget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      floatingTimerWidget.style.right = 'auto';
      floatingTimerWidget.style.bottom = 'auto';
      floatingTimerWidget.style.left = `${initialLeft}px`;
      floatingTimerWidget.style.top = `${initialTop}px`;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      floatingTimerWidget.style.left = `${Math.max(10, Math.min(window.innerWidth - 230, initialLeft + dx))}px`;
      floatingTimerWidget.style.top = `${Math.max(60, Math.min(window.innerHeight - 180, initialTop + dy))}px`;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  // ─── CHAT WITH STUDY DOST (AI MENTOR DRAWER) ───
  function openChatDrawerWithTaskContext(taskId) {
    const task = state.roadmap ? state.roadmap.tasks.find(t => t.id === taskId) : null;
    studyDostChatDrawer.classList.add('open');
    chatDrawerOverlay.classList.add('open');

    if (task) {
      appendChatMessage("dost", `I see you're focusing on <strong>"${escapeHtml(task.title)}"</strong> (${task.estimatedMinutes} min). What's blocking you or what concept can I explain?`);
    }
  }

  function closeChatDrawer() {
    studyDostChatDrawer.classList.remove('open');
    chatDrawerOverlay.classList.remove('open');
  }

  function appendChatMessage(sender, htmlContent) {
    const msgEl = document.createElement('div');
    msgEl.className = `sd-msg ${sender}`;
    msgEl.innerHTML = `<div class="sd-msg-bubble">${htmlContent}</div>`;
    chatDostMessages.appendChild(msgEl);
    chatDostMessages.scrollTop = chatDostMessages.scrollHeight;
  }

  async function handleChatSubmit(e) {
    if (e) e.preventDefault();
    const query = chatDostInput.value.trim();
    if (!query) return;

    chatDostInput.value = '';
    appendChatMessage("user", escapeHtml(query));

    // Typing indicator
    const typingId = `typing_${Date.now()}`;
    const typingEl = document.createElement('div');
    typingEl.className = 'sd-msg dost';
    typingEl.id = typingId;
    typingEl.innerHTML = `<div class="sd-msg-bubble"><i class="fa-solid fa-ellipsis fa-fade"></i> Dost is thinking...</div>`;
    chatDostMessages.appendChild(typingEl);
    chatDostMessages.scrollTop = chatDostMessages.scrollHeight;

    // Build context
    const currentTask = state.roadmap ? state.roadmap.tasks.find(t => t.id === state.activeTaskId) : null;
    const taskContext = currentTask ? `Current Task: "${currentTask.title}" (${currentTask.category}, ${currentTask.estimatedMinutes}m). Substeps: ${currentTask.substeps.map(s => s.text).join('; ')}.` : 'No specific task selected.';

    const systemPrompt = `You are Study Dost, an enthusiastic, highly supportive GenZ AI study mentor for 'The Chairman Show' platform. Provide direct, razor-sharp, practical advice in simple Hinglish/English with bullet points and positive encouragement. Student query: "${query}". Context: ${taskContext}`;

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: systemPrompt,
          subject: "Study Dost Tutoring",
          mode: "study-buddy"
        })
      });

      const typing = $(typingId);
      if (typing) typing.remove();

      if (resp.ok) {
        const data = await resp.json();
        const reply = data.response || data.text || data.answer || "Focus on one sub-step at a time bhai! Break down the problem, eliminate tabs, and set a 15-minute timer.";
        appendChatMessage("dost", formatMarkdown(reply));
      } else {
        appendChatMessage("dost", `Here is how to tackle it: 1) Break it down into 3-minute mini-chunks. 2) Write the key definition on paper. 3) You've got this, let's keep the streak alive!`);
      }
    } catch (err) {
      const typing = $(typingId);
      if (typing) typing.remove();
      appendChatMessage("dost", `Don't panic! For <strong>"${currentTask ? escapeHtml(currentTask.title) : 'this task'}"</strong>, start with the theory for 5 minutes, solve 1 small example, and you will build instant momentum! 💪`);
    }
  }

  // ─── MODALS: BADGES & HISTORY ───
  function renderBadgesModal() {
    badgesGridContainer.innerHTML = '';
    BADGES_CATALOG.forEach(b => {
      const isUnlocked = state.badges.includes(b.id);
      const item = document.createElement('div');
      item.className = `sd-badge-item ${isUnlocked ? 'unlocked' : ''}`;
      item.innerHTML = `
        <div class="sd-bi-icon">${b.icon}</div>
        <div class="sd-bi-info">
          <h5>${b.title} ${isUnlocked ? '✅' : '🔒'}</h5>
          <p>${b.desc}</p>
        </div>
      `;
      badgesGridContainer.appendChild(item);
    });
  }

  function renderHistoryModal() {
    historyListContainer.innerHTML = '';
    if (state.history.length === 0) {
      historyListContainer.innerHTML = '<p class="sd-text-muted" style="text-align:center;padding:20px;">No saved roadmaps yet. Create your first mission!</p>';
      return;
    }

    state.history.forEach((hist, idx) => {
      const item = document.createElement('div');
      item.className = 'sd-history-item';
      item.innerHTML = `
        <div>
          <h5 style="margin:0 0 4px;font-family:var(--font-heading);">${escapeHtml(hist.title || `Roadmap #${idx + 1}`)}</h5>
          <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${hist.date || 'Recent'} • ${hist.taskCount || 0} tasks</span>
        </div>
        <button type="button" class="sd-btn-resume" style="background:var(--gold-soft);color:var(--gold-primary);border:1px solid var(--border-gold);padding:6px 14px;border-radius:9999px;font-size:0.78rem;font-weight:700;cursor:pointer;">
          Resume
        </button>
      `;

      item.querySelector('.sd-btn-resume').addEventListener('click', () => {
        // If it's the current roadmap, just show it
        if (state.roadmap && state.roadmap.id === hist.id) {
          historyModal.classList.remove('open');
          showScreen("roadmap");
        } else {
          showToast("Roadmap loaded from history!", "info");
          historyModal.classList.remove('open');
          showScreen("roadmap");
        }
      });

      historyListContainer.appendChild(item);
    });
  }

  // ─── CONFETTI ENGINE ───
  function triggerConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#D4AF37', '#7c3aed', '#10b981', '#00d4ff', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let frame = 0;
    function render() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        p.opacity -= 0.012;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frame++;
      if (frame < 80) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    requestAnimationFrame(render);
  }

  // ─── TOAST NOTIFICATIONS ───
  function showToast(message, type = "info") {
    if (!toastStack) return;
    const toast = document.createElement('div');
    toast.className = `sd-toast ${type}`;

    let icon = "fa-info-circle";
    if (type === "success") icon = "fa-circle-check";
    if (type === "warning") icon = "fa-triangle-exclamation";

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    toastStack.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ─── THEME TOGGLE ───
  function setupThemeToggle() {
    const themeToggle = $('themeToggle');
    const themeIcon = $('themeIcon');
    if (!themeToggle) return;

    const currentTheme = localStorage.getItem('tcs_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeIcon) {
      themeIcon.className = currentTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    themeToggle.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme');
      const next = active === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tcs_theme', next);
      if (themeIcon) {
        themeIcon.className = next === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
    });
  }

  // ─── GLOBAL EVENT LISTENERS ───
  function setupEventListeners() {
    // Screen 1: Add Task Form
    if (addTaskForm) {
      addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTaskInput(taskTextInput.value);
        taskTextInput.value = '';
      });
    }

    // Quick presets
    document.querySelectorAll('.sd-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const taskText = chip.getAttribute('data-task');
        if (taskText) addTaskInput(taskText);
      });
    });

    // Clear All Tasks
    if (clearAllTasksBtn) {
      clearAllTasksBtn.addEventListener('click', () => {
        state.rawTasks = [];
        renderInputTasks();
        saveState();
      });
    }

    // Generate Roadmap
    if (generateRoadmapBtn) {
      generateRoadmapBtn.addEventListener('click', generateRoadmapFromTasks);
    }

    // Back button in Roadmap Screen
    if (backToInputBtn) {
      backToInputBtn.addEventListener('click', () => {
        showScreen("input");
      });
    }

    // Draggable Floating Timer Controls
    setupDraggableFloatingTimer();
    if (ftToggleBtn) ftToggleBtn.addEventListener('click', toggleTimer);
    if (ftDoneBtn) {
      ftDoneBtn.addEventListener('click', () => {
        if (state.timer.taskId) completeTask(state.timer.taskId);
      });
    }
    if (ftExpandBtn) {
      ftExpandBtn.addEventListener('click', () => {
        if (state.timer.taskId) openFocusMode(state.timer.taskId);
        else if (state.activeTaskId) openFocusMode(state.activeTaskId);
      });
    }
    if (ftCloseBtn) {
      ftCloseBtn.addEventListener('click', () => {
        floatingTimerWidget.style.display = 'none';
      });
    }

    // Full Screen Focus Mode Controls
    if (exitFocusModeBtn) exitFocusModeBtn.addEventListener('click', closeFocusMode);
    if (focusPlayPauseBtn) focusPlayPauseBtn.addEventListener('click', toggleTimer);
    if (focusDoneBtn) {
      focusDoneBtn.addEventListener('click', () => {
        if (state.timer.taskId) completeTask(state.timer.taskId);
        else if (state.activeTaskId) completeTask(state.activeTaskId);
      });
    }
    if (focusAmbientMusicBtn) {
      focusAmbientMusicBtn.addEventListener('click', () => {
        const active = toggleAmbientMusic();
        if (ambientSoundLabel) {
          ambientSoundLabel.textContent = `Ambient Sound: ${active ? 'Playing 🎵' : 'Off'}`;
        }
      });
    }

    // Chat Drawer
    if (floatingChatDostBtn) {
      floatingChatDostBtn.addEventListener('click', () => {
        openChatDrawerWithTaskContext(state.activeTaskId);
      });
    }
    if (closeChatDrawerBtn) closeChatDrawerBtn.addEventListener('click', closeChatDrawer);
    if (chatDrawerOverlay) chatDrawerOverlay.addEventListener('click', closeChatDrawer);
    if (chatDostForm) chatDostForm.addEventListener('submit', handleChatSubmit);

    // Quick chips in chat
    if (chatQuickChips) {
      chatQuickChips.querySelectorAll('.sd-cchip').forEach(chip => {
        chip.addEventListener('click', () => {
          const q = chip.getAttribute('data-q');
          if (q) {
            chatDostInput.value = q;
            handleChatSubmit();
          }
        });
      });
    }

    // Badges Modal
    if (viewBadgesBtn) {
      viewBadgesBtn.addEventListener('click', () => {
        renderBadgesModal();
        badgesModal.classList.add('open');
      });
    }
    if (closeBadgesModalBtn) {
      closeBadgesModalBtn.addEventListener('click', () => {
        badgesModal.classList.remove('open');
      });
    }
    if (badgesModal) {
      badgesModal.addEventListener('click', (e) => {
        if (e.target === badgesModal) badgesModal.classList.remove('open');
      });
    }

    // History Modal
    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener('click', () => {
        renderHistoryModal();
        historyModal.classList.add('open');
      });
    }
    if (closeHistoryModalBtn) {
      closeHistoryModalBtn.addEventListener('click', () => {
        historyModal.classList.remove('open');
      });
    }
    if (historyModal) {
      historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) historyModal.classList.remove('open');
      });
    }

    // Initialize Chairman Super Revision Engine
    setupSuperRevision();

    // Check URL parameters for direct deep-linking
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (urlParams.get('mode') === 'super-revision' || urlParams.get('tab') === 'super-revision' || path === '/super-revision' || path === '/revision' || path === '/mindmap' || path === '/mindmaps') {
      showScreen('super-revision');
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // 'N' focuses input if on input screen
      if (e.key === 'n' || e.key === 'N') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          if (state.screen === 'input' && taskTextInput) {
            e.preventDefault();
            taskTextInput.focus();
          }
        }
      }
      // 'Escape' closes modals and focus mode
      if (e.key === 'Escape') {
        if (focusModeOverlay && focusModeOverlay.style.display === 'flex') {
          closeFocusMode();
        }
        if (badgesModal && badgesModal.classList.contains('open')) {
          badgesModal.classList.remove('open');
        }
        if (historyModal && historyModal.classList.contains('open')) {
          historyModal.classList.remove('open');
        }
        if (studyDostChatDrawer && studyDostChatDrawer.classList.contains('open')) {
          closeChatDrawer();
        }
        const nodeModal = $('nodeDetailModal');
        if (nodeModal && nodeModal.style.display !== 'none') {
          nodeModal.style.display = 'none';
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CHAIRMAN SUPER REVISION — CORE ENGINE IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════

  const SR_THEMES = {
    chairman: {
      bg: '#0a0a0f',
      grid: 'rgba(212, 175, 55, 0.1)',
      rootBg: 'linear-gradient(135deg, #2a2205, #141103)',
      rootBorder: '#D4AF37',
      rootText: '#fff',
      branchColors: ['#D4AF37', '#9333ea', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
      nodeBg: '#16161d',
      nodeText: '#f8fafc',
      nodeBorderAlpha: 0.7
    },
    cyber: {
      bg: '#060814',
      grid: 'rgba(0, 242, 254, 0.12)',
      rootBg: 'linear-gradient(135deg, #051d38, #0a0b24)',
      rootBorder: '#00f2fe',
      rootText: '#fff',
      branchColors: ['#00f2fe', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f43f5e'],
      nodeBg: '#0f172a',
      nodeText: '#f1f5f9',
      nodeBorderAlpha: 0.8
    },
    emerald: {
      bg: '#05110c',
      grid: 'rgba(16, 185, 129, 0.12)',
      rootBg: 'linear-gradient(135deg, #06381e, #051a10)',
      rootBorder: '#10b981',
      rootText: '#fff',
      branchColors: ['#10b981', '#D4AF37', '#06b6d4', '#84cc16', '#3b82f6', '#14b8a6'],
      nodeBg: '#0a1d15',
      nodeText: '#f0fdf4',
      nodeBorderAlpha: 0.8
    },
    light: {
      bg: '#f8fafc',
      grid: 'rgba(15, 23, 42, 0.08)',
      rootBg: 'linear-gradient(135deg, #1e293b, #0f172a)',
      rootBorder: '#0f172a',
      rootText: '#ffffff',
      branchColors: ['#b45309', '#6d28d9', '#0369a1', '#047857', '#be123c', '#4338ca'],
      nodeBg: '#ffffff',
      nodeText: '#0f172a',
      nodeBorderAlpha: 0.85
    }
  };

  const SR_PRESETS = {
    python_dsa: {
      title: "Python OOP, DSA & Algorithms (15 Slides PPT)",
      subject: "Computer Science & Coding",
      text: `Slide 1: Core Python & Memory Model - Python interpreter, GIL, dynamic typing, bytecode compilation, id() and mutable vs immutable types.
Slide 2: Object-Oriented Programming (OOP) - Classes, Objects, __init__ constructor, Dunder methods (__repr__, __str__, __eq__).
Slide 3: OOP 4 Pillars - Encapsulation (private _ and __ mangling), Inheritance (super(), MRO C3 linearization), Polymorphism, Abstraction (ABC, @abstractmethod).
Slide 4: Advanced Python - Decorators (@functools.wraps), Generators (yield, memory efficiency), Context Managers (with, __enter__, __exit__).
Slide 5: Asymptotic Analysis - Big-O, Omega, Theta. Amortized time complexity of dynamic array resizing. Space-Time tradeoffs.
Slide 6: Arrays & Two Pointers - Two pointers (opposite ends, sliding window for subarrays, fast & slow pointers for cycle detection).
Slide 7: Linked Lists - Singly, Doubly, Circular. Reversal in O(1) space, merge two sorted lists, Floyd's cycle detection.
Slide 8: Stacks & Queues - LIFO vs FIFO. Monotonic stacks (Next Greater Element), circular deque, double-ended queues (collections.deque).
Slide 9: Hash Maps & Sets - Hash functions, collision resolution (Chaining vs Open Addressing). Two-sum, subarray sum equals K.
Slide 10: Trees & Binary Search Trees (BST) - Inorder, Preorder, Postorder traversals. BST search O(log N). Lowest Common Ancestor (LCA).
Slide 11: Heaps & Priority Queues - Min-Heap vs Max-Heap. heapq module. Top K Frequent Elements, Median from Data Stream.
Slide 12: Graphs & Traversals - Adjacency List, BFS (shortest path in unweighted), DFS (connected components, cycle detection in directed graphs using 3-color states).
Slide 13: Graph Shortest Paths & MST - Dijkstra's algorithm (non-negative weights), Bellman-Ford, Kruskal & Prim's MST.
Slide 14: Dynamic Programming (DP) - Overlapping subproblems & Optimal substructure. Memoization (Top-Down) vs Tabulation (Bottom-Up). 0/1 Knapsack, LCS, LIS.
Slide 15: Revision Strategy - LeetCode 75 Roadmap, pattern recognition over memorization, dry run edge cases (null, single element, duplicates).`,
      mindmap: {
        title: "Python OOP, DSA & Algorithms (15 Slides Master Revision)",
        subject: "Computer Science & Coding",
        root: {
          id: "root",
          label: "Python OOP & DSA Master",
          icon: "🐍",
          tag: "MASTER ROADMAP",
          color: "#D4AF37",
          summary: "Comprehensive slide-by-slide revision covering Python internal memory, OOP pillars, core data structures, graph algorithms, and DP patterns.",
          children: [
            {
              id: "node-p1",
              label: "Python Internals & OOP",
              icon: "⚡",
              tag: "SLIDES 1-4",
              color: "#9333ea",
              summary: "Memory architecture, GIL, mutability, four OOP pillars, MRO linearization, and Pythonic metaprogramming.",
              examTip: "Interview trap: Default mutable arguments (e.g. def fn(l=[])) share the same list across function calls!",
              mnemonic: "PIE-A: Polymorphism, Inheritance, Encapsulation, Abstraction",
              formula: "MRO(C) = C + merge(MRO(P1), MRO(P2)...)",
              children: [
                {
                  id: "node-p1-1",
                  label: "Memory & GIL",
                  icon: "🧠",
                  tag: "INTERNALS",
                  color: "#06b6d4",
                  summary: "GIL allows only one native thread to hold Python bytecode lock at once. Use multiprocessing for CPU-bound tasks.",
                  examTip: "Strings, tuples, frozensets are immutable; lists, dicts, sets are mutable.",
                  children: []
                },
                {
                  id: "node-p1-2",
                  label: "OOP 4 Pillars & MRO",
                  icon: "🏛️",
                  tag: "OOP DESIGN",
                  color: "#10b981",
                  summary: "Encapsulation via private mangling (__var), Inheritance with super(), Polymorphism with duck typing, Abstraction via abc.ABC.",
                  examTip: "C3 Linearization resolves diamond inheritance order safely without duplicates.",
                  children: []
                },
                {
                  id: "node-p1-3",
                  label: "Decorators & Generators",
                  icon: "✨",
                  tag: "PYTHONIC",
                  color: "#f59e0b",
                  summary: "Generators pause execution with yield for O(1) space streams. Decorators wrap callable objects.",
                  mnemonic: "YIELD: You Iterate Easily Lowers Demand (saves RAM)",
                  children: []
                }
              ]
            },
            {
              id: "node-p2",
              label: "Linear Data Structures",
              icon: "📊",
              tag: "SLIDES 5-9",
              color: "#06b6d4",
              summary: "Array pointers, linked lists, monotonic stacks, dequeues, and hash collision mechanics.",
              examTip: "Never use Python list as queue with pop(0) because it causes O(N) shift. Use collections.deque for O(1) pops!",
              mnemonic: "FAST-SLOW: Floyd's tortoise & hare finds loop in O(N) time O(1) space",
              formula: "T(N) = O(1) amortized for list.append()",
              children: [
                {
                  id: "node-p2-1",
                  label: "Sliding Window & Pointers",
                  icon: "↔️",
                  tag: "ARRAY PATTERNS",
                  color: "#D4AF37",
                  summary: "Two pointers at edges for sorted arrays; sliding window for maximum sum or smallest substring.",
                  examTip: "Keep window validity checks invariant while expanding right and contracting left.",
                  children: []
                },
                {
                  id: "node-p2-2",
                  label: "Linked Lists & Reversal",
                  icon: "🔗",
                  tag: "LISTS",
                  color: "#ec4899",
                  summary: "In-place iterative reversal uses three pointers: prev, curr, next. Floyd's cycle detection.",
                  formula: "Prev = None; Curr = Head; Next = Curr.next",
                  children: []
                },
                {
                  id: "node-p2-3",
                  label: "Monotonic Stacks & Deque",
                  icon: "🥞",
                  tag: "STACKS",
                  color: "#9333ea",
                  summary: "Monotonic stack maintains elements in strictly increasing/decreasing order for Next Greater Element in O(N).",
                  examTip: "Great for histogram max area and daily temperature problems.",
                  children: []
                }
              ]
            },
            {
              id: "node-p3",
              label: "Non-Linear: Trees & Graphs",
              icon: "🌲",
              tag: "SLIDES 10-13",
              color: "#10b981",
              summary: "BST invariant, heap priority queues, graph adjacency list, BFS shortest path, Dijkstra and cycle detection.",
              examTip: "Dijkstra fails with negative weight edges — use Bellman-Ford instead!",
              mnemonic: "BFS = Queue (Level order/Shortest), DFS = Stack (Deep paths/Backtrack)",
              formula: "Dijkstra: O((V + E) log V) with Min-Heap",
              children: [
                {
                  id: "node-p3-1",
                  label: "BST & Tree Traversals",
                  icon: "🌿",
                  tag: "TREES",
                  color: "#06b6d4",
                  summary: "Inorder traversal of BST gives sorted keys. Height balanced AVL/Red-Black guarantees O(log N).",
                  examTip: "Lowest Common Ancestor (LCA) in BST can be found without exploring both subtrees if split detected.",
                  children: []
                },
                {
                  id: "node-p3-2",
                  label: "Heaps & Top-K Patterns",
                  icon: "🏔️",
                  tag: "HEAPS",
                  color: "#f59e0b",
                  summary: "heapq is a min-heap in Python. To keep top K maximum elements, maintain a min-heap of size K.",
                  formula: "Space: O(K), Time: O(N log K)",
                  children: []
                },
                {
                  id: "node-p3-3",
                  label: "Graph Traversal & Dijkstra",
                  icon: "🕸️",
                  tag: "GRAPHS",
                  color: "#ec4899",
                  summary: "3-color DFS detects directed cycles. Dijkstra greedily explores shortest cumulative distance.",
                  examTip: "Remember to check if popped distance is greater than dist[u] to skip stale heap entries.",
                  children: []
                }
              ]
            },
            {
              id: "node-p4",
              label: "Dynamic Programming Patterns",
              icon: "🧩",
              tag: "SLIDES 14-15",
              color: "#ec4899",
              summary: "Recognizing state, optimal substructure, 0/1 Knapsack, Longest Common Subsequence, and 1D space optimization.",
              examTip: "If decision is either 'take or skip', it's a 0/1 Knapsack variant. If choices can be reused infinitely, it's Unbounded Knapsack.",
              mnemonic: "FAST: Function state, Array table, State transition, Termination base case",
              formula: "dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]])",
              children: [
                {
                  id: "node-p4-1",
                  label: "0/1 Knapsack & Subset Sum",
                  icon: "🎒",
                  tag: "DP PATTERN 1",
                  color: "#D4AF37",
                  summary: "Iterate items outer loop, iterate capacities inner loop backwards from W down to wt[i] for 1D array optimization.",
                  children: []
                },
                {
                  id: "node-p4-2",
                  label: "LCS & String DP",
                  icon: "🔤",
                  tag: "DP PATTERN 2",
                  color: "#06b6d4",
                  summary: "If s1[i-1] == s2[j-1]: dp[i][j] = 1 + dp[i-1][j-1], else max(dp[i-1][j], dp[i][j-1]).",
                  children: []
                }
              ]
            }
          ]
        },
        quickRevisionSummary: [
          "Python GIL limits concurrency on CPU-bound threads; use multiprocessing or native extensions.",
          "Invert Binary Tree / Reverse Linked List are essential pointer manipulation foundations.",
          "Monotonic Stack solves Next Greater Element & Largest Histogram in O(N) linear time.",
          "Maintain a Min-Heap of size K to solve Top-K Frequent or Kth Largest in O(N log K) time.",
          "BFS guarantees shortest unweighted path; Dijkstra with min-heap guarantees non-negative shortest path.",
          "DP problems are solved by determining State, Base Case, Transition equation, and space compression."
        ],
        examMnemonics: [
          { concept: "OOP 4 Pillars", mnemonic: "PIE-A", meaning: "Polymorphism, Inheritance, Encapsulation, Abstraction" },
          { concept: "Graph Cycle Detection", mnemonic: "WHITE-GRAY-BLACK", meaning: "White=Unvisited, Gray=Currently on recursion stack (Back-edge found = Cycle!), Black=Fully processed" },
          { concept: "DP State Construction", mnemonic: "FAST", meaning: "Function parameters, Array dimensions, State transition, Termination edge base cases" }
        ],
        highYieldFormulas: [
          { name: "Amortized Dynamic Array Resizing", formula: "Sum(2^i) / N <= O(1)", notes: "Doubling array capacity when full guarantees O(1) amortized append" },
          { name: "Dijkstra Time Complexity", formula: "O((V + E) log V)", notes: "Requires binary min-heap / priority queue with non-negative weights" },
          { name: "0/1 Knapsack Transition", formula: "dp[w] = max(dp[w], val + dp[w - wt])", notes: "Must iterate w backwards from Capacity down to wt to avoid re-using same item" }
        ],
        activeRecallQuestions: [
          { question: "Why is popping from index 0 of a Python list slow, and what should you use instead?", answer: "list.pop(0) takes O(N) because all remaining elements must shift left in memory. Use collections.deque with popleft() for O(1) time.", difficulty: "Easy" },
          { question: "How does Floyd's Tortoise and Hare cycle detection algorithm guarantee meeting inside a loop?", answer: "Fast pointer moves at 2 steps/sec while slow moves at 1 step/sec. The relative distance decreases by 1 each step, so fast must catch slow inside any loop of length L in <= L steps.", difficulty: "Medium" },
          { question: "What is the difference between Memoization and Tabulation in Dynamic Programming?", answer: "Memoization is Top-Down recursion storing results in a hashmap/cache; Tabulation is Bottom-Up iterative building of a table starting from base cases, often allowing space optimization to O(1) or O(N).", difficulty: "Medium" }
        ]
      }
    },
    neet_genetics: {
      title: "NEET Biology: Molecular Basis of Inheritance (PPT Slides)",
      subject: "NEET Biology & Medical",
      text: `Slide 1: DNA Structure & Discovery - Miescher isolated 'Nuclein', Watson & Crick double helix model based on Rosalind Franklin X-ray diffraction. Purines (A, G) = Pyrimidines (C, T). Chargaff's rule A+T != G+C, but A/T = G/C = 1.
Slide 2: Packaging of DNA - Histone octamer (H2A, H2B, H3, H4 pairs) + H1 linker. 200 bp DNA wraps around octamer to form Nucleosome (10 nm beads on string). Solenoid (30 nm) -> Chromatin fibers. Euchromatin (lightly stained, transcriptionally active) vs Heterochromatin (dense, inactive).
Slide 3: Search for Genetic Material - Griffith's transforming principle (Streptococcus pneumoniae, S strain smooth lethal, R strain rough non-lethal). Avery, MacLeod, McCarty proved DNA is transforming principle using DNase. Hershey & Chase bacteriophage experiment using P-32 (DNA) and S-35 (protein coat).
Slide 4: DNA Replication - Semiconservative replication proved by Meselson & Stahl using N-15 and N-14 heavy isotopes in E. coli. Taylor used radioactive thymidine in Vicia faba. Helicase unzips, DNA Polymerase III synthesizes 5'->3'. Leading strand continuous, Lagging strand discontinuous (Okazaki fragments joined by DNA Ligase).
Slide 5: Transcription Machinery - Transcription unit: Promoter, Structural gene, Terminator. Template strand (3'->5') vs Coding strand (5'->3'). RNA Polymerase binds Sigma factor for initiation, Rho factor for termination.
Slide 6: Eukaryotic RNA Processing - Heterogeneous nuclear RNA (hnRNA) undergoes 5' Capping (methylated guanosine triphosphate m7Gppp) and 3' Polyadenylation (Poly-A tail 200-300 adenylate residues). Splicing removes Introns and ligates Exons via snRNPs (spliceosome).
Slide 7: Genetic Code & Translation - Triplet, degenerate, non-overlapping, universal (except mitochondria), unambiguous. AUG codes for Methionine and acts as initiator codon. UAA, UAG, UGA are stop codons. Translation on Ribosome (A site, P site, E site) with peptide bond catalyzed by 23S rRNA (ribozyme in prokaryotes).
Slide 8: Regulation of Gene Expression (Lac Operon) - Jacob & Monod model. i gene codes for repressor protein. In absence of lactose: repressor binds Operator, RNA Pol blocked. In presence of lactose (allolactose inducer): repressor inactivated, Pol transcribes z (beta-galactosidase), y (permease), a (transacetylase).`,
      mindmap: {
        title: "NEET Biology: Molecular Basis of Inheritance",
        subject: "NEET Biology & Medical",
        root: {
          id: "root",
          label: "Molecular Genetics & DNA",
          icon: "🧬",
          tag: "NEET HIGH YIELD",
          color: "#D4AF37",
          summary: "NCERT-aligned master revision of DNA structure, nucleosome packaging, Meselson-Stahl replication, transcription splicing, and the Lac Operon.",
          children: [
            {
              id: "node-bio1",
              label: "DNA Structure & Packaging",
              icon: "🔬",
              tag: "SLIDES 1-2",
              color: "#10b981",
              summary: "B-DNA double helix: pitch 3.4 nm, 10 base pairs per turn (0.34 nm spacing). Histone octamer forms nucleosome wrapping 200 bp DNA.",
              examTip: "Chargaff rule applies ONLY to double-stranded DNA! If A!=T or G!=C, the genetic material is single-stranded DNA.",
              mnemonic: "CUT the Pyramids: Cytosine, Uracil, Thymine are Pyrimidines",
              formula: "Pitch = 3.4 nm (34 Å), Distance between bp = 0.34 nm",
              children: [
                {
                  id: "node-bio1-1",
                  label: "Nucleosome Octamer",
                  icon: "🧶",
                  tag: "PACKAGING",
                  color: "#06b6d4",
                  summary: "Rich in basic amino acids Lysine and Arginine carrying positive charge. H1 binds entry/exit DNA.",
                  children: []
                },
                {
                  id: "node-bio1-2",
                  label: "Euchromatin vs Heterochromatin",
                  icon: "🎨",
                  tag: "CHROMATIN",
                  color: "#D4AF37",
                  summary: "Euchromatin: loosely packed, light staining, transcriptionally ACTIVE. Heterochromatin: dense, dark staining, INACTIVE.",
                  children: []
                }
              ]
            },
            {
              id: "node-bio2",
              label: "Genetic Material Proofs",
              icon: "🧪",
              tag: "SLIDES 3-4",
              color: "#06b6d4",
              summary: "Griffith transformation, Avery-MacLeod-McCarty enzymatic validation, Hershey-Chase P32/S35 isotope confirmation.",
              examTip: "Phosphorus-32 labels DNA (phosphate backbone); Sulfur-35 labels Protein coat (cysteine & methionine).",
              mnemonic: "P-32 in DNA Pellet, S-35 in Supernatant",
              children: [
                {
                  id: "node-bio2-1",
                  label: "Meselson & Stahl Experiment",
                  icon: "⚖️",
                  tag: "REPLICATION PROOF",
                  color: "#9333ea",
                  summary: "Proved semi-conservative replication using CsCl density gradient centrifugation after 20 and 40 min in E. coli.",
                  examTip: "Gen 1 (20 min): 100% Hybrid (15N/14N). Gen 2 (40 min): 50% Hybrid, 50% Light (14N/14N).",
                  children: []
                },
                {
                  id: "node-bio2-2",
                  label: "Okazaki & DNA Polymerase",
                  icon: "✂️",
                  tag: "REPLICATION FORK",
                  color: "#ec4899",
                  summary: "Polymerase works 5'->3' only. Leading strand continuous; lagging strand discontinuous fragments joined by DNA Ligase.",
                  children: []
                }
              ]
            },
            {
              id: "node-bio3",
              label: "Transcription & Splicing",
              icon: "📜",
              tag: "SLIDES 5-6",
              color: "#9333ea",
              summary: "RNA Polymerase requires Sigma factor for start and Rho factor for stop. hnRNA processing in eukaryotes: Capping, Tailing, Splicing.",
              examTip: "Coding strand matches mRNA exactly (except T is replaced with U). Template strand is complementary.",
              mnemonic: "CAP at 5' (methylated G), TAIL at 3' (Poly-A)",
              children: [
                {
                  id: "node-bio3-1",
                  label: "Eukaryotic hnRNA Splicing",
                  icon: "✂️",
                  tag: "POST-TRANSCRIPTION",
                  color: "#f59e0b",
                  summary: "Split genes: Introns (non-coding intervening sequences) removed, Exons ligated by spliceosomes (snRNPs).",
                  children: []
                }
              ]
            },
            {
              id: "node-bio4",
              label: "Translation & Lac Operon",
              icon: "⚙️",
              tag: "SLIDES 7-8",
              color: "#ec4899",
              summary: "Ribosome 23S rRNA acts as peptidyl transferase ribozyme. Lac operon z-y-a genes regulated by allolactose inducer.",
              examTip: "Stop codons: UAA (Ochre), UAG (Amber), UGA (Opal). None code for any amino acid (nonsense).",
              mnemonic: "z=Beta-gal, y=Permease, a=Transacetylase (Order: Z-Y-A)",
              children: [
                {
                  id: "node-bio4-1",
                  label: "Lac Operon Induction",
                  icon: "🥛",
                  tag: "GENE REGULATION",
                  color: "#10b981",
                  summary: "Lactose acts as inducer. Binds repressor protein so it falls off operator, allowing RNA polymerase to transcribe.",
                  children: []
                }
              ]
            }
          ]
        },
        quickRevisionSummary: [
          "B-DNA: 0.34 nm between base pairs, 3.4 nm pitch per turn of 10 base pairs.",
          "Histone octamer consists of 2 copies each of H2A, H2B, H3, H4 wrapping ~200 bp DNA.",
          "Hershey-Chase: P-32 stayed in pellet (DNA is genetic material), S-35 stayed in supernatant.",
          "Meselson-Stahl: After 40 minutes (2 generations), ratio of hybrid to light DNA is 1:1.",
          "23S rRNA in bacteria is a ribozyme catalyzing peptide bond formation during translation.",
          "In Lac operon: z gene codes for Beta-galactosidase, y codes for Permease, a codes for Transacetylase."
        ],
        examMnemonics: [
          { concept: "Stop Codons", mnemonic: "U Are Away (UAA), U Are Gone (UAG), U Go Away (UGA)", meaning: "Three termination codons that halt protein translation" },
          { concept: "Lac Operon Structural Genes", mnemonic: "Z-Y-A (Beta-Gal, Permease, Transacetylase)", meaning: "Z hydrolyzes lactose, Y permits entry into cell, A transfers acetyl group" },
          { concept: "Transcription Factors", mnemonic: "SIGMA Starts, RHO Releases", meaning: "Sigma factor initiates transcription, Rho factor causes termination" }
        ],
        highYieldFormulas: [
          { name: "Chargaff Rule for dsDNA", formula: "A + G = T + C and A/T = G/C = 1", notes: "Does not apply to single-stranded viral DNA" },
          { name: "Number of Nucleosomes", formula: "Total bp / 200 bp", notes: "Human genome 6.6 x 10^9 bp contains ~3.3 x 10^7 nucleosomes in diploid cell" }
        ],
        activeRecallQuestions: [
          { question: "What is the key difference between Euchromatin and Heterochromatin?", answer: "Euchromatin is lightly stained, loosely packed, and transcriptionally active. Heterochromatin is darkly stained, tightly packed, and transcriptionally inactive.", difficulty: "Easy" },
          { question: "In the Hershey-Chase experiment, why was P-32 found in the pellet while S-35 was in the supernatant?", answer: "P-32 labeled DNA which entered the bacterial cells (heavy, went into pellet). S-35 labeled viral protein coat which remained outside and was sheared off in the blender (stayed in light supernatant).", difficulty: "Medium" },
          { question: "What happens to the Lac operon when both Glucose and Lactose are present in the culture medium?", answer: "Catabolite repression occurs. Bacteria preferentially utilize Glucose; cAMP levels stay low, so CAP-cAMP complex cannot activate high-level transcription even though inducer is present.", difficulty: "Hard" }
        ]
      }
    },
    jee_emi: {
      title: "JEE Physics: Electromagnetic Induction & AC Circuits",
      subject: "JEE & Physics / Chemistry",
      text: `Slide 1: Magnetic Flux & Faraday's Laws - Magnetic flux Phi = B . A = B A cos(theta). Faraday's 1st law: changing flux induces emf. 2nd law: induced emf magnitude |e| = dPhi/dt.
Slide 2: Lenz's Law & Conservation of Energy - Induced emf opposes the cause that produces it: e = - dPhi/dt. Direct consequence of energy conservation.
Slide 3: Motional EMF & Induced Electric Field - Rod moving in B: e = B v l. Rotating rod: e = 1/2 B omega l^2. Non-electrostatic induced electric field: oint E . dl = - dPhi/dt. Closed circular lines, non-conservative.
Slide 4: Self & Mutual Inductance - Self flux Phi = L I, induced emf e = - L dI/dt. Solenoid L = mu_0 n^2 A l. Energy stored in inductor U = 1/2 L I^2. Mutual inductance M = mu_0 n1 n2 A l. Coupling coefficient k = M / sqrt(L1 L2).
Slide 5: LR Transients - Growth of current: I = I_0 (1 - e^(-t / tau)), where tau = L/R. Decay of current: I = I_0 e^(-t / tau). At t = 0, inductor acts as open circuit. At t = infinity, inductor acts as short circuit (plain wire).
Slide 6: Alternating Current Fundamentals - Sinusoidal AC: I = I_0 sin(omega t). RMS current I_rms = I_0 / sqrt(2) = 0.707 I_0. Average current for half cycle = 2 I_0 / pi = 0.637 I_0.
Slide 7: AC with L, C, and R - Resistor: V and I in phase. Inductor: V leads I by pi/2, Inductive reactance X_L = omega L. Capacitor: I leads V by pi/2, Capacitive reactance X_C = 1 / (omega C).
Slide 8: Series LCR Resonance & Quality Factor - Impedance Z = sqrt(R^2 + (X_L - X_C)^2). Resonance when X_L = X_C => omega_0 = 1 / sqrt(L C). Resonance impedance Z_min = R (purely resistive). Quality factor Q = omega_0 L / R = 1 / (omega_0 C R) = (1/R) sqrt(L/C). Sharpness of tuning.`,
      mindmap: {
        title: "JEE Physics: Electromagnetic Induction & AC Circuits",
        subject: "JEE & Physics / Chemistry",
        root: {
          id: "root",
          label: "EMI & AC Circuits Master",
          icon: "⚛️",
          tag: "JEE ADVANCED",
          color: "#D4AF37",
          summary: "Master synthesis of Faraday & Lenz laws, motional EMF, inductor energy transients, impedance phasors, and series LCR resonance.",
          children: [
            {
              id: "node-emi1",
              label: "Faraday & Motional EMF",
              icon: "🧲",
              tag: "SLIDES 1-3",
              color: "#06b6d4",
              summary: "e = -dPhi/dt. Motional EMF in translating rod e = Bvl; rotating rod e = 1/2 B omega l^2.",
              examTip: "Induced electric field is NON-CONSERVATIVE: oint E . dl != 0. Potential cannot be defined for it!",
              formula: "e = -dPhi/dt = Bvl",
              children: []
            },
            {
              id: "node-emi2",
              label: "Inductance & LR Transients",
              icon: "🌀",
              tag: "SLIDES 4-5",
              color: "#9333ea",
              summary: "L = mu_0 n^2 A l. Magnetic energy density u_B = B^2 / (2 mu_0). Time constant tau = L/R.",
              examTip: "At t=0+ right after switch closed, current in uncharged inductor is ZERO (acts as open break). At t=infinity, acts as simple conducting wire.",
              formula: "I(t) = (V/R)(1 - e^(-t/(L/R)))",
              children: []
            },
            {
              id: "node-emi3",
              label: "Series LCR Resonance",
              icon: "⚡",
              tag: "SLIDES 6-8",
              color: "#10b981",
              summary: "Impedance Z = sqrt(R^2 + (omega L - 1/omega C)^2). Resonance frequency omega_0 = 1/sqrt(LC).",
              examTip: "At resonance: current is MAXIMUM, power factor cos(phi) = 1, V_L and V_C cancel each other out completely!",
              formula: "omega_0 = 1/sqrt(LC), Q = (1/R) sqrt(L/C)",
              children: []
            }
          ]
        },
        quickRevisionSummary: [
          "Motional EMF for rotating rod about one end in uniform field: e = 1/2 B omega L^2.",
          "Self inductance of long solenoid: L = mu_0 n^2 A l (depends on square of turns per unit length).",
          "LR Circuit time constant is tau = L/R; at t = tau, current reaches 63.2% of steady state value.",
          "In purely inductive circuit voltage leads by 90°; in purely capacitive circuit current leads by 90°.",
          "At resonance in series LCR circuit, Z = R (minimum), current is maximum, and power factor is unity."
        ],
        examMnemonics: [
          { concept: "Phase Lead/Lag in AC", mnemonic: "CIVIL", meaning: "In Capacitor (C), Current (I) leads Voltage (V); In Inductor (L), Voltage (V) leads Current (I)" },
          { concept: "Time Constants", mnemonic: "LR = L/R, RC = R*C", meaning: "Both have dimensions of seconds (time)" }
        ],
        highYieldFormulas: [
          { name: "Rotating Rod EMF", formula: "e = 1/2 B omega L^2", notes: "Derived by integrating B v dr from 0 to L" },
          { name: "Resonance Angular Frequency", formula: "omega_0 = 1 / sqrt(LC)", notes: "Frequency f_0 = 1 / (2 pi sqrt(LC))" },
          { name: "Quality Factor", formula: "Q = (1/R) * sqrt(L/C)", notes: "Higher Q means narrower bandwidth and sharper resonance" }
        ],
        activeRecallQuestions: [
          { question: "What is the physical significance of the minus sign in Lenz's law e = -dPhi/dt?", answer: "It ensures the conservation of energy: the induced current produces a magnetic field that opposes the change in flux, preventing runaway spontaneous energy generation.", difficulty: "Easy" },
          { question: "In a series LCR circuit at resonance, what is the net voltage across the L-C combination?", answer: "Zero. Because V_L and V_C have equal magnitudes but are exactly 180 degrees out of phase, they cancel out completely.", difficulty: "Medium" }
        ]
      }
    },
    upsc_polity: {
      title: "UPSC Polity: Fundamental Rights (Articles 12-35)",
      subject: "UPSC & Civil Services",
      text: `Slide 1: Constitutional Framework of Part III - Articles 12 to 35, borrowed from US Bill of Rights. Called Magna Carta of India. Justiciable, defended by Supreme Court (Art 32) and High Court (Art 226). Not absolute but qualified.
Slide 2: Article 12 & 13 - Art 12 defines 'State' (Govt, Parliament, State legislature, local bodies, statutory/non-statutory authorities like LIC, ONGC). Art 13 declares laws inconsistent with FRs void (Judicial Review doctrine, Doctrine of Severability, Doctrine of Eclipse).
Slide 3: Right to Equality (Articles 14-18) - Art 14: Equality before law (British) & Equal protection of laws (American). Art 15: No discrimination on grounds ONLY of religion, race, caste, sex, place of birth. Art 16: Equality of opportunity in public employment. Art 17: Abolition of Untouchability (absolute right). Art 18: Abolition of titles.
Slide 4: Right to Freedom (Articles 19-22) - Art 19 guarantees 6 freedoms (Speech, Assembly, Association, Movement, Residence, Profession). Subject to reasonable restrictions under 19(2). Art 20: Protection against retrospective criminal law (ex-post facto), double jeopardy, self-incrimination.
Slide 5: Article 21 & Golden Triangle - Art 21: Protection of life and personal liberty except according to 'procedure established by law'. AK Gopalan (narrow) -> Maneka Gandhi 1978 (broadened to 'due process of law' & fairness). Golden Triangle: Articles 14, 19, 21 operate together. Art 21A: Right to education (86th Amendment 2002).
Slide 6: Right against Exploitation (Articles 23-24) - Art 23: Prohibition of human trafficking & forced labor (begar). Art 24: Prohibition of child labor below 14 years in hazardous industries.
Slide 7: Right to Freedom of Religion (Articles 25-28) - Art 25: Individual freedom of conscience, profess, practice, propagate. Art 26: Collective right to manage religious affairs. Art 27: Freedom from taxation for promotion of religion. Art 28: Freedom from religious instruction in state-funded institutions.
Slide 8: Constitutional Remedies (Article 32) - Dr. Ambedkar called it 'Heart and Soul of the Constitution'. 5 Writs: Habeas Corpus ('to have the body'), Mandamus ('we command'), Prohibition ('to forbid'), Certiorari ('to be certified/quashed'), Quo-Warranto ('by what authority').`,
      mindmap: {
        title: "UPSC Polity: Fundamental Rights (Articles 12-35)",
        subject: "UPSC & Civil Services",
        root: {
          id: "root",
          label: "Part III: Fundamental Rights",
          icon: "🏛️",
          tag: "MAGNA CARTA",
          color: "#D4AF37",
          summary: "Comprehensive constitutional analysis of Articles 12 to 35, Golden Triangle jurisprudence (14, 19, 21), reasonable restrictions, and writ remedies under Article 32.",
          children: [
            {
              id: "node-pol1",
              label: "State & Judicial Review",
              icon: "⚖️",
              tag: "ARTS 12-13",
              color: "#9333ea",
              summary: "Article 12 defines 'State'. Article 13 provides constitutional foundation for Judicial Review.",
              examTip: "Constitutional amendments are NOT 'law' under Art 13 according to Kesavananda Bharati (1973), but cannot violate Basic Structure!",
              children: []
            },
            {
              id: "node-pol2",
              label: "Right to Equality",
              icon: "🤝",
              tag: "ARTS 14-18",
              color: "#06b6d4",
              summary: "Equality before law (Art 14), non-discrimination (Art 15), equal opportunity (Art 16), abolition of untouchability (Art 17 - absolute!).",
              examTip: "Article 15 & 16 use the word 'ONLY' — affirmative action based on non-enumerated factors like residence/backwardness is permissible.",
              children: []
            },
            {
              id: "node-pol3",
              label: "Freedoms & Art 21 Golden Triangle",
              icon: "🕊️",
              tag: "ARTS 19-22",
              color: "#10b981",
              summary: "6 democratic freedoms (Art 19), protection in criminal conviction (Art 20), Right to Life & Liberty (Art 21, expanded by Maneka Gandhi).",
              examTip: "Articles 20 and 21 CANNOT be suspended even during a National Emergency (44th Amendment Act 1978)!",
              mnemonic: "SAM-MRP: Speech, Assembly, Association, Movement, Residence, Profession",
              children: []
            },
            {
              id: "node-pol4",
              label: "Writs & Remedies (Art 32)",
              icon: "📜",
              tag: "HEART & SOUL",
              color: "#ec4899",
              summary: "Article 32 is itself a Fundamental Right! 5 prerogative writs issued to enforce rights against public authorities.",
              examTip: "High Court's writ jurisdiction under Art 226 is WIDER than Supreme Court under Art 32 (can issue writs for legal rights as well as FRs).",
              mnemonic: "H-M-P-C-Q: Habeas, Mandamus, Prohibition, Certiorari, Quo-Warranto",
              children: []
            }
          ]
        },
        quickRevisionSummary: [
          "Part III is borrowed from the American Bill of Rights and is called the Magna Carta of India.",
          "Fundamental Rights available ONLY to citizens (not foreigners): Articles 15, 16, 19, 29, and 30.",
          "Articles 20 and 21 can NEVER be suspended even during National Emergency (44th Amendment Act 1978).",
          "Maneka Gandhi case (1978) broadened Article 21 from 'procedure established by law' to 'due process of law'.",
          "Article 32 writ jurisdiction is a basic structure of the Constitution; Ambedkar termed it 'heart and soul'."
        ],
        examMnemonics: [
          { concept: "Rights only for Citizens", mnemonic: "15, 16, 19, 29, 30", meaning: "All other Fundamental Rights are available to foreigners and citizens alike" },
          { concept: "5 Writs", mnemonic: "HMP-CQ", meaning: "Habeas Corpus (body), Mandamus (command), Prohibition (stay lower court), Certiorari (quash order), Quo Warranto (check office title)" }
        ],
        highYieldFormulas: [],
        activeRecallQuestions: [
          { question: "Which two Fundamental Rights cannot be suspended even during a National Emergency under Article 352?", answer: "Article 20 (protection against retrospective criminal laws, double jeopardy, and self-incrimination) and Article 21 (right to life and personal liberty), safeguarded by the 44th Constitutional Amendment Act 1978.", difficulty: "Easy" },
          { question: "How does the writ jurisdiction of the High Court (Art 226) differ from that of the Supreme Court (Art 32)?", answer: "Supreme Court can issue writs ONLY for Fundamental Rights; High Court can issue writs for Fundamental Rights AND ordinary legal rights. However, Art 32 is itself a Fundamental Right, while Art 226 is discretionary.", difficulty: "Medium" }
        ]
      }
    },
    os_scheduling: {
      title: "Operating Systems: CPU Scheduling & Deadlocks (PPT Slides)",
      subject: "Computer Science & Coding",
      text: `Slide 1: Process Concept & States - New, Ready, Running, Waiting (Blocked), Terminated. Process Control Block (PCB) stores PID, Program Counter, Registers, CPU scheduling info, Memory limits. Context Switch overhead.
Slide 2: CPU Scheduling Criteria - CPU Utilization, Throughput (processes/unit time), Turnaround Time (Completion - Arrival), Waiting Time (Turnaround - Burst), Response Time (First response - Arrival).
Slide 3: Non-Preemptive Algorithms - First-Come First-Served (FCFS) suffers from Convoy Effect. Shortest Job First (SJF) gives provably minimum average waiting time, but impossible to know exact future burst (exponential averaging).
Slide 4: Preemptive Algorithms - Shortest Remaining Time First (SRTF, preemptive SJF). Round Robin (RR) with Time Quantum q. If q too large -> FCFS; if q too small -> excessive context switch overhead. Rule of thumb: 80% CPU bursts should be shorter than q.
Slide 5: Priority Scheduling & Starvation - Processes assigned priority. Starvation of low-priority processes prevented by Aging (gradually increasing priority over time). Multilevel Feedback Queue (MLFQ).
Slide 6: Deadlock 4 Coffman Conditions - Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. All 4 must hold simultaneously for deadlock to occur.
Slide 7: Deadlock Handling - Prevention (invalidate 1 of 4 conditions), Avoidance (Banker's Algorithm using Safe State), Detection & Recovery (Wait-For Graph cycle detection, terminate process/preempt resource), Omission (Ostrich algorithm - ignore).
Slide 8: Banker's Algorithm - Data structures: Available vector, Max matrix, Allocation matrix, Need matrix (Need = Max - Allocation). Safe state search algorithm checks if Work >= Need.`,
      mindmap: {
        title: "Operating Systems: CPU Scheduling & Deadlocks",
        subject: "Computer Science & Coding",
        root: {
          id: "root",
          label: "OS: Scheduling & Deadlocks",
          icon: "💻",
          tag: "GATE / CORE CS",
          color: "#D4AF37",
          summary: "Master synthesis of process states, FCFS convoy effect, optimal SJF/SRTF, Round Robin quantum selection, Coffman deadlock conditions, and Banker's Algorithm.",
          children: [
            {
              id: "node-os1",
              label: "Process Lifecycle & PCB",
              icon: "🔄",
              tag: "SLIDES 1-2",
              color: "#06b6d4",
              summary: "5-state model. PCB tracks process metadata. Context switch time is pure system overhead.",
              examTip: "Turnaround Time = Completion Time - Arrival Time. Waiting Time = Turnaround Time - Burst Time.",
              formula: "TAT = CT - AT; WT = TAT - BT",
              children: []
            },
            {
              id: "node-os2",
              label: "CPU Scheduling Algorithms",
              icon: "⏱️",
              tag: "SLIDES 3-5",
              color: "#9333ea",
              summary: "FCFS, SJF (optimal avg waiting time), SRTF, Round Robin with Time Quantum q. Aging prevents starvation in priority queues.",
              examTip: "Round Robin with infinite quantum degenerates into FCFS. Too small quantum wastes CPU in context switching.",
              children: []
            },
            {
              id: "node-os3",
              label: "Deadlock Conditions & Banker's",
              icon: "🔒",
              tag: "SLIDES 6-8",
              color: "#ec4899",
              summary: "4 Coffman conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait. Banker's Algorithm checks safe sequence.",
              examTip: "Safe state implies NO deadlock; Unsafe state does NOT guarantee deadlock, but means system cannot prevent it if worst-case requests arrive.",
              mnemonic: "ME-HW-NP-CW: Coffman 4 Deadlock pillars",
              formula: "Need[i][j] = Max[i][j] - Allocation[i][j]",
              children: []
            }
          ]
        },
        quickRevisionSummary: [
          "SJF (Shortest Job First) is provably optimal for minimizing average waiting time.",
          "Convoy effect occurs in FCFS when short processes queue up behind one huge CPU-bound process.",
          "Round Robin quantum should cover ~80% of CPU bursts to balance responsiveness and overhead.",
          "All 4 Coffman conditions must hold simultaneously for deadlock: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.",
          "Banker's Algorithm uses Need = Max - Allocation to discover at least one Safe Sequence."
        ],
        examMnemonics: [
          { concept: "4 Coffman Conditions", mnemonic: "ME Hold No Circle", meaning: "Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait" }
        ],
        highYieldFormulas: [
          { name: "Turnaround Time", formula: "TAT = Completion Time - Arrival Time", notes: "Total time from arrival to finish" },
          { name: "Waiting Time", formula: "WT = Turnaround Time - Burst Time", notes: "Time spent waiting in ready queue" },
          { name: "Banker's Need Matrix", formula: "Need = Max - Allocation", notes: "Remaining resources required by process" }
        ],
        activeRecallQuestions: [
          { question: "What is the difference between Preemptive and Non-Preemptive scheduling?", answer: "Non-preemptive allows a running process to keep the CPU until it voluntarily terminates or blocks for I/O (e.g. FCFS, standard SJF). Preemptive can forcibly take the CPU away if a higher priority process arrives (e.g. SRTF, Round Robin).", difficulty: "Easy" },
          { question: "Does being in an 'Unsafe State' mean a deadlock has already occurred in Banker's Algorithm?", answer: "No. An unsafe state merely means the system cannot guarantee avoidance if all processes suddenly request their maximum declared resources simultaneously. Deadlock might not happen if processes complete with fewer resources.", difficulty: "Medium" }
        ]
      }
    }
  };

  // ─── SUPER REVISION SETUP & CONTROLLER ───
  function setupSuperRevision() {
    const tabRoadmapMode = $('tabRoadmapMode');
    const tabSuperRevisionMode = $('tabSuperRevisionMode');
    const navSuperRevisionBtn = $('navSuperRevisionBtn');

    if (tabRoadmapMode) {
      tabRoadmapMode.addEventListener('click', () => {
        showScreen(state.roadmap ? "roadmap" : "input");
      });
    }

    if (tabSuperRevisionMode) {
      tabSuperRevisionMode.addEventListener('click', () => {
        showScreen("super-revision");
      });
    }

    if (navSuperRevisionBtn) {
      navSuperRevisionBtn.addEventListener('click', () => {
        showScreen("super-revision");
      });
    }

    // Sub-Tabs: Text Notes vs Slide Images
    const srTabTextInput = $('srTabTextInput');
    const srTabImageInput = $('srTabImageInput');
    const srPanelText = $('srPanelText');
    const srPanelImages = $('srPanelImages');

    if (srTabTextInput && srTabImageInput) {
      srTabTextInput.addEventListener('click', () => {
        srTabTextInput.classList.add('active');
        srTabImageInput.classList.remove('active');
        if (srPanelText) srPanelText.style.display = 'block';
        if (srPanelImages) srPanelImages.style.display = 'none';
      });

      srTabImageInput.addEventListener('click', () => {
        srTabImageInput.classList.add('active');
        srTabTextInput.classList.remove('active');
        if (srPanelText) srPanelText.style.display = 'none';
        if (srPanelImages) srPanelImages.style.display = 'block';
      });
    }

    // Textarea word counter
    const srNotesTextInput = $('srNotesTextInput');
    const srWordCount = $('srWordCount');
    if (srNotesTextInput && srWordCount) {
      srNotesTextInput.addEventListener('input', () => {
        const val = srNotesTextInput.value || '';
        const words = val.trim() ? val.trim().split(/\s+/).length : 0;
        srWordCount.textContent = `${words} words • ${val.length} characters`;
      });
    }

    // 1-Click Preset Chips
    document.querySelectorAll('.sd-sr-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const presetKey = chip.getAttribute('data-preset');
        loadPreset(presetKey);
      });
    });

    // File Drag and Drop for PPT Slide Images
    const srDropzone = $('srDropzone');
    const srFileInput = $('srFileInput');
    const srBrowseFilesBtn = $('srBrowseFilesBtn');

    if (srBrowseFilesBtn && srFileInput) {
      srBrowseFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        srFileInput.click();
      });
    }

    if (srDropzone && srFileInput) {
      srDropzone.addEventListener('click', () => srFileInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        srDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          srDropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        srDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          srDropzone.classList.remove('dragover');
        });
      });

      srDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) {
          handleImageFiles(e.dataTransfer.files);
        }
      });

      srFileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          handleImageFiles(e.target.files);
        }
      });
    }

    const srClearImagesBtn = $('srClearImagesBtn');
    if (srClearImagesBtn) {
      srClearImagesBtn.addEventListener('click', () => {
        state.sr.uploadedImages = [];
        renderImageThumbnails();
      });
    }

    // Generate Button
    const srGenerateBtn = $('srGenerateBtn');
    if (srGenerateBtn) {
      srGenerateBtn.addEventListener('click', handleGenerateSuperMindmap);
    }

    // Back to edit notes button in workspace topbar
    const srEditNotesBtn = $('srEditNotesBtn');
    if (srEditNotesBtn) {
      srEditNotesBtn.addEventListener('click', () => {
        const workspace = $('srWorkspace');
        const inputCard = $('superRevisionInputCard');
        if (workspace) workspace.style.display = 'none';
        if (inputCard) inputCard.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Options dropdowns (Layout, Theme, Depth)
    const srLayoutSelect = $('srLayoutSelect');
    if (srLayoutSelect) {
      srLayoutSelect.addEventListener('change', () => {
        state.sr.layout = srLayoutSelect.value;
        const quickLbl = $('srLayoutQuickLabel');
        if (quickLbl) quickLbl.textContent = `Layout: ${capitalize(state.sr.layout)}`;
        if (state.sr.currentMindmap) renderMindmapSvg();
      });
    }

    const srThemeSelect = $('srThemeSelect');
    if (srThemeSelect) {
      srThemeSelect.addEventListener('change', () => {
        state.sr.theme = srThemeSelect.value;
        if (state.sr.currentMindmap) renderMindmapSvg();
      });
    }

    // Workspace Quick Action Tools
    const srToggleActiveRecallBtn = $('srToggleActiveRecallBtn');
    if (srToggleActiveRecallBtn) {
      srToggleActiveRecallBtn.addEventListener('click', () => {
        state.sr.activeRecall = !state.sr.activeRecall;
        if (state.sr.activeRecall) {
          srToggleActiveRecallBtn.classList.add('active');
          srToggleActiveRecallBtn.innerHTML = `<i class="fa-solid fa-eye"></i><span>Exit Recall</span>`;
          // Collapse all Level 2 and Level 3 nodes
          collapseAllChildNodes();
          showToast("Active Recall Mode Enabled: Test your memory on hidden concepts!", "info");
        } else {
          srToggleActiveRecallBtn.classList.remove('active');
          srToggleActiveRecallBtn.innerHTML = `<i class="fa-solid fa-eye-slash"></i><span>Active Recall</span>`;
          state.sr.collapsedNodes.clear();
        }
        renderMindmapSvg();
      });
    }

    const srExpandAllBtn = $('srExpandAllBtn');
    if (srExpandAllBtn) {
      srExpandAllBtn.addEventListener('click', () => {
        state.sr.collapsedNodes.clear();
        state.sr.activeRecall = false;
        if (srToggleActiveRecallBtn) {
          srToggleActiveRecallBtn.classList.remove('active');
          srToggleActiveRecallBtn.innerHTML = `<i class="fa-solid fa-eye-slash"></i><span>Active Recall</span>`;
        }
        renderMindmapSvg();
        showToast("All nodes expanded", "info");
      });
    }

    const srSwitchLayoutQuickBtn = $('srSwitchLayoutQuickBtn');
    if (srSwitchLayoutQuickBtn) {
      srSwitchLayoutQuickBtn.addEventListener('click', () => {
        if (state.sr.layout === 'radial') state.sr.layout = 'split';
        else if (state.sr.layout === 'split') state.sr.layout = 'flow';
        else state.sr.layout = 'radial';

        if (srLayoutSelect) srLayoutSelect.value = state.sr.layout;
        const quickLbl = $('srLayoutQuickLabel');
        if (quickLbl) quickLbl.textContent = `Layout: ${capitalize(state.sr.layout)}`;
        renderMindmapSvg();
      });
    }

    const srSaveMindmapBtn = $('srSaveMindmapBtn');
    if (srSaveMindmapBtn) {
      srSaveMindmapBtn.addEventListener('click', saveCurrentMindmap);
    }

    // Download & Export Handlers
    const srDownloadMenuBtn = $('srDownloadMenuBtn');
    const srDownloadDropdown = $('srDownloadDropdown');
    if (srDownloadMenuBtn && srDownloadDropdown) {
      srDownloadMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        srDownloadDropdown.classList.toggle('show');
      });
      document.addEventListener('click', () => {
        srDownloadDropdown.classList.remove('show');
      });
    }

    const srDownloadPngBtn = $('srDownloadPngBtn');
    if (srDownloadPngBtn) srDownloadPngBtn.addEventListener('click', exportMindmapPng);

    const srDownloadSvgBtn = $('srDownloadSvgBtn');
    if (srDownloadSvgBtn) srDownloadSvgBtn.addEventListener('click', exportMindmapSvg);

    const srExportMarkdownBtn = $('srExportMarkdownBtn');
    if (srExportMarkdownBtn) srExportMarkdownBtn.addEventListener('click', exportRevisionMarkdown);

    const srPrintBtn = $('srPrintBtn');
    if (srPrintBtn) srPrintBtn.addEventListener('click', () => window.print());

    const srCopyJsonBtn = $('srCopyJsonBtn');
    if (srCopyJsonBtn) srCopyJsonBtn.addEventListener('click', copyMindmapJson);

    // Zoom and Pan Controls
    setupViewportPanAndZoom();

    // Node Modal Details Inspector
    const closeNodeDetailBtn = $('closeNodeDetailBtn');
    const nodeDetailModal = $('nodeDetailModal');
    if (closeNodeDetailBtn && nodeDetailModal) {
      closeNodeDetailBtn.addEventListener('click', () => {
        nodeDetailModal.style.display = 'none';
      });
      nodeDetailModal.addEventListener('click', (e) => {
        if (e.target === nodeDetailModal) nodeDetailModal.style.display = 'none';
      });
    }
    const nmDoneReviewBtn = $('nmDoneReviewBtn');
    if (nmDoneReviewBtn && nodeDetailModal) {
      nmDoneReviewBtn.addEventListener('click', () => {
        nodeDetailModal.style.display = 'none';
        showToast("Concept marked as Mastered! 🌟", "success");
        playTone(784, 'sine', 0.1, 0.15);
      });
    }

    // Bottom Accordion Sheet Tabs
    setupBottomSheetTabs();

    // Load saved mindmaps from storage
    loadSavedMindmapsFromStorage();
  }

  // ─── IMAGE FILE PROCESSING ───
  function handleImageFiles(files) {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showToast("Please upload image files (PNG, JPG, WEBP)", "error");
      return;
    }

    showToast(`Loading ${validFiles.length} note / PPT slide(s)...`, "info");

    let loaded = 0;
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.sr.uploadedImages.push({
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          base64: e.target.result
        });
        loaded++;
        if (loaded === validFiles.length) {
          renderImageThumbnails();
          showToast(`Added ${loaded} slide(s) successfully!`, "success");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function renderImageThumbnails() {
    const grid = $('srThumbnailsGrid');
    const statsBar = $('srUploadStatsBar');
    const countLbl = $('srUploadCountLabel');
    if (!grid) return;

    grid.innerHTML = '';
    const images = state.sr.uploadedImages;

    if (images.length === 0) {
      grid.style.display = 'none';
      if (statsBar) statsBar.style.display = 'none';
      return;
    }

    grid.style.display = 'grid';
    if (statsBar) statsBar.style.display = 'flex';
    if (countLbl) countLbl.textContent = `${images.length} slide(s) ready for AI revision`;

    images.forEach((img, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'sd-dz-thumb';
      thumb.innerHTML = `
        <img src="${img.base64}" alt="Slide ${idx + 1}">
        <span class="sd-dz-thumb-pill">Slide ${idx + 1}</span>
        <button type="button" class="sd-dz-thumb-del" data-index="${idx}" title="Remove slide">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      thumb.querySelector('.sd-dz-thumb-del').addEventListener('click', (e) => {
        e.stopPropagation();
        state.sr.uploadedImages.splice(idx, 1);
        renderImageThumbnails();
      });

      grid.appendChild(thumb);
    });
  }

  // ─── LOAD SAMPLE PRESETS ───
  function loadPreset(key) {
    const preset = SR_PRESETS[key];
    if (!preset) return;

    const textarea = $('srNotesTextInput');
    const subjectSelect = $('srSubjectSelect');
    const wordCount = $('srWordCount');

    if (textarea) {
      textarea.value = preset.text;
      if (wordCount) {
        const words = preset.text.trim().split(/\s+/).length;
        wordCount.textContent = `${words} words • ${preset.text.length} characters`;
      }
    }

    if (subjectSelect) subjectSelect.value = preset.subject;

    // Switch to text tab
    const srTabTextInput = $('srTabTextInput');
    const srTabImageInput = $('srTabImageInput');
    const srPanelText = $('srPanelText');
    const srPanelImages = $('srPanelImages');
    if (srTabTextInput) srTabTextInput.classList.add('active');
    if (srTabImageInput) srTabImageInput.classList.remove('active');
    if (srPanelText) srPanelText.style.display = 'block';
    if (srPanelImages) srPanelImages.style.display = 'none';

    // Direct render of the verified master mindmap
    state.sr.currentMindmap = JSON.parse(JSON.stringify(preset.mindmap));
    renderCurrentMindmapComplete();
    showToast(`Loaded "${preset.title}" mindmap!`, "success");
    playSuccessChime();
  }

  // ─── GENERATE SUPER MINDMAP ───
  async function handleGenerateSuperMindmap() {
    const textInput = $('srNotesTextInput');
    const notesText = textInput ? textInput.value.trim() : '';
    const images = state.sr.uploadedImages || [];
    const subjectSelect = $('srSubjectSelect');
    const depthSelect = $('srDepthSelect');
    const layoutSelect = $('srLayoutSelect');

    const subject = subjectSelect ? subjectSelect.value : 'General Study';
    const detailLevel = depthSelect ? depthSelect.value : 'comprehensive';
    const layout = layoutSelect ? layoutSelect.value : 'radial';

    if (!notesText && images.length === 0) {
      showToast("Please paste text notes or upload photos of notes/PPT slides!", "error");
      return;
    }

    const btn = $('srGenerateBtn');
    const loadingBox = $('srLoadingBox');
    if (btn) btn.disabled = true;
    if (loadingBox) loadingBox.style.display = 'block';

    // Step animation indicators
    const setStep = (stepNum) => {
      for (let i = 1; i <= 4; i++) {
        const el = $(`lstep${i}`);
        if (!el) continue;
        if (i < stepNum) {
          el.className = 'sd-sr-lstep done';
          el.querySelector('i').className = 'fa-solid fa-check text-green';
        } else if (i === stepNum) {
          el.className = 'sd-sr-lstep active';
          el.querySelector('i').className = 'fa-solid fa-spinner fa-spin text-gold';
        } else {
          el.className = 'sd-sr-lstep';
          el.querySelector('i').className = 'fa-regular fa-circle';
        }
      }
    };

    setStep(1);
    await new Promise(r => setTimeout(r, 400));
    setStep(2);

    let mindmapData = null;

    try {
      // 1. Primary Call: Server-Side Gemini 3.8 Flash Multimodal Endpoint
      const response = await fetch('/api/super-revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notesText,
          images,
          subject,
          detailLevel,
          layout
        })
      });

      setStep(3);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.mindmap) {
          mindmapData = data.mindmap;
        }
      }
    } catch (apiErr) {
      console.warn('[Study Dost] /api/super-revision fallback triggered:', apiErr.message);
    }

    // 2. Secondary Fallback: Cloudflare AI Proxy if server offline
    if (!mindmapData && CONFIG.AI_PROXY) {
      try {
        const prompt = `Convert this student material into a structured mindmap JSON: { "title": "Topic", "subject": "${subject}", "root": { "id":"root", "label":"Topic", "children": [...] }, "quickRevisionSummary": ["..."], "examMnemonics": [...], "highYieldFormulas": [...] }. Notes: ${notesText.slice(0, 3000)}`;
        const cfResp = await fetch(CONFIG.AI_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: prompt, subject: "Super Revision", mode: "mindmap" })
        });
        if (cfResp.ok) {
          const cfData = await cfResp.json();
          const raw = cfData.answer || cfData.text || cfData.response || JSON.stringify(cfData);
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            mindmapData = JSON.parse(match[0]);
          }
        }
      } catch (cfErr) {
        console.warn('[Study Dost] Cloudflare worker fallback:', cfErr.message);
      }
    }

    setStep(4);
    await new Promise(r => setTimeout(r, 300));

    // 3. Guaranteed Local Resilient Heuristic Generator (Zero failure guarantee)
    if (!mindmapData || !mindmapData.root) {
      mindmapData = generateSmartOutlineMindmap(notesText || 'Slide Revision Notes', subject);
    }

    if (btn) btn.disabled = false;
    if (loadingBox) loadingBox.style.display = 'none';

    state.sr.currentMindmap = mindmapData;
    renderCurrentMindmapComplete();

    // Award XP
    addXp(25, "Created Super Revision Mindmap 🧠");
    showToast("Super Revision Mindmap generated successfully! 🚀", "success");
    playSuccessChime();
  }

  // ─── RESILIENT SMART OUTLINE GENERATOR (OFFLINE FALLBACK) ───
  function generateSmartOutlineMindmap(text, subject) {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] ? lines[0].replace(/^(slide\s*\d+:?|#+)\s*/i, '').slice(0, 50) : `${subject} Revision`;

    const branchThemes = [];
    let currentTheme = null;

    lines.forEach((line, idx) => {
      // Check if line represents a slide or major section
      if (line.match(/^(slide\s*\d+|#+|\d+\.|\bunit\b|\bchapter\b)/i) || !currentTheme) {
        const cleanLabel = line.replace(/^(slide\s*\d+:?|#+|\d+\.\s*)/i, '').slice(0, 45);
        currentTheme = {
          id: `node-${branchThemes.length + 1}`,
          label: cleanLabel || `Core Section ${branchThemes.length + 1}`,
          icon: idx % 2 === 0 ? "⚡" : "📌",
          tag: `THEME ${branchThemes.length + 1}`,
          color: ['#D4AF37', '#9333ea', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][branchThemes.length % 6],
          summary: `Key takeaways and principles from ${cleanLabel}.`,
          examTip: `High-yield exam concept: thoroughly memorize core definitions and diagrams for this section.`,
          children: []
        };
        branchThemes.push(currentTheme);
      } else if (currentTheme && currentTheme.children.length < 5) {
        const cleanSub = line.replace(/^[-*•]\s*/, '').slice(0, 55);
        if (cleanSub) {
          currentTheme.children.push({
            id: `sub-${branchThemes.length}-${currentTheme.children.length + 1}`,
            label: cleanSub,
            icon: "🔹",
            tag: "KEY POINT",
            color: currentTheme.color,
            summary: cleanSub,
            children: []
          });
        }
      }
    });

    if (branchThemes.length === 0) {
      branchThemes.push({
        id: "node-1",
        label: "Core Principles & Overview",
        icon: "⚡",
        tag: "THEME 1",
        color: "#D4AF37",
        summary: "Primary conceptual foundation of the topic.",
        children: []
      });
    }

    return {
      title,
      subject,
      root: {
        id: "root",
        label: title,
        icon: "🧠",
        tag: "CORE TOPIC",
        color: "#D4AF37",
        summary: `Comprehensive mindmap covering all aspects of ${title}.`,
        children: branchThemes
      },
      quickRevisionSummary: lines.slice(0, 5).map(l => l.replace(/^[-*•\d.]+\s*/, '')),
      examMnemonics: [
        { concept: title, mnemonic: "FAST REVISION", meaning: "Focus, Active recall, Spaced review, Testing" }
      ],
      highYieldFormulas: [],
      activeRecallQuestions: [
        { question: `What is the main overarching principle of ${title}?`, answer: `Key concepts encompass: ${branchThemes.map(b => b.label).join(', ')}.`, difficulty: "Medium" }
      ]
    };
  }

  // ─── RENDER CURRENT MINDMAP VIEW ───
  function renderCurrentMindmapComplete() {
    const data = state.sr.currentMindmap;
    if (!data) return;

    const workspace = $('srWorkspace');
    if (workspace) {
      workspace.style.display = 'block';
      workspace.scrollIntoView({ behavior: 'smooth' });
    }

    const titleText = $('srMindmapTitleText');
    if (titleText) titleText.textContent = data.title || "Super Revision Mindmap";

    // Count concepts
    let totalNodes = 1;
    const countNodes = (n) => {
      if (n.children && n.children.length) {
        totalNodes += n.children.length;
        n.children.forEach(countNodes);
      }
    };
    if (data.root) countNodes(data.root);

    const statsPill = $('srMindmapStatsPill');
    if (statsPill) {
      const themesCount = (data.root && data.root.children) ? data.root.children.length : 0;
      const mnemCount = (data.examMnemonics) ? data.examMnemonics.length : 0;
      statsPill.textContent = `${themesCount} Major Themes • ${totalNodes} Total Concepts • ${mnemCount} Mnemonics • Active Recall Ready`;
    }

    renderMindmapSvg();
    renderRevisionSheet();
  }

  // ─── SVG MINDMAP VISUAL RENDERER ───
  function renderMindmapSvg() {
    const data = state.sr.currentMindmap;
    if (!data || !data.root) return;

    const svg = $('srCanvasSvg');
    const branchesLayer = $('srSvgBranchesLayer');
    const nodesLayer = $('srSvgNodesLayer');
    const rootTransform = $('srSvgRootTransform');
    if (!svg || !branchesLayer || !nodesLayer || !rootTransform) return;

    branchesLayer.innerHTML = '';
    nodesLayer.innerHTML = '';

    const theme = SR_THEMES[state.sr.theme] || SR_THEMES.chairman;
    const layout = state.sr.layout || 'radial';

    // Apply viewport container background
    const viewport = $('srViewport');
    if (viewport) {
      viewport.style.background = theme.bg;
    }

    // Viewport dimensions
    const vWidth = viewport ? viewport.clientWidth || 1000 : 1000;
    const vHeight = viewport ? viewport.clientHeight || 640 : 640;
    const centerX = vWidth / 2;
    const centerY = vHeight / 2;

    // Node positioning layout calculation
    const positionedNodes = computeMindmapLayout(data.root, centerX, centerY, layout, theme);

    // Render connecting branches (cubic bezier curves)
    positionedNodes.forEach(item => {
      if (item.parent) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const p1 = item.parent;
        const p2 = item;

        let d = '';
        if (layout === 'radial') {
          // Smooth radial curve
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          d = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;
        } else if (layout === 'split') {
          // Horizontal s-curve
          const cX1 = p1.x + (p2.x - p1.x) * 0.5;
          const cX2 = p1.x + (p2.x - p1.x) * 0.5;
          d = `M ${p1.x} ${p1.y} C ${cX1} ${p1.y}, ${cX2} ${p2.y}, ${p2.x} ${p2.y}`;
        } else {
          // Flow: downward s-curve
          const cY1 = p1.y + (p2.y - p1.y) * 0.5;
          const cY2 = p1.y + (p2.y - p1.y) * 0.5;
          d = `M ${p1.x} ${p1.y} C ${p1.x} ${cY1}, ${p2.x} ${cY2}, ${p2.x} ${p2.y}`;
        }

        path.setAttribute('d', d);
        path.setAttribute('class', 'sd-mm-branch-path');
        path.setAttribute('stroke', item.color || theme.rootBorder);
        path.setAttribute('stroke-width', item.level === 1 ? '3.5' : '2');
        path.setAttribute('stroke-opacity', '0.75');
        path.setAttribute('filter', 'url(#branchGlow)');
        branchesLayer.appendChild(path);
      }
    });

    // Render node cards
    positionedNodes.forEach(item => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'sd-mm-node-g');
      g.setAttribute('data-id', item.node.id);
      g.setAttribute('transform', `translate(${item.x}, ${item.y})`);

      const isRoot = item.level === 0;
      const isCollapsed = state.sr.collapsedNodes.has(item.node.id);
      const hasChildren = item.node.children && item.node.children.length > 0;

      const cardW = item.width;
      const cardH = item.height;
      const halfW = cardW / 2;
      const halfH = cardH / 2;

      // Card Background Rect
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', -halfW);
      rect.setAttribute('y', -halfH);
      rect.setAttribute('width', cardW);
      rect.setAttribute('height', cardH);
      rect.setAttribute('class', 'sd-mm-node-rect');
      rect.setAttribute('rx', isRoot ? 14 : 10);
      rect.setAttribute('ry', isRoot ? 14 : 10);
      rect.setAttribute('fill', isRoot ? theme.rootBorder : theme.nodeBg);
      rect.setAttribute('stroke', item.color || theme.rootBorder);
      rect.setAttribute('stroke-width', isRoot ? '2.5' : '1.8');
      rect.setAttribute('filter', 'url(#nodeGlow)');
      g.appendChild(rect);

      // Icon & Label Text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 0);
      text.setAttribute('y', isRoot ? 5 : 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'sd-mm-node-text');
      text.setAttribute('fill', isRoot ? '#0a0a0f' : theme.nodeText);
      text.setAttribute('font-size', isRoot ? '14px' : '12px');
      text.setAttribute('font-weight', isRoot ? '900' : '700');

      const icon = item.node.icon || (isRoot ? '👑' : '⚡');
      const label = item.node.label || 'Concept';
      const truncated = label.length > 26 ? label.slice(0, 24) + '...' : label;
      text.textContent = `${icon} ${truncated}`;
      g.appendChild(text);

      // Expand / Collapse Pill if node has children
      if (hasChildren && !isRoot) {
        const togglePill = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        togglePill.setAttribute('class', 'sd-mm-toggle-pill');
        togglePill.setAttribute('transform', `translate(${halfW - 4}, 0)`);

        const pillCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pillCircle.setAttribute('r', '8');
        pillCircle.setAttribute('fill', isCollapsed ? '#D4AF37' : theme.nodeBg);
        pillCircle.setAttribute('stroke', item.color || '#D4AF37');
        pillCircle.setAttribute('stroke-width', '1.5');

        const pillText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        pillText.setAttribute('text-anchor', 'middle');
        pillText.setAttribute('y', '3');
        pillText.setAttribute('font-size', '9px');
        pillText.setAttribute('font-weight', '900');
        pillText.setAttribute('fill', isCollapsed ? '#0a0a0f' : '#fff');
        pillText.textContent = isCollapsed ? `+${item.node.children.length}` : '−';

        togglePill.appendChild(pillCircle);
        togglePill.appendChild(pillText);

        togglePill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (state.sr.collapsedNodes.has(item.node.id)) {
            state.sr.collapsedNodes.delete(item.node.id);
          } else {
            state.sr.collapsedNodes.add(item.node.id);
          }
          renderMindmapSvg();
        });

        g.appendChild(togglePill);
      }

      // Click to open detailed node inspector modal
      g.addEventListener('click', () => {
        openNodeDetailModal(item.node);
      });

      nodesLayer.appendChild(g);
    });

    // Update transform
    applyViewportTransform();
  }

  // ─── COMPUTE LAYOUT POSITIONS ───
  function computeMindmapLayout(rootNode, centerX, centerY, layout, theme) {
    const list = [];
    if (!rootNode) return list;

    const rootItem = {
      node: rootNode,
      x: centerX,
      y: centerY,
      level: 0,
      width: Math.min(260, Math.max(160, rootNode.label.length * 10 + 40)),
      height: 44,
      color: theme.rootBorder,
      parent: null
    };
    list.push(rootItem);

    const l1Children = rootNode.children || [];
    const colors = theme.branchColors;

    if (layout === 'radial') {
      // 360° Organic Radial Layout
      const l1Radius = Math.min(centerX, centerY) * 0.55;
      const l2Radius = l1Radius + 140;

      l1Children.forEach((l1, i) => {
        if (state.sr.collapsedNodes.has(rootNode.id)) return;

        const angle = (2 * Math.PI * i) / l1Children.length - Math.PI / 2;
        const color = colors[i % colors.length];
        const l1X = centerX + l1Radius * Math.cos(angle);
        const l1Y = centerY + l1Radius * Math.sin(angle);

        const l1Item = {
          node: l1,
          x: l1X,
          y: l1Y,
          level: 1,
          width: Math.min(220, Math.max(130, l1.label.length * 8 + 36)),
          height: 36,
          color,
          parent: rootItem
        };
        list.push(l1Item);

        if (l1.children && !state.sr.collapsedNodes.has(l1.id)) {
          const l2Count = l1.children.length;
          const spreadAngle = Math.PI / (l1Children.length * 1.5);

          l1.children.forEach((l2, j) => {
            const subAngle = angle + (j - (l2Count - 1) / 2) * (spreadAngle / Math.max(1, l2Count));
            const l2X = centerX + l2Radius * Math.cos(subAngle);
            const l2Y = centerY + l2Radius * Math.sin(subAngle);

            const l2Item = {
              node: l2,
              x: l2X,
              y: l2Y,
              level: 2,
              width: Math.min(200, Math.max(110, l2.label.length * 7.5 + 32)),
              height: 32,
              color,
              parent: l1Item
            };
            list.push(l2Item);
          });
        }
      });

    } else if (layout === 'split') {
      // Dual-Wing Tree (Half Right, Half Left)
      const half = Math.ceil(l1Children.length / 2);
      const rightChildren = l1Children.slice(0, half);
      const leftChildren = l1Children.slice(half);

      const renderWing = (children, isRight) => {
        const sign = isRight ? 1 : -1;
        const totalH = children.length * 80;
        const startY = centerY - totalH / 2 + 40;

        children.forEach((l1, i) => {
          const color = colors[i % colors.length];
          const l1X = centerX + sign * 240;
          const l1Y = startY + i * 80;

          const l1Item = {
            node: l1,
            x: l1X,
            y: l1Y,
            level: 1,
            width: Math.min(210, Math.max(130, l1.label.length * 8 + 36)),
            height: 36,
            color,
            parent: rootItem
          };
          list.push(l1Item);

          if (l1.children && !state.sr.collapsedNodes.has(l1.id)) {
            const subCount = l1.children.length;
            const subStartY = l1Y - (subCount * 40) / 2 + 20;

            l1.children.forEach((l2, j) => {
              const l2X = l1X + sign * 200;
              const l2Y = subStartY + j * 42;

              list.push({
                node: l2,
                x: l2X,
                y: l2Y,
                level: 2,
                width: Math.min(190, Math.max(110, l2.label.length * 7.5 + 30)),
                height: 30,
                color,
                parent: l1Item
              });
            });
          }
        });
      };

      renderWing(rightChildren, true);
      renderWing(leftChildren, false);

    } else {
      // Hierarchical Flow (Top-Down)
      rootItem.x = centerX;
      rootItem.y = 70;

      const totalL1Width = l1Children.length * 220;
      const startX = centerX - totalL1Width / 2 + 110;

      l1Children.forEach((l1, i) => {
        const color = colors[i % colors.length];
        const l1X = startX + i * 220;
        const l1Y = 190;

        const l1Item = {
          node: l1,
          x: l1X,
          y: l1Y,
          level: 1,
          width: Math.min(200, Math.max(120, l1.label.length * 8 + 32)),
          height: 36,
          color,
          parent: rootItem
        };
        list.push(l1Item);

        if (l1.children && !state.sr.collapsedNodes.has(l1.id)) {
          l1.children.forEach((l2, j) => {
            const l2X = l1X;
            const l2Y = l1Y + 90 + j * 50;

            list.push({
              node: l2,
              x: l2X,
              y: l2Y,
              level: 2,
              width: Math.min(180, Math.max(110, l2.label.length * 7 + 28)),
              height: 30,
              color,
              parent: l1Item
            });
          });
        }
      });
    }

    return list;
  }

  // ─── ACTIVE RECALL COLLAPSE HELPER ───
  function collapseAllChildNodes() {
    state.sr.collapsedNodes.clear();
    const data = state.sr.currentMindmap;
    if (data && data.root && data.root.children) {
      data.root.children.forEach(l1 => {
        if (l1.children && l1.children.length > 0) {
          state.sr.collapsedNodes.add(l1.id);
        }
      });
    }
  }

  // ─── VIEWPORT PAN AND ZOOM ENGINE ───
  function setupViewportPanAndZoom() {
    const viewport = $('srViewport');
    if (!viewport) return;

    // Mouse drag pan
    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.sd-mm-node-g') || e.target.closest('.sd-sr-zoom-dock')) return;
      state.sr.isPanning = true;
      state.sr.startPanX = e.clientX - state.sr.panX;
      state.sr.startPanY = e.clientY - state.sr.panY;
      viewport.classList.add('grabbing');
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.sr.isPanning) return;
      state.sr.panX = e.clientX - state.sr.startPanX;
      state.sr.panY = e.clientY - state.sr.startPanY;
      applyViewportTransform();
    });

    window.addEventListener('mouseup', () => {
      if (state.sr.isPanning) {
        state.sr.isPanning = false;
        viewport.classList.remove('grabbing');
      }
    });

    // Mouse wheel zoom
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(state.sr.zoom + delta);
    }, { passive: false });

    // Touch support for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        state.sr.isPanning = true;
        touchStartX = e.touches[0].clientX - state.sr.panX;
        touchStartY = e.touches[0].clientY - state.sr.panY;
      }
    });
    viewport.addEventListener('touchmove', (e) => {
      if (state.sr.isPanning && e.touches.length === 1) {
        state.sr.panX = e.touches[0].clientX - touchStartX;
        state.sr.panY = e.touches[0].clientY - touchStartY;
        applyViewportTransform();
      }
    });
    viewport.addEventListener('touchend', () => {
      state.sr.isPanning = false;
    });

    // Zoom Buttons
    const btnIn = $('srZoomInBtn');
    const btnOut = $('srZoomOutBtn');
    const btnReset = $('srZoomResetBtn');
    const btnFit = $('srZoomFitBtn');

    if (btnIn) btnIn.addEventListener('click', () => setZoomLevel(state.sr.zoom + 0.2));
    if (btnOut) btnOut.addEventListener('click', () => setZoomLevel(state.sr.zoom - 0.2));
    if (btnReset) btnReset.addEventListener('click', () => {
      state.sr.panX = 0;
      state.sr.panY = 0;
      setZoomLevel(1);
    });
    if (btnFit) btnFit.addEventListener('click', fitMindmapToScreen);
  }

  function setZoomLevel(newZoom) {
    state.sr.zoom = Math.max(0.35, Math.min(3.0, newZoom));
    const lbl = $('srZoomPctLabel');
    if (lbl) lbl.textContent = `${Math.round(state.sr.zoom * 100)}%`;
    applyViewportTransform();
  }

  function applyViewportTransform() {
    const rootG = $('srSvgRootTransform');
    if (rootG) {
      rootG.setAttribute('transform', `translate(${state.sr.panX}, ${state.sr.panY}) scale(${state.sr.zoom})`);
    }
  }

  function fitMindmapToScreen() {
    state.sr.panX = 0;
    state.sr.panY = 0;
    setZoomLevel(0.85);
  }

  // ─── NODE DETAIL INSPECTOR MODAL ───
  function openNodeDetailModal(node) {
    if (!node) return;
    const modal = $('nodeDetailModal');
    if (!modal) return;

    const tagEl = $('nmTag');
    const titleEl = $('nmTitle');
    const summaryEl = $('nmSummary');
    const examBlock = $('nmExamBlock');
    const examTip = $('nmExamTip');
    const mnemBlock = $('nmMnemonicBlock');
    const mnem = $('nmMnemonic');
    const formBlock = $('nmFormulaBlock');
    const form = $('nmFormula');

    if (tagEl) {
      tagEl.textContent = node.tag || 'CONCEPT';
      tagEl.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
      tagEl.style.color = node.color || '#D4AF37';
    }

    if (titleEl) titleEl.textContent = `${node.icon || '📌'} ${node.label || 'Concept'}`;
    if (summaryEl) summaryEl.textContent = node.summary || 'Essential concept revision notes.';

    if (node.examTip) {
      if (examBlock) examBlock.style.display = 'block';
      if (examTip) examTip.textContent = node.examTip;
    } else {
      if (examBlock) examBlock.style.display = 'none';
    }

    if (node.mnemonic) {
      if (mnemBlock) mnemBlock.style.display = 'block';
      if (mnem) mnem.textContent = node.mnemonic;
    } else {
      if (mnemBlock) mnemBlock.style.display = 'none';
    }

    if (node.formula) {
      if (formBlock) formBlock.style.display = 'block';
      if (form) form.textContent = node.formula;
    } else {
      if (formBlock) formBlock.style.display = 'none';
    }

    modal.style.display = 'flex';
    playTone(550, 'sine', 0.1, 0.12);
  }

  // ─── REVISION SHEET PANELS & FLASHCARDS ───
  function setupBottomSheetTabs() {
    const tabs = ['Takeaways', 'Mnemonics', 'Recall', 'Saved'];
    tabs.forEach(tabName => {
      const tabBtn = $(`srBsTab${tabName}`);
      const panel = $(`srBsPanel${tabName}`);
      if (tabBtn && panel) {
        tabBtn.addEventListener('click', () => {
          tabs.forEach(t => {
            const b = $(`srBsTab${t}`);
            const p = $(`srBsPanel${t}`);
            if (b) b.classList.remove('active');
            if (p) p.classList.remove('active');
          });
          tabBtn.classList.add('active');
          panel.classList.add('active');
        });
      }
    });
  }

  function renderRevisionSheet() {
    const data = state.sr.currentMindmap;
    if (!data) return;

    // 1. Takeaways List
    const takeawaysList = $('srTakeawaysList');
    if (takeawaysList) {
      takeawaysList.innerHTML = '';
      const items = data.quickRevisionSummary || [];
      if (items.length === 0) {
        takeawaysList.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No takeaways generated yet.</p>';
      } else {
        items.forEach(text => {
          const el = document.createElement('div');
          el.className = 'sd-sr-takeaway-item';
          el.innerHTML = `<i class="fa-solid fa-check text-gold" style="margin-right:8px;"></i>${escapeHtml(text)}`;
          takeawaysList.appendChild(el);
        });
      }
    }

    // 2. Mnemonics Grid
    const mnemonicsGrid = $('srMnemonicsGrid');
    if (mnemonicsGrid) {
      mnemonicsGrid.innerHTML = '';
      const items = data.examMnemonics || [];
      if (items.length === 0) {
        mnemonicsGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No mnemonics available for this deck.</p>';
      } else {
        items.forEach(m => {
          const card = document.createElement('div');
          card.className = 'sd-sr-mnem-card';
          card.innerHTML = `
            <span class="sd-sr-mnem-badge">${escapeHtml(m.mnemonic)}</span>
            <div class="sd-sr-mnem-title">${escapeHtml(m.concept)}</div>
            <div class="sd-sr-mnem-desc">${escapeHtml(m.meaning || m.explanation || '')}</div>
          `;
          mnemonicsGrid.appendChild(card);
        });
      }
    }

    // 3. Active Recall Flashcards Grid
    const flashcardsGrid = $('srFlashcardsGrid');
    if (flashcardsGrid) {
      flashcardsGrid.innerHTML = '';
      const items = data.activeRecallQuestions || [];
      if (items.length === 0) {
        flashcardsGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No active recall flashcards generated.</p>';
      } else {
        items.forEach(q => {
          const card = document.createElement('div');
          card.className = 'sd-sr-fc-card';
          card.innerHTML = `
            <div>
              <span style="font-size:0.7rem;font-weight:800;color:var(--gold-primary);text-transform:uppercase;">FLASHCARD</span>
              <div class="sd-sr-fc-q">${escapeHtml(q.question)}</div>
            </div>
            <div>
              <button type="button" class="sd-sr-fc-btn">Reveal Answer</button>
              <div class="sd-sr-fc-a">${escapeHtml(q.answer)}</div>
            </div>
          `;
          const btn = card.querySelector('.sd-sr-fc-btn');
          const ans = card.querySelector('.sd-sr-fc-a');
          btn.addEventListener('click', () => {
            const isHidden = ans.style.display !== 'block';
            ans.style.display = isHidden ? 'block' : 'none';
            btn.textContent = isHidden ? 'Hide Answer' : 'Reveal Answer';
            if (isHidden) playTone(659, 'sine', 0.08, 0.1);
          });
          flashcardsGrid.appendChild(card);
        });
      }
    }
  }

  // ─── EXPORT AS RETINA HD PNG IMAGE ───
  function exportMindmapPng() {
    const svgEl = $('srCanvasSvg');
    if (!svgEl) return;

    showToast("Preparing High-Definition PNG image...", "info");

    const width = 1600;
    const height = 1000;
    const scale = 2; // Retina quality

    // Clone SVG and prepare standalone serialization
    const clonedSvg = svgEl.cloneNode(true);
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);

    // Apply inline style rules so SVG renders identically without external stylesheet
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      .sd-mm-branch-path { fill: none; stroke-linecap: round; }
      .sd-mm-node-rect { rx: 12px; ry: 12px; }
      .sd-mm-node-text { font-family: 'Space Grotesk', 'Inter', sans-serif; font-weight: 700; }
    `;
    clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);

    const svgXml = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0a0a0f');
      bgGrad.addColorStop(0.5, '#121218');
      bgGrad.addColorStop(1, '#08080c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle gold frame border
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Draw SVG onto canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Chairman Branding Watermark
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 16px "Space Grotesk", sans-serif';
      ctx.fillText('👑 THE CHAIRMAN SHOW • SUPER REVISION ENGINE', 32, height - 36);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillText(`Aesthetic Revision Mindmap • thechairmanshow.in`, 32, height - 18);

      URL.revokeObjectURL(blobUrl);

      // Download PNG trigger
      const link = document.createElement('a');
      const cleanTitle = (state.sr.currentMindmap && state.sr.currentMindmap.title)
        ? state.sr.currentMindmap.title.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'Super_Revision_Mindmap';
      link.download = `${cleanTitle}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast("High-Res HD PNG downloaded! 📸", "success");
      playSuccessChime();
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      showToast("Could not export PNG. Try Vector SVG export.", "error");
    };

    img.src = blobUrl;
  }

  // ─── EXPORT AS VECTOR SVG ───
  function exportMindmapSvg() {
    const svgEl = $('srCanvasSvg');
    if (!svgEl) return;

    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgXml = new XMLSerializer().serializeToString(cloned);
    const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const cleanTitle = (state.sr.currentMindmap && state.sr.currentMindmap.title)
      ? state.sr.currentMindmap.title.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'Super_Revision_Mindmap';
    link.download = `${cleanTitle}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    showToast("Lossless Vector SVG downloaded! 📐", "success");
    playSuccessChime();
  }

  // ─── EXPORT AS MARKDOWN REVISION SHEET ───
  function exportRevisionMarkdown() {
    const data = state.sr.currentMindmap;
    if (!data) return;

    let md = `# 👑 ${data.title || 'Chairman Super Revision'}\n`;
    md += `**Subject**: ${data.subject || 'General'}\n`;
    md += `**Date**: ${new Date().toLocaleDateString()}\n\n`;

    if (data.root) {
      md += `## 🌟 Central Core Theme: ${data.root.label}\n`;
      md += `${data.root.summary || ''}\n\n`;

      if (data.root.children) {
        data.root.children.forEach((c, idx) => {
          md += `### ${idx + 1}. ${c.label}\n`;
          if (c.summary) md += `*Summary*: ${c.summary}\n`;
          if (c.examTip) md += `*💡 Exam Tip*: ${c.examTip}\n`;
          if (c.mnemonic) md += `*🧠 Mnemonic*: ${c.mnemonic}\n`;
          if (c.formula) md += `*⚡ Formula*: \`${c.formula}\`\n`;

          if (c.children && c.children.length) {
            c.children.forEach(sub => {
              md += `  - **${sub.label}**: ${sub.summary || ''}\n`;
            });
          }
          md += `\n`;
        });
      }
    }

    if (data.quickRevisionSummary && data.quickRevisionSummary.length) {
      md += `## 🚀 High-Yield Key Takeaways\n`;
      data.quickRevisionSummary.forEach(item => {
        md += `- ${item}\n`;
      });
      md += `\n`;
    }

    if (data.examMnemonics && data.examMnemonics.length) {
      md += `## 🧠 Memory Mnemonics & Shortcuts\n`;
      data.examMnemonics.forEach(m => {
        md += `- **${m.concept}**: \`${m.mnemonic}\` — ${m.meaning || m.explanation || ''}\n`;
      });
      md += `\n`;
    }

    if (data.highYieldFormulas && data.highYieldFormulas.length) {
      md += `## ⚡ High-Yield Formulas & Laws\n`;
      data.highYieldFormulas.forEach(f => {
        md += `- **${f.name}**: \`${f.formula}\` (${f.notes || ''})\n`;
      });
      md += `\n`;
    }

    md += `---\n*Generated by Chairman Super Revision on [The Chairman Show](https://thechairmanshow.in)*\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanTitle = (data.title || 'Revision_Sheet').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanTitle}_Revision_Sheet.md`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    showToast("Markdown Revision Sheet exported! 📄", "success");
  }

  function copyMindmapJson() {
    const data = state.sr.currentMindmap;
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      .then(() => showToast("Mindmap JSON copied to clipboard! 📋", "success"))
      .catch(() => showToast("Failed to copy to clipboard", "error"));
  }

  // ─── SAVED MINDMAPS PERSISTENCE ───
  function saveCurrentMindmap() {
    const data = state.sr.currentMindmap;
    if (!data) return;

    const savedItem = {
      id: `mindmap_${Date.now()}`,
      savedAt: new Date().toISOString(),
      title: data.title || "Untitled Mindmap",
      subject: data.subject || "General",
      data
    };

    state.sr.savedMindmaps.unshift(savedItem);
    try {
      localStorage.setItem("sr_saved_mindmaps_v1", JSON.stringify(state.sr.savedMindmaps));
    } catch (e) {
      console.warn("Local storage write error:", e.message);
    }

    // Save to Firestore if user authenticated
    if (db && currentUser) {
      db.collection('users')
        .doc(currentUser.uid)
        .collection('mindmaps')
        .doc(savedItem.id)
        .set(savedItem)
        .catch(err => console.log('Firestore mindmap save notice:', err.message));
    }

    renderSavedMindmapsList();
    showToast("Mindmap saved to your personal library! 💾", "success");
    playTone(880, 'sine', 0.1, 0.15);
  }

  function loadSavedMindmapsFromStorage() {
    try {
      const raw = localStorage.getItem("sr_saved_mindmaps_v1");
      if (raw) {
        state.sr.savedMindmaps = JSON.parse(raw);
        renderSavedMindmapsList();
      }
    } catch (e) {
      state.sr.savedMindmaps = [];
    }
  }

  function renderSavedMindmapsList() {
    const list = $('srSavedMindmapsList');
    const pill = $('srSavedCountPill');
    if (!list) return;

    list.innerHTML = '';
    const items = state.sr.savedMindmaps || [];
    if (pill) pill.textContent = items.length;

    if (items.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No mindmaps saved yet. Click the "Save" button to keep revision decks here!</p>';
      return;
    }

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'sd-sr-takeaway-item';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';
      card.innerHTML = `
        <div>
          <div style="font-weight:700;color:#fff;">👑 ${escapeHtml(item.title)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(item.subject)} • ${new Date(item.savedAt).toLocaleDateString()}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="sd-btn-add" style="padding:4px 10px;font-size:0.78rem;" data-idx="${idx}">Open</button>
          <button type="button" class="sd-clear-btn" style="padding:4px 8px;font-size:0.78rem;" data-del="${idx}">Delete</button>
        </div>
      `;

      card.querySelector('[data-idx]').addEventListener('click', () => {
        state.sr.currentMindmap = item.data;
        renderCurrentMindmapComplete();
        showToast(`Loaded "${item.title}"!`, "success");
      });

      card.querySelector('[data-del]').addEventListener('click', () => {
        state.sr.savedMindmaps.splice(idx, 1);
        try {
          localStorage.setItem("sr_saved_mindmaps_v1", JSON.stringify(state.sr.savedMindmaps));
        } catch (e) {}
        renderSavedMindmapsList();
        showToast("Deleted saved mindmap", "info");
      });

      list.appendChild(card);
    });
  }

  // ─── UTILITY HELPERS ───
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let formatted = escapeHtml(text);
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Code
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    // Bullet points
    formatted = formatted.replace(/^\s*[-•*]\s+(.*)$/gm, '<li>$1</li>');
    if (formatted.includes('<li>')) {
      formatted = `<ul>${formatted}</ul>`;
    }
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  // Boot up application on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
