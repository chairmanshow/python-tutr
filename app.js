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
  PISTON_API: "https://emkc.org/api/v2/piston/execute",
  GROQ_API_KEY: "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"

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

/* ══════════════════════════════════════════════════════════════
   NOTE: Run Code (Piston API) removed — we use "Show Solution" instead
   ══════════════════════════════════════════════════════════════ */


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
/* ══════════════════════════════════════════════════════════════
   SECTION 24: REAL-TIME COMMUNITY CHAT
   ══════════════════════════════════════════════════════════════ */

const rtdb = firebase.database();

const Chat = (function() {
  // ═══ CONFIG ═══
  const ROOMS = [
    { id: 'general', name: 'general', icon: 'fa-hashtag', desc: 'Anything & everything' },
    { id: 'dsa', name: 'dsa-help', icon: 'fa-code', desc: 'Algorithms & Data Structures' },
    { id: 'python', name: 'python', icon: 'fa-brands fa-python', desc: 'Python discussion' },
    { id: 'projects', name: 'projects', icon: 'fa-rocket', desc: 'Show off your work' },
    { id: 'off-topic', name: 'off-topic', icon: 'fa-mug-hot', desc: 'Fun, memes, chill' }
  ];

  const QUICK_REACTIONS = ['👍','❤️','😂','🔥','👏','😮'];

  const EMOJI_SET = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','🤐','😐',
    '😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
    '🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯',
    '😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩',
    '😫','🥱','😤','😡','😠','🤬','😈','👿','💀','🤡','👋','🤚','✋','🖖','👌','🤌',
    '✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜',
    '👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','❤️','🧡','💛','💚','💙',
    '💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✨','⭐','🌟',
    '🔥','💥','💫','⚡','🎉','🎊','🎁','🏆','🥇','🎯','🚀','🌈','☀️','🌙','☁️','❄️'
  ];

  const GROUP_WINDOW_MS = 5 * 60 * 1000;
  const MAX_MESSAGES = 250;
  const TYPING_TIMEOUT = 2600;

  // ═══ STATE ═══
  const state = {
    uid: null,
    name: '',
    color: '',
    room: 'general',
    messages: [],
    roomListeners: [],
    online: {},
    typing: {},
    unread: 0,
    soundOn: false,
    replyTarget: null,
    editingKey: null,
    searchTerm: '',
    firstLoadDone: false,
    ready: false
  };

  const el = {};

  // ═══ HELPERS ═══
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  function formatMsgText(text) {
    let out = escapeHtml(text);
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    out = out.replace(/(https?:\/\/[^\s<]+)/g, (url) => '<a href="'+url+'" target="_blank" rel="noopener">'+url+'</a>');
    out = out.replace(/\n/g, '<br>');
    return out;
  }

  function hashStr(str) {
    let h = 0;
    const s = String(str || 'x');
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  function initialOf(name) {
    const n = String(name || '?').trim();
    return n ? n.charAt(0).toUpperCase() : '?';
  }

  function dayKey(ts) {
    const d = new Date(ts || Date.now());
    return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  }

  function formatDayLabel(ts) {
    const d = new Date(ts || Date.now());
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);

    if (dayKey(d) === dayKey(today)) return 'Today';
    if (dayKey(d) === dayKey(yest)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatClock(ts) {
    return new Date(ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ═══ IDENTITY ═══
  function loadIdentity() {
    let uid = localStorage.getItem('tcs_uid');
    if (!uid) {
      uid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('tcs_uid', uid);
    }
    state.uid = uid;
    state.name = localStorage.getItem('tcs_chat_name') || '';
    state.color = localStorage.getItem('tcs_chat_color') || '';

    const savedRoom = localStorage.getItem('tcs_chat_room');
    if (savedRoom && ROOMS.some(r => r.id === savedRoom)) {
      state.room = savedRoom;
    }
  }

  function saveIdentity() {
    localStorage.setItem('tcs_chat_name', state.name);
    localStorage.setItem('tcs_chat_color', state.color);
    localStorage.setItem('tcs_chat_room', state.room);
  }

  // ═══ CACHE DOM ═══
  function cacheDom() {
    el.shell = document.getElementById('chatShell') || document.querySelector('.chat-shell-cine');
    el.sidebar = document.getElementById('chatSidebar');
    el.sideOpen = document.getElementById('cmMenuBtn');
    el.sideClose = document.getElementById('csCloseBtn');
    el.meAvatar = document.getElementById('csMeAvatar');
    el.meName = document.getElementById('csMeName');
    el.roomList = document.getElementById('csRooms');
    el.userList = document.getElementById('csUsers');
    el.onlineTotal = document.getElementById('csOnlineCount');
    el.chatSearch = document.getElementById('csSearchInput');
    el.roomTitle = document.getElementById('cmRoomName');
    el.roomSub = document.getElementById('cmRoomSub');
    el.soundBtn = document.getElementById('cmSoundBtn');
    el.messages = document.getElementById('cmBody');
    el.typingBar = document.getElementById('cmTyping');
    el.replyPrev = document.getElementById('cmReplyPreview');
    el.rpName = document.getElementById('cmRpName');
    el.rpText = document.getElementById('cmRpText');
    el.rpCancel = document.getElementById('cmRpCancel');
    el.emojiPanel = document.getElementById('cmEmojiPanel');
    el.emojiBtn = document.getElementById('cmEmojiBtn');
    el.imageBtn = document.getElementById('cmImageBtn');
    el.imageInput = document.getElementById('cmImageInput');
    el.imgPreview = document.getElementById('cmImgPreview');
    el.imgPreviewEl = document.getElementById('cmImgPreviewEl');
    el.imgRemove = document.getElementById('cmImgRemove');
    el.form = document.getElementById('cmComposer');
    el.input = document.getElementById('cmInput');
    el.sendBtn = document.getElementById('cmSendBtn');
    el.jumpBtn = document.getElementById('cmJumpBtn');
    el.jumpBadge = document.getElementById('cmJumpBadge');
    el.joinOverlay = document.getElementById('cmJoinOverlay');
    el.joinName = document.getElementById('cmJoinName');
    el.joinColors = document.getElementById('cmJoinColors');
    el.joinBtn = document.getElementById('cmJoinBtn');
    el.joinError = document.getElementById('cmJoinError');
    el.navBadge = document.getElementById('navChatBadge');
  }

  // ═══ RENDER ROOMS ═══
  function renderRooms() {
    if (!el.roomList) return;
    el.roomList.innerHTML = '';
    ROOMS.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'cs-room' + (r.id === state.room ? ' active' : '');
      btn.type = 'button';
      btn.innerHTML = `
        <div class="cs-room-ico"><i class="${r.icon.startsWith('fa-brands') ? r.icon : 'fa-solid ' + r.icon}"></i></div>
        <div class="cs-room-meta">
          <div class="cs-room-name">#${escapeHtml(r.name)}</div>
        </div>
        <span class="cs-room-count" data-room="${r.id}">0</span>
      `;
      btn.addEventListener('click', () => switchRoom(r.id));
      el.roomList.appendChild(btn);
    });
  }

  function updateRoomCounts() {
    // Just placeholder — you could query message count per room for accuracy
  }

  // ═══ RENDER PROFILE ═══
  function renderProfile() {
    if (el.meName) el.meName.textContent = state.name || 'Guest';
    if (el.meAvatar) {
      el.meAvatar.textContent = state.name ? initialOf(state.name) : '?';
      el.meAvatar.style.background = state.color || 'linear-gradient(135deg,#00d4ff,#7c3aed)';
      el.meAvatar.style.display = 'flex';
      el.meAvatar.style.alignItems = 'center';
      el.meAvatar.style.justifyContent = 'center';
      el.meAvatar.style.fontWeight = '800';
      el.meAvatar.style.color = '#000';
      el.meAvatar.src = '';
    }
  }

  // ═══ RENDER ONLINE USERS ═══
  function renderOnlineUsers() {
    if (!el.userList) return;
    const list = Object.entries(state.online)
      .map(([uid, u]) => ({ uid, ...u }))
      .sort((a, b) => {
        if (a.uid === state.uid) return -1;
        if (b.uid === state.uid) return 1;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

    if (el.onlineTotal) el.onlineTotal.textContent = list.length;

    if (!list.length) {
      el.userList.innerHTML = '<div class="cs-loading">No one online</div>';
    } else {
      el.userList.innerHTML = list.map(u => `
        <div class="cs-user">
          <div class="cs-user-av" style="background:${u.color || '#00d4ff'}">${escapeHtml(initialOf(u.name))}</div>
          <span class="cs-user-name">${escapeHtml(u.name || 'Anonymous')}</span>
          ${u.uid === state.uid ? '<span class="cs-user-you">you</span>' : ''}
        </div>
      `).join('');
    }

    if (el.roomSub) {
      const n = list.length;
      el.roomSub.textContent = n + (n === 1 ? ' member online' : ' members online');
    }
  }

  // ═══ SCROLL ═══
  function scrollNearBottom(threshold) {
    const t = threshold === undefined ? 140 : threshold;
    return (el.messages.scrollHeight - el.messages.scrollTop - el.messages.clientHeight) < t;
  }

  function scrollToBottom(smooth) {
    if (smooth === undefined) smooth = true;
    try {
      el.messages.scrollTo({ top: el.messages.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    } catch (e) {
      el.messages.scrollTop = el.messages.scrollHeight;
    }
    state.unread = 0;
    updateJumpBtn();
  }

  function updateJumpBtn() {
    if (!el.jumpBtn) return;
    if (state.unread > 0) {
      el.jumpBadge.style.display = 'flex';
      el.jumpBadge.textContent = state.unread > 99 ? '99+' : String(state.unread);
      el.jumpBtn.classList.add('show');
    } else {
      el.jumpBtn.classList.remove('show');
      el.jumpBadge.style.display = 'none';
    }
  }

  function clearUnread() {
    state.unread = 0;
    updateJumpBtn();
    if (el.navBadge) el.navBadge.style.display = 'none';
  }

  function bumpUnread() {
    if (activeTab === 'community' && !document.hidden) return;
    state.unread++;
    updateJumpBtn();
    if (el.navBadge) {
      el.navBadge.style.display = 'flex';
      el.navBadge.textContent = state.unread > 99 ? '99+' : String(state.unread);
    }
  }

  // ═══ MESSAGE NODE ═══
  function buildMessageNode(m, grouped) {
    const mine = m.uid === state.uid;
    const row = document.createElement('div');
    row.className = 'cm-msg' + (mine ? ' mine' : '') + (grouped ? ' grouped' : '');
    row.dataset.key = m.key;

    const av = document.createElement('div');
    av.className = 'cm-msg-avatar' + (grouped ? ' hidden' : '');
    if (!grouped) {
      av.textContent = initialOf(m.name);
      av.style.background = m.color || '#00d4ff';
      av.title = m.name || 'Anonymous';
    }

    const col = document.createElement('div');
    col.className = 'cm-msg-col';

    if (!grouped && !mine) {
      const author = document.createElement('div');
      author.className = 'cm-msg-author';
      const hue = Math.abs(hashStr(m.name)) % 360;
      author.style.color = 'hsl(' + hue + ', 80%, 65%)';
      author.textContent = m.name || 'Anonymous';
      col.appendChild(author);
    }

    const bubble = document.createElement('div');
    bubble.className = 'cm-bubble';
    bubble.dataset.key = m.key;

    if (m.reply && m.reply.text) {
      const q = document.createElement('div');
      q.className = 'cm-quote';
      q.innerHTML = `
        <div class="cm-quote-body">
          <div class="cm-quote-name">${escapeHtml(m.reply.name || 'User')}</div>
          <div class="cm-quote-text">${escapeHtml(m.reply.text)}</div>
        </div>`;
      q.addEventListener('click', () => {
        const target = el.messages.querySelector('.cm-msg[data-key="' + m.reply.key + '"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.style.transition = 'background .4s';
          target.style.background = 'rgba(0,212,255,.14)';
          setTimeout(() => { target.style.background = ''; }, 900);
        }
      });
      bubble.appendChild(q);
    }

    // Image
    if (m.imageUrl) {
      const img = document.createElement('img');
      img.className = 'cm-chat-img';
      img.src = m.imageUrl;
      img.alt = 'shared';
      img.loading = 'lazy';
      img.addEventListener('click', () => {
        if (window.openImageViewer) window.openImageViewer(m.imageUrl);
      });
      bubble.appendChild(img);
    }

    // Text
    if (m.text) {
      const textEl = document.createElement('div');
      textEl.className = 'cm-text';
      let html = formatMsgText(m.text);
      if (state.searchTerm) {
        const safeTerm = state.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp('(' + safeTerm + ')', 'gi'), '<mark style="background:rgba(245,158,11,.4);color:#fff;border-radius:3px;padding:0 2px;">$1</mark>');
      }
      textEl.innerHTML = html;
      bubble.appendChild(textEl);
    }

    // Meta
    const meta = document.createElement('div');
    meta.className = 'cm-bubble-meta';
    let metaHtml = '';
    if (m.edited) metaHtml += '<span class="cm-edited-tag">edited</span>';
    metaHtml += '<span>' + formatClock(m.ts) + '</span>';
    if (mine) metaHtml += '<i class="fa-solid fa-check"></i>';
    meta.innerHTML = metaHtml;
    bubble.appendChild(meta);

    col.appendChild(bubble);

    // Reactions
    if (m.reactions && typeof m.reactions === 'object') {
      const entries = Object.entries(m.reactions)
        .map(([emoji, users]) => ({
          emoji,
          users: users && typeof users === 'object' ? Object.keys(users) : []
        }))
        .filter(r => r.users.length > 0);

      if (entries.length) {
        const bar = document.createElement('div');
        bar.className = 'cm-reactions';
        entries.forEach(({ emoji, users }) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'cm-reaction-chip' + (users.indexOf(state.uid) !== -1 ? ' mine' : '');
          chip.innerHTML = '<span>' + emoji + '</span><span>' + users.length + '</span>';
          chip.addEventListener('click', () => toggleReaction(m.key, emoji));
          bar.appendChild(chip);
        });
        col.appendChild(bar);
      }
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'cm-msg-actions';

    QUICK_REACTIONS.slice(0, 4).forEach(emoji => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = emoji;
      b.title = 'React ' + emoji;
      b.addEventListener('click', (ev) => { ev.stopPropagation(); toggleReaction(m.key, emoji); });
      actions.appendChild(b);
    });

    const sep = document.createElement('div');
    sep.className = 'cm-act-sep';
    actions.appendChild(sep);

    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.innerHTML = '<i class="fa-solid fa-reply"></i>';
    replyBtn.title = 'Reply';
    replyBtn.addEventListener('click', (ev) => { ev.stopPropagation(); setReply(m); });
    actions.appendChild(replyBtn);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    copyBtn.title = 'Copy';
    copyBtn.addEventListener('click', (ev) => { ev.stopPropagation(); copyText(m.text || ''); });
    actions.appendChild(copyBtn);

    if (mine) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', (ev) => { ev.stopPropagation(); startEdit(m); });
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.title = 'Delete';
      delBtn.addEventListener('click', (ev) => { ev.stopPropagation(); deleteMessage(m.key); });
      actions.appendChild(delBtn);
    }

    row.appendChild(av);
    row.appendChild(col);
    row.appendChild(actions);
    return row;
  }

  // ═══ RENDER MESSAGES ═══
  function renderMessages() {
    const box = el.messages;
    if (!box) return;
    const wasAtBottom = scrollNearBottom(160);
    const prevHeight = box.scrollHeight;
    const prevTop = box.scrollTop;

    box.innerHTML = '';

    if (!state.messages.length) {
      box.innerHTML = `
        <div class="cm-empty">
          <i class="fa-regular fa-comments"></i>
          <h4>No messages yet</h4>
          <p>Be the first to say hello in #${escapeHtml(roomName())}</p>
        </div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    let prev = null;

    state.messages.forEach(m => {
      if (!prev || dayKey(prev.ts) !== dayKey(m.ts)) {
        const sep = document.createElement('div');
        sep.className = 'cm-date-sep';
        sep.innerHTML = '<span>' + formatDayLabel(m.ts) + '</span>';
        frag.appendChild(sep);
      }

      const sameDay = prev && dayKey(prev.ts) === dayKey(m.ts);
      const grouped = !!(prev && sameDay && prev.uid === m.uid && (m.ts - prev.ts) < GROUP_WINDOW_MS && !m.reply);

      frag.appendChild(buildMessageNode(m, grouped));
      prev = m;
    });

    box.appendChild(frag);

    if (wasAtBottom) box.scrollTop = box.scrollHeight;
    else box.scrollTop = prevTop + (box.scrollHeight - prevHeight);
  }

  function roomName() {
    const r = ROOMS.find(x => x.id === state.room);
    return r ? r.name : state.room;
  }

  // ═══ ROOM LISTENERS ═══
  function detachRoomListeners() {
    state.roomListeners.forEach(({ ref, ev, cb }) => ref.off(ev, cb));
    state.roomListeners = [];
  }

  function attachRoom(roomId) {
    detachRoomListeners();
    state.messages = [];
    state.typing = {};
    state.firstLoadDone = false;
    renderMessages();
    renderTyping();

    const msgRef = rtdb.ref('chat/' + roomId + '/messages').limitToLast(MAX_MESSAGES);

    const onAdded = msgRef.on('child_added', (snap) => {
      const msg = normalizeMessage(snap.key, snap.val() || {});
      if (!state.messages.some(x => x.key === msg.key)) {
        state.messages.push(msg);
        state.messages.sort(compareMessages);
        if (state.messages.length > MAX_MESSAGES) {
          state.messages = state.messages.slice(-MAX_MESSAGES);
        }
      }
      const atBottom = scrollNearBottom(180);
      renderMessages();

      const isNew = state.firstLoadDone && msg.uid !== state.uid;
      if (isNew) {
        if (atBottom) scrollToBottom(true);
        else bumpUnread();
        if (state.soundOn) playPing();
      }
      if (msg.uid === state.uid) scrollToBottom(true);
    });

    const onChanged = msgRef.on('child_changed', (snap) => {
      const idx = state.messages.findIndex(x => x.key === snap.key);
      if (idx !== -1) {
        state.messages[idx] = normalizeMessage(snap.key, snap.val() || {});
        renderMessages();
      }
    });

    const onRemoved = msgRef.on('child_removed', (snap) => {
      state.messages = state.messages.filter(x => x.key !== snap.key);
      renderMessages();
    });

    state.roomListeners.push({ ref: msgRef, ev: 'child_added', cb: onAdded });
    state.roomListeners.push({ ref: msgRef, ev: 'child_changed', cb: onChanged });
    state.roomListeners.push({ ref: msgRef, ev: 'child_removed', cb: onRemoved });

    setTimeout(() => {
      state.firstLoadDone = true;
      scrollToBottom(false);
    }, 700);

    attachTypingListener(roomId);
  }

  function normalizeMessage(key, val) {
    return {
      key,
      uid: val.uid || 'anon',
      name: val.name || 'Anonymous',
      color: val.color || '#00d4ff',
      text: val.text || '',
      imageUrl: val.imageUrl || '',
      ts: typeof val.ts === 'number' ? val.ts : Date.now(),
      edited: !!val.edited,
      reply: val.reply || null,
      reactions: val.reactions || null
    };
  }

  function compareMessages(a, b) {
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  }

  // ═══ PRESENCE ═══
  function attachPresence() {
    const connRef = rtdb.ref('.info/connected');
    connRef.on('value', (snap) => {
      if (snap.val() !== true) return;
      const myRef = rtdb.ref('chat/presence/' + state.uid);
      myRef.onDisconnect().remove();
      myRef.set({
        name: state.name || 'Anonymous',
        color: state.color || '#00d4ff',
        ts: firebase.database.ServerValue.TIMESTAMP
      });
    });

    const presRef = rtdb.ref('chat/presence');
    const handler = presRef.on('value', (snap) => {
      state.online = snap.val() || {};
      renderOnlineUsers();
    });
    state.roomListeners.push({ ref: presRef, ev: 'value', cb: handler });
  }

  function refreshPresence() {
    rtdb.ref('chat/presence/' + state.uid).update({
      name: state.name,
      color: state.color,
      ts: firebase.database.ServerValue.TIMESTAMP
    }).catch(() => {});
  }

  // ═══ TYPING ═══
  let typingRef = null;
  let typingStopTimer = null;
  let amTyping = false;

  function attachTypingListener(roomId) {
    detachTypingListeners();
    const ref = rtdb.ref('chat/typing/' + roomId);
    const handler = ref.on('value', (snap) => {
      const val = snap.val() || {};
      const now = Date.now();
      state.typing = {};
      Object.entries(val).forEach(([uid, info]) => {
        if (uid === state.uid) return;
        if (!info || !info.ts || (now - info.ts) > 8000) return;
        state.typing[uid] = info;
      });
      renderTyping();
    });
    state.roomListeners.push({ ref, ev: 'value', cb: handler });
  }

  function detachTypingListeners() {
    // handled by detachRoomListeners
  }

  function renderTyping() {
    if (!el.typingBar) return;
    const names = Object.values(state.typing).map(t => t.name || 'Someone');
    if (!names.length) {
      el.typingBar.classList.remove('show');
      el.typingBar.innerHTML = '';
      return;
    }

    let label;
    if (names.length === 1) label = names[0] + ' is typing';
    else if (names.length === 2) label = names[0] + ' and ' + names[1] + ' are typing';
    else label = names.length + ' people are typing';

    el.typingBar.innerHTML = '<span class="cm-typing-dots"><i></i><i></i><i></i></span><span>' + escapeHtml(label) + '</span>';
    el.typingBar.classList.add('show');
  }

  function signalTyping() {
    if (!state.name) return;
    if (!typingRef || typingRef.toString().indexOf('/chat/typing/' + state.room + '/') === -1) {
      typingRef = rtdb.ref('chat/typing/' + state.room + '/' + state.uid);
      typingRef.onDisconnect().remove();
    }
    if (!amTyping) {
      amTyping = true;
      typingRef.set({ name: state.name, ts: Date.now() }).catch(() => {});
    } else {
      typingRef.update({ ts: Date.now() }).catch(() => {});
    }
    clearTimeout(typingStopTimer);
    typingStopTimer = setTimeout(stopTyping, TYPING_TIMEOUT);
  }

  function stopTyping() {
    clearTimeout(typingStopTimer);
    amTyping = false;
    if (typingRef) typingRef.remove().catch(() => {});
  }

  // ═══ SEND MESSAGE ═══
  let pendingImageUrl = '';

  function sendMessage() {
    const text = el.input.value.trim();
    const hasImage = !!pendingImageUrl;

    if (!text && !hasImage) return;
    if (!state.name) { openJoin(); return; }

    const msgRef = rtdb.ref('chat/' + state.room + '/messages');

    if (state.editingKey) {
      msgRef.child(state.editingKey).update({
        text,
        edited: true
      }).catch(err => console.error('Edit failed:', err));
      cancelEdit();
      el.input.value = '';
      autoResize();
      updateSendState();
      return;
    }

    const payload = {
      uid: state.uid,
      name: state.name,
      color: state.color,
      text: text || '',
      ts: firebase.database.ServerValue.TIMESTAMP
    };

    if (hasImage) {
      payload.imageUrl = pendingImageUrl;
    }

    if (state.replyTarget) {
      payload.reply = {
        key: state.replyTarget.key,
        name: state.replyTarget.name,
        text: String(state.replyTarget.text || state.replyTarget.imageUrl ? '[image]' : '').slice(0, 140)
      };
    }

    msgRef.push(payload).catch(err => {
      console.error('Send failed:', err);
      alert('Could not send message. Check connection.');
    });

    el.input.value = '';
    pendingImageUrl = '';
    if (el.imgPreview) el.imgPreview.style.display = 'none';
    if (el.imgPreviewEl) el.imgPreviewEl.src = '';
    autoResize();
    cancelReply();
    stopTyping();
    updateSendState();
    scrollToBottom(true);
  }

  function setReply(m) {
    state.replyTarget = m;
    el.rpName.textContent = m.name || 'Anonymous';
    el.rpText.textContent = String(m.text || '[image]').slice(0, 120);
    el.replyPrev.classList.add('show');
    el.input.focus();
    cancelEdit();
  }

  function cancelReply() {
    state.replyTarget = null;
    el.replyPrev.classList.remove('show');
  }

  function startEdit(m) {
    state.editingKey = m.key;
    el.input.value = m.text || '';
    el.input.focus();
    autoResize();
    updateSendState();
    el.sendBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    el.input.placeholder = 'Editing message… (Esc to cancel)';
    cancelReply();
  }

  function cancelEdit() {
    state.editingKey = null;
    el.sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    el.input.placeholder = 'Message #' + roomName() + '...';
  }

  function deleteMessage(key) {
    if (!confirm('Delete this message?')) return;
    rtdb.ref('chat/' + state.room + '/messages/' + key).remove().catch(err => console.error('Delete failed:', err));
  }

  function toggleReaction(key, emoji) {
    if (!state.name) { openJoin(); return; }
    const path = 'chat/' + state.room + '/messages/' + key + '/reactions/' + emoji + '/' + state.uid;
    const ref = rtdb.ref(path);
    ref.once('value').then(snap => {
      if (snap.exists()) ref.remove();
      else ref.set(true);
    }).catch(err => console.error('Reaction failed:', err));
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => flashToast('Copied!')).catch(() => {});
    }
  }

  let toastTimer = null;
  function flashToast(msg) {
    let t = document.getElementById('chatToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'chatToast';
      t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);background:#202024;border:1px solid rgba(255,255,255,.12);color:#fff;padding:10px 20px;border-radius:9999px;font-size:.85rem;z-index:5000;opacity:0;transition:.25s;pointer-events:none;box-shadow:0 12px 30px rgba(0,0,0,.6);font-family:inherit;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 1800);
  }

  function playPing() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 600);
    } catch (e) {}
  }

  // ═══ SWITCH ROOM ═══
  function switchRoom(roomId) {
    if (!ROOMS.some(r => r.id === roomId)) return;
    if (roomId === state.room && state.ready) { closeSidebar(); return; }
    stopTyping();
    state.room = roomId;
    saveIdentity();

    const r = ROOMS.find(x => x.id === roomId);
    if (el.roomTitle) el.roomTitle.textContent = r.name;
    if (el.input) el.input.placeholder = 'Message #' + r.name + '...';

    cancelReply();
    cancelEdit();
    closeEmoji();
    closeSidebar();
    clearUnread();
    renderRooms();
    attachRoom(roomId);
  }

  // ═══ EMOJI ═══
  function buildEmojiPanel() {
    if (!el.emojiPanel) return;
    el.emojiPanel.innerHTML = '';
    EMOJI_SET.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = e;
      b.addEventListener('click', () => {
        const input = el.input;
        const start = input.selectionStart || input.value.length;
        const end = input.selectionEnd || input.value.length;
        input.value = input.value.slice(0, start) + e + input.value.slice(end);
        input.selectionStart = input.selectionEnd = start + e.length;
        input.focus();
        autoResize();
        updateSendState();
      });
      el.emojiPanel.appendChild(b);
    });
  }

  function toggleEmoji() {
    if (!el.emojiPanel) return;
    el.emojiPanel.classList.toggle('show');
    el.emojiBtn.classList.toggle('active', el.emojiPanel.classList.contains('show'));
  }

  function closeEmoji() {
    if (el.emojiPanel) el.emojiPanel.classList.remove('show');
    if (el.emojiBtn) el.emojiBtn.classList.remove('active');
  }

  function openSidebar() { el.sidebar?.classList.add('open'); }
  function closeSidebar() { el.sidebar?.classList.remove('open'); }

  function autoResize() {
    if (!el.input) return;
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, 130) + 'px';
  }

  function updateSendState() {
    if (!el.sendBtn || !el.input) return;
    const hasText = el.input.value.trim().length > 0;
    const hasImg = !!pendingImageUrl;
    el.sendBtn.disabled = !(hasText || hasImg);
  }

  function focusInput() {
    if (window.innerWidth > 640) el.input?.focus();
  }

  // ═══ JOIN ═══
  const COLORS = [
    '#00d4ff', '#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#06b6d4'
  ];
  let selectedColor = COLORS[0];

  function buildColorPicker() {
    if (!el.joinColors) return;
    el.joinColors.innerHTML = '';
    COLORS.forEach(c => {
      const s = document.createElement('div');
      s.className = 'cm-color-swatch' + (c === selectedColor ? ' sel' : '');
      s.style.background = c;
      s.addEventListener('click', () => { selectedColor = c; buildColorPicker(); });
      el.joinColors.appendChild(s);
    });
  }

  function openJoin() {
    el.joinOverlay?.classList.remove('hide');
    setTimeout(() => el.joinName?.focus(), 150);
  }

  function closeJoin() {
    el.joinOverlay?.classList.add('hide');
  }

  function handleJoin() {
    const name = el.joinName.value.trim();
    if (name.length < 2) {
      el.joinError.style.display = 'block';
      el.joinError.textContent = 'Please enter at least 2 characters.';
      return;
    }
    if (name.length > 20) {
      el.joinError.style.display = 'block';
      el.joinError.textContent = 'Name must be 20 characters or fewer.';
      return;
    }
    state.name = name;
    state.color = selectedColor;
    saveIdentity();
    renderProfile();
    refreshPresence();
    closeJoin();
    updateSendState();
    focusInput();
    flashToast('Welcome, ' + name + '!');
  }

  // ═══ SEARCH ═══
  const onSearch = debounce(function(term) {
    state.searchTerm = term.trim();
    renderMessages();
  }, 250);

  // ═══ EVENTS ═══
  function bindEvents() {
    el.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    el.input?.addEventListener('input', function() {
      autoResize();
      updateSendState();
      if (this.value.trim()) signalTyping();
      else stopTyping();
    });

    el.input?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      if (e.key === 'Escape') {
        if (state.editingKey) {
          cancelEdit();
          el.input.value = '';
          autoResize();
          updateSendState();
        } else if (state.replyTarget) {
          cancelReply();
        } else closeEmoji();
      }
    });

    el.input?.addEventListener('blur', () => setTimeout(stopTyping, 400));

    el.emojiBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEmoji();
    });

    document.addEventListener('click', (e) => {
      if (el.emojiPanel?.classList.contains('show') &&
          !el.emojiPanel.contains(e.target) &&
          e.target !== el.emojiBtn &&
          !el.emojiBtn?.contains(e.target)) {
        closeEmoji();
      }
    });

    el.rpCancel?.addEventListener('click', cancelReply);

    el.messages?.addEventListener('scroll', () => {
      if (scrollNearBottom(120) && state.unread > 0) clearUnread();
    });

    el.jumpBtn?.addEventListener('click', () => scrollToBottom(true));

    el.soundBtn?.addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      el.soundBtn.innerHTML = state.soundOn
        ? '<i class="fa-solid fa-volume-high"></i>'
        : '<i class="fa-solid fa-volume-xmark"></i>';
      el.soundBtn.classList.toggle('active', state.soundOn);
      localStorage.setItem('tcs_chat_sound', state.soundOn ? '1' : '0');
      if (state.soundOn) playPing();
    });

    el.sideOpen?.addEventListener('click', openSidebar);
    el.sideClose?.addEventListener('click', closeSidebar);

    el.shell?.addEventListener('click', (e) => {
      if (window.innerWidth <= 900 &&
          el.sidebar?.classList.contains('open') &&
          !el.sidebar.contains(e.target) &&
          e.target !== el.sideOpen &&
          !el.sideOpen?.contains(e.target)) {
        closeSidebar();
      }
    });

    el.chatSearch?.addEventListener('input', function() {
      onSearch(this.value);
    });

    el.joinBtn?.addEventListener('click', handleJoin);
    el.joinName?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleJoin();
      }
    });

    // Image upload
    el.imageBtn?.addEventListener('click', () => el.imageInput?.click());

    el.imageInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        flashToast('Image too large (max 10MB)');
        return;
      }
      try {
        flashToast('Uploading image...');
        const url = await uploadToImgBB(file);
        pendingImageUrl = url;
        if (el.imgPreview) el.imgPreview.style.display = 'inline-block';
        if (el.imgPreviewEl) el.imgPreviewEl.src = url;
        updateSendState();
        flashToast('Image ready to send');
      } catch (err) {
        flashToast('Upload failed: ' + err.message);
      } finally {
        el.imageInput.value = '';
      }
    });

    el.imgRemove?.addEventListener('click', () => {
      pendingImageUrl = '';
      if (el.imgPreview) el.imgPreview.style.display = 'none';
      if (el.imgPreviewEl) el.imgPreviewEl.src = '';
      updateSendState();
    });

    window.addEventListener('beforeunload', () => {
      try {
        rtdb.ref('chat/presence/' + state.uid).remove();
        if (typingRef) typingRef.remove();
      } catch (e) {}
    });

    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth > 900) closeSidebar();
    }, 150));

    window.addEventListener('focus', () => {
      if (activeTab === 'community') clearUnread();
    });
  }

  // ═══ INIT ═══
  function init() {
    cacheDom();
    loadIdentity();
    state.soundOn = localStorage.getItem('tcs_chat_sound') === '1';

    if (el.soundBtn) {
      el.soundBtn.innerHTML = state.soundOn
        ? '<i class="fa-solid fa-volume-high"></i>'
        : '<i class="fa-solid fa-volume-xmark"></i>';
      el.soundBtn.classList.toggle('active', state.soundOn);
    }

    renderProfile();
    renderRooms();
    buildEmojiPanel();
    buildColorPicker();
    bindEvents();
    attachPresence();

    const r = ROOMS.find(x => x.id === state.room);
    if (el.roomTitle) el.roomTitle.textContent = r.name;
    if (el.input) el.input.placeholder = 'Message #' + r.name + '...';

    attachRoom(state.room);

    if (!state.name) {
      el.joinName.value = '';
      selectedColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      buildColorPicker();
      openJoin();
    } else {
      closeJoin();
    }

    updateSendState();
    autoResize();
    state.ready = true;
  }

  return {
    init,
    scrollToBottom,
    focusInput,
    switchRoom,
    clearUnread,
    getState: () => state
  };
})();

// ═══ Hook Chat into tab switch ═══
const _prevSwitchToTabForChat = window.switchToTab;
window.switchToTab = function(tabId) {
  _prevSwitchToTabForChat(tabId);
  if (tabId === 'community') {
    Chat.clearUnread();
    setTimeout(() => {
      Chat.scrollToBottom(false);
      Chat.focusInput();
    }, 80);
  }
};

// ═══ Init Chat when app loads ═══
const _prevInitAppForChat = initApp;
initApp = function() {
  _prevInitAppForChat();
  try {
    Chat.init();
  } catch (err) {
    console.error('Chat init error:', err);
  }
};

console.log('💬 Community Chat Loaded');
/* ══════════════════════════════════════════════════════════════
   SHOW SOLUTION — Clean, no API needed
   ══════════════════════════════════════════════════════════════ */

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#showSolutionBtn');
  if (!btn) return;
  e.preventDefault();

  if (!currentProblem) {
    toast('warn', 'No problem loaded');
    return;
  }

  const solutionCard = document.getElementById('solutionCard');
  const codeBody = document.querySelector('.editor-body');
  const editorFooter = document.querySelector('.editor-footer');
  const solutionCode = document.getElementById('solutionCode');
  const solutionExplanation = document.getElementById('solutionExplanation');

  if (!solutionCard) {
    toast('warn', 'Solution card missing');
    return;
  }

  // Fill solution content
  if (solutionCode) {
    solutionCode.textContent = currentProblem.solution || '# Solution not available';
  }

  if (solutionExplanation) {
    const exp = currentProblem.explanation || 'No explanation available for this problem.';
    solutionExplanation.innerHTML = `
      <div style="margin-bottom:.6rem; font-weight:700; color:var(--accent-cyan);">
        <i class="fa-solid fa-lightbulb"></i> Explanation
      </div>
      <div>${escapeHtml(exp).replace(/\n/g, '<br>')}</div>
    `;
  }

  // Hide code editor, show solution
  if (codeBody) codeBody.style.display = 'none';
  if (editorFooter) editorFooter.style.display = 'none';
  solutionCard.style.display = 'block';

  // Switch to Solution tab (visual)
  document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
  const solTab = document.getElementById('tabSolution');
  if (solTab) solTab.classList.add('active');

  // Scroll to solution
  setTimeout(() => {
    solutionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  toast('success', 'Solution revealed!', 'Study it, then try on your own 💪');
});
/* ═══ COPY SOLUTION ═══ */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#copySolutionBtn');
  if (!btn) return;
  e.preventDefault();

  if (!currentProblem) return;
  const text = currentProblem.solution || '';
  
  if (!text) {
    toast('warn', 'Nothing to copy');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--accent-green)"></i>';
    toast('success', 'Solution copied!', 'Paste it in your editor');
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  }).catch(() => {
    toast('warn', 'Copy failed');
  });
});

/* ═══ BACK TO CODE EDITOR ═══ */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#backToCodeBtn');
  if (!btn) return;
  e.preventDefault();

  const solutionCard = document.getElementById('solutionCard');
  const codeBody = document.querySelector('.editor-body');
  const editorFooter = document.querySelector('.editor-footer');

  if (solutionCard) solutionCard.style.display = 'none';
  if (codeBody) codeBody.style.display = 'flex';
  if (editorFooter) editorFooter.style.display = 'flex';

  // Switch tab visual
  document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
  const codeTab = document.getElementById('tabCode');
  if (codeTab) codeTab.classList.add('active');

  // Scroll back up
  const editorCard = document.querySelector('.editor-card');
  if (editorCard) {
    editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
/* ══════════════════════════════════════════════════════════════
   PARTICLES BACKGROUND — Floating Gold Dots
   ══════════════════════════════════════════════════════════════ */
(function initParticles() {
  const canvas = document.getElementById('particlesCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const PARTICLE_COUNT = 40;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.2,
      hue: Math.random() > 0.5 ? 45 : 265
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 45
        ? `rgba(212,175,55,${p.alpha})`
        : `rgba(124,58,237,${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();
