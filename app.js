/* ══════════════════════════════════════════════════════════════
   THE CHAIRMAN SHOW — Complete App Logic (v3)
   Fixed AI + Admin Posts + Theme Toggle + Universal Back
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
const rtdb = firebase.database();

const CONFIG = {
  UPI_ID: "chairman@upi",
  IMGBB_KEY: "f1e5041PDx4Vtw4YF6XfduRwwS6nKZ6sPAC9nCeR",
  AI_PROXY: "https://tcs-ai-proxy.sumitshrivas24.workers.dev/",   // ⚠️ अपना worker URL डालो
  ADMIN_EMAIL: "overactingofficial7@gmail.com",              // ⚠️ अपना admin email
  YT_API_KEY: "AIzaSyBdHiNJ6VOskm_KAWnZVb53XWJv662fDgw",             // ⚠️ YouTube API key
  YT_CHANNEL_ID: "UCkxoxW7yaoQri2HW_37FqLQ"
};

let currentUser = null;
let userProfile = null;
let currentProblem = null;

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ─────────────── SECTION 2: UTILITIES ─────────────── */
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

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function isAdmin() {
  return currentUser?.email === CONFIG.ADMIN_EMAIL;
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

/* ─────────────── SECTION 4: THEME TOGGLE ─────────────── */
(function initTheme() {
  const saved = localStorage.getItem('tcs_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  document.addEventListener('DOMContentLoaded', () => {
    updateThemeIcon(saved);
  });

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('#themeToggle');
    if (!toggle) return;
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tcs_theme', next);
    updateThemeIcon(next);
    toast('info', next === 'light' ? '☀️ Light mode' : '🌙 Dark mode');
  });

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }
})();

/* ─────────────── SECTION 5: AUTH ─────────────── */
$('googleSignInBtn')?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    $('loginError').style.display = 'none';
    await auth.signInWithPopup(provider);
  } catch (err) {
    console.error('Sign in error:', err);
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
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

/* ─────────────── SECTION 6: USER PROFILE ─────────────── */
async function ensureUserProfile(user) {
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'Coder',
      photoURL: user.photoURL || '',
      role: user.email === CONFIG.ADMIN_EMAIL ? 'admin' : 'student',
      class: '',
      bio: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      solvedCount: 0,
      xp: 0,
      streak: 0
    };
    await ref.set(profile);
    userProfile = profile;
  } else {
    userProfile = snap.data();
    if (user.email === CONFIG.ADMIN_EMAIL) userProfile.role = 'admin';
  }
  updateUserUI();
}

function updateUserUI() {
  if (!userProfile) return;
  const name = userProfile.name || 'Coder';
  const avatar = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=D4AF37&color=000&bold=true`;

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

  // Show post creator if admin
  if ($('postCreator')) {
    $('postCreator').style.display = isAdmin() ? 'block' : 'none';
  }
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

/* ─────────────── SECTION 7: TAB SWITCHING + HISTORY ─────────────── */
let activeTab = 'home';
const tabHistory = ['home'];

window.switchToTab = function(tabId) {
  const current = tabHistory[tabHistory.length - 1];
  if (current !== tabId) {
    tabHistory.push(tabId);
    if (tabHistory.length > 20) tabHistory.shift();
  }

  $$('.tab-content').forEach(t => t.classList.remove('active'));
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const target = $(tabId);
  if (target) target.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');
  activeTab = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Tab-specific loaders
  if (tabId === 'python') renderLevelsGrid();
  if (tabId === 'chatWithChairman') loadDoubts();
  if (tabId === 'chairmanPosts') loadChairmanPosts();
  if (tabId === 'leaderboard') loadLeaderboard();
  if (tabId === 'freeCourses') YouTube.ensureLoaded();
  if (tabId === 'donate') {
    if ($('upiIdDisplay')) $('upiIdDisplay').textContent = CONFIG.UPI_ID;
  }
  if (tabId === 'community') {
    setTimeout(() => { Chat.scrollToBottom(false); Chat.focusInput(); }, 80);
  }

  updateBackButton();
};

window.goBack = function() {
  if (tabHistory.length > 1) {
    tabHistory.pop();
    const prev = tabHistory[tabHistory.length - 1];
    switchToTabWithoutHistory(prev);
  } else {
    switchToTabWithoutHistory('home');
  }
  updateBackButton();
};

function switchToTabWithoutHistory(tabId) {
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const target = $(tabId);
  if (target) target.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');
  activeTab = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'python') renderLevelsGrid();
  if (tabId === 'chatWithChairman') loadDoubts();
  if (tabId === 'chairmanPosts') loadChairmanPosts();
  if (tabId === 'leaderboard') loadLeaderboard();
  if (tabId === 'freeCourses') YouTube.ensureLoaded();
}

function updateBackButton() {
  const btn = $('universalBackBtn');
  if (!btn) return;
  if (activeTab === 'home' || tabHistory.length <= 1) {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'inline-flex';
  }
}

document.addEventListener('click', (e) => {
  const navBtn = e.target.closest('.nav-item[data-tab]');
  if (navBtn) switchToTab(navBtn.dataset.tab);
  const gotoBtn = e.target.closest('[data-goto]');
  if (gotoBtn) {
    switchToTab(gotoBtn.dataset.goto);
    $('userDropdown')?.classList.remove('show');
  }
});

/* ─────────────── SECTION 8: PROGRESS TRACKER ─────────────── */
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

/* ─────────────── SECTION 9: LEVELS GRID ─────────────── */
let currentPythonFilter = 'all';
let currentPythonSearch = '';

function renderLevelsGrid() {
  const grid = $('levelsGrid');
  if (!grid) return;
  updatePythonProgress();

  let problems = window.PROBLEMS_DB || [];

  if (currentPythonFilter === 'solved') {
    problems = problems.filter(p => Progress.isSolved(p.id));
  } else if (currentPythonFilter !== 'all') {
    problems = problems.filter(p => p.difficulty === currentPythonFilter);
  }

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
    const meta = window.getLevelMeta ? window.getLevelMeta(p.level) : { icon:'fa-code', color:'#D4AF37' };
    return `
      <div class="level-card-cine ${solved ? 'solved' : ''}" onclick="openProblem(${p.id})">
        <div class="lc-header">
          <div class="lc-level">
            <i class="fa-solid ${meta.icon}" style="color:${meta.color}"></i>
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

document.querySelectorAll('#pythonFilters .chip-cine').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#pythonFilters .chip-cine').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentPythonFilter = chip.dataset.diff;
    renderLevelsGrid();
  });
});

$('pythonSearch')?.addEventListener('input', debounce((e) => {
  currentPythonSearch = e.target.value.trim();
  renderLevelsGrid();
}, 250));

/* ─────────────── SECTION 10: PROBLEM VIEW ─────────────── */
window.openProblem = function(id) {
  const prob = (window.PROBLEMS_DB || []).find(p => p.id === id);
  if (!prob) return;

  currentProblem = prob;
  switchToTab('problemView');

  const meta = window.getLevelMeta ? window.getLevelMeta(prob.level) : { name:'', icon:'fa-code', color:'#D4AF37' };
  if ($('problemViewMeta')) {
    $('problemViewMeta').innerHTML = `
      <span><i class="fa-solid ${meta.icon}" style="color:${meta.color}"></i> ${meta.name}</span>
      <span>•</span>
      <span>LEVEL ${prob.level}</span>
    `;
  }

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

  if ($('pvDescription')) {
    $('pvDescription').innerHTML = escapeHtml(prob.description).replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  if ($('pvExamples')) {
    if (prob.examples && prob.examples.length) {
      $('pvExamples').innerHTML = prob.examples.map(ex => `
        <div class="example-block">
          <div class="example-row"><span class="label">Input:</span><span class="value">${escapeHtml(ex.input)}</span></div>
          <div class="example-row"><span class="label">Output:</span><span class="value output">${escapeHtml(ex.output)}</span></div>
          ${ex.explanation ? `<div class="example-explanation">💡 ${escapeHtml(ex.explanation)}</div>` : ''}
        </div>
      `).join('');
    } else {
      $('pvExamples').innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">No examples provided</p>';
    }
  }

  if ($('codeEditor')) {
    $('codeEditor').value = prob.starter || '# Write your Python code here\n';
    updateLineNumbers();
  }

  updateMarkSolvedBtn();
  if ($('solutionCard')) $('solutionCard').style.display = 'none';
  if ($('codeEditor') && $('codeEditor').parentElement) $('codeEditor').parentElement.style.display = 'flex';

  document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
  $('tabCode')?.classList.add('active');

  setTimeout(updateProblemNavigation, 50);
};

/* Code editor */
const codeEditor = $('codeEditor');
const editorLineNumbers = $('editorLineNumbers');

function updateLineNumbers() {
  if (!codeEditor || !editorLineNumbers) return;
  const lines = codeEditor.value.split('\n').length;
  let html = '';
  for (let i = 1; i <= lines; i++) html += `<span>${i}</span>`;
  editorLineNumbers.innerHTML = html;
}

codeEditor?.addEventListener('input', updateLineNumbers);
codeEditor?.addEventListener('scroll', () => {
  if (editorLineNumbers) editorLineNumbers.scrollTop = codeEditor.scrollTop;
});
codeEditor?.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
    updateLineNumbers();
  }
});

$('resetCodeBtn')?.addEventListener('click', () => {
  if (!currentProblem) return;
  if (!confirm('Reset code to starter template?')) return;
  codeEditor.value = currentProblem.starter || '# Write your Python code here\n';
  updateLineNumbers();
  toast('info', 'Code reset');
});

$('copyCodeBtn')?.addEventListener('click', () => {
  if (!codeEditor) return;
  navigator.clipboard.writeText(codeEditor.value).then(() => {
    toast('success', 'Copied!', 'Code copied to clipboard');
  }).catch(() => toast('warn', 'Copy failed'));
});

/* Show Solution */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#showSolutionBtn');
  if (!btn) return;
  e.preventDefault();
  if (!currentProblem) { toast('warn', 'No problem loaded'); return; }

  const solutionCard = $('solutionCard');
  const codeBody = document.querySelector('.editor-body');
  const editorFooter = document.querySelector('.editor-footer');

  if ($('solutionCode')) $('solutionCode').textContent = currentProblem.solution || '# Solution not available';
  if ($('solutionExplanation')) {
    const exp = currentProblem.explanation || 'No explanation available for this problem.';
    $('solutionExplanation').innerHTML = `
      <div style="margin-bottom:.6rem; font-weight:700; color:var(--gold-primary);">
        <i class="fa-solid fa-lightbulb"></i> Explanation
      </div>
      <div>${escapeHtml(exp).replace(/\n/g, '<br>')}</div>
    `;
  }

  if (codeBody) codeBody.style.display = 'none';
  if (editorFooter) editorFooter.style.display = 'none';
  if (solutionCard) solutionCard.style.display = 'block';

  document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
  $('tabSolution')?.classList.add('active');

  setTimeout(() => solutionCard?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  toast('success', 'Solution revealed!', 'Study it, then try on your own 💪');
  setTimeout(syncSolutionNav, 100);
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#copySolutionBtn');
  if (!btn) return;
  if (!currentProblem) return;
  const text = currentProblem.solution || '';
  if (!text) { toast('warn', 'Nothing to copy'); return; }
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--accent-green)"></i>';
    toast('success', 'Solution copied!');
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  });
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#backToCodeBtn');
  if (!btn) return;
  const solutionCard = $('solutionCard');
  const codeBody = document.querySelector('.editor-body');
  const editorFooter = document.querySelector('.editor-footer');
  if (solutionCard) solutionCard.style.display = 'none';
  if (codeBody) codeBody.style.display = 'flex';
  if (editorFooter) editorFooter.style.display = 'flex';
  document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
  $('tabCode')?.classList.add('active');
  setTimeout(updateProblemNavigation, 100);
});

/* Mark Solved */
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

/* Problem navigation */
function updateProblemNavigation() {
  if (!currentProblem) return;
  const allProblems = window.PROBLEMS_DB || [];
  const currentIndex = allProblems.findIndex(p => p.id === currentProblem.id);

  const prevBtn = $('prevProblemBtn');
  const nextBtn = $('nextProblemBtn');
  const prevTitle = $('prevProblemTitle');
  const nextTitle = $('nextProblemTitle');

  if (currentIndex > 0) {
    const prev = allProblems[currentIndex - 1];
    if (prevTitle) prevTitle.textContent = prev.title;
    if (prevBtn) { prevBtn.disabled = false; prevBtn.onclick = () => openProblem(prev.id); }
  } else {
    if (prevTitle) prevTitle.textContent = 'No previous';
    if (prevBtn) prevBtn.disabled = true;
  }

  if (currentIndex < allProblems.length - 1) {
    const next = allProblems[currentIndex + 1];
    if (nextTitle) nextTitle.textContent = next.title;
    if (nextBtn) { nextBtn.disabled = false; nextBtn.onclick = () => openProblem(next.id); }
  } else {
    if (nextTitle) nextTitle.textContent = 'Completed! 🎉';
    if (nextBtn) nextBtn.disabled = true;
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#allLevelsBtn')) { e.preventDefault(); switchToTab('python'); }
});

document.addEventListener('keydown', (e) => {
  if (activeTab !== 'problemView') return;
  if (document.activeElement?.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const btn = $('prevProblemBtn');
    if (btn && !btn.disabled) btn.click();
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const btn = $('nextProblemBtn');
    if (btn && !btn.disabled) btn.click();
  }
});

function syncSolutionNav() {
  if (!currentProblem) return;
  const allProblems = window.PROBLEMS_DB || [];
  const idx = allProblems.findIndex(p => p.id === currentProblem.id);

  const sPrev = $('solutionPrevBtn');
  const sNext = $('solutionNextBtn');

  if (sPrev) {
    if (idx > 0) { sPrev.disabled = false; sPrev.onclick = () => openProblem(allProblems[idx - 1].id); }
    else sPrev.disabled = true;
  }
  if (sNext) {
    if (idx < allProblems.length - 1) { sNext.disabled = false; sNext.onclick = () => openProblem(allProblems[idx + 1].id); }
    else sNext.disabled = true;
  }
}

/* ─────────────── SECTION 11: CONFETTI ─────────────── */
function launchConfetti() {
  const canvas = $('confettiCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#D4AF37', '#F4D03F', '#B8860B', '#7c3aed', '#ec4899', '#10b981'];
  const particles = Array.from({ length: 100 }, () => ({
    x: canvas.width / 2, y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 1.5) * 16,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 360, vr: (Math.random() - 0.5) * 25, life: 0
  }));

  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
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

/* ══════════════════════════════════════════════════════════════
   SECTION 12: CHAT WITH CHAIRMAN — Real 1-on-1 Chat
   ══════════════════════════════════════════════════════════════ */

const ChairmanChat = (function() {
  const STORAGE_KEY = 'tcs_chairman_chats_v2';
  const EMOJI_SET = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','🤗','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','🤡','👋','🤚','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✨','⭐','🌟','🔥','💥','💫','⚡','🎉','🎊','🎁','🏆','🥇','🎯','🚀','🌈','☀️','🌙','☁️','❄️','🐍','💻','📚','🎓','🧠'];

  const state = {
    chats: [],           // [{ id, title, createdAt, updatedAt, messages: [] }]
    currentChatId: null,
    isTyping: false,
    attachedImage: null,
    pendingImageUrl: ''
  };

  const el = {};

  /* ═══ STORAGE ═══ */
  function loadChats() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(data)) return data;
    } catch (e) {}
    return [];
  }

  function saveChats() {
    try {
      // Keep only last 30 chats, 100 messages each
      const trimmed = state.chats.slice(-30).map(c => ({
        ...c,
        messages: c.messages.slice(-100)
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) { console.warn('Save chats failed:', e); }
  }

  function newChat() {
    const id = 'chat_' + Date.now();
    const chat = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    state.chats.push(chat);
    state.currentChatId = id;
    saveChats();
    return chat;
  }

  function currentChat() {
    return state.chats.find(c => c.id === state.currentChatId);
  }

  /* ═══ CACHE DOM ═══ */
  function cacheDom() {
    el.shell = document.querySelector('.chairman-chat-shell');
    el.body = document.getElementById('ccBody');
    el.form = document.getElementById('ccComposer');
    el.input = document.getElementById('ccInput');
    el.sendBtn = document.getElementById('ccSendBtn');
    el.typingBar = document.getElementById('ccTypingBar');
    el.statusText = document.getElementById('ccStatusText');
    el.status = document.getElementById('ccStatus');
    el.suggestions = document.getElementById('ccSuggestions');
    el.newChatBtn = document.getElementById('ccNewChatBtn');
    el.historyBtn = document.getElementById('ccHistoryBtn');
    el.historyPanel = document.getElementById('ccHistoryPanel');
    el.historyClose = document.getElementById('ccHistoryClose');
    el.historyList = document.getElementById('ccHistoryList');
    el.emojiBtn = document.getElementById('ccEmojiBtn');
    el.emojiPanel = document.getElementById('ccEmojiPanel');
    el.attachBtn = document.getElementById('ccAttachBtn');
    el.attachInput = document.getElementById('ccAttachInput');
  }

  /* ═══ RENDER ═══ */
  function renderAll() {
    renderMessages();
    renderSuggestions();
    renderHistory();
  }

  function renderMessages() {
    if (!el.body) return;
    const chat = currentChat();
    if (!chat) return;

    el.body.innerHTML = '';

    if (!chat.messages.length) {
      // Welcome message
      const welcome = {
        role: 'chairman',
        text: `Namaste! 👑\n\nमैं हूँ **The Chairman** — तुम्हारा personal coding mentor.\n\nPython, DSA, Web Dev, या कुछ और — कोई भी सवाल पूछो, main directly जवाब दूँगा. 🚀\n\nReady? नीचे अपना सवाल type करो या quick suggestions use करो.`,
        ts: Date.now()
      };
      appendMessageNode(welcome);
      return;
    }

    let prevRole = null;
    let prevTs = 0;
    chat.messages.forEach(m => {
      // Date separator if day changed
      if (dayKey(prevTs) !== dayKey(m.ts)) {
        const sep = document.createElement('div');
        sep.className = 'cc-date-sep';
        sep.innerHTML = '<span>' + formatDayLabel(m.ts) + '</span>';
        el.body.appendChild(sep);
      }
      const grouped = (prevRole === m.role) && (m.ts - prevTs < 60000);
      appendMessageNode(m, grouped);
      prevRole = m.role;
      prevTs = m.ts;
    });

    requestAnimationFrame(scrollToBottom);
  }

  function appendMessageNode(m, grouped) {
    if (!el.body) return;
    const row = document.createElement('div');
    const isMine = m.role === 'user';
    row.className = 'cc-msg ' + (isMine ? 'cc-mine' : 'cc-chairman');

    // Avatar
    const av = document.createElement('div');
    av.className = 'cc-msg-avatar ' + (isMine ? 'cc-user' : 'cc-chairman') + (grouped ? ' hidden' : '');
    if (!grouped) {
      av.innerHTML = isMine
        ? (userProfile?.photoURL ? `<img src="${userProfile.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '<i class="fa-solid fa-user"></i>')
        : '<i class="fa-solid fa-crown"></i>';
    }

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = 'cc-msg-bubble';
    const textEl = document.createElement('div');
    textEl.className = 'cc-msg-text';
    textEl.innerHTML = formatChairmanText(m.text || '');
    bubble.appendChild(textEl);

    // Meta
    const meta = document.createElement('div');
    meta.className = 'cc-msg-meta';
    meta.innerHTML = `<span>${formatClock(m.ts)}</span>` + (isMine ? '<i class="fa-solid fa-check-double"></i>' : '');
    bubble.appendChild(meta);

    row.appendChild(av);
    row.appendChild(bubble);
    el.body.appendChild(row);
  }

  function formatChairmanText(text) {
    let out = escapeHtml(text);
    // Code blocks
    out = out.replace(/```([\s\S]*?)```/g, (_, code) => `<pre>${code.trim()}</pre>`);
    // Inline code
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // Bold
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    out = out.replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<em>$2</em>');
    // Links
    out = out.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    // Line breaks
    out = out.replace(/\n/g, '<br>');
    return out;
  }

  function renderSuggestions() {
    if (!el.suggestions) return;
    const chat = currentChat();
    const hasMessages = chat && chat.messages.length > 0;
    el.suggestions.style.display = hasMessages ? 'none' : 'flex';
  }

  function renderHistory() {
    if (!el.historyList) return;
    if (!state.chats.length) {
      el.historyList.innerHTML = `
        <div class="cc-history-empty">
          <i class="fa-regular fa-comments"></i>
          <p>No previous chats</p>
        </div>`;
      return;
    }

    const sorted = [...state.chats].sort((a, b) => b.updatedAt - a.updatedAt);
    el.historyList.innerHTML = sorted.map(c => {
      const last = c.messages[c.messages.length - 1];
      const preview = last ? (last.text || '').slice(0, 50) : 'No messages yet';
      const when = last ? formatRelativeTime(last.ts) : formatRelativeTime(c.createdAt);
      const active = c.id === state.currentChatId ? ' style="background:var(--gold-soft);border-color:var(--border-gold);"' : '';
      return `
        <div class="cc-history-item"${active} onclick="ChairmanChat.openChat('${c.id}')">
          <div class="cc-history-item-title">${escapeHtml(c.title || 'Chat')}</div>
          <div class="cc-history-item-preview">${escapeHtml(preview)}</div>
          <div class="cc-history-item-time">${when}</div>
        </div>`;
    }).join('');
  }

  function formatRelativeTime(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const d = Math.floor(hr / 24);
    if (d < 7) return d + 'd ago';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function scrollToBottom() {
    if (el.body) el.body.scrollTop = el.body.scrollHeight;
  }

  /* ═══ SEND MESSAGE ═══ */
  async function sendMessage() {
    const chat = currentChat();
    if (!chat) return;

    const text = el.input.value.trim();
    const hasImage = !!state.pendingImageUrl;
    if (!text && !hasImage) return;
    if (state.isTyping) return;

    // User message
    const userMsg = {
      role: 'user',
      text: text || '',
      image: hasImage ? state.pendingImageUrl : null,
      ts: Date.now()
    };
    chat.messages.push(userMsg);
    chat.updatedAt = Date.now();

    // Set title from first message
    if (chat.messages.filter(m => m.role === 'user').length === 1) {
      chat.title = (text || 'Image').slice(0, 40);
    }

    saveChats();
    renderMessages();
    renderSuggestions();
    renderHistory();

    // Reset input
    el.input.value = '';
    el.input.style.height = 'auto';
    state.pendingImageUrl = '';
    const preview = document.getElementById('ccAttachPreview');
    if (preview) preview.remove();
    updateSendState();

    // Trigger AI reply
    requestChairmanReply(chat, text);
  }

  async function requestChairmanReply(chat, userText) {
    state.isTyping = true;
    setTypingIndicator(true);
    setStatus('typing', 'Chairman is typing…');
    disableSuggestions(true);

    // Small delay to feel natural
    await sleep(700 + Math.random() * 500);

    try {
      // Build conversation context (last 6 messages)
      const history = chat.messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || '[image]'
      }));

      const res = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userText,
          subject: 'General',
          history: history.slice(0, -1) // exclude current message
        })
      });

      if (!res.ok) throw new Error('AI service returned ' + res.status);
      const data = await res.json();
      if (!data.ok || !data.answer) throw new Error(data.error || 'No answer');

      // Add empty chairman message and typewriter effect
      await streamChairmanMessage(chat, data.answer);

    } catch (err) {
      console.error('Chairman AI error:', err);
      const errorMsg = {
        role: 'chairman',
        text: `⚠️ Sorry, मुझे अभी connection में problem हो रही है.\n\nError: ${err.message}\n\nथोड़ी देर बाद try करो!`,
        ts: Date.now()
      };
      chat.messages.push(errorMsg);
      saveChats();
      renderMessages();
    } finally {
      state.isTyping = false;
      setTypingIndicator(false);
      setStatus('online', 'Online — replies instantly');
      disableSuggestions(false);
    }
  }

  async function streamChairmanMessage(chat, fullText) {
    const chairmanMsg = {
      role: 'chairman',
      text: '',
      ts: Date.now()
    };
    chat.messages.push(chairmanMsg);

    // Create message node for streaming
    const row = document.createElement('div');
    const isMine = false;
    row.className = 'cc-msg cc-chairman';

    const av = document.createElement('div');
    av.className = 'cc-msg-avatar cc-chairman';
    av.innerHTML = '<i class="fa-solid fa-crown"></i>';

    const bubble = document.createElement('div');
    bubble.className = 'cc-msg-bubble';
    const textEl = document.createElement('div');
    textEl.className = 'cc-msg-text';
    bubble.appendChild(textEl);

    const meta = document.createElement('div');
    meta.className = 'cc-msg-meta';
    meta.innerHTML = '<span>' + formatClock(Date.now()) + '</span>';
    bubble.appendChild(meta);

    row.appendChild(av);
    row.appendChild(bubble);

    // Remove any empty welcome if present
    const existingEmpty = el.body.querySelector('.cc-msg');
    if (existingEmpty && !chat.messages.slice(0, -1).length) {
      el.body.innerHTML = '';
    }

    el.body.appendChild(row);
    scrollToBottom();

    // Typewriter
    const cursor = document.createElement('span');
    cursor.className = 'cc-typing-cursor';
    textEl.appendChild(cursor);

    let displayed = '';
    const speed = fullText.length > 400 ? 6 : 12; // faster for long answers

    for (let i = 0; i < fullText.length; i++) {
      displayed += fullText.charAt(i);
      chairmanMsg.text = displayed;
      textEl.innerHTML = formatChairmanText(displayed);
      textEl.appendChild(cursor);

      if (i % 8 === 0) scrollToBottom();

      await sleep(speed);
    }

    // Finished
    cursor.remove();
    chairmanMsg.text = fullText;
    textEl.innerHTML = formatChairmanText(fullText);
    chat.updatedAt = Date.now();
    saveChats();
    renderHistory();
    scrollToBottom();
  }

  /* ═══ UI HELPERS ═══ */
  function setTypingIndicator(show) {
    if (!el.typingBar) return;
    el.typingBar.classList.toggle('show', show);
    if (show) scrollToBottom();
  }

  function setStatus(type, text) {
    if (el.statusText) el.statusText.textContent = text;
    if (el.status) el.status.classList.toggle('typing', type === 'typing');
  }

  function disableSuggestions(disable) {
    if (!el.suggestions) return;
    el.suggestions.querySelectorAll('button').forEach(b => b.disabled = disable);
  }

  function updateSendState() {
    if (!el.sendBtn || !el.input) return;
    const hasText = el.input.value.trim().length > 0;
    const hasImg = !!state.pendingImageUrl;
    el.sendBtn.disabled = !(hasText || hasImg) || state.isTyping;
  }

  function autoResize() {
    if (!el.input) return;
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, 120) + 'px';
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ═══ ATTACH IMAGE ═══ */
  async function handleAttach(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('warn', 'Image too large', 'Max 10MB');
      return;
    }
    try {
      toast('info', 'Uploading image…');
      const url = await uploadToImgBB(file);
      state.pendingImageUrl = url;

      // Show preview
      let preview = document.getElementById('ccAttachPreview');
      if (!preview) {
        preview = document.createElement('div');
        preview.id = 'ccAttachPreview';
        preview.className = 'cc-attach-preview show';
        preview.innerHTML = `
          <img src="${url}" alt="">
          <button type="button" class="cc-attach-remove" onclick="ChairmanChat.clearAttach()">
            <i class="fa-solid fa-xmark"></i>
          </button>`;
        el.shell.querySelector('.cc-composer-wrap').prepend(preview);
      } else {
        preview.querySelector('img').src = url;
        preview.classList.add('show');
      }
      updateSendState();
      toast('success', 'Image ready');
    } catch (err) {
      toast('warn', 'Upload failed', err.message);
    } finally {
      el.attachInput.value = '';
    }
  }

  function clearAttach() {
    state.pendingImageUrl = '';
    const preview = document.getElementById('ccAttachPreview');
    if (preview) preview.remove();
    updateSendState();
  }

  /* ═══ CHAT MANAGEMENT ═══ */
  function openChat(id) {
    if (!state.chats.some(c => c.id === id)) return;
    state.currentChatId = id;
    renderAll();
    closeHistory();
  }

  function startNewChat() {
    if (state.isTyping) {
      toast('warn', 'Please wait', 'Chairman is typing…');
      return;
    }
    newChat();
    renderAll();
    closeHistory();
    toast('info', 'New chat started', 'Ask anything!');
  }

  function openHistory() {
    el.historyPanel?.classList.add('open');
    renderHistory();
  }

  function closeHistory() {
    el.historyPanel?.classList.remove('open');
  }

  /* ═══ EVENTS ═══ */
  function bindEvents() {
    // Send
    el.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    // Input
    el.input?.addEventListener('input', () => {
      autoResize();
      updateSendState();
    });
    el.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Emoji
    el.emojiBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      el.emojiPanel.classList.toggle('show');
      el.emojiBtn.classList.toggle('active', el.emojiPanel.classList.contains('show'));
    });
    document.addEventListener('click', (e) => {
      if (el.emojiPanel?.classList.contains('show') &&
          !el.emojiPanel.contains(e.target) &&
          e.target !== el.emojiBtn && !el.emojiBtn?.contains(e.target)) {
        el.emojiPanel.classList.remove('show');
        el.emojiBtn?.classList.remove('active');
      }
    });

    // Attach
    el.attachBtn?.addEventListener('click', () => el.attachInput?.click());
    el.attachInput?.addEventListener('change', (e) => handleAttach(e.target.files?.[0]));

    // Quick suggestions
    el.suggestions?.addEventListener('click', (e) => {
      const btn = e.target.closest('.cc-suggestion');
      if (!btn) return;
      el.input.value = btn.dataset.q || '';
      autoResize();
      updateSendState();
      sendMessage();
    });

    // History
    el.historyBtn?.addEventListener('click', openHistory);
    el.historyClose?.addEventListener('click', closeHistory);

    // New chat
    el.newChatBtn?.addEventListener('click', startNewChat);
  }

  /* ═══ BUILD EMOJI PANEL ═══ */
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

  /* ═══ INIT ═══ */
function init() {
  cacheDom();
  state.chats = loadChats();

  // If no chat, create one
  if (!state.chats.length) {
    newChat();
  } else {
    // Open most recent
    const mostRecent = [...state.chats].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    state.currentChatId = mostRecent.id;
  }

  bindEvents();
  buildEmojiPanel();
  renderAll();
  updateSendState();
  
  // ═══ FORCE ENABLE CHECK ═══
  setTimeout(() => {
    if (el.input && el.sendBtn) {
      el.sendBtn.disabled = el.input.value.trim().length === 0;
    }
  }, 100);
}

  return { init, openChat, clearAttach, startNewChat };
})();

/* Hook into tab switching */
const _prevSwitchToTabForChairman = window.switchToTab;
window.switchToTab = function(tabId) {
  _prevSwitchToTabForChairman(tabId);
  if (tabId === 'chatWithChairman') {
    setTimeout(() => {
      if (!ChairmanChat.__inited) {
        ChairmanChat.init();
        ChairmanChat.__inited = true;
      }
      const input = document.getElementById('ccInput');
      if (input && window.innerWidth > 640) input.focus();
    }, 60);
  }
};

/* Also init on app load */
const _prevInitAppForChairman = typeof initApp === 'function' ? initApp : null;
/* ─────────────── SECTION 13: POSTS BY CHAIRMAN ─────────────── */
async function loadChairmanPosts() {
  const feed = $('postsFeed');
  if (!feed) return;

  feed.innerHTML = `
    <div class="loading-cine">
      <div class="loading-spinner-cine"></div>
      <p>Loading posts...</p>
    </div>`;

  try {
    const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(50).get();
    const posts = [];
    snap.forEach(d => posts.push({ id: d.id, ...d.data() }));

    if (!posts.length) {
      feed.innerHTML = `
        <div class="empty-state-cine">
          <i class="fa-solid fa-bullhorn"></i>
          <h4>No posts yet</h4>
          <p>${isAdmin() ? 'Create your first post above' : 'Check back soon for updates from the Chairman'}</p>
        </div>`;
      return;
    }

    feed.innerHTML = posts.map(p => {
      const when = p.createdAt?.toDate?.() ? formatTime(p.createdAt.toDate().getTime()) : 'Just now';
      const adminActions = isAdmin() ? `
        <div class="post-admin-actions">
          <button onclick="deletePost('${p.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      ` : '';
      return `
        <div class="post-card-cine">
          <div class="post-header-cine">
            <div class="post-avatar-cine"><i class="fa-solid fa-crown"></i></div>
            <div class="post-author-info">
              <div class="post-author-name">The Chairman <i class="fa-solid fa-circle-check"></i></div>
              <div class="post-time">${when}</div>
            </div>
          </div>
          <div class="post-content-cine">${escapeHtml(p.content || '')}</div>
          ${p.link ? `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" class="post-link-cine"><i class="fa-solid fa-link"></i> ${escapeHtml(p.link)}</a>` : ''}
          <div class="post-footer-cine">
            <span><i class="fa-regular fa-heart"></i> ${p.likes || 0}</span>
            ${adminActions}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    feed.innerHTML = `
      <div class="empty-state-cine">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h4>Error loading posts</h4>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
  }
}

$('publishPostBtn')?.addEventListener('click', async () => {
  if (!isAdmin()) { toast('warn', 'Only admin can post'); return; }
  const content = $('postContent').value.trim();
  const link = $('postLink').value.trim();

  if (!content) { toast('warn', 'Write something first'); return; }

  const btn = $('publishPostBtn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';

  try {
    await db.collection('posts').add({
      content, link,
      authorName: 'The Chairman',
      authorEmail: userProfile.email,
      authorUid: currentUser.uid,
      likes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    $('postContent').value = '';
    $('postLink').value = '';
    toast('success', 'Post published!', 'Students can see it now');
    loadChairmanPosts();
  } catch (err) {
    console.error(err);
    toast('warn', 'Failed to publish', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
});

window.deletePost = async function(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete this post?')) return;
  try {
    await db.collection('posts').doc(id).delete();
    toast('success', 'Post deleted');
    loadChairmanPosts();
  } catch (err) {
    toast('warn', 'Delete failed', err.message);
  }
};

/* ─────────────── SECTION 14: LEADERBOARD ─────────────── */
async function loadLeaderboard() {
  const podium = $('lbPodium');
  const list = $('lbList');
  if (!podium || !list) return;

  // Mock data — replace with Firestore query later
  const mockUsers = [
    { name: 'Rohan Verma', xp: 4820, solved: 89, streak: 42 },
    { name: 'Sneha Reddy', xp: 4230, solved: 82, streak: 35 },
    { name: 'Arjun Mehta', xp: 3910, solved: 78, streak: 28 },
    { name: 'Priya Sharma', xp: 3450, solved: 72, streak: 22 },
    { name: 'Karan Singh', xp: 3120, solved: 68, streak: 19 },
    { name: 'Anjali Verma', xp: 2890, solved: 65, streak: 15 }
  ];

  const top3 = mockUsers.slice(0, 3);
  const podiumClasses = ['gold', 'silver', 'bronze'];

  podium.innerHTML = top3.map((u, i) => {
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=D4AF37&color=000&bold=true&size=128`;
    return `
      <div class="lb-podium-card ${podiumClasses[i]}">
        <div class="lb-podium-rank">#${i + 1}</div>
        <img class="lb-podium-avatar" src="${avatar}" alt="">
        <div class="lb-podium-name">${escapeHtml(u.name)}</div>
        <div class="lb-podium-xp">${u.xp} XP</div>
      </div>`;
  }).join('');

  list.innerHTML = mockUsers.map((u, i) => {
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=D4AF37&color=000&bold=true&size=128`;
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
      </div>`;
  }).join('');
}

/* ─────────────── SECTION 15: DONATE ─────────────── */
$('copyUpiBtn')?.addEventListener('click', () => {
  navigator.clipboard.writeText(CONFIG.UPI_ID).then(() => {
    toast('success', 'UPI ID copied!', CONFIG.UPI_ID);
  }).catch(() => toast('warn', 'Copy failed'));
});

/* ─────────────── SECTION 16: HOME PREVIEW ─────────────── */
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
      </div>`;
  }).join('');

  if ($('statLevels')) $('statLevels').textContent = allProblems.length;
  if ($('statSolvedGlobal')) $('statSolvedGlobal').textContent = Progress.totalSolved();
}

/* ─────────────── SECTION 17: SCROLL + BACK TO TOP ─────────────── */
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)) * 100;
  if ($('scrollProgress')) $('scrollProgress').style.width = scrolled + '%';
  if ($('backToTop')) $('backToTop').classList.toggle('show', h.scrollTop > 400);
});

$('backToTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay-cine.show').forEach(m => m.classList.remove('show'));
    document.body.style.overflow = '';
  }
});

/* ─────────────── SECTION 18: INIT ─────────────── */
function initApp() {
  renderHomePreview();
  updatePythonProgress();
  updateUserUI();
  if ($('upiIdDisplay')) $('upiIdDisplay').textContent = CONFIG.UPI_ID;
  if ($('postCreator')) $('postCreator').style.display = isAdmin() ? 'block' : 'none';
  try { Chat.init(); } catch (err) { console.error('Chat init:', err); }
  try { YouTube.init(); } catch (err) { console.error('YT init:', err); }
  
  // ═══ INIT CHAIRMAN CHAT ═══
  try { 
    if (typeof ChairmanChat !== 'undefined') {
      ChairmanChat.init();
      ChairmanChat.__inited = true;
    }
  } catch (err) { console.error('ChairmanChat init:', err); }
}

/* ─────────────── SECTION 19: YOUTUBE ─────────────── */
const YouTube = (function() {
  const API_KEY = CONFIG.YT_API_KEY;
  const CHANNEL_ID = CONFIG.YT_CHANNEL_ID;
  const API_BASE = 'https://www.googleapis.com/youtube/v3';
  const CACHE_KEY = 'tcs_yt_cache_v2';
  const CACHE_TTL = 30 * 60 * 1000;

  let allVideos = [];
  let currentFilter = 'all';
  let searchTerm = '';
  let nextPageToken = '';
  let isLoading = false;
  let uploadsPlaylistId = '';

  function getCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && c.ts && (Date.now() - c.ts) < CACHE_TTL && c.videos) return c;
    } catch (e) {}
    return null;
  }

  function setCache(videos, nextToken, playlistId) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(), videos: videos.slice(0, 200),
        nextToken: nextToken || '', playlistId: playlistId || ''
      }));
    } catch (e) {}
  }

  function formatViews(n) {
    n = parseInt(n || 0, 10);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M views';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K views';
    return n + ' views';
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return Math.floor(days / 365) + 'y ago';
  }

  function formatDuration(iso) {
    if (!iso) return '';
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return '';
    const h = parseInt(m[1] || 0, 10);
    const min = parseInt(m[2] || 0, 10);
    const s = parseInt(m[3] || 0, 10);
    if (h > 0) return h + ':' + String(min).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return min + ':' + String(s).padStart(2, '0');
  }

  function durationToSeconds(iso) {
    if (!iso) return 0;
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return (parseInt(m[1] || 0, 10) * 3600) + (parseInt(m[2] || 0, 10) * 60) + (parseInt(m[3] || 0, 10));
  }

  async function getUploadsPlaylist() {
    const url = `${API_BASE}/channels?part=contentDetails,statistics&id=${CHANNEL_ID}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Channel fetch failed: ' + res.status);
    const data = await res.json();
    if (!data.items || !data.items.length) throw new Error('Channel not found');

    const channel = data.items[0];
    uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) throw new Error('Uploads playlist not found');

    const stats = channel.statistics;
    if (stats?.subscriberCount) {
      const count = parseInt(stats.subscriberCount, 10);
      const formatted = count >= 1000000
        ? (count / 1000000).toFixed(1) + 'M subscribers'
        : count >= 1000
          ? (count / 1000).toFixed(1) + 'K subscribers'
          : count + ' subscribers';
      const el = $('ytSubscriberCount');
      if (el) el.textContent = formatted + ' · ' + (stats.videoCount || 0) + ' videos';
    }
    return uploadsPlaylistId;
  }

  async function fetchVideos(pageToken) {
    if (!uploadsPlaylistId) await getUploadsPlaylist();
    const url = `${API_BASE}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${API_KEY}${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Videos fetch failed: ' + res.status);
    const data = await res.json();

    const videos = (data.items || []).map(item => {
      const s = item.snippet;
      const vid = item.contentDetails?.videoId || s.resourceId?.videoId;
      return {
        id: vid, title: s.title || 'Untitled',
        thumbnail: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || s.thumbnails?.medium?.url || '',
        publishedAt: s.publishedAt, duration: '', views: 0
      };
    }).filter(v => v.id);

    if (videos.length) {
      const ids = videos.map(v => v.id).join(',');
      const detailUrl = `${API_BASE}/videos?part=contentDetails,statistics&id=${ids}&key=${API_KEY}`;
      const detailRes = await fetch(detailUrl);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        const map = {};
        (detailData.items || []).forEach(item => {
          map[item.id] = { duration: item.contentDetails?.duration || '', views: parseInt(item.statistics?.viewCount || 0, 10) };
        });
        videos.forEach(v => {
          if (map[v.id]) { v.duration = map[v.id].duration; v.views = map[v.id].views; }
        });
      }
    }

    return { videos, nextPageToken: data.nextPageToken || '' };
  }

  function renderVideos() {
    const grid = $('ytVideosGrid');
    if (!grid) return;
    let videos = [...allVideos];

    if (currentFilter === 'latest') videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    else if (currentFilter === 'popular') videos.sort((a, b) => b.views - a.views);
    else if (currentFilter === 'long') videos = videos.filter(v => durationToSeconds(v.duration) > 1200);

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      videos = videos.filter(v => v.title.toLowerCase().includes(q));
    }

    if (!videos.length) {
      grid.innerHTML = `<div class="empty-state-cine" style="grid-column:1/-1"><i class="fa-brands fa-youtube"></i><h4>No videos found</h4><p>Try a different filter</p></div>`;
      return;
    }

    grid.innerHTML = videos.map((v, i) => {
      const duration = formatDuration(v.duration);
      const delay = Math.min(i * 0.03, 0.5);
      return `
        <div class="yt-video-card" style="animation-delay:${delay}s" onclick="YouTube.openVideo('${v.id}')">
          <div class="yt-thumb">
            <img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}" loading="lazy" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
            <div class="yt-thumb-overlay"><div class="yt-play-icon"><i class="fa-solid fa-play"></i></div></div>
            ${duration ? `<span class="yt-duration">${escapeHtml(duration)}</span>` : ''}
          </div>
          <div class="yt-card-body">
            <div class="yt-card-title">${escapeHtml(v.title)}</div>
            <div class="yt-card-meta">
              <span><i class="fa-regular fa-eye"></i> ${escapeHtml(formatViews(v.views))}</span>
              <span>·</span>
              <span>${escapeHtml(formatDate(v.publishedAt))}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function loadVideos(loadMore) {
    if (isLoading) return;
    isLoading = true;
    const grid = $('ytVideosGrid');
    const wrap = $('ytLoadMoreWrap');

    if (!loadMore && grid) {
      grid.innerHTML = `<div class="loading-cine"><div class="loading-spinner-cine"></div><p>Loading videos…</p></div>`;
    }

    try {
      if (!loadMore) {
        const cache = getCache();
        if (cache && cache.videos.length) {
          allVideos = cache.videos;
          nextPageToken = cache.nextToken || '';
          uploadsPlaylistId = cache.playlistId || '';
          renderVideos();
          if (nextPageToken && wrap) wrap.style.display = 'block';
          isLoading = false;
          return;
        }
      }

      const result = await fetchVideos(nextPageToken);
      allVideos = loadMore ? allVideos.concat(result.videos) : result.videos;
      nextPageToken = result.nextPageToken;
      setCache(allVideos, nextPageToken, uploadsPlaylistId);
      renderVideos();
      if (wrap) wrap.style.display = nextPageToken ? 'block' : 'none';
    } catch (err) {
      console.error('YT error:', err);
      if (grid) {
        grid.innerHTML = `<div class="empty-state-cine" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><h4>Could not load videos</h4><p style="font-family:var(--font-mono);font-size:.8rem;margin-top:.5rem;">${escapeHtml(err.message)}</p><button class="btn-hero-primary" style="margin-top:1rem" onclick="YouTube.reload()"><i class="fa-solid fa-rotate"></i> Retry</button></div>`;
      }
    } finally {
      isLoading = false;
    }
  }

  function bindFilters() {
    document.querySelectorAll('#ytFilters .chip-cine').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#ytFilters .chip-cine').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter || 'all';
        renderVideos();
      });
    });
    const search = $('ytSearch');
    if (search) search.addEventListener('input', debounce((e) => { searchTerm = e.target.value.trim(); renderVideos(); }, 300));
    const lm = $('ytLoadMoreBtn');
    if (lm) lm.addEventListener('click', () => loadVideos(true));
  }

  function init() {
    if (!$('ytVideosGrid')) return;
    if (API_KEY.includes('XXXXX')) {
      const grid = $('ytVideosGrid');
      if (grid) grid.innerHTML = `<div class="empty-state-cine" style="grid-column:1/-1"><i class="fa-brands fa-youtube"></i><h4>YouTube not configured</h4><p>Add API key in app.js</p></div>`;
      return;
    }
    bindFilters();
  }

  return {
    init,
    ensureLoaded: () => { if (!allVideos.length && !isLoading) loadVideos(false); },
    openVideo: (id) => window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'),
    reload: () => { try { localStorage.removeItem(CACHE_KEY); } catch(e){} allVideos = []; nextPageToken = ''; uploadsPlaylistId = ''; loadVideos(false); }
  };
})();

/* ─────────────── SECTION 20: COMMUNITY CHAT ─────────────── */
const Chat = (function() {
  const ROOMS = [
    { id: 'general', name: 'general', icon: 'fa-hashtag', desc: 'Anything & everything' },
    { id: 'dsa', name: 'dsa-help', icon: 'fa-code', desc: 'Algorithms & Data Structures' },
    { id: 'python', name: 'python', icon: 'fa-brands fa-python', desc: 'Python discussion' },
    { id: 'projects', name: 'projects', icon: 'fa-rocket', desc: 'Show off your work' },
    { id: 'off-topic', name: 'off-topic', icon: 'fa-mug-hot', desc: 'Fun & chill' }
  ];

  const QUICK_REACTIONS = ['👍','❤️','😂','🔥','👏','😮'];
  const EMOJI_SET = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','🤡','👋','🤚','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✨','⭐','🌟','🔥','💥','💫','⚡','🎉','🎊','🎁','🏆','🥇','🎯','🚀','🌈','☀️','🌙','☁️','❄️'];

  const GROUP_WINDOW_MS = 5 * 60 * 1000;
  const MAX_MESSAGES = 250;
  const TYPING_TIMEOUT = 2600;

  const state = {
    uid: null, name: '', color: '', room: 'general',
    messages: [], roomListeners: [], online: {}, typing: {},
    unread: 0, soundOn: false, replyTarget: null, editingKey: null,
    searchTerm: '', firstLoadDone: false, ready: false
  };
  const el = {};

  function loadIdentity() {
    let uid = localStorage.getItem('tcs_uid');
    if (!uid) { uid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('tcs_uid', uid); }
    state.uid = uid;
    state.name = localStorage.getItem('tcs_chat_name') || userProfile?.name || '';
    state.color = localStorage.getItem('tcs_chat_color') || '#D4AF37';
    const savedRoom = localStorage.getItem('tcs_chat_room');
    if (savedRoom && ROOMS.some(r => r.id === savedRoom)) state.room = savedRoom;
  }

  function saveIdentity() {
    localStorage.setItem('tcs_chat_name', state.name);
    localStorage.setItem('tcs_chat_color', state.color);
    localStorage.setItem('tcs_chat_room', state.room);
  }

  function cacheDom() {
    el.shell = document.querySelector('.chat-shell-cine');
    el.sidebar = $('chatSidebar');
    el.sideOpen = $('cmMenuBtn');
    el.sideClose = $('csCloseBtn');
    el.meAvatar = $('csMeAvatar');
    el.meName = $('csMeName');
    el.roomList = $('csRooms');
    el.userList = $('csUsers');
    el.onlineTotal = $('csOnlineCount');
    el.chatSearch = $('csSearchInput');
    el.roomTitle = $('cmRoomName');
    el.roomSub = $('cmRoomSub');
    el.soundBtn = $('cmSoundBtn');
    el.messages = $('cmBody');
    el.typingBar = $('cmTyping');
    el.replyPrev = $('cmReplyPreview');
    el.rpName = $('cmRpName');
    el.rpText = $('cmRpText');
    el.rpCancel = $('cmRpCancel');
    el.emojiPanel = $('cmEmojiPanel');
    el.emojiBtn = $('cmEmojiBtn');
    el.imageBtn = $('cmImageBtn');
    el.imageInput = $('cmImageInput');
    el.imgPreview = $('cmImgPreview');
    el.imgPreviewEl = $('cmImgPreviewEl');
    el.imgRemove = $('cmImgRemove');
    el.form = $('cmComposer');
    el.input = $('cmInput');
    el.sendBtn = $('cmSendBtn');
    el.jumpBtn = $('cmJumpBtn');
    el.jumpBadge = $('cmJumpBadge');
    el.joinOverlay = $('cmJoinOverlay');
    el.joinName = $('cmJoinName');
    el.joinColors = $('cmJoinColors');
    el.joinBtn = $('cmJoinBtn');
    el.joinError = $('cmJoinError');
    el.navBadge = $('navChatBadge');
  }

  function renderRooms() {
    if (!el.roomList) return;
    el.roomList.innerHTML = '';
    ROOMS.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'cs-room' + (r.id === state.room ? ' active' : '');
      btn.type = 'button';
      btn.innerHTML = `
        <div class="cs-room-ico"><i class="${r.icon.startsWith('fa-brands') ? r.icon : 'fa-solid ' + r.icon}"></i></div>
        <div class="cs-room-meta"><div class="cs-room-name">#${escapeHtml(r.name)}</div></div>
        <span class="cs-room-count" data-room="${r.id}">0</span>
      `;
      btn.addEventListener('click', () => switchRoom(r.id));
      el.roomList.appendChild(btn);
    });
  }

  function renderProfile() {
    if (el.meName) el.meName.textContent = state.name || 'Guest';
    if (el.meAvatar) {
      el.meAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.name || 'Guest')}&background=${(state.color || '#D4AF37').replace('#','')}&color=000&bold=true`;
    }
  }

  function renderOnlineUsers() {
    if (!el.userList) return;
    const list = Object.entries(state.online).map(([uid, u]) => ({ uid, ...u }))
      .sort((a, b) => a.uid === state.uid ? -1 : b.uid === state.uid ? 1 : String(a.name||'').localeCompare(String(b.name||'')));
    if (el.onlineTotal) el.onlineTotal.textContent = list.length;

    if (!list.length) el.userList.innerHTML = '<div class="cs-loading">No one online</div>';
    else {
      el.userList.innerHTML = list.map(u => {
        const initial = (u.name || '?').charAt(0).toUpperCase();
        return `
          <div class="cs-user">
            <div class="cs-user-av" style="background:${u.color || '#D4AF37'}">${escapeHtml(initial)}</div>
            <span class="cs-user-name">${escapeHtml(u.name || 'Anonymous')}</span>
            ${u.uid === state.uid ? '<span class="cs-user-you">you</span>' : ''}
          </div>`;
      }).join('');
    }
    if (el.roomSub) el.roomSub.textContent = list.length + (list.length === 1 ? ' member online' : ' members online');
  }

  function scrollNearBottom(t) { t = t === undefined ? 140 : t; return (el.messages.scrollHeight - el.messages.scrollTop - el.messages.clientHeight) < t; }
  function scrollToBottom(smooth) {
    if (smooth === undefined) smooth = true;
    try { el.messages.scrollTo({ top: el.messages.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }
    catch (e) { el.messages.scrollTop = el.messages.scrollHeight; }
    state.unread = 0; updateJumpBtn();
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

  function buildMessageNode(m, grouped) {
    const mine = m.uid === state.uid;
    const row = document.createElement('div');
    row.className = 'cm-msg' + (mine ? ' mine' : '') + (grouped ? ' grouped' : '');
    row.dataset.key = m.key;

    const av = document.createElement('div');
    av.className = 'cm-msg-avatar' + (grouped ? ' hidden' : '');
    if (!grouped) {
      av.textContent = (m.name || '?').charAt(0).toUpperCase();
      av.style.background = m.color || '#D4AF37';
      av.style.color = '#fff';
    }

    const col = document.createElement('div');
    col.className = 'cm-msg-col';

    if (!grouped && !mine) {
      const author = document.createElement('div');
      author.className = 'cm-msg-author';
      author.style.color = 'hsl(' + (Math.abs(hashStr(m.name)) % 360) + ', 80%, 65%)';
      author.textContent = m.name || 'Anonymous';
      col.appendChild(author);
    }

    const bubble = document.createElement('div');
    bubble.className = 'cm-bubble';
    bubble.dataset.key = m.key;

    if (m.reply && m.reply.text) {
      const q = document.createElement('div');
      q.className = 'cm-quote';
      q.innerHTML = `<div class="cm-quote-body"><div class="cm-quote-name">${escapeHtml(m.reply.name||'User')}</div><div class="cm-quote-text">${escapeHtml(m.reply.text)}</div></div>`;
      q.addEventListener('click', () => {
        const target = el.messages.querySelector('.cm-msg[data-key="' + m.reply.key + '"]');
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.style.background = 'rgba(212,175,55,.14)'; setTimeout(() => target.style.background = '', 900); }
      });
      bubble.appendChild(q);
    }

    if (m.imageUrl) {
      const img = document.createElement('img');
      img.className = 'cm-chat-img';
      img.src = m.imageUrl;
      img.loading = 'lazy';
      img.addEventListener('click', () => openImageViewer(m.imageUrl));
      bubble.appendChild(img);
    }

    if (m.text) {
      const textEl = document.createElement('div');
      textEl.className = 'cm-text';
      let html = formatMsgText(m.text);
      if (state.searchTerm) {
        const safe = state.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp('(' + safe + ')', 'gi'), '<mark style="background:rgba(212,175,55,.4);color:inherit;border-radius:3px;padding:0 2px;">$1</mark>');
      }
      textEl.innerHTML = html;
      bubble.appendChild(textEl);
    }

    const meta = document.createElement('div');
    meta.className = 'cm-bubble-meta';
    let mh = '';
    if (m.edited) mh += '<span class="cm-edited-tag">edited</span>';
    mh += '<span>' + formatClock(m.ts) + '</span>';
    if (mine) mh += '<i class="fa-solid fa-check"></i>';
    meta.innerHTML = mh;
    bubble.appendChild(meta);
    col.appendChild(bubble);

    if (m.reactions && typeof m.reactions === 'object') {
      const entries = Object.entries(m.reactions).map(([emoji, users]) => ({ emoji, users: users && typeof users === 'object' ? Object.keys(users) : [] })).filter(r => r.users.length > 0);
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

    const actions = document.createElement('div');
    actions.className = 'cm-msg-actions';
    QUICK_REACTIONS.slice(0, 4).forEach(emoji => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = emoji;
      b.addEventListener('click', (ev) => { ev.stopPropagation(); toggleReaction(m.key, emoji); });
      actions.appendChild(b);
    });
    const sep = document.createElement('div'); sep.className = 'cm-act-sep'; actions.appendChild(sep);
    const replyBtn = document.createElement('button');
    replyBtn.type = 'button'; replyBtn.innerHTML = '<i class="fa-solid fa-reply"></i>';
    replyBtn.addEventListener('click', (ev) => { ev.stopPropagation(); setReply(m); });
    actions.appendChild(replyBtn);
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button'; copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    copyBtn.addEventListener('click', (ev) => { ev.stopPropagation(); copyText(m.text || ''); });
    actions.appendChild(copyBtn);
    if (mine) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button'; editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.addEventListener('click', (ev) => { ev.stopPropagation(); startEdit(m); });
      actions.appendChild(editBtn);
      const delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.addEventListener('click', (ev) => { ev.stopPropagation(); deleteMessage(m.key); });
      actions.appendChild(delBtn);
    }

    row.appendChild(av);
    row.appendChild(col);
    row.appendChild(actions);
    return row;
  }

  function renderMessages() {
    const box = el.messages;
    if (!box) return;
    const wasBottom = scrollNearBottom(160);
    const prevH = box.scrollHeight;
    const prevT = box.scrollTop;
    box.innerHTML = '';

    if (!state.messages.length) {
      box.innerHTML = `<div class="cm-empty"><i class="fa-regular fa-comments"></i><h4>No messages yet</h4><p>Be the first to say hello in #${escapeHtml(roomName())}</p></div>`;
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
    if (wasBottom) box.scrollTop = box.scrollHeight;
    else box.scrollTop = prevT + (box.scrollHeight - prevH);
  }

  function roomName() { const r = ROOMS.find(x => x.id === state.room); return r ? r.name : state.room; }

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
        if (state.messages.length > MAX_MESSAGES) state.messages = state.messages.slice(-MAX_MESSAGES);
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
      if (idx !== -1) { state.messages[idx] = normalizeMessage(snap.key, snap.val() || {}); renderMessages(); }
    });
    const onRemoved = msgRef.on('child_removed', (snap) => {
      state.messages = state.messages.filter(x => x.key !== snap.key);
      renderMessages();
    });

    state.roomListeners.push({ ref: msgRef, ev: 'child_added', cb: onAdded });
    state.roomListeners.push({ ref: msgRef, ev: 'child_changed', cb: onChanged });
    state.roomListeners.push({ ref: msgRef, ev: 'child_removed', cb: onRemoved });

    setTimeout(() => { state.firstLoadDone = true; scrollToBottom(false); }, 700);
    attachTypingListener(roomId);
  }

  function normalizeMessage(key, val) {
    return {
      key, uid: val.uid || 'anon', name: val.name || 'Anonymous',
      color: val.color || '#D4AF37', text: val.text || '', imageUrl: val.imageUrl || '',
      ts: typeof val.ts === 'number' ? val.ts : Date.now(),
      edited: !!val.edited, reply: val.reply || null, reactions: val.reactions || null
    };
  }

  function compareMessages(a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; }

  function attachPresence() {
    const connRef = rtdb.ref('.info/connected');
    connRef.on('value', (snap) => {
      if (snap.val() !== true) return;
      const myRef = rtdb.ref('chat/presence/' + state.uid);
      myRef.onDisconnect().remove();
      myRef.set({ name: state.name || 'Anonymous', color: state.color || '#D4AF37', ts: firebase.database.ServerValue.TIMESTAMP });
    });
    const presRef = rtdb.ref('chat/presence');
    const handler = presRef.on('value', (snap) => { state.online = snap.val() || {}; renderOnlineUsers(); });
    state.roomListeners.push({ ref: presRef, ev: 'value', cb: handler });
  }

  function refreshPresence() {
    rtdb.ref('chat/presence/' + state.uid).update({ name: state.name, color: state.color, ts: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
  }

  let typingRef = null, typingStopTimer = null, amTyping = false;

  function attachTypingListener(roomId) {
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

  function renderTyping() {
    if (!el.typingBar) return;
    const names = Object.values(state.typing).map(t => t.name || 'Someone');
    if (!names.length) { el.typingBar.classList.remove('show'); el.typingBar.innerHTML = ''; return; }
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
    if (!amTyping) { amTyping = true; typingRef.set({ name: state.name, ts: Date.now() }).catch(() => {}); }
    else typingRef.update({ ts: Date.now() }).catch(() => {});
    clearTimeout(typingStopTimer);
    typingStopTimer = setTimeout(stopTyping, TYPING_TIMEOUT);
  }
  function stopTyping() { clearTimeout(typingStopTimer); amTyping = false; if (typingRef) typingRef.remove().catch(() => {}); }

  let pendingImageUrl = '';

  function sendMessage() {
    const text = el.input.value.trim();
    const hasImage = !!pendingImageUrl;
    if (!text && !hasImage) return;
    if (!state.name) { openJoin(); return; }

    const msgRef = rtdb.ref('chat/' + state.room + '/messages');

    if (state.editingKey) {
      msgRef.child(state.editingKey).update({ text, edited: true }).catch(err => console.error('Edit failed:', err));
      cancelEdit();
      el.input.value = '';
      autoResize();
      updateSendState();
      return;
    }

    const payload = { uid: state.uid, name: state.name, color: state.color, text: text || '', ts: firebase.database.ServerValue.TIMESTAMP };
    if (hasImage) payload.imageUrl = pendingImageUrl;
    if (state.replyTarget) {
      payload.reply = { key: state.replyTarget.key, name: state.replyTarget.name, text: String(state.replyTarget.text || '[image]').slice(0, 140) };
    }

    msgRef.push(payload).catch(err => { console.error('Send failed:', err); alert('Could not send message. Check connection.'); });

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
  function cancelReply() { state.replyTarget = null; el.replyPrev.classList.remove('show'); }

  function startEdit(m) {
    state.editingKey = m.key;
    el.input.value = m.text || '';
    el.input.focus();
    autoResize();
    updateSendState();
    el.sendBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    el.input.placeholder = 'Editing… (Esc to cancel)';
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
    ref.once('value').then(snap => { if (snap.exists()) ref.remove(); else ref.set(true); }).catch(err => console.error('Reaction failed:', err));
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => flashToast('Copied!')).catch(() => {});
  }

  let toastTimer = null;
  function flashToast(msg) {
    let t = $('chatToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'chatToast';
      t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--bg-surface);border:1px solid var(--border-mid);color:var(--text-primary);padding:10px 20px;border-radius:9999px;font-size:.85rem;z-index:5000;opacity:0;transition:.25s;pointer-events:none;box-shadow:0 12px 30px rgba(0,0,0,.6);font-family:inherit;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 1800);
  }

  function playPing() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 600);
    } catch (e) {}
  }

  function switchRoom(roomId) {
    if (!ROOMS.some(r => r.id === roomId)) return;
    if (roomId === state.room && state.ready) { closeSidebar(); return; }
    stopTyping();
    state.room = roomId;
    saveIdentity();
    const r = ROOMS.find(x => x.id === roomId);
    if (el.roomTitle) el.roomTitle.textContent = r.name;
    if (el.input) el.input.placeholder = 'Message #' + r.name + '...';
    cancelReply(); cancelEdit(); closeEmoji(); closeSidebar(); clearUnread();
    renderRooms(); attachRoom(roomId);
  }

  function buildEmojiPanel() {
    if (!el.emojiPanel) return;
    el.emojiPanel.innerHTML = '';
    EMOJI_SET.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = e;
      b.addEventListener('click', () => {
        const input = el.input;
        const start = input.selectionStart || input.value.length;
        const end = input.selectionEnd || input.value.length;
        input.value = input.value.slice(0, start) + e + input.value.slice(end);
        input.selectionStart = input.selectionEnd = start + e.length;
        input.focus(); autoResize(); updateSendState();
      });
      el.emojiPanel.appendChild(b);
    });
  }

  function toggleEmoji() { el.emojiPanel?.classList.toggle('show'); el.emojiBtn?.classList.toggle('active', el.emojiPanel?.classList.contains('show')); }
  function closeEmoji() { el.emojiPanel?.classList.remove('show'); el.emojiBtn?.classList.remove('active'); }
  function openSidebar() { el.sidebar?.classList.add('open'); }
  function closeSidebar() { el.sidebar?.classList.remove('open'); }

  function autoResize() { if (!el.input) return; el.input.style.height = 'auto'; el.input.style.height = Math.min(el.input.scrollHeight, 130) + 'px'; }
  function updateSendState() {
    if (!el.sendBtn || !el.input) return;
    const hasText = el.input.value.trim().length > 0;
    const hasImg = !!pendingImageUrl;
    el.sendBtn.disabled = !(hasText || hasImg);
  }
  function focusInput() { if (window.innerWidth > 640) el.input?.focus(); }

  const COLORS = ['#D4AF37', '#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#06b6d4'];
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

  function openJoin() { el.joinOverlay?.classList.remove('hide'); setTimeout(() => el.joinName?.focus(), 150); }
  function closeJoin() { el.joinOverlay?.classList.add('hide'); }

  function handleJoin() {
    const name = el.joinName.value.trim();
    if (name.length < 2) { el.joinError.style.display = 'block'; el.joinError.textContent = 'Please enter at least 2 characters.'; return; }
    if (name.length > 20) { el.joinError.style.display = 'block'; el.joinError.textContent = 'Max 20 characters.'; return; }
    state.name = name;
    state.color = selectedColor;
    saveIdentity(); renderProfile(); refreshPresence(); closeJoin(); updateSendState(); focusInput();
    flashToast('Welcome, ' + name + '!');
  }

  const onSearch = debounce((term) => { state.searchTerm = term.trim(); renderMessages(); }, 250);

  function bindEvents() {
    el.form?.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    el.input?.addEventListener('input', function() {
      autoResize(); updateSendState();
      if (this.value.trim()) signalTyping(); else stopTyping();
    });
    el.input?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      if (e.key === 'Escape') {
        if (state.editingKey) { cancelEdit(); el.input.value = ''; autoResize(); updateSendState(); }
        else if (state.replyTarget) cancelReply();
        else closeEmoji();
      }
    });
    el.input?.addEventListener('blur', () => setTimeout(stopTyping, 400));
    el.emojiBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggleEmoji(); });
    document.addEventListener('click', (e) => {
      if (el.emojiPanel?.classList.contains('show') && !el.emojiPanel.contains(e.target) && e.target !== el.emojiBtn && !el.emojiBtn?.contains(e.target)) closeEmoji();
    });
    el.rpCancel?.addEventListener('click', cancelReply);
    el.messages?.addEventListener('scroll', () => { if (scrollNearBottom(120) && state.unread > 0) clearUnread(); });
    el.jumpBtn?.addEventListener('click', () => scrollToBottom(true));
    el.soundBtn?.addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      el.soundBtn.innerHTML = state.soundOn ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      el.soundBtn.classList.toggle('active', state.soundOn);
      localStorage.setItem('tcs_chat_sound', state.soundOn ? '1' : '0');
      if (state.soundOn) playPing();
    });
    el.sideOpen?.addEventListener('click', openSidebar);
    el.sideClose?.addEventListener('click', closeSidebar);
    el.shell?.addEventListener('click', (e) => {
      if (window.innerWidth <= 900 && el.sidebar?.classList.contains('open') && !el.sidebar.contains(e.target) && e.target !== el.sideOpen && !el.sideOpen?.contains(e.target)) closeSidebar();
    });
    el.chatSearch?.addEventListener('input', function() { onSearch(this.value); });
    el.joinBtn?.addEventListener('click', handleJoin);
    el.joinName?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleJoin(); } });

    el.imageBtn?.addEventListener('click', () => el.imageInput?.click());
    el.imageInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { flashToast('Image too large (max 10MB)'); return; }
      try {
        flashToast('Uploading...');
        const url = await uploadToImgBB(file);
        pendingImageUrl = url;
        if (el.imgPreview) el.imgPreview.style.display = 'inline-block';
        if (el.imgPreviewEl) el.imgPreviewEl.src = url;
        updateSendState();
        flashToast('Image ready');
      } catch (err) { flashToast('Upload failed: ' + err.message); }
      finally { el.imageInput.value = ''; }
    });

    el.imgRemove?.addEventListener('click', () => {
      pendingImageUrl = '';
      if (el.imgPreview) el.imgPreview.style.display = 'none';
      if (el.imgPreviewEl) el.imgPreviewEl.src = '';
      updateSendState();
    });

    window.addEventListener('beforeunload', () => {
      try { rtdb.ref('chat/presence/' + state.uid).remove(); if (typingRef) typingRef.remove(); } catch (e) {}
    });
    window.addEventListener('resize', debounce(() => { if (window.innerWidth > 900) closeSidebar(); }, 150));
    window.addEventListener('focus', () => { if (activeTab === 'community') clearUnread(); });
  }

  function init() {
    cacheDom();
    loadIdentity();
    state.soundOn = localStorage.getItem('tcs_chat_sound') === '1';
    if (el.soundBtn) {
      el.soundBtn.innerHTML = state.soundOn ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      el.soundBtn.classList.toggle('active', state.soundOn);
    }
    renderProfile(); renderRooms(); buildEmojiPanel(); buildColorPicker(); bindEvents(); attachPresence();

    const r = ROOMS.find(x => x.id === state.room);
    if (el.roomTitle) el.roomTitle.textContent = r.name;
    if (el.input) el.input.placeholder = 'Message #' + r.name + '...';
    attachRoom(state.room);

    if (!state.name) { el.joinName.value = ''; selectedColor = COLORS[Math.floor(Math.random() * COLORS.length)]; buildColorPicker(); openJoin(); }
    else closeJoin();

    updateSendState(); autoResize();
    state.ready = true;
  }

  return { init, scrollToBottom, focusInput, clearUnread: () => { state.unread = 0; updateJumpBtn(); if (el.navBadge) el.navBadge.style.display = 'none'; } };
})();

/* ─────────────── HELPER FUNCTIONS ─────────────── */
function hashStr(str) { let h = 0; const s = String(str || 'x'); for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return h; }
function dayKey(ts) { const d = new Date(ts || Date.now()); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
function formatDayLabel(ts) {
  const d = new Date(ts || Date.now());
  const today = new Date(); const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'Today';
  if (dayKey(d) === dayKey(yest)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatClock(ts) { return new Date(ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function formatMsgText(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  out = out.replace(/(https?:\/\/[^\s<]+)/g, (url) => '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>');
  out = out.replace(/\n/g, '<br>');
  return out;
}

/* ─────────────── BOOT ─────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = $('bootLoader');
    if (loader) loader.classList.add('hide');
  }, 4000);
});

console.log('🚀 The Chairman Show — v3 Loaded');
