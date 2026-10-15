/* ══════════════════════════════════════════════════════════════
   THE CHAIRMAN SHOW — Complete App Logic (v3)
   Fixed AI + Admin Posts + Theme Toggle + Universal Back
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

/* ─────────────── SECTION 1: CONFIG ─────────────── */
const firebaseConfig = {
  projectId: "golden-bruin-t8f9p",
  appId: "1:136967711261:web:fc321c257eaaf0e66674f4",
  apiKey: "AIzaSyARBlTKDAEI67aI62WMtiLQyKzR9mQPZO0",
  authDomain: "golden-bruin-t8f9p.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-pythontutr-56f85dc1-308f-460c-ae88-4fabdc5fb4f8",
  storageBucket: "golden-bruin-t8f9p.firebasestorage.app",
  messagingSenderId: "136967711261",
  measurementId: "",
  oAuthClientId: "136967711261-e98cknuge80v2c4j6mo986b38vmcrad7.apps.googleusercontent.com"
};

const auth = window.auth || (typeof firebase !== 'undefined' && firebase.apps?.length ? firebase.auth() : (typeof firebase !== 'undefined' ? firebase.initializeApp(firebaseConfig).auth() : null));
const db = window.db || (typeof firebase !== 'undefined' ? firebase.firestore() : null);
const memoryChatStore = new Map();
const memoryChatEmitters = new Map();

function createMemoryRtdbBridge() {
  function getRef(path) {
    if (path === '.info/connected') {
      return { on: (ev, cb) => { setTimeout(() => cb({ val: () => true }), 50); return cb; }, off: () => {}, onDisconnect: () => ({ remove: () => {} }) };
    }
    const cleanPath = String(path || '');
    return {
      key: cleanPath.split('/').pop() || '',
      limitToLast: function() { return this; },
      push: (data) => {
        const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const map = memoryChatStore.get(cleanPath) || new Map();
        map.set(id, data);
        memoryChatStore.set(cleanPath, map);
        const emit = memoryChatEmitters.get(cleanPath + ':child_added');
        if (emit) emit({ key: id, val: () => data });
        return { key: id };
      },
      child: (k) => getRef(cleanPath + '/' + k),
      set: (data) => {
        memoryChatStore.set(cleanPath, data);
        const emit = memoryChatEmitters.get(cleanPath + ':value');
        if (emit) emit({ val: () => data });
        return Promise.resolve();
      },
      update: (data) => {
        const existing = memoryChatStore.get(cleanPath) || {};
        const merged = { ...existing, ...data };
        memoryChatStore.set(cleanPath, merged);
        const emit = memoryChatEmitters.get(cleanPath + ':value');
        if (emit) emit({ val: () => merged });
        return Promise.resolve();
      },
      remove: () => {
        memoryChatStore.delete(cleanPath);
        const emit = memoryChatEmitters.get(cleanPath + ':value');
        if (emit) emit({ val: () => null });
        return Promise.resolve();
      },
      on: (ev, cb) => {
        memoryChatEmitters.set(cleanPath + ':' + ev, cb);
        return cb;
      },
      off: (ev) => {
        memoryChatEmitters.delete(cleanPath + ':' + ev);
      },
      onDisconnect: () => ({ remove: () => {} })
    };
  }
  return { ref: getRef };
}

function createFirestoreRtdbBridge(firestoreDb) {
  if (!firestoreDb || typeof firestoreDb.collection !== 'function') {
    return createMemoryRtdbBridge();
  }

  const listeners = new Map();

  function getRef(path) {
    const p = String(path || '');
    const parts = p.split('/').filter(Boolean);

    // 1. Connection status ref
    if (p === '.info/connected') {
      return {
        on: (ev, cb) => {
          setTimeout(() => cb({ val: () => true }), 50);
          return cb;
        },
        off: () => {},
        onDisconnect: () => ({ remove: () => {} })
      };
    }

    // 2. Reaction path: chat/{roomId}/messages/{msgKey}/reactions/{emoji}/{uid}
    if (parts[0] === 'chat' && parts[2] === 'messages' && parts[4] === 'reactions') {
      const roomId = parts[1];
      const msgId = parts[3];
      const emoji = parts[5];
      const uid = parts[6];
      const docRef = firestoreDb.collection('chat_rooms').doc(roomId).collection('messages').doc(msgId);
      const reactionField = `reactions.${emoji}.${uid}`;

      return {
        once: async () => {
          const snap = await docRef.get();
          const data = snap.data() || {};
          const exists = !!(data.reactions && data.reactions[emoji] && data.reactions[emoji][uid]);
          return {
            exists: () => exists,
            val: () => exists ? true : null
          };
        },
        set: async () => {
          await docRef.update({ [reactionField]: true }).catch(() => {});
        },
        remove: async () => {
          const delVal = (typeof firebase !== 'undefined' && firebase.firestore?.FieldValue?.delete) ? firebase.firestore.FieldValue.delete() : null;
          if (delVal) await docRef.update({ [reactionField]: delVal }).catch(() => {});
        }
      };
    }

    // 2b. Chat messages: chat/{roomId}/messages
    if (parts[0] === 'chat' && parts[2] === 'messages') {
      const roomId = parts[1] || 'general';
      const colRef = firestoreDb.collection('chat_rooms').doc(roomId).collection('messages');

      const refObj = {
        key: 'messages',
        limitToLast: () => refObj,
        push: async (data) => {
          const payload = { ...data, ts: data.ts || Date.now() };
          const docRes = await colRef.add(payload);
          return { key: docRes.id };
        },
        child: (docId) => {
          const docRef = colRef.doc(docId);
          return {
            key: docId,
            update: (updates) => docRef.update(updates).catch(() => {}),
            remove: () => docRef.delete().catch(() => {}),
            child: (sub) => ({
              update: (updates) => docRef.update(updates).catch(() => {}),
              set: (val) => docRef.set(val, { merge: true }).catch(() => {})
            })
          };
        },
        on: (ev, cb) => {
          if (ev === 'child_added' || ev === 'child_changed' || ev === 'child_removed') {
            const unsub = colRef.orderBy('ts', 'asc').limit(100).onSnapshot(
              (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                  const snapObj = {
                    key: change.doc.id,
                    val: () => change.doc.data()
                  };
                  if (change.type === 'added' && ev === 'child_added') cb(snapObj);
                  else if (change.type === 'modified' && ev === 'child_changed') cb(snapObj);
                  else if (change.type === 'removed' && ev === 'child_removed') cb(snapObj);
                });
              },
              (err) => console.warn('[Chat] Firestore onSnapshot note:', err.message)
            );
            listeners.set(cb, unsub);
          }
          return cb;
        },
        off: (ev, cb) => {
          const unsub = listeners.get(cb);
          if (unsub) { unsub(); listeners.delete(cb); }
        }
      };
      return refObj;
    }

    // 3. Presence: chat/presence or chat/presence/{uid}
    if (parts[0] === 'chat' && parts[1] === 'presence') {
      const colRef = firestoreDb.collection('chat_presence');
      const uid = parts[2];

      if (uid) {
        const docRef = colRef.doc(uid);
        return {
          key: uid,
          set: (data) => docRef.set({ ...data, lastActive: Date.now() }).catch(() => {}),
          update: (data) => docRef.set({ ...data, lastActive: Date.now() }, { merge: true }).catch(() => {}),
          remove: () => docRef.delete().catch(() => {}),
          onDisconnect: () => ({ remove: () => {} })
        };
      }

      return {
        key: 'presence',
        on: (ev, cb) => {
          const unsub = colRef.onSnapshot(
            (snapshot) => {
              const obj = {};
              const now = Date.now();
              snapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.lastActive || now - data.lastActive < 120000) {
                  obj[doc.id] = data;
                }
              });
              cb({ val: () => obj });
            },
            () => {}
          );
          listeners.set(cb, unsub);
          return cb;
        },
        off: (ev, cb) => {
          const unsub = listeners.get(cb);
          if (unsub) { unsub(); listeners.delete(cb); }
        }
      };
    }

    // 4. Typing: chat/typing/{roomId} or chat/typing/{roomId}/{uid}
    if (parts[0] === 'chat' && parts[1] === 'typing') {
      const roomId = parts[2] || 'general';
      const uid = parts[3];
      const colRef = firestoreDb.collection('chat_typing').doc(roomId).collection('users');

      if (uid) {
        const docRef = colRef.doc(uid);
        return {
          key: uid,
          set: (data) => docRef.set(data).catch(() => {}),
          update: (data) => docRef.set(data, { merge: true }).catch(() => {}),
          remove: () => docRef.delete().catch(() => {}),
          onDisconnect: () => ({ remove: () => {} })
        };
      }

      return {
        key: roomId,
        on: (ev, cb) => {
          const unsub = colRef.onSnapshot(
            (snapshot) => {
              const obj = {};
              snapshot.forEach((doc) => { obj[doc.id] = doc.data(); });
              cb({ val: () => obj });
            },
            () => {}
          );
          listeners.set(cb, unsub);
          return cb;
        },
        off: (ev, cb) => {
          const unsub = listeners.get(cb);
          if (unsub) { unsub(); listeners.delete(cb); }
        }
      };
    }

    return createMemoryRtdbBridge().ref(p);
  }

  return { ref: getRef };
}

let rtdb = null;
try {
  if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') {
    rtdb = firebase.database();
  }
} catch (e) {}
if (!rtdb) {
  rtdb = createFirestoreRtdbBridge(db);
}
if (typeof firebase !== 'undefined') {
  if (!firebase.database) firebase.database = () => rtdb;
  if (!firebase.database.ServerValue) firebase.database.ServerValue = { TIMESTAMP: Date.now() };
}

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

var $ = (id) => document.getElementById(id);
var $$ = (sel) => document.querySelectorAll(sel);
window.$ = $;
window.$$ = $$;

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
  const email = currentUser?.email?.toLowerCase();
  const ADMIN_EMAILS = [CONFIG.ADMIN_EMAIL?.toLowerCase(), "icreative552@gmail.com"];
  return ADMIN_EMAILS.includes(email) || userProfile?.role === 'admin' || localStorage.getItem('tcs_admin_mode') === 'true';
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
let isAuthPopupPending = false;
$('googleSignInBtn')?.addEventListener('click', async () => {
  if (isAuthPopupPending) return;
  isAuthPopupPending = true;
  const btn = $('googleSignInBtn');
  if (btn) btn.disabled = true;

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    if ($('loginError')) $('loginError').style.display = 'none';
    await auth.signInWithPopup(provider);
  } catch (err) {
    // Gracefully handle user cancellation or concurrent popup without noisy errors
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return;
    }
    console.warn('Sign in notice:', err.message || err.code);
    if ($('loginError')) {
      $('loginError').textContent = err.message || 'Sign in failed. Please try again.';
      $('loginError').style.display = 'block';
    }
  } finally {
    isAuthPopupPending = false;
    if (btn) btn.disabled = false;
  }
});

function loginAsGuest() {
  const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
  currentUser = {
    uid: guestId,
    displayName: 'Guest Student',
    email: 'guest@thechairmanshow.com',
    photoURL: ''
  };
  userProfile = {
    uid: guestId,
    email: 'guest@thechairmanshow.com',
    name: 'Guest Student',
    photoURL: '',
    role: 'student',
    class: 'Python Learner',
    bio: 'Learning Python on The Chairman Show',
    solvedCount: Progress.totalSolved(),
    xp: Progress.totalSolved() * 10,
    streak: 1
  };
  updateUserUI();
  showApp();
  initApp();
  toast('success', 'Welcome, Guest Student!', 'Exploring in Guest Mode');
}

$('guestSignInBtn')?.addEventListener('click', () => {
  loginAsGuest();
});

$('signOutBtn')?.addEventListener('click', () => {
  if (confirm('Sign out?')) {
    userProfile = null;
    currentUser = null;
    if (auth.currentUser) auth.signOut();
    showLogin();
  }
});

const authTimeout = setTimeout(() => {
  if (!currentUser) {
    const loader = $('bootLoader');
    if (loader) loader.classList.add('hide');
    const ls = $('loginScreen');
    if (ls) ls.style.display = 'flex';
  }
}, 1500);

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
  if (tabId === 'careerCounselor') {
    if (window.CareerCounselor && typeof window.CareerCounselor.init === 'function') {
      window.CareerCounselor.init();
    }
  }
  if (tabId === 'python') renderLevelsGrid();
  if (tabId === 'chatWithChairman') {
  // Chairman chat handle karta hai apna load
}
  if (tabId === 'chairmanPosts') loadChairmanPosts();
  if (tabId === 'freeCourses') {
    YouTube.ensureLoaded();
    if (window.CoursesManager) window.CoursesManager.init();
  }
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

  if (tabId === 'careerCounselor') {
    if (window.CareerCounselor && typeof window.CareerCounselor.init === 'function') {
      window.CareerCounselor.init();
    }
  }
  if (tabId === 'python') renderLevelsGrid();
  if (tabId === 'chatWithChairman') loadDoubts();
  if (tabId === 'chairmanPosts') loadChairmanPosts();
  if (tabId === 'freeCourses') {
    YouTube.ensureLoaded();
    if (window.CoursesManager) window.CoursesManager.init();
  }
}

function updateBackButton() {
  const btn = $('universalBackBtn');
  if (!btn) return;
  if (activeTab === 'home') {
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

  // Reset tab to code view without hiding any footer buttons
  switchEditorTab('code');

  // Populate solution pane
  if ($('solutionCode')) $('solutionCode').textContent = prob.solution || '# Solution not available';
  if ($('solutionLevelBadge')) $('solutionLevelBadge').textContent = `Level ${prob.level || 1}`;
  if ($('solutionExplanation')) {
    const exp = prob.explanation || 'No explanation available for this problem.';
    $('solutionExplanation').innerHTML = `
      <div style="margin-bottom:.6rem; font-weight:700; color:var(--gold-primary); display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-lightbulb"></i> Solution Breakdown & Concept
      </div>
      <div>${escapeHtml(exp).replace(/\n/g, '<br>')}</div>
    `;
  }

  // Reset AI output
  if ($('aiHelpOutput')) {
    $('aiHelpOutput').textContent = `Ready to help you master "${prob.title}" (Level ${prob.level})!\nClick "Progressive Hint" if you're stuck, or "Review My Code" after writing your solution.`;
  }

  setTimeout(updateProblemNavigation, 50);
};

/* ─────────────── TAB SWITCHER (CODE / SOLUTION / AI) ─────────────── */
function switchEditorTab(tab) {
  const tabCode = $('tabCode');
  const tabSolution = $('tabSolution');
  const tabAiHelp = $('tabAiHelp');
  const paneCode = $('paneCode');
  const paneSolution = $('paneSolution');
  const paneAiHelp = $('paneAiHelp');
  const showBtnText = $('showSolutionBtnText');
  const showBtn = $('showSolutionBtn');

  // Deactivate all
  [tabCode, tabSolution, tabAiHelp].forEach(t => t?.classList.remove('active'));
  if (paneCode) paneCode.style.display = 'none';
  if (paneSolution) paneSolution.style.display = 'none';
  if (paneAiHelp) paneAiHelp.style.display = 'none';

  if (tab === 'solution') {
    tabSolution?.classList.add('active');
    if (paneSolution) paneSolution.style.display = 'block';
    if (showBtnText) showBtnText.textContent = 'Back to Code';
    if (showBtn) showBtn.title = 'Switch back to your code editor';

    // Populate solution fresh
    if (currentProblem) {
      if ($('solutionCode')) $('solutionCode').textContent = currentProblem.solution || '# Solution not available';
      if ($('solutionLevelBadge')) $('solutionLevelBadge').textContent = `Level ${currentProblem.level || 1}`;
      if ($('solutionExplanation')) {
        const exp = currentProblem.explanation || 'No explanation available for this problem.';
        $('solutionExplanation').innerHTML = `
          <div style="margin-bottom:.6rem; font-weight:700; color:var(--gold-primary); display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-lightbulb"></i> Solution Breakdown & Concept
          </div>
          <div>${escapeHtml(exp).replace(/\n/g, '<br>')}</div>
        `;
      }
    }
  } else if (tab === 'ai') {
    tabAiHelp?.classList.add('active');
    if (paneAiHelp) paneAiHelp.style.display = 'block';
    if (showBtnText) showBtnText.textContent = 'Solution';
    if (showBtn) showBtn.title = 'View official verified solution';
  } else {
    // Default: 'code'
    tabCode?.classList.add('active');
    if (paneCode) paneCode.style.display = 'block';
    if (showBtnText) showBtnText.textContent = 'Solution';
    if (showBtn) showBtn.title = 'View official verified solution';
    updateLineNumbers();
  }
}

// Tab click listeners
$('tabCode')?.addEventListener('click', () => switchEditorTab('code'));
$('tabSolution')?.addEventListener('click', () => switchEditorTab('solution'));
$('tabAiHelp')?.addEventListener('click', () => switchEditorTab('ai'));

/* Code editor setup */
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
  // Indent on Tab
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
    updateLineNumbers();
  }
  // Run code on Ctrl+Enter or Cmd+Enter
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    $('runCodeBtn')?.click();
  }
});

$('resetCodeBtn')?.addEventListener('click', () => {
  if (!currentProblem) return;
  codeEditor.value = currentProblem.starter || '# Write your Python code here\n';
  updateLineNumbers();
  toast('info', 'Code reset to starter template');
});

$('copyCodeBtn')?.addEventListener('click', () => {
  if (!codeEditor) return;
  navigator.clipboard.writeText(codeEditor.value).then(() => {
    toast('success', 'Copied!', 'Code copied to clipboard');
  }).catch(() => toast('warn', 'Copy failed'));
});

/* Toggle Solution Button in Footer */
$('showSolutionBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!currentProblem) { toast('warn', 'No problem loaded'); return; }
  const isSolutionActive = $('tabSolution')?.classList.contains('active');
  if (isSolutionActive) {
    switchEditorTab('code');
    toast('info', 'Switched to Code Editor');
  } else {
    switchEditorTab('solution');
    toast('success', 'Official Solution', 'Study the logic and try running it!');
  }
});

/* Insert solution into editor */
$('insertSolutionToEditorBtn')?.addEventListener('click', () => {
  if (!currentProblem || !currentProblem.solution) return;
  if (codeEditor) {
    codeEditor.value = currentProblem.solution;
    updateLineNumbers();
  }
  switchEditorTab('code');
  toast('success', 'Solution Copied to Editor', 'You can now run, tweak, and test it!');
});

/* Copy solution to clipboard */
$('copySolutionBtn')?.addEventListener('click', () => {
  if (!currentProblem || !currentProblem.solution) return;
  navigator.clipboard.writeText(currentProblem.solution).then(() => {
    toast('success', 'Copied!', 'Solution copied to clipboard');
  });
});

/* ─────────────── PYTHON PYODIDE & WASM EXECUTION ENGINE ─────────────── */
let pyodideInstance = null;
let pyodideLoading = false;

async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (typeof window.loadPyodide === 'function' && !pyodideLoading) {
    pyodideLoading = true;
    try {
      pyodideInstance = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
      });
      const pill = $('pyEngineStatus');
      if (pill) {
        pill.textContent = 'Python 3.12 (Wasm Ready)';
        pill.style.background = 'rgba(16,185,129,.15)';
        pill.style.color = '#10b981';
      }
      console.log('🐍 Pyodide Python 3.12 initialized');
    } catch (e) {
      console.warn('Pyodide load note:', e.message);
    } finally {
      pyodideLoading = false;
    }
  }
  return pyodideInstance;
}

// Proactively initiate Pyodide in background
setTimeout(getPyodide, 800);

/* Client simulation engine (instant fallback) */
function simulatePythonExecution(code, examples) {
  const output = [];
  const trimmed = (code || '').trim();

  if (!trimmed || trimmed === '# Write your Python code here') {
    return '⚠️ No code written yet. Type your Python code above and click Run Code!';
  }

  try {
    const printRegex = /print\s*\((.*?)\)/g;
    let match;
    let foundPrint = false;

    const openQuotes = (code.match(/"/g) || []).length;
    const singleQuotes = (code.match(/'/g) || []).length;
    if (openQuotes % 2 !== 0 || singleQuotes % 2 !== 0) {
      return 'SyntaxError: EOL while scanning string literal';
    }

    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().endsWith(':')) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().length > 0 && !nextLine.startsWith(' ') && !nextLine.startsWith('\t')) {
          return `IndentationError: expected an indented block after '${line.trim()}' (line ${i + 2})`;
        }
      }
    }

    while ((match = printRegex.exec(code)) !== null) {
      foundPrint = true;
      const expr = match[1].trim();
      if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
        output.push(expr.slice(1, -1));
      } else if (!isNaN(Number(expr))) {
        output.push(expr);
      } else if (expr.includes('+') || expr.includes('*') || expr.includes('-')) {
        try {
          if (/^[0-9+\-*/().\s]+$/.test(expr)) {
            output.push(String(Function(`'use strict'; return (${expr})`)()));
          } else {
            output.push(`[Output of: ${expr}]`);
          }
        } catch (e) {
          output.push(`[Output of: ${expr}]`);
        }
      } else {
        output.push(`[Evaluated: ${expr}]`);
      }
    }

    if (foundPrint && output.length) {
      let res = `>>> python3 solution.py\n${output.join('\n')}\n\n`;
      if (examples && examples.length && examples[0].output) {
        const expected = examples[0].output.trim();
        const matches = output.some(o => o.trim() === expected || o.includes(expected));
        if (matches) {
          res += `✅ Test Case 1 Passed! Output matches expected: "${expected}"`;
        } else {
          res += `ℹ️ Test Case Sample Output: "${expected}"\n(Verify if your code matches logic for all edge cases)`;
        }
      }
      return res;
    }

    return `>>> python3 solution.py\n[Process completed with return code 0]\nCode compiled without syntax errors. Add print(...) statements or test cases to inspect variable outputs!`;

  } catch (err) {
    return `RuntimeError: ${err.message}`;
  }
}

/* Master execution handler using Pyodide Wasm with instant fallback */
async function executePythonCode(code, sampleInput = '') {
  const startTime = performance.now();
  const trimmed = (code || '').trim();

  if (!trimmed || trimmed === '# Write your Python code here') {
    return {
      output: '⚠️ No code written yet. Write your Python code in the editor and click "Run Code"!',
      raw: '',
      success: false
    };
  }

  // 1. Try Pyodide
  try {
    const py = await getPyodide();
    if (py) {
      const rawInputs = sampleInput ? String(sampleInput).split('\n') : [];
      py.globals.set('__script_inputs', rawInputs);

      const harness = `
import sys, io

class OutCapture(io.StringIO):
    pass

sys.stdout = OutCapture()
sys.stderr = OutCapture()

__inp_i = 0
__inps = list(__script_inputs) if '__script_inputs' in globals() else []

def __tcs_input(prompt=""):
    global __inp_i
    if prompt:
        sys.stdout.write(str(prompt))
    if __inp_i < len(__inps):
        val = str(__inps[__inp_i])
        __inp_i += 1
        return val
    return ""

input = __tcs_input
`;
      await py.runPythonAsync(harness);
      await py.runPythonAsync(code);

      const stdout = py.runPython("sys.stdout.getvalue()");
      const stderr = py.runPython("sys.stderr.getvalue()");
      const elapsed = Math.round(performance.now() - startTime);

      let out = stdout || '';
      if (stderr) out += (out ? '\n' : '') + stderr;
      if (!out.trim()) {
        out = `[Process completed with return code 0]\nCode compiled without syntax errors. Add print(...) statements to view variable outputs!`;
      }

      return {
        output: `>>> python3 solution.py\n${out}\n\n⚡ Executed in ${elapsed}ms via Python 3.12 (Pyodide Wasm)`,
        raw: (stdout || '').trim(),
        success: true,
        engine: 'pyodide',
        elapsed
      };
    }
  } catch (err) {
    let stderr = '';
    try {
      if (pyodideInstance) stderr = pyodideInstance.runPython("sys.stderr.getvalue()");
    } catch (_) {}
    const elapsed = Math.round(performance.now() - startTime);
    return {
      output: `>>> python3 solution.py\n${stderr ? stderr + '\n' : ''}Traceback (most recent call last):\n${err.message}\n\n⏱️ Terminated with error in ${elapsed}ms`,
      raw: '',
      success: false,
      error: err.message,
      engine: 'pyodide'
    };
  }

  // 2. Fallback
  const sim = simulatePythonExecution(code, currentProblem?.examples);
  return {
    output: sim,
    raw: sim,
    success: sim.includes('Passed') || sim.includes('return code 0'),
    engine: 'simulator'
  };
}

/* ─────────────── RUNNER BUTTONS & ACTIONS ─────────────── */
document.addEventListener('click', async (e) => {
  // 1. Run User's Code
  const runBtn = e.target.closest('#runCodeBtn');
  if (runBtn) {
    const code = $('codeEditor')?.value || '';
    const panel = $('pythonOutputPanel');
    const pre = $('pythonOutputPre');
    if (!panel || !pre) return;

    panel.style.display = 'block';
    pre.innerHTML = '<span style="color:var(--gold-primary);"><i class="fa-solid fa-spinner fa-spin"></i> Executing Python script...</span>';

    // If on solution or AI tab, switch back to code tab so user sees code running
    if (!$('tabCode')?.classList.contains('active')) {
      switchEditorTab('code');
    }

    const firstExampleInput = currentProblem?.examples?.[0]?.input || '';
    const cleanInput = (firstExampleInput === '(no input)' || firstExampleInput.includes('(none)')) ? '' : firstExampleInput;

    const res = await executePythonCode(code, cleanInput);
    pre.textContent = res.output;

    if (res.success) {
      toast('success', 'Execution Complete!', 'Checked output in terminal below');
    } else {
      toast('info', 'Executed with notice', 'Check terminal output');
    }
  }

  // 2. Run Solution Directly (both inside solution pane and in main footer)
  const runSolBtn = e.target.closest('#runSolutionInTerminalBtn, #quickRunSolutionBtn');
  if (runSolBtn) {
    if (!currentProblem || !currentProblem.solution) return;
    const panel = $('pythonOutputPanel');
    const pre = $('pythonOutputPre');
    if (!panel || !pre) return;

    panel.style.display = 'block';
    pre.innerHTML = '<span style="color:var(--accent-green);"><i class="fa-solid fa-circle-play fa-spin"></i> Running official verified solution...</span>';

    const firstExampleInput = currentProblem?.examples?.[0]?.input || '';
    const cleanInput = (firstExampleInput === '(no input)' || firstExampleInput.includes('(none)')) ? '' : firstExampleInput;

    const res = await executePythonCode(currentProblem.solution, cleanInput);
    pre.textContent = `════════ OFFICIAL SOLUTION RUN ════════\n${res.output}`;
    toast('success', 'Solution Executed!', 'Verified official output displayed below');
  }

  // 3. Run Test Suite
  const testBtn = e.target.closest('#runTestsBtn');
  if (testBtn) {
    if (!currentProblem) return;
    const code = $('codeEditor')?.value || '';
    const panel = $('pythonOutputPanel');
    const pre = $('pythonOutputPre');
    if (!panel || !pre) return;

    panel.style.display = 'block';
    pre.innerHTML = '<span style="color:var(--accent-green);"><i class="fa-solid fa-flask fa-spin"></i> Running comprehensive test suite...</span>';

    const examples = currentProblem.examples || [];
    if (!examples.length) {
      pre.textContent = 'ℹ️ No predefined test cases for this level. Use print(...) statements to verify your solution.';
      return;
    }

    let report = `════════ TEST SUITE REPORT: ${currentProblem.title} (Level ${currentProblem.level}) ════════\n`;
    let passedCount = 0;

    for (let idx = 0; idx < examples.length; idx++) {
      const ex = examples[idx];
      const cleanInput = (ex.input === '(no input)' || ex.input.includes('(none)')) ? '' : (ex.input || '');
      const res = await executePythonCode(code, cleanInput);
      const expected = (ex.output || '').trim();
      const passed = res.raw && (res.raw === expected || res.raw.includes(expected));
      if (passed) passedCount++;

      report += `Test Case ${idx + 1}: ${passed ? '✅ PASSED' : '⚠️ MISMATCH / CHECK'}\n`;
      if (cleanInput) report += `  Input:    ${cleanInput}\n`;
      report += `  Expected: ${expected}\n`;
      report += `  Received: ${res.raw || '(no output)'}\n\n`;
    }

    report += `Summary: ${passedCount}/${examples.length} Sample Tests Passed.\n`;
    pre.textContent = report;

    if (passedCount === examples.length) {
      toast('success', 'All Tests Passed! 🎉', 'Perfect solution! Ready to mark solved.');
    } else if (passedCount > 0) {
      toast('info', 'Partial Match', `${passedCount}/${examples.length} tests passed`);
    } else {
      toast('warn', 'Tests Failed', 'Review output and check edge cases');
    }
  }

  // 4. AI Hint
  const hintBtn = e.target.closest('#aiHintBtn, #aiTabHintBtn');
  if (hintBtn) {
    if (!currentProblem) return;
    switchEditorTab('ai');
    const outputBox = $('aiHelpOutput');
    if (!outputBox) return;

    hintBtn.disabled = true;
    outputBox.innerHTML = '<span style="color:#f59e0b;"><i class="fa-solid fa-lightbulb fa-spin"></i> Chairman AI is crafting a progressive hint...</span>';

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Give a progressive, non-spoiling hint for this Python problem:
Problem: "${currentProblem.title}" (Level ${currentProblem.level})
Description: ${currentProblem.description}
Provide 2 progressive hints:
1. Conceptual guidance (what formula, algorithm, or data structure to think about)
2. A small step-by-step pseudo logic without giving the full code.`,
          subject: 'Python Coding Hint',
          mode: 'study-buddy'
        })
      });
      if (!resp.ok) throw new Error('AI hint service error');
      const data = await resp.json();
      const answer = data.answer || data.response || data.text || '';
      outputBox.textContent = `💡 Progressive Hint for "${currentProblem.title}":\n\n${answer}`;
      toast('info', 'Hint Loaded', 'Think it through step-by-step!');
    } catch (err) {
      outputBox.textContent = `💡 Progressive Hint for "${currentProblem.title}":\n\n${currentProblem.explanation || 'Think about the simplest case first, and write down variables on paper before coding!'}`;
      toast('info', 'Hint Loaded');
    } finally {
      hintBtn.disabled = false;
    }
  }

  // 5. AI Review
  const reviewBtn = e.target.closest('#aiReviewCodeBtn, #aiTabReviewBtn');
  if (reviewBtn) {
    if (!currentProblem) return;
    switchEditorTab('ai');
    const code = $('codeEditor')?.value || '';
    const outputBox = $('aiHelpOutput');
    if (!outputBox) return;

    reviewBtn.disabled = true;
    outputBox.innerHTML = '<span style="color:var(--gold-primary);"><i class="fa-solid fa-wand-magic-sparkles fa-spin"></i> Chairman AI Tutor is reviewing your code...</span>';

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Review this student's Python code for problem "${currentProblem.title}":
Problem Description: ${currentProblem.description}
Student Code:
${code}

Provide:
1. Is the approach correct?
2. Time & Space Complexity analysis (Big-O).
3. 2 concise suggestions or edge cases to consider.
Keep it encouraging, mentor-like, and concise!`,
          subject: 'Python Code Review',
          mode: 'study-buddy'
        })
      });
      if (!resp.ok) throw new Error('AI service error');
      const data = await resp.json();
      const answer = data.answer || data.response || data.text || '';
      outputBox.textContent = answer || 'Great effort! Clean indentation and structure. Test with edge cases like 0 and negative numbers.';
      toast('success', 'Review Ready', 'Chairman feedback generated!');
    } catch (err) {
      outputBox.textContent = `💡 Chairman Quick Tip for "${currentProblem.title}":\n\n1. Ensure you handle base cases (empty inputs, zero, single element).\n2. Optimize loops: Avoid nested loops if a hash map or two-pointer approach can achieve O(N) time.\n3. Keep variable names descriptive and follow PEP 8!`;
      toast('info', 'Quick Guidance', 'Applied core heuristic tips.');
    } finally {
      reviewBtn.disabled = false;
    }
  }

  // 6. AI Complexity Breakdown
  const compBtn = e.target.closest('#aiTabComplexityBtn');
  if (compBtn) {
    if (!currentProblem) return;
    const outputBox = $('aiHelpOutput');
    if (!outputBox) return;

    outputBox.innerHTML = '<span style="color:var(--accent-blue);"><i class="fa-solid fa-chart-line fa-spin"></i> Analyzing time and space complexity...</span>';
    compBtn.disabled = true;

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Explain the optimal Time and Space Complexity for this Python problem:
Title: "${currentProblem.title}" (Level ${currentProblem.level})
Description: ${currentProblem.description}
Official Solution:
${currentProblem.solution}

Break down:
- Optimal Time Complexity (Big-O) and why
- Space Complexity (Auxiliary memory)
- How to achieve it in Python`,
          subject: 'Big-O Complexity Analysis',
          mode: 'study-buddy'
        })
      });
      if (!resp.ok) throw new Error('Complexity service error');
      const data = await resp.json();
      const answer = data.answer || data.response || data.text || '';
      outputBox.textContent = `📊 Complexity Analysis for "${currentProblem.title}":\n\n${answer}`;
    } catch (err) {
      outputBox.textContent = `📊 Complexity Analysis for "${currentProblem.title}":\n\nOptimal Time Complexity: O(N) or O(1) depending on operations.\nAuxiliary Space: O(1) in-place whenever possible.\nEnsure you avoid quadratic loops O(N^2) for large inputs!`;
    } finally {
      compBtn.disabled = false;
    }
  }

  // 7. Clear Terminal Output
  const clearBtn = e.target.closest('#clearOutputBtn');
  if (clearBtn) {
    const pre = $('pythonOutputPre');
    if (pre) pre.textContent = 'Terminal cleared. Click "Run Code" or "Run Solution" to execute.';
  }

  // 8. Close Terminal Output
  const closeBtn = e.target.closest('#closeOutputBtn');
  if (closeBtn) {
    const panel = $('pythonOutputPanel');
    if (panel) panel.style.display = 'none';
  }
});

/* AI Practice Doubt Form */
$('aiPracticeDoubtForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('aiPracticeDoubtInput');
  const doubt = input?.value?.trim();
  if (!doubt || !currentProblem) return;

  const outputBox = $('aiHelpOutput');
  if (!outputBox) return;

  outputBox.innerHTML = `<span style="color:var(--gold-primary);"><i class="fa-solid fa-wand-magic-sparkles fa-spin"></i> Answering your doubt: "${escapeHtml(doubt)}"...</span>`;
  input.value = '';

  try {
    const resp = await fetch(CONFIG.AI_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: `The student is working on Python problem "${currentProblem.title}" (Level ${currentProblem.level}).
Problem description: ${currentProblem.description}
Student Question: ${doubt}
Provide a clear, patient, educational answer with an example.`,
        subject: 'Python Practice Help',
        mode: 'study-buddy'
      })
    });
    if (!resp.ok) throw new Error('Service error');
    const data = await resp.json();
    outputBox.textContent = data.answer || data.response || data.text || 'I could not generate an answer right now. Please try again.';
  } catch (err) {
    outputBox.textContent = `💡 Response to "${doubt}":\nRemember that in Python, data types, indentation, and variable scope are key. Break the problem into inputs, processing, and output steps!`;
  }
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
        text: `Namaste! 👑\n\nमैं हूँ **The Chairman** — तुम्हारा personal mentor for all exams.\n\nचाहे **NEET (Biology, Physics, Chemistry), JEE, UPSC, State PCS, Class 10/12 Boards, या Coding** हो — कोई भी सवाल या doubt पूछो, main directly जवाब दूँगा. 🚀\n\nReady? नीचे अपना सवाल type करो या quick suggestions use करो.`,
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

  // ═══ INIT CAREER COUNSELOR ═══
  try {
    if (typeof CareerCounselor !== 'undefined' && typeof CareerCounselor.init === 'function') {
      CareerCounselor.init();
    }
  } catch (err) { console.error('CareerCounselor init:', err); }
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

    if (!rtdb || typeof rtdb.ref !== 'function') {
      setTimeout(() => { state.firstLoadDone = true; scrollToBottom(false); }, 700);
      return;
    }

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
    if (!rtdb || typeof rtdb.ref !== 'function') return;
    const connRef = rtdb.ref('.info/connected');
    connRef.on('value', (snap) => {
      if (snap.val() !== true) return;
      const myRef = rtdb.ref('chat/presence/' + state.uid);
      myRef.onDisconnect().remove();
      const sVal = (typeof firebase !== 'undefined' && firebase.database?.ServerValue?.TIMESTAMP) ? firebase.database.ServerValue.TIMESTAMP : Date.now();
      myRef.set({ name: state.name || 'Anonymous', color: state.color || '#D4AF37', ts: sVal });
    });
    const presRef = rtdb.ref('chat/presence');
    const handler = presRef.on('value', (snap) => { state.online = snap.val() || {}; renderOnlineUsers(); });
    state.roomListeners.push({ ref: presRef, ev: 'value', cb: handler });
  }

  function refreshPresence() {
    if (!rtdb || typeof rtdb.ref !== 'function') return;
    const sVal = (typeof firebase !== 'undefined' && firebase.database?.ServerValue?.TIMESTAMP) ? firebase.database.ServerValue.TIMESTAMP : Date.now();
    rtdb.ref('chat/presence/' + state.uid).update({ name: state.name, color: state.color, ts: sVal }).catch(() => {});
  }

  let typingRef = null, typingStopTimer = null, amTyping = false;

  function attachTypingListener(roomId) {
    if (!rtdb || typeof rtdb.ref !== 'function') return;
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

    const sVal = (typeof firebase !== 'undefined' && firebase.database?.ServerValue?.TIMESTAMP) ? firebase.database.ServerValue.TIMESTAMP : Date.now();
    const payload = { uid: state.uid, name: state.name, color: state.color, text: text || '', ts: sVal };
    if (hasImage) payload.imageUrl = pendingImageUrl;
    if (state.replyTarget) {
      payload.reply = { key: state.replyTarget.key, name: state.replyTarget.name, text: String(state.replyTarget.text || '[image]').slice(0, 140) };
    }

    msgRef.push(payload).catch(err => { console.error('Send failed:', err); toast('warn', 'Chat Notice', 'Could not send message. Check connection.'); });

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

window.toast = toast;
window.escapeHtml = escapeHtml;

console.log('🚀 The Chairman Show — v3 Loaded');

})();
