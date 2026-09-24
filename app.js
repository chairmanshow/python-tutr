/* ══════════════════════════════════════════════════════════════
   THE CHAIRMAN SHOW — Cinematic Coding Platform
   Complete App Logic
   ══════════════════════════════════════════════════════════════ */

/* ─────────────── SECTION 1: CONFIG ─────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyA3T1Yp8nFQuHb-_63bfzbd3L2r2wn-01I",
  authDomain: "the-chairman-show-7c839.firebaseapp.com",
  databaseURL: "https://the-chairman-show-7c839-default-rtdb.firebaseio.com",
  projectId: "the-chairman-show-7c839",
  storageBucket: "the-chairman-show-7c839.firebasestorage.app",
  messagingSenderId: "667528459671",
  appId: "1:667528459671:web:696a5aeda14ba2391fc0d2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const CONFIG = {
  UPI_ID: "chairman@upi",
  TELEGRAM_PROXY: "https://tcs-telegram-proxy.sumitshrivas24.workers.dev",
  ADMIN_EMAIL: "overactingofficial7@gmail.com",
  IMGBB_KEY: "f1e5041PbWWqgKDBDorh525uecKaGZD21FGSoCeR",
  PISTON_API: "https://emkc.org/api/v2/piston/execute"
};

let currentUser = null;
let userProfile = null;
let activeTab = 'home';
let currentProblem = null;

/* ─────────────── SECTION 2: UTILITIES ─────────────── */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function toast(type, title, sub) {
  const stack = $('toastStack');
  if (!stack) return;
  const icons = { success:'fa-circle-check', warn:'fa-triangle-exclamation', info:'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}"></i>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title || '')}</div>
      ${sub ? `<div class="toast-sub">${escapeHtml(sub)}</div>` : ''}
    </div>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 300); }, 4000);
}

window.openModal = function(id) {
  const el = $(id);
  if (el) el.classList.add('show');
  document.body.style.overflow = 'hidden';
};
window.closeModal = function(id) {
  const el = $(id);
  if (el) el.classList.remove('show');
  document.body.style.overflow = '';
};

function formatTime(ts) {
  if (!ts) return 'Just now';
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ─────────────── SECTION 3: IMGBB UPLOAD ─────────────── */
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Not an image'));
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadToImgBB(file) {
  if (!file) return '';
  if (file.size > 10 * 1024 * 1024) throw new Error('Image too large (max 10MB)');
  const compressed = await compressImage(file, 1200, 0.8);
  const base64 = await fileToBase64(compressed);
  const base64Data = base64.split(',')[1];

  const formData = new FormData();
  formData.append('image', base64Data);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${CONFIG.IMGBB_KEY}`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Upload failed');
  return data.data.url;
}

/* ─────────────── SECTION 4: AUTH ─────────────── */
$('googleSignInBtn')?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    $('loginError').style.display = 'none';
    await auth.signInWithPopup(provider);
  } catch (err) {
    console.error('Sign in error:', err);
    if ($('loginError')) {
      $('loginError').textContent = err.message;
      $('loginError').style.display = 'block';
    }
  }
});

$('signOutBtn')?.addEventListener('click', () => {
  if (confirm('Sign out?')) {
    userProfile = null;
    currentUser = null;
    auth.signOut();
  }
});

const authTimeout = setTimeout(() => {
  if (!currentUser) {
    const loader = $('bootLoader');
    if (loader) loader.classList.add('hide');
    const ls = $('loginScreen');
    if (ls) ls.style.display = 'flex';
  }
}, 4000);

auth.onAuthStateChanged(async (user) => {
  clearTimeout(authTimeout);
  if (user) {
    currentUser = user;
    try {
      await ensureUserProfile(user);
      showApp();
      initApp();
    } catch (err) {
      console.error('Profile load error:', err);
      toast('warn', 'Profile load failed', 'Please refresh');
    }
  } else {
    currentUser = null;
    userProfile = null;
    showLogin();
  }
});

function showApp() {
  const ls = $('loginScreen');
  if (ls) ls.style.display = 'none';
  const app = $('app');
  if (app) app.style.display = 'block';
  const loader = $('bootLoader');
  if (loader) setTimeout(() => loader.classList.add('hide'), 300);
}

function showLogin() {
  const ls = $('loginScreen');
  const app = $('app');
  if (ls) ls.style.display = 'flex';
  if (app) app.style.display = 'none';
  const loader = $('bootLoader');
  if (loader) setTimeout(() => loader.classList.add('hide'), 500);
}

/* ─────────────── SECTION 5: USER PROFILE ─────────────── */
async function ensureUserProfile(user) {
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'Coder',
      photoURL: user.photoURL || '',
      role: 'student',
      class: '',
      bio: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      solvedCount: 0,
      xp: 0,
      streak: 0,
      lastSolveDate: null
    };
    await ref.set(profile);
    userProfile = profile;
  } else {
    userProfile = snap.data();
    userProfile.role = userProfile.role || 'student';
  }
  updateUserUI();
}

function updateUserUI() {
  if (!userProfile) return;
  const name = userProfile.name || 'Coder';
  const avatar = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00d4ff&color=000&bold=true`;

  if ($('navUserName')) $('navUserName').textContent = name.split(' ')[0];
  if ($('navUserAvatar')) $('navUserAvatar').src = avatar;
  if ($('ddUserName')) $('ddUserName').textContent = name;
  if ($('ddUserEmail')) $('ddUserEmail').textContent = userProfile.email;
  if ($('ddUserAvatar')) $('ddUserAvatar').src = avatar;
  if ($('profileAvatar')) $('profileAvatar').src = avatar;
  if ($('profileName')) $('profileName').textContent = name;
  if ($('profileEmail')) $('profileEmail').textContent = userProfile.email;
  if ($('profileDisplayName')) $('profileDisplayName').value = name;
  if ($('profileClass')) $('profileClass').value = userProfile.class || '';
  if ($('profileBio')) $('profileBio').value = userProfile.bio || '';
}

$('userMenuBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  $('userDropdown')?.classList.toggle('show');
});
document.addEventListener('click', () => $('userDropdown')?.classList.remove('show'));
$('userDropdown')?.addEventListener('click', (e) => e.stopPropagation());

$('saveProfileBtn')?.addEventListener('click', async () => {
  const updates = {
    name: $('profileDisplayName').value.trim() || userProfile.name,
    class: $('profileClass').value,
    bio: $('profileBio').value.trim()
  };
  try {
    await db.collection('users').doc(currentUser.uid).update(updates);
    Object.assign(userProfile, updates);
    updateUserUI();
    toast('success', 'Profile updated!');
  } catch (err) {
    toast('warn', 'Update failed', err.message);
  }
});

/* ─────────────── SECTION 6: TAB SWITCHING ─────────────── */
window.switchToTab = function(tabId) {
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const target = $(tabId);
  if (target) target.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');
  activeTab = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'python') renderLevelsGrid();
  if (tabId === 'doubts') loadDoubts();
  if (tabId === 'experts') loadExperts();
  if (tabId === 'leaderboard') loadLeaderboard();
  if (tabId === 'donate') {
    if ($('upiIdDisplay')) $('upiIdDisplay').textContent = CONFIG.UPI_ID;
  }
};

document.addEventListener('click', (e) => {
  const navBtn = e.target.closest('.nav-item[data-tab]');
  if (navBtn) switchToTab(navBtn.dataset.tab);
  const gotoBtn = e.target.closest('[data-goto]');
  if (gotoBtn) {
    switchToTab(gotoBtn.dataset.goto);
    $('userDropdown')?.classList.remove('show');
  }
});

/* ─────────────── SECTION 7: PROGRESS TRACKER ─────────────── */
const Progress = (function() {
  const STORAGE_KEY = 'tcs_python_progress_v1';

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && typeof data === 'object') return data;
    } catch (e) {}
    return { solved: [] };
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  const state = load();

  function isSolved(id) { return state.solved.indexOf(id) !== -1; }

  function markSolved(id) {
    if (state.solved.indexOf(id) === -1) {
      state.solved.push(id);
      save(state);
      syncToFirestore();
      return true;
    }
    return false;
  }

  function unmarkSolved(id) {
    const i = state.solved.indexOf(id);
    if (i !== -1) {
      state.solved.splice(i, 1);
      save(state);
      syncToFirestore();
    }
  }

  function totalSolved() { return state.solved.length; }

  function syncToFirestore() {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).update({
      solvedCount: state.solved.length,
      xp: state.solved.length * 10,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }

  return { isSolved, markSolved, unmarkSolved, totalSolved, state };
})();

/* ─────────────── SECTION 8: LEVELS GRID (Python) ─────────────── */
let currentPythonFilter = 'all';
let currentPythonSearch = '';

function renderLevelsGrid() {
  const grid = $('levelsGrid');
  if (!grid) return;

  // Update progress bar
  updatePythonProgress();

  let problems = window.PROBLEMS_DB || [];

  // Filter
  if (currentPythonFilter === 'solved') {
    problems = problems.filter(p => Progress.isSolved(p.id));
  } else if (currentPythonFilter !== 'all') {
    problems = problems.filter(p => p.difficulty === currentPythonFilter);
  }

  // Search
  if (currentPythonSearch) {
    const q = currentPythonSearch.toLowerCase();
    problems = problems.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  if (!problems.length) {
    grid.innerHTML = `
      <div class="empty-state-cine">
        <i class="fa-solid fa-inbox"></i>
        <h4>No problems found</h4>
        <p>Try a different filter or search term</p>
      </div>`;
    return;
  }

  grid.innerHTML = problems.map(p => {
    const solved = Progress.isSolved(p.id);
    const meta = window.getLevelMeta ? window.getLevelMeta(p.level) : { name:'', icon:'fa-code', color:'#00d4ff' };
    return `
      <div class="level-card-cine ${solved ? 'solved' : ''}" onclick="openProblem(${p.id})">
        <div class="lc-header">
          <div class="lc-level">
            <i class="fa-solid ${meta.icon} lc-level-icon" style="color:${meta.color}"></i>
            <span>LVL ${p.level}</span>
          </div>
          ${solved ? '<div class="lc-check-big pop-in"><i class="fa-solid fa-check"></i></div>' : ''}
        </div>
        <div class="lc-title">${escapeHtml(p.title)}</div>
        <div class="lc-desc">${escapeHtml((p.description || '').slice(0, 110))}...</div>
        <div class="lc-footer">
          <span class="lc-diff-badge ${p.difficulty}">${p.difficulty}</span>
          <i class="fa-solid fa-arrow-right lc-arrow"></i>
        </div>
      </div>
    `;
  }).join('');
}

function updatePythonProgress() {
  const total = (window.PROBLEMS_DB || []).length;
  const solved = Progress.totalSolved();
  const pct = total ? Math.round((solved / total) * 100) : 0;
  if ($('pythonProgressLabel')) $('pythonProgressLabel').textContent = `${solved} / ${total}`;
  if ($('pythonProgressFill')) $('pythonProgressFill').style.width = pct + '%';
}

// Filter chips
$$('#pythonFilters .chip-cine').forEach(chip => {
  chip.addEventListener('click', () => {
    $$('#pythonFilters .chip-cine').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentPythonFilter = chip.dataset.diff;
    renderLevelsGrid();
  });
});

$('pythonSearch')?.addEventListener('input', debounce((e) => {
  currentPythonSearch = e.target.value.trim();
  renderLevelsGrid();
}, 250));

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ─────────────── SECTION 9: PROBLEM VIEW ─────────────── */
window.openProblem = function(id) {
  const prob = (window.PROBLEMS_DB || []).find(p => p.id === id);
  if (!prob) return;

  currentProblem = prob;
  switchToTab('problemView');

  // Meta
  const meta = window.getLevelMeta ? window.getLevelMeta(prob.level) : { name:'', icon:'fa-code', color:'#00d4ff' };
  if ($('problemViewMeta')) {
    $('problemViewMeta').innerHTML = `
      <span><i class="fa-solid ${meta.icon}" style="color:${meta.color}"></i> ${meta.name}</span>
      <span>•</span>
      <span>LEVEL ${prob.level}</span>
    `;
  }

  // Title, difficulty, tags
  if ($('pvTitle')) $('pvTitle').textContent = prob.title;
  if ($('pvDifficulty')) {
    $('pvDifficulty').textContent = prob.difficulty;
    $('pvDifficulty').className = 'badge-diff ' + prob.difficulty;
  }
  if ($('pvTags')) {
    $('pvTags').innerHTML = (prob.tags || []).map(t =>
      `<span class="problem-tag">#${escapeHtml(t)}</span>`
    ).join('');
  }

  // Description
  if ($('pvDescription')) {
    $('pvDescription').innerHTML = escapeHtml(prob.description).replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // Examples
  if ($('pvExamples')) {
    if (prob.examples && prob.examples.length) {
      $('pvExamples').innerHTML = prob.examples.map(ex => `
        <div class="example-block">
          <div class="example-row">
            <span class="label">Input:</span>
            <span class="value">${escapeHtml(ex.input)}</span>
          </div>
          <div class="example-row">
            <span class="label">Output:</span>
            <span class="value output">${escapeHtml(ex.output)}</span>
          </div>
          ${ex.explanation ? `<div class="example-explanation">💡 ${escapeHtml(ex.explanation)}</div>` : ''}
        </div>
      `).join('');
    } else {
      $('pvExamples').innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">No examples provided</p>';
    }
  }

  // Code editor
  if ($('codeEditor')) {
    $('codeEditor').value = prob.starter || '# Write your Python code here\n';
    updateLineNumbers();
  }

  // Mark solved state
  updateMarkSolvedBtn();

  // Hide output & solution
  if ($('outputCard')) $('outputCard').style.display = 'none';
  if ($('solutionCard')) $('solutionCard').style.display = 'none';

  // Reset tabs
  $$('.editor-tab').forEach(t => t.classList.remove('active'));
  $('tabCode')?.classList.add('active');
};

/* ─────────────── SECTION 10: CODE EDITOR ─────────────── */
const codeEditor = $('codeEditor');
const editorLineNumbers = $('editorLineNumbers');

function updateLineNumbers() {
  if (!codeEditor || !editorLineNumbers) return;
  const lines = codeEditor.value.split('\n').length;
  let html = '';
  for (let i = 1; i <= lines; i++) {
    html += `<span>${i}</span>`;
  }
  editorLineNumbers.innerHTML = html;
}

codeEditor?.addEventListener('input', updateLineNumbers);
codeEditor?.addEventListener('scroll', () => {
  if (editorLineNumbers) editorLineNumbers.scrollTop = codeEditor.scrollTop;
});
codeEditor?.addEventListener('keydown', (e) => {
  // Tab support
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
    updateLineNumbers();
  }
});

/* Reset code */
$('resetCodeBtn')?.addEventListener('click', () => {
  if (!currentProblem) return;
  if (!confirm('Reset code to starter template?')) return;
  codeEditor.value = currentProblem.starter || '# Write your Python code here\n';
  updateLineNumbers();
  toast('info', 'Code reset');
});

/* Copy code */
$('copyCodeBtn')?.addEventListener('click', () => {
  if (!codeEditor) return;
  navigator.clipboard.writeText(codeEditor.value).then(() => {
    toast('success', 'Copied!', 'Code copied to clipboard');
  }).catch(() => toast('warn', 'Copy failed'));
});

/* ─────────────── SECTION 11: RUN CODE (Piston API) ─────────────── */
$('runCodeBtn')?.addEventListener('click', async () => {
  if (!codeEditor || !currentProblem) return;
  const code = codeEditor.value.trim();
  if (!code) {
    toast('warn', 'Write some code first');
    return;
  }

  const btn = $('runCodeBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';

  // Show output card
  if ($('outputCard')) $('outputCard').style.display = 'block';
  if ($('outputBody')) {
    $('outputBody').innerHTML = '<span class="out-prompt">$</span> Executing your code...\n';
  }

  try {
    const res = await fetch(CONFIG.PISTON_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        version: '3.10.0',
        files: [{ content: code }],
        stdin: ''
      })
    });

    if (!res.ok) {
      throw new Error('Code execution service unavailable. Try again.');
    }

    const data = await res.json();
    const run = data.run || {};
    const stdout = run.stdout || '';
    const stderr = run.stderr || '';

    let outputHtml = '<span class="out-prompt">$</span> python main.py\n\n';
    if (stdout) {
      outputHtml += escapeHtml(stdout);
    }
    if (stderr) {
      outputHtml += '<span class="out-error">' + escapeHtml(stderr) + '</span>';
    }
    if (!stdout && !stderr) {
      outputHtml += '<span style="color:var(--text-muted)">(no output)</span>';
    }

    if ($('outputBody')) $('outputBody').innerHTML = outputHtml;

    if (!stderr) {
      toast('success', 'Code executed!', 'Check the output panel');
    } else {
      toast('warn', 'Runtime error', 'Check the output panel');
    }
  } catch (err) {
    console.error('Run error:', err);
    if ($('outputBody')) {
      $('outputBody').innerHTML = '<span class="out-error">❌ ' + escapeHtml(err.message) + '</span>';
    }
    toast('warn', 'Execution failed', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
});

/* ─────────────── SECTION 12: MARK SOLVED ─────────────── */
function updateMarkSolvedBtn() {
  const btn = $('markSolvedBtn');
  if (!btn || !currentProblem) return;
  const solved = Progress.isSolved(currentProblem.id);
  if (solved) {
    btn.classList.add('solved');
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Solved';
  } else {
    btn.classList.remove('solved');
    btn.innerHTML = '<i class="fa-regular fa-circle-check"></i> Mark as Solved';
  }
}

$('markSolvedBtn')?.addEventListener('click', () => {
  if (!currentProblem) return;
  const solved = Progress.isSolved(currentProblem.id);

  if (solved) {
    Progress.unmarkSolved(currentProblem.id);
    toast('info', 'Unmarked', 'Problem removed from solved list');
  } else {
    Progress.markSolved(currentProblem.id);
    launchConfetti();
    toast('success', '🎉 Solved!', 'Great job, keep going!');
  }

  updateMarkSolvedBtn();
  updatePythonProgress();
});

/* Solution tab */
$('tabCode')?.addEventListener('click', () => {
  $$('.editor-tab').forEach(t => t.classList.remove('active'));
  $('tabCode')?.classList.add('active');
  if ($('solutionCard')) $('solutionCard').style.display = 'none';
});

$('tabSolution')?.addEventListener('click', () => {
  $$('.editor-tab').forEach(t => t.classList.remove('active'));
  $('tabSolution')?.classList.add('active');
  if (!currentProblem) return;
  if ($('solutionCode')) $('solutionCode').textContent = currentProblem.solution || '(no solution)';
  if ($('solutionExplanation')) {
    $('solutionExplanation').innerHTML = '<strong>💡 Explanation:</strong><br>' + escapeHtml(currentProblem.explanation || 'No explanation provided.');
  }
  if ($('solutionCard')) $('solutionCard').style.display = 'block';
});

/* ─────────────── SECTION 13: CONFETTI ─────────────── */
function launchConfetti() {
  const canvas = $('confettiCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#00d4ff', '#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
  const particles = Array.from({ length: 100 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 16,
    vy: (Math.random() - 1.5) * 16,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 360,
    vr: (Math.random() - 0.5) * 25,
    life: 0
  }));

  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.vy += 0.4;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 100);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    if (frame < 100) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  tick();
}

/* ─────────────── SECTION 14: DOUBTS SYSTEM ─────────────── */
async function loadDoubts() {
  const grid = $('doubtsGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="empty-state-cine" style="grid-column:1/-1">
      <div class="loading-spinner-cine" style="margin: 0 auto 1rem;"></div>
      <p>Loading your doubts...</p>
    </div>`;

  try {
    const snap = await db.collection('doubts')
      .where('userId', '==', currentUser.uid)
      .limit(50)
      .get();

    const doubts = [];
    snap.forEach(d => doubts.push({ id: d.id, ...d.data() }));

    doubts.sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime() || 0;
      return tb - ta;
    });

    const filter = document.querySelector('#doubtFilters .chip-cine.active')?.dataset.status || 'all';
    const filtered = filter === 'all' ? doubts : doubts.filter(d => d.status === filter);

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state-cine" style="grid-column:1/-1">
          <i class="fa-solid fa-code"></i>
          <h4>No doubts yet</h4>
          <p>Ask your first coding doubt to get help from experts</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(d => `
      <div class="doubt-card-cine" onclick="viewDoubt('${d.id}')">
        <div class="dc-header">
          <span class="dc-topic">${escapeHtml(d.subject || 'Code')}</span>
          <span class="dc-status ${d.status}">${d.status}</span>
        </div>
        <div class="dc-question">${escapeHtml((d.question || '').slice(0, 200))}</div>
        <div class="dc-meta">
          <span><i class="fa-solid fa-clock"></i> ${formatTime(d.createdAt?.toDate?.()?.getTime())}</span>
          ${d.answerCount ? `<span><i class="fa-solid fa-comments"></i> ${d.answerCount} answers</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="empty-state-cine" style="grid-column:1/-1">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h4>Error loading doubts</h4>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
  }
}

$$('#doubtFilters .chip-cine').forEach(chip => {
  chip.addEventListener('click', () => {
    $$('#doubtFilters .chip-cine').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    loadDoubts();
  });
});

$('newDoubtBtn')?.addEventListener('click', () => {
  openModal('newDoubtModal');
});

$('doubtImage')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = $('doubtImagePreview');
    if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:150px;border-radius:8px;margin-top:8px;border:1px solid var(--border-mid);">`;
  };
  reader.readAsDataURL(file);
});

$('postDoubtBtn')?.addEventListener('click', async () => {
  const subject = $('doubtSubject').value;
  const question = $('doubtQuestion').value.trim();
  const imageFile = $('doubtImage').files[0];

  if (!question) {
    toast('warn', 'Please describe your problem');
    return;
  }

  const btn = $('postDoubtBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

  try {
    let imageUrl = '';
    if (imageFile) {
      imageUrl = await uploadToImgBB(imageFile);
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';

    await db.collection('doubts').add({
      userId: currentUser.uid,
      userName: userProfile.name,
      userPhoto: userProfile.photoURL || '',
      subject,
      question,
      imageUrl,
      status: 'open',
      answerCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    notifyTelegram(`🆕 New Code Doubt!\nFrom: ${userProfile.name}\nTopic: ${subject}\n\n${question.slice(0, 250)}`);

    toast('success', 'Doubt posted!', 'Experts will answer soon');
    closeModal('newDoubtModal');
    if ($('doubtQuestion')) $('doubtQuestion').value = '';
    if ($('doubtImage')) $('doubtImage').value = '';
    if ($('doubtImagePreview')) $('doubtImagePreview').innerHTML = '';

    loadDoubts();
  } catch (err) {
    console.error(err);
    toast('warn', 'Failed to post', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
});

window.viewDoubt = async function(id) {
  try {
    const doc = await db.collection('doubts').doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();

    const body = $('doubtDetailsBody');
    if (!body) return;

    body.innerHTML = `
      <div class="problem-card-cine" style="margin-bottom:1rem;">
        <div class="problem-title-row">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;font-weight:700;">${escapeHtml(d.subject)} — Doubt</h3>
          <span class="dc-status ${d.status}">${d.status}</span>
        </div>
        <div class="problem-desc" style="margin-top:.8rem;">${escapeHtml(d.question)}</div>
        ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" style="max-width:100%;border-radius:12px;margin-top:.8rem;border:1px solid var(--border-mid);cursor:pointer;" onclick="openImageViewer('${escapeHtml(d.imageUrl)}')">` : ''}
        <div style="margin-top:1rem;font-size:.75rem;color:var(--text-muted);font-family:var(--font-mono);">
          <i class="fa-solid fa-clock"></i> ${formatTime(d.createdAt?.toDate?.()?.getTime())}
        </div>
      </div>
      <div style="text-align:center;padding:2rem;color:var(--text-muted);">
        <i class="fa-solid fa-hourglass-half" style="font-size:2rem;opacity:.4;display:block;margin-bottom:1rem;"></i>
        <p style="font-size:.88rem;">Waiting for expert answer...</p>
      </div>
    `;

    openModal('doubtDetailsModal');
  } catch (err) {
    toast('warn', 'Error', err.message);
  }
};

window.openImageViewer = function(url) {
  if ($('viewerImage')) $('viewerImage').src = url;
  openModal('imageViewerModal');
};

/* ─────────────── SECTION 15: EXPERTS ─────────────── */
const EXPERT_SECTIONS = [
  { id:'python', title:'Python & Backend', icon:'fa-brands fa-python', color:'linear-gradient(135deg,#00d4ff,#3b82f6)', desc:'Python, Django, Flask, FastAPI' },
  { id:'dsa', title:'DSA & Competitive', icon:'fa-solid fa-brain', color:'linear-gradient(135deg,#7c3aed,#ec4899)', desc:'Algorithms, LeetCode, Codeforces' },
  { id:'webdev', title:'Web Development', icon:'fa-solid fa-code', color:'linear-gradient(135deg,#f59e0b,#ef4444)', desc:'HTML, CSS, JS, React, Node' },
  { id:'data', title:'Data Science & ML', icon:'fa-solid fa-chart-line', color:'linear-gradient(135deg,#10b981,#059669)', desc:'Pandas, NumPy, ML, AI' }
];

async function loadExperts() {
  const container = $('expertSections');
  if (!container) return;

  container.innerHTML = `
    <div class="loading-cine">
      <div class="loading-spinner-cine"></div>
      <p>Loading experts...</p>
    </div>`;

  // Fake expert data (can be replaced with Firestore fetch later)
  const fakeExperts = [
    { name: 'Arjun Mehta', title: 'Python Expert', exp: 8, rating: 4.9, doubts: 1420, section: 'python' },
    { name: 'Priya Sharma', title: 'Backend Engineer', exp: 6, rating: 4.8, doubts: 980, section: 'python' },
    { name: 'Rohan Verma', title: 'DSA Specialist', exp: 10, rating: 5.0, doubts: 2340, section: 'dsa' },
    { name: 'Sneha Reddy', title: 'FAANG Engineer', exp: 7, rating: 4.9, doubts: 1890, section: 'dsa' },
    { name: 'Karan Singh', title: 'Full Stack Dev', exp: 5, rating: 4.7, doubts: 720, section: 'webdev' },
    { name: 'Anjali Verma', title: 'React Expert', exp: 6, rating: 4.8, doubts: 1120, section: 'webdev' },
    { name: 'Dr. Vikram Rao', title: 'ML Scientist', exp: 12, rating: 5.0, doubts: 3050, section: 'data' },
    { name: 'Meera Iyer', title: 'Data Analyst', exp: 5, rating: 4.7, doubts: 640, section: 'data' }
  ];

  container.innerHTML = EXPERT_SECTIONS.map(section => {
    const sectionExperts = fakeExperts.filter(e => e.section === section.id);
    const cards = sectionExperts.map(e => {
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=0a0a0f&color=00d4ff&bold=true&size=128`;
      return `
        <div class="expert-card-cine">
          <div class="ec-top">
            <img class="ec-avatar" src="${avatar}" alt="">
            <div>
              <div class="ec-name">${escapeHtml(e.name)}</div>
              <div class="ec-role">${escapeHtml(e.title)}</div>
            </div>
          </div>
          <div class="ec-stats">
            <span><i class="fa-solid fa-star"></i> ${e.rating}</span>
            <span><i class="fa-solid fa-check"></i> ${e.doubts} solved</span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="expert-section-cine">
        <div class="es-header">
          <div class="es-icon" style="background:${section.color}">
            <i class="${section.icon}"></i>
          </div>
          <div>
            <div class="es-title">${section.title}</div>
            <div class="es-desc">${section.desc}</div>
          </div>
        </div>
        <div class="experts-grid-cine">${cards}</div>
      </div>`;
  }).join('');
}

/* ─────────────── SECTION 16: LEADERBOARD ─────────────── */
async function loadLeaderboard() {
  const podium = $('lbPodium');
  const list = $('lbList');
  if (!podium || !list) return;

  // Mock data (extend later with real Firestore query)
  const mockUsers = [
    { name: 'Rohan Verma', xp: 4820, solved: 89, streak: 42 },
    { name: 'Sneha Reddy', xp: 4230, solved: 82, streak: 35 },
    { name: 'Arjun Mehta', xp: 3910, solved: 78, streak: 28 },
    { name: 'Priya Sharma', xp: 3450, solved: 72, streak: 22 },
    { name: 'Karan Singh', xp: 3120, solved: 68, streak: 19 },
    { name: 'Anjali Verma', xp: 2890, solved: 65, streak: 15 },
    { name: 'Meera Iyer', xp: 2340, solved: 58, streak: 12 },
    { name: 'Dr. Vikram Rao', xp: 2050, solved: 52, streak: 10 }
  ];

  const top3 = mockUsers.slice(0, 3);
  const podiumClasses = ['gold', 'silver', 'bronze'];

  podium.innerHTML = top3.map((u, i) => {
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0a0a0f&color=00d4ff&bold=true&size=128`;
    return `
      <div class="lb-podium-card ${podiumClasses[i]}">
        <div class="lb-podium-rank">#${i + 1}</div>
        <img class="lb-podium-avatar" src="${avatar}" alt="">
        <div class="lb-podium-name">${escapeHtml(u.name)}</div>
        <div class="lb-podium-xp">${u.xp} XP</div>
      </div>
    `;
  }).join('');

  list.innerHTML = mockUsers.map((u, i) => {
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0a0a0f&color=00d4ff&bold=true&size=128`;
    const isMe = userProfile?.name === u.name;
    return `
      <div class="lb-row-cine ${isMe ? 'me' : ''}">
        <div class="lb-rank-cine">#${i + 1}</div>
        <img class="lb-avatar-cine" src="${avatar}" alt="">
        <div class="lb-info-cine">
          <div class="lb-name-cine">${escapeHtml(u.name)}${isMe ? ' (you)' : ''}</div>
          <div class="lb-sub-cine">${u.solved} solved · ${u.streak} day streak</div>
        </div>
        <div class="lb-xp-cine">${u.xp} XP</div>
      </div>
    `;
  }).join('');
}

/* ─────────────── SECTION 17: DONATE ─────────────── */
$('copyUpiBtn')?.addEventListener('click', () => {
  navigator.clipboard.writeText(CONFIG.UPI_ID).then(() => {
    toast('success', 'UPI ID copied!', CONFIG.UPI_ID);
  }).catch(() => toast('warn', 'Copy failed'));
});

/* ─────────────── SECTION 18: TELEGRAM ─────────────── */
async function notifyTelegram(message) {
  try {
    await fetch(CONFIG.TELEGRAM_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'System', email: 'system@tcs', msg: message })
    });
  } catch (err) {
    console.warn('Telegram notify failed:', err);
  }
}

/* ─────────────── SECTION 19: HOME PREVIEW ─────────────── */
function renderHomePreview() {
  const container = $('levelTrackPreview');
  if (!container) return;

  const allProblems = window.PROBLEMS_DB || [];
  const preview = allProblems.slice(0, 10);

  container.innerHTML = preview.map(p => {
    const solved = Progress.isSolved(p.id);
    return `
      <div class="level-preview-card ${solved ? 'solved' : ''}" onclick="openProblem(${p.id})">
        ${solved ? '<div class="lpc-check"><i class="fa-solid fa-check"></i></div>' : ''}
        <div class="lpc-num">LVL ${p.level}</div>
        <div class="lpc-title">${escapeHtml(p.title)}</div>
        <div class="lpc-meta">
          <span class="lpc-diff ${p.difficulty}">${p.difficulty}</span>
        </div>
      </div>
    `;
  }).join('');

  // Stats
  if ($('statLevels')) $('statLevels').textContent = allProblems.length;
  if ($('statSolvedGlobal')) $('statSolvedGlobal').textContent = Progress.totalSolved();
}

/* ─────────────── SECTION 20: SCROLL PROGRESS + BACK TO TOP ─────────────── */
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)) * 100;
  const sp = $('scrollProgress');
  if (sp) sp.style.width = scrolled + '%';
  const btt = $('backToTop');
  if (btt) btt.classList.toggle('show', h.scrollTop > 400);
});

$('backToTop')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─────────────── SECTION 21: KEYBOARD SHORTCUTS ─────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay-cine.show').forEach(m => m.classList.remove('show'));
    document.body.style.overflow = '';
  }
});

/* ─────────────── SECTION 22: INIT ─────────────── */
function initApp() {
  renderHomePreview();
  updatePythonProgress();
  updateUserUI();

  // Set UPI display
  if ($('upiIdDisplay')) $('upiIdDisplay').textContent = CONFIG.UPI_ID;
}

/* ─────────────── SECTION 23: BOOT ─────────────── */
window.addEventListener('load', () => {
  // Force boot loader hide after 4 seconds no matter what
  setTimeout(() => {
    const loader = $('bootLoader');
    if (loader) loader.classList.add('hide');
  }, 4000);
});

console.log('🚀 The Chairman Show — Cinematic Platform Loaded');
