/**
 * THE CHAIRMAN SHOW — GLOBAL PRACTICE EXAM TIMER & MOCK QUIZ SUITE
 * Universal Exam Pressure Simulation, Configurable Durations, and Timed Problem Solving
 */

const PracticeTimer = (function() {
  // State
  let config = {
    duration: 45 * 60, // default 45 mins in seconds
    remaining: 45 * 60,
    isRunning: false,
    soundEnabled: true,
    strictMode: false,
    minimized: false,
    activeTab: 'timer', // 'timer' | 'quiz' | 'stats'
    dockPos: 'bottom-right' // 'bottom-right' | 'top-right' | 'bottom-left'
  };

  let timerInterval = null;
  let targetEndTime = null;
  let audioCtx = null;
  let violationsCount = 0;
  let sessionSolved = [];
  let sessionStats = {
    totalSessions: 0,
    totalSecondsFocused: 0,
    problemsSolvedCount: 0
  };

  // Mock Quiz state
  let currentQuiz = null; // { tier: '', questions: [ids], currentIndex: 0, startTime: 0, duration: 0 }

  // Load persisted settings
  function loadPersistedState() {
    try {
      const saved = localStorage.getItem('tcs_practice_timer_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.duration) {
          config.duration = parsed.duration;
          config.remaining = parsed.duration;
        }
        if (typeof parsed.soundEnabled === 'boolean') config.soundEnabled = parsed.soundEnabled;
        if (typeof parsed.strictMode === 'boolean') config.strictMode = parsed.strictMode;
        if (parsed.dockPos) config.dockPos = parsed.dockPos;
      }
      const savedStats = localStorage.getItem('tcs_practice_timer_stats');
      if (savedStats) {
        sessionStats = Object.assign(sessionStats, JSON.parse(savedStats));
      }
    } catch (e) {
      console.warn('Could not read timer state', e);
    }
  }

  function savePersistedState() {
    try {
      localStorage.setItem('tcs_practice_timer_config', JSON.stringify({
        duration: config.duration,
        soundEnabled: config.soundEnabled,
        strictMode: config.strictMode,
        dockPos: config.dockPos
      }));
      localStorage.setItem('tcs_practice_timer_stats', JSON.stringify(sessionStats));
    } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════════
  // SYNTHESIZED WEB AUDIO ENGINE (Zero dependency, instant sound)
  // ══════════════════════════════════════════════════════════════
  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.2, volume = 0.15) {
    if (!config.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playSoundAlert(type) {
    if (!config.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      if (type === 'start') {
        // Resonant ascending gong
        playTone(440, 'sine', 0.3, 0.2);
        setTimeout(() => playTone(659.25, 'sine', 0.5, 0.25), 120);
        setTimeout(() => playTone(880, 'triangle', 0.8, 0.2), 260);
      } else if (type === 'tick') {
        // Crisp subtle heartbeat tick for final 10 seconds
        playTone(900, 'sine', 0.05, 0.1);
      } else if (type === 'warning5m') {
        // Double warning chime
        playTone(523.25, 'triangle', 0.25, 0.2);
        setTimeout(() => playTone(659.25, 'triangle', 0.35, 0.2), 150);
      } else if (type === 'warning1m') {
        // High alert ping
        playTone(784, 'square', 0.2, 0.15);
        setTimeout(() => playTone(784, 'square', 0.3, 0.15), 180);
      } else if (type === 'timeup') {
        // Loud triumphant exam bell
        playTone(330, 'triangle', 0.4, 0.3);
        setTimeout(() => playTone(330, 'triangle', 0.4, 0.3), 200);
        setTimeout(() => playTone(440, 'triangle', 0.5, 0.35), 400);
        setTimeout(() => playTone(659.25, 'sine', 1.2, 0.4), 650);
      } else if (type === 'solve') {
        // Positive milestone chime
        playTone(523.25, 'sine', 0.2, 0.2);
        setTimeout(() => playTone(659.25, 'sine', 0.2, 0.2), 100);
        setTimeout(() => playTone(783.99, 'sine', 0.4, 0.25), 200);
        setTimeout(() => playTone(1046.5, 'sine', 0.6, 0.25), 300);
      }
    } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════════
  // CORE TIMER ENGINE
  // ══════════════════════════════════════════════════════════════
  function start() {
    initAudio();
    if (config.remaining <= 0) {
      config.remaining = config.duration;
    }
    config.isRunning = true;
    targetEndTime = Date.now() + (config.remaining * 1000);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 250);

    playSoundAlert('start');
    sessionStats.totalSessions += 1;
    savePersistedState();
    updateUI();
  }

  function pause() {
    if (!config.isRunning) return;
    config.isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateUI();
  }

  function toggle() {
    if (config.isRunning) {
      pause();
    } else {
      start();
    }
  }

  function reset() {
    pause();
    config.remaining = config.duration;
    violationsCount = 0;
    updateUI();
  }

  function setDurationMinutes(mins) {
    const validMins = Math.max(1, Math.min(180, parseInt(mins, 10) || 45));
    config.duration = validMins * 60;
    config.remaining = config.duration;
    savePersistedState();
    updateUI();
  }

  function addMinutes(extraMins = 5) {
    const addedSecs = extraMins * 60;
    config.remaining += addedSecs;
    if (config.remaining > config.duration) {
      config.duration = config.remaining;
    }
    if (config.isRunning) {
      targetEndTime = Date.now() + (config.remaining * 1000);
    }
    updateUI();
  }

  function tick() {
    if (!config.isRunning || !targetEndTime) return;

    const diffMs = targetEndTime - Date.now();
    const prevSec = config.remaining;
    config.remaining = Math.max(0, Math.ceil(diffMs / 1000));

    // Stats tracker
    if (prevSec !== config.remaining) {
      sessionStats.totalSecondsFocused += 1;
    }

    // Exam pressure sound alerts
    if (prevSec !== config.remaining) {
      if (config.remaining === 5 * 60) playSoundAlert('warning5m');
      if (config.remaining === 60) playSoundAlert('warning1m');
      if (config.remaining > 0 && config.remaining <= 10) playSoundAlert('tick');
    }

    // Time's Up trigger
    if (config.remaining <= 0) {
      onTimeUp();
      return;
    }

    updateUI();
  }

  function onTimeUp() {
    pause();
    config.remaining = 0;
    playSoundAlert('timeup');
    updateUI();
    showTimesUpModal();
  }

  // ══════════════════════════════════════════════════════════════
  // STRICT EXAM MODE & FOCUS DETECTION
  // ══════════════════════════════════════════════════════════════
  function setupStrictFocusWatcher() {
    function handleViolation() {
      if (config.isRunning && config.strictMode) {
        violationsCount += 1;
        showViolationAlert();
        updateUI();
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handleViolation();
    });

    window.addEventListener('blur', () => {
      handleViolation();
    });
  }

  function showViolationAlert() {
    const existing = document.getElementById('examViolationToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'examViolationToast';
    toast.className = 'exam-violation-toast';
    toast.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>
      <span>Exam Focus Warning: Tab switch detected! (Violation #${violationsCount})</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4000);
  }

  // ══════════════════════════════════════════════════════════════
  // PROBLEM VIEWER & SOLVE EVENT HOOKS
  // ══════════════════════════════════════════════════════════════
  function recordProblemSolved(problemId) {
    if (!sessionSolved.includes(problemId)) {
      sessionSolved.push(problemId);
      sessionStats.problemsSolvedCount += 1;
      savePersistedState();

      if (config.isRunning) {
        playSoundAlert('solve');
      }

      // If active in a mock quiz, mark that question as solved
      if (currentQuiz && currentQuiz.questions.includes(problemId)) {
        renderMockQuizNavigator();
      }

      updateUI();
    }
  }

  function hookProblemSolver() {
    // Intercept Progress.markSolved
    if (window.Progress && typeof window.Progress.markSolved === 'function') {
      const originalMarkSolved = window.Progress.markSolved;
      window.Progress.markSolved = function(id) {
        const res = originalMarkSolved.apply(this, arguments);
        recordProblemSolved(id);
        return res;
      };
    }

    // Listen to problem tab changes to update ticker
    const observer = new MutationObserver(() => {
      updateCurrentProblemTicker();
    });
    const pvTitle = document.getElementById('pvTitle');
    if (pvTitle) {
      observer.observe(pvTitle, { childList: true, characterData: true, subtree: true });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // MOCK QUIZ ENGINE
  // ══════════════════════════════════════════════════════════════
  function generateMockQuiz(tier) {
    const all = window.PROBLEMS_DB || [];
    if (!all.length) {
      if (window.toast) window.toast('error', 'Error', 'Problems database not yet loaded');
      return;
    }

    let questions = [];
    let durationMins = 45;

    if (tier === 'easy') {
      const easyPool = all.filter(p => p.difficulty === 'Easy');
      questions = shuffleArray(easyPool).slice(0, 5).map(p => p.id);
      durationMins = 25;
    } else if (tier === 'medium') {
      const medPool = all.filter(p => p.difficulty === 'Medium');
      questions = shuffleArray(medPool).slice(0, 5).map(p => p.id);
      durationMins = 45;
    } else if (tier === 'hard') {
      const hardPool = all.filter(p => p.difficulty === 'Hard');
      questions = shuffleArray(hardPool).slice(0, 3).map(p => p.id);
      durationMins = 60;
    } else {
      // Mixed
      const easy = shuffleArray(all.filter(p => p.difficulty === 'Easy')).slice(0, 1);
      const med = shuffleArray(all.filter(p => p.difficulty === 'Medium')).slice(0, 3);
      const hard = shuffleArray(all.filter(p => p.difficulty === 'Hard')).slice(0, 1);
      questions = [...easy, ...med, ...hard].map(p => p.id);
      durationMins = 45;
    }

    currentQuiz = {
      tier: tier,
      questions: questions,
      currentIndex: 0,
      startTime: Date.now(),
      durationSeconds: durationMins * 60,
      submitted: false
    };

    setDurationMinutes(durationMins);
    start();

    // Open first problem
    if (questions.length && typeof window.openProblem === 'function') {
      window.openProblem(questions[0]);
    }

    if (window.toast) {
      window.toast('success', 'Mock Exam Started', `Timed ${durationMins}-minute mock challenge activated!`);
    }

    config.activeTab = 'quiz';
    updateUI();
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function submitMockExam() {
    if (!currentQuiz) return;
    pause();
    currentQuiz.submitted = true;

    const solvedInQuiz = currentQuiz.questions.filter(id => {
      return (window.Progress && window.Progress.isSolved && window.Progress.isSolved(id)) || sessionSolved.includes(id);
    });

    const score = Math.round((solvedInQuiz.length / currentQuiz.questions.length) * 100);
    showTimesUpModal(`Mock Quiz Complete! You scored ${score}% (${solvedInQuiz.length}/${currentQuiz.questions.length} problems solved).`);
  }

  // ══════════════════════════════════════════════════════════════
  // FORMATTING & TIME HELPERS
  // ══════════════════════════════════════════════════════════════
  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ══════════════════════════════════════════════════════════════
  // UI RENDERING & COMPONENT SYNC
  // ══════════════════════════════════════════════════════════════
  function updateUI() {
    const formatted = formatTime(config.remaining);
    const percent = config.duration > 0 ? (config.remaining / config.duration) * 100 : 0;
    const isCritical = config.remaining <= 60 && config.remaining > 0;
    const isOver = config.remaining === 0;

    // 1. Update Global Header Nav Button & Badge
    const navBtn = document.getElementById('practiceTimerToggleBtn');
    const navBadge = document.getElementById('navTimerBadge');
    if (navBtn) {
      if (config.isRunning) {
        navBtn.classList.add('active');
      } else {
        navBtn.classList.remove('active');
      }
    }
    if (navBadge) {
      navBadge.style.display = 'inline-block';
      navBadge.textContent = formatted;
      if (isCritical) {
        navBadge.style.color = '#ef4444';
        navBadge.style.borderColor = '#ef4444';
      } else {
        navBadge.style.color = '';
        navBadge.style.borderColor = '';
      }
    }

    // 2. Update Floating Widget HUD
    const widget = document.getElementById('practiceTimerWidget');
    if (widget) {
      // Critical pressure class
      if (isCritical) {
        widget.classList.add('pressure-critical');
      } else {
        widget.classList.remove('pressure-critical');
      }

      // Minimized class
      if (config.minimized) {
        widget.classList.add('minimized');
      } else {
        widget.classList.remove('minimized');
      }

      // Digits & Progress bar
      const clockDigits = document.getElementById('ptwClockDigits');
      if (clockDigits) clockDigits.textContent = formatted;

      const miniDigits = document.getElementById('ptwMiniDigits');
      if (miniDigits) miniDigits.textContent = formatted;

      const progressFill = document.getElementById('ptwProgressFill');
      if (progressFill) progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;

      // Status text
      const statusText = document.getElementById('ptwStatusText');
      if (statusText) {
        if (isOver) {
          statusText.textContent = "Time's Up · Exam Complete";
        } else if (config.isRunning) {
          statusText.textContent = isCritical ? "⚡ EXTREME EXAM PRESSURE" : "⚡ Real Exam Pressure Running";
        } else {
          statusText.textContent = "Timer Paused · Standby";
        }
      }

      // Start/Pause Button inside HUD
      const startPauseBtn = document.getElementById('ptwStartPauseBtn');
      if (startPauseBtn) {
        if (config.isRunning) {
          startPauseBtn.className = 'ptw-btn-action ptw-btn-pause';
          startPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        } else {
          startPauseBtn.className = 'ptw-btn-action ptw-btn-start';
          startPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
        }
      }

      // Mini play/pause
      const miniPlayBtn = document.getElementById('ptwMiniPlayBtn');
      if (miniPlayBtn) {
        miniPlayBtn.innerHTML = config.isRunning ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      }

      // Active preset chip highlight
      const presetButtons = widget.querySelectorAll('.ptw-preset-btn');
      presetButtons.forEach(btn => {
        const mins = parseInt(btn.dataset.mins, 10);
        if (mins * 60 === config.duration) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // 3. Problem View Header Widget (#pvTimerWidget)
    const pvTimerWidget = document.getElementById('pvTimerWidget');
    if (pvTimerWidget) {
      if (isCritical) {
        pvTimerWidget.classList.add('critical');
      } else {
        pvTimerWidget.classList.remove('critical');
      }

      const pvClock = pvTimerWidget.querySelector('.pv-timer-clk');
      if (pvClock) pvClock.textContent = formatted;

      const pvToggleBtn = pvTimerWidget.querySelector('.pv-toggle-run-btn');
      if (pvToggleBtn) {
        pvToggleBtn.innerHTML = config.isRunning ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      }
    }

    // 4. Editor Header Timer Badge
    const editorTimerBadge = document.getElementById('editorTimerBadge');
    const editorTimerDigits = document.getElementById('editorTimerDigits');
    if (editorTimerBadge && editorTimerDigits) {
      editorTimerBadge.style.display = 'inline-flex';
      editorTimerDigits.textContent = formatted;
      if (isCritical) {
        editorTimerBadge.classList.add('critical');
      } else {
        editorTimerBadge.classList.remove('critical');
      }
    }

    // 5. Update Current Problem ticker
    updateCurrentProblemTicker();
  }

  function updateCurrentProblemTicker() {
    const tickerTitle = document.getElementById('ptwCurrentProbTitle');
    const solvesTally = document.getElementById('ptwSessionSolvesCount');

    if (tickerTitle) {
      const pvTitle = document.getElementById('pvTitle');
      if (pvTitle && pvTitle.textContent && pvTitle.textContent.trim() !== 'Problem Title') {
        tickerTitle.textContent = pvTitle.textContent.trim();
      } else {
        tickerTitle.textContent = "Python Arena · Practice Mode";
      }
    }

    if (solvesTally) {
      solvesTally.textContent = sessionSolved.length;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // MOCK QUIZ NAVIGATOR RENDERER
  // ══════════════════════════════════════════════════════════════
  function renderMockQuizNavigator() {
    const wrap = document.getElementById('ptwMockQuizNavWrap');
    if (!wrap) return;

    if (!currentQuiz) {
      wrap.innerHTML = '';
      return;
    }

    const html = `
      <div class="ptw-quiz-navigator">
        <div class="ptw-quiz-nav-head">
          <span><i class="fa-solid fa-list-check"></i> ${currentQuiz.tier.toUpperCase()} CHALLENGE</span>
          <span>${sessionSolved.filter(id => currentQuiz.questions.includes(id)).length} / ${currentQuiz.questions.length} Solved</span>
        </div>
        <div class="ptw-quiz-chips-wrap">
          ${currentQuiz.questions.map((qid, idx) => {
            const isSolved = (window.Progress && window.Progress.isSolved && window.Progress.isSolved(qid)) || sessionSolved.includes(qid);
            const isCurrent = currentQuiz.currentIndex === idx;
            return `
              <button class="ptw-quiz-q-chip ${isCurrent ? 'active' : ''} ${isSolved ? 'solved' : ''}"
                      onclick="PracticeTimer.jumpToQuizQuestion(${idx})"
                      title="Question ${idx + 1}">
                Q${idx + 1}
              </button>
            `;
          }).join('')}
        </div>
        <div style="margin-top:0.6rem;display:flex;justify-content:flex-end;">
          <button class="ptw-custom-btn" onclick="PracticeTimer.submitMockExam()" style="background:#ef4444;color:#fff;border-color:#ef4444;">
            <i class="fa-solid fa-flag-checkered"></i> Submit Exam
          </button>
        </div>
      </div>
    `;
    wrap.innerHTML = html;
  }

  function jumpToQuizQuestion(idx) {
    if (!currentQuiz || !currentQuiz.questions[idx]) return;
    currentQuiz.currentIndex = idx;
    const qid = currentQuiz.questions[idx];
    if (typeof window.openProblem === 'function') {
      window.openProblem(qid);
    }
    renderMockQuizNavigator();
  }

  // ══════════════════════════════════════════════════════════════
  // TIME'S UP DEBRIEF MODAL
  // ══════════════════════════════════════════════════════════════
  function showTimesUpModal(customMessage) {
    const existing = document.getElementById('examTimesUpModal');
    if (existing) existing.remove();

    const solvedCount = sessionSolved.length;
    const totalMinutesAllocated = Math.round(config.duration / 60);

    const modal = document.createElement('div');
    modal.id = 'examTimesUpModal';
    modal.className = 'exam-modal-overlay';
    modal.innerHTML = `
      <div class="exam-modal-card">
        <div class="exam-modal-icon">
          <i class="fa-solid fa-bell"></i>
        </div>
        <h2 class="exam-modal-title">Time's Up!</h2>
        <p class="exam-modal-desc">
          ${customMessage || "Your timed exam simulation session has completed. Review your focus metrics and solutions under real exam pressure."}
        </p>

        <div class="exam-score-grid">
          <div class="exam-score-box">
            <div class="val">${totalMinutesAllocated}m</div>
            <div class="lbl">Exam Duration</div>
          </div>
          <div class="exam-score-box">
            <div class="val" style="color:var(--accent-green);">${solvedCount}</div>
            <div class="lbl">Problems Solved</div>
          </div>
          <div class="exam-score-box">
            <div class="val" style="color:${violationsCount > 0 ? '#ef4444' : '#10b981'};">${violationsCount}</div>
            <div class="lbl">Focus Violations</div>
          </div>
        </div>

        <div class="exam-modal-actions">
          <button class="ptw-btn-action ptw-btn-extend" onclick="PracticeTimer.addMinutes(5); document.getElementById('examTimesUpModal').remove();">
            <i class="fa-solid fa-plus"></i> +5 Mins Extra
          </button>
          <button class="ptw-btn-action ptw-btn-start" onclick="PracticeTimer.reset(); PracticeTimer.start(); document.getElementById('examTimesUpModal').remove();">
            <i class="fa-solid fa-rotate-right"></i> Restart Simulation
          </button>
          <button class="ptw-btn-action ptw-btn-secondary" onclick="document.getElementById('examTimesUpModal').remove();">
            <i class="fa-solid fa-check"></i> Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // ══════════════════════════════════════════════════════════════
  // HUD INJECTION & MOUNTING
  // ══════════════════════════════════════════════════════════════
  function mountHUD() {
    if (document.getElementById('practiceTimerWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'practiceTimerWidget';
    widget.className = 'practice-timer-widget';

    widget.innerHTML = `
      <!-- Minimized Bar -->
      <div class="ptw-mini-bar" id="ptwMiniBar">
        <div class="ptw-mini-indicator" onclick="PracticeTimer.expandWidget()">
          <div class="ptw-mini-pulse"></div>
          <span class="ptw-mini-digits" id="ptwMiniDigits">45:00</span>
          <span class="ptw-mini-badge">EXAM MODE</span>
        </div>
        <div class="ptw-mini-actions">
          <button class="ptw-mini-btn primary" id="ptwMiniPlayBtn" onclick="PracticeTimer.toggle()" title="Play/Pause">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="ptw-mini-btn" onclick="PracticeTimer.addMinutes(5)" title="+5 Mins">
            +5m
          </button>
          <button class="ptw-mini-btn" onclick="PracticeTimer.expandWidget()" title="Expand Exam Cockpit">
            <i class="fa-solid fa-expand"></i>
          </button>
        </div>
      </div>

      <!-- Full Cockpit Content -->
      <div class="ptw-full-content">
        <!-- Header -->
        <div class="ptw-header">
          <div class="ptw-title-wrap">
            <div class="ptw-icon-badge">
              <i class="fa-solid fa-stopwatch-20"></i>
            </div>
            <div class="ptw-header-text">
              <h4>Practice Exam Timer <span class="ptw-pressure-tag" id="ptwPressureTag">EXAM PRESSURE</span></h4>
            </div>
          </div>
          <div class="ptw-controls">
            <button class="ptw-ctrl-btn" onclick="PracticeTimer.toggleSound()" title="Toggle Sound" id="ptwSoundToggleBtn">
              <i class="fa-solid fa-volume-high"></i>
            </button>
            <button class="ptw-ctrl-btn" onclick="PracticeTimer.minimizeWidget()" title="Minimize to Pill">
              <i class="fa-solid fa-compress"></i>
            </button>
            <button class="ptw-ctrl-btn" onclick="PracticeTimer.toggleVisibility()" title="Close HUD">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Tab Switcher -->
        <div class="ptw-nav-tabs">
          <button class="ptw-tab-btn active" id="ptwTabTimer" onclick="PracticeTimer.switchTab('timer')">
            <i class="fa-solid fa-clock"></i> Countdown
          </button>
          <button class="ptw-tab-btn" id="ptwTabQuiz" onclick="PracticeTimer.switchTab('quiz')">
            <i class="fa-solid fa-graduation-cap"></i> Mock Quiz Arena
          </button>
          <button class="ptw-tab-btn" id="ptwTabStats" onclick="PracticeTimer.switchTab('stats')">
            <i class="fa-solid fa-chart-line"></i> Session Stats
          </button>
        </div>

        <!-- Body -->
        <div class="ptw-body">
          <!-- 1. COUNTDOWN TIMER PANEL -->
          <div id="ptwPanelTimer">
            <div class="ptw-display-card">
              <div class="ptw-progress-bar-wrap">
                <div class="ptw-progress-bar-fill" id="ptwProgressFill" style="width: 100%;"></div>
              </div>
              <div class="ptw-clock-digits" id="ptwClockDigits">
                45:00
              </div>
              <div class="ptw-status-subline">
                <span class="ptw-status-indicator" id="ptwStatusDot"></span>
                <span id="ptwStatusText">Standby · Press Start to Begin</span>
              </div>
            </div>

            <!-- Action Controls -->
            <div class="ptw-actions-row">
              <button class="ptw-btn-action ptw-btn-start" id="ptwStartPauseBtn" onclick="PracticeTimer.toggle()">
                <i class="fa-solid fa-play"></i> Start
              </button>
              <button class="ptw-btn-action ptw-btn-secondary" onclick="PracticeTimer.reset()">
                <i class="fa-solid fa-rotate-left"></i> Reset
              </button>
              <button class="ptw-btn-action ptw-btn-extend" onclick="PracticeTimer.addMinutes(5)">
                +5 Mins
              </button>
            </div>

            <!-- Configurable Duration Presets -->
            <div class="ptw-presets-section">
              <div class="ptw-section-label">
                <span>Configure Exam Duration</span>
              </div>
              <div class="ptw-presets-grid">
                <button class="ptw-preset-btn" data-mins="15" onclick="PracticeTimer.setDurationMinutes(15)">
                  <span>15 Mins</span>
                  <span class="preset-sub">Speed Blitz</span>
                </button>
                <button class="ptw-preset-btn" data-mins="25" onclick="PracticeTimer.setDurationMinutes(25)">
                  <span>25 Mins</span>
                  <span class="preset-sub">Pomodoro</span>
                </button>
                <button class="ptw-preset-btn" data-mins="30" onclick="PracticeTimer.setDurationMinutes(30)">
                  <span>30 Mins</span>
                  <span class="preset-sub">Tech Screen</span>
                </button>
                <button class="ptw-preset-btn active" data-mins="45" onclick="PracticeTimer.setDurationMinutes(45)">
                  <span>45 Mins</span>
                  <span class="preset-sub">Standard Exam</span>
                </button>
                <button class="ptw-preset-btn" data-mins="60" onclick="PracticeTimer.setDurationMinutes(60)">
                  <span>60 Mins</span>
                  <span class="preset-sub">Coding Round</span>
                </button>
                <button class="ptw-preset-btn" data-mins="90" onclick="PracticeTimer.setDurationMinutes(90)">
                  <span>90 Mins</span>
                  <span class="preset-sub">Full Mock</span>
                </button>
              </div>

              <!-- Custom Duration -->
              <div class="ptw-custom-row">
                <i class="fa-solid fa-sliders" style="color:var(--text-muted);font-size:.8rem;"></i>
                <span>Custom Duration:</span>
                <input type="number" id="ptwCustomMins" min="1" max="180" placeholder="45" value="45">
                <button class="ptw-custom-btn" onclick="PracticeTimer.applyCustomMinutes()">Set</button>
              </div>
            </div>

            <!-- Real Exam Simulation Toggles -->
            <div class="ptw-settings-list">
              <div class="ptw-setting-item">
                <div class="ptw-setting-info">
                  <i class="fa-solid fa-shield-halved"></i>
                  <div>
                    <div class="title">Strict Exam Mode</div>
                    <div class="desc">Penalizes tab switching & blur distractions</div>
                  </div>
                </div>
                <label class="ptw-switch">
                  <input type="checkbox" id="ptwStrictSwitch" onchange="PracticeTimer.setStrictMode(this.checked)">
                  <span class="ptw-slider"></span>
                </label>
              </div>

              <div class="ptw-setting-item">
                <div class="ptw-setting-info">
                  <i class="fa-solid fa-bell"></i>
                  <div>
                    <div class="title">Audio Warnings & Ticks</div>
                    <div class="desc">Synthetic chimes at 5m, 1m & final 10s</div>
                  </div>
                </div>
                <label class="ptw-switch">
                  <input type="checkbox" id="ptwSoundSwitch" checked onchange="PracticeTimer.setSoundEnabled(this.checked)">
                  <span class="ptw-slider"></span>
                </label>
              </div>
            </div>

            <!-- Current Problem Ticker -->
            <div class="ptw-current-problem-card">
              <div>
                <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;">Active Focus Target:</div>
                <div class="ptw-current-problem-title" id="ptwCurrentProbTitle">Python Arena · Practice Mode</div>
              </div>
              <div class="ptw-session-solves">
                <i class="fa-solid fa-circle-check"></i>
                <span id="ptwSessionSolvesCount">0</span> solved
              </div>
            </div>
          </div>

          <!-- 2. MOCK QUIZ ARENA PANEL -->
          <div id="ptwPanelQuiz" style="display:none;">
            <div id="ptwMockQuizNavWrap"></div>

            <div class="ptw-section-label" style="margin-top:0.4rem;">
              <span>Select Mock Exam Tier</span>
            </div>

            <div class="ptw-mock-card" onclick="PracticeTimer.generateMockQuiz('easy')">
              <div class="ptw-mock-head">
                <span class="ptw-mock-title"><i class="fa-solid fa-seedling" style="color:var(--accent-green);"></i> Beginner Sprint</span>
                <span class="badge-diff" style="background:rgba(16,185,129,0.15);color:#10b981;font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:4px;">Easy</span>
              </div>
              <div class="ptw-mock-meta">
                <span><i class="fa-regular fa-clock"></i> 25 Mins</span>
                <span><i class="fa-solid fa-code"></i> 5 Python Problems</span>
              </div>
            </div>

            <div class="ptw-mock-card" onclick="PracticeTimer.generateMockQuiz('medium')">
              <div class="ptw-mock-head">
                <span class="ptw-mock-title"><i class="fa-solid fa-fire" style="color:var(--accent-orange);"></i> Interview Assessment</span>
                <span class="badge-diff" style="background:rgba(245,158,11,0.15);color:#f59e0b;font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:4px;">Medium</span>
              </div>
              <div class="ptw-mock-meta">
                <span><i class="fa-regular fa-clock"></i> 45 Mins</span>
                <span><i class="fa-solid fa-code"></i> 5 Python Problems</span>
              </div>
            </div>

            <div class="ptw-mock-card" onclick="PracticeTimer.generateMockQuiz('hard')">
              <div class="ptw-mock-head">
                <span class="ptw-mock-title"><i class="fa-solid fa-skull" style="color:var(--accent-red);"></i> Hard Tech Round</span>
                <span class="badge-diff" style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:4px;">Hard</span>
              </div>
              <div class="ptw-mock-meta">
                <span><i class="fa-regular fa-clock"></i> 60 Mins</span>
                <span><i class="fa-solid fa-code"></i> 3 Complex Problems</span>
              </div>
            </div>

            <div class="ptw-mock-card" onclick="PracticeTimer.generateMockQuiz('mixed')">
              <div class="ptw-mock-head">
                <span class="ptw-mock-title"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--gold-primary);"></i> Mixed Real Exam</span>
                <span class="badge-diff" style="background:rgba(212,175,55,0.15);color:var(--gold-light);font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:4px;">Simulated</span>
              </div>
              <div class="ptw-mock-meta">
                <span><i class="fa-regular fa-clock"></i> 45 Mins</span>
                <span><i class="fa-solid fa-code"></i> 1 Easy · 3 Med · 1 Hard</span>
              </div>
            </div>
          </div>

          <!-- 3. SESSION STATS PANEL -->
          <div id="ptwPanelStats" style="display:none;">
            <div class="exam-score-grid" style="margin-top:0.4rem;margin-bottom:1rem;">
              <div class="exam-score-box">
                <div class="val" id="ptwStatSessions">0</div>
                <div class="lbl">Sessions</div>
              </div>
              <div class="exam-score-box">
                <div class="val" id="ptwStatMinutes">0m</div>
                <div class="lbl">Total Focus</div>
              </div>
              <div class="exam-score-box">
                <div class="val" id="ptwStatSolved" style="color:var(--accent-green);">0</div>
                <div class="lbl">Solved</div>
              </div>
            </div>

            <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:0.8rem;font-size:0.78rem;color:var(--text-secondary);line-height:1.6;">
              <p><strong style="color:#fff;"><i class="fa-solid fa-trophy" style="color:var(--gold-primary);"></i> Exam Readiness Tips:</strong></p>
              <ul style="padding-left:1.2rem;margin-top:0.4rem;display:flex;flex-direction:column;gap:0.35rem;">
                <li>Strict mode conditions simulate actual coding screening tests (Amazon, Google, TCS Digital).</li>
                <li>Aim for under 20 mins on Easy and under 35 mins on Medium problems.</li>
                <li>Use synthesized audio feedback for time pacing cues.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Sync switch states
    const strictSwitch = document.getElementById('ptwStrictSwitch');
    if (strictSwitch) strictSwitch.checked = config.strictMode;

    const soundSwitch = document.getElementById('ptwSoundSwitch');
    if (soundSwitch) soundSwitch.checked = config.soundEnabled;

    updateUI();
  }

  function switchTab(tabName) {
    config.activeTab = tabName;
    const tabTimer = document.getElementById('ptwTabTimer');
    const tabQuiz = document.getElementById('ptwTabQuiz');
    const tabStats = document.getElementById('ptwTabStats');

    const panelTimer = document.getElementById('ptwPanelTimer');
    const panelQuiz = document.getElementById('ptwPanelQuiz');
    const panelStats = document.getElementById('ptwPanelStats');

    [tabTimer, tabQuiz, tabStats].forEach(t => t && t.classList.remove('active'));
    [panelTimer, panelQuiz, panelStats].forEach(p => p && (p.style.display = 'none'));

    if (tabName === 'timer') {
      if (tabTimer) tabTimer.classList.add('active');
      if (panelTimer) panelTimer.style.display = 'block';
    } else if (tabName === 'quiz') {
      if (tabQuiz) tabQuiz.classList.add('active');
      if (panelQuiz) panelQuiz.style.display = 'block';
      renderMockQuizNavigator();
    } else if (tabName === 'stats') {
      if (tabStats) tabStats.classList.add('active');
      if (panelStats) panelStats.style.display = 'block';
      updateStatsPanel();
    }
  }

  function updateStatsPanel() {
    const sSessions = document.getElementById('ptwStatSessions');
    const sMinutes = document.getElementById('ptwStatMinutes');
    const sSolved = document.getElementById('ptwStatSolved');

    if (sSessions) sSessions.textContent = sessionStats.totalSessions;
    if (sMinutes) sMinutes.textContent = `${Math.round(sessionStats.totalSecondsFocused / 60)}m`;
    if (sSolved) sSolved.textContent = sessionStats.problemsSolvedCount;
  }

  function toggleVisibility() {
    const widget = document.getElementById('practiceTimerWidget');
    if (!widget) return;
    if (widget.classList.contains('hidden')) {
      widget.classList.remove('hidden');
    } else {
      widget.classList.add('hidden');
    }
  }

  function showWidget() {
    const widget = document.getElementById('practiceTimerWidget');
    if (widget) {
      widget.classList.remove('hidden');
    }
  }

  function minimizeWidget() {
    config.minimized = true;
    updateUI();
  }

  function expandWidget() {
    config.minimized = false;
    updateUI();
  }

  function applyCustomMinutes() {
    const input = document.getElementById('ptwCustomMins');
    if (input) {
      setDurationMinutes(input.value);
    }
  }

  function setStrictMode(val) {
    config.strictMode = !!val;
    savePersistedState();
    if (window.toast) {
      window.toast('info', config.strictMode ? 'Strict Exam Mode ON' : 'Strict Mode OFF',
        config.strictMode ? 'Tab switches will now trigger exam alerts' : 'Standard practice timer active');
    }
  }

  function setSoundEnabled(val) {
    config.soundEnabled = !!val;
    savePersistedState();
    const btn = document.getElementById('ptwSoundToggleBtn');
    if (btn) {
      btn.innerHTML = config.soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    }
  }

  function toggleSound() {
    setSoundEnabled(!config.soundEnabled);
    const soundSwitch = document.getElementById('ptwSoundSwitch');
    if (soundSwitch) soundSwitch.checked = config.soundEnabled;
  }

  // ══════════════════════════════════════════════════════════════
  // PUBLIC INITIALIZATION
  // ══════════════════════════════════════════════════════════════
  function init() {
    loadPersistedState();
    mountHUD();
    setupStrictFocusWatcher();
    hookProblemSolver();
    updateUI();
  }

  return {
    init,
    start,
    pause,
    toggle,
    reset,
    setDurationMinutes,
    addMinutes,
    applyCustomMinutes,
    setStrictMode,
    setSoundEnabled,
    toggleSound,
    toggleVisibility,
    showWidget,
    minimizeWidget,
    expandWidget,
    switchTab,
    generateMockQuiz,
    jumpToQuizQuestion,
    submitMockExam,
    recordProblemSolved,
    updateCurrentProblemTicker,
    getState: () => ({ ...config })
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PracticeTimer.init());
} else {
  PracticeTimer.init();
}

window.PracticeTimer = PracticeTimer;
