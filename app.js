/* ══════════════════════════════════════════════════════════════
   THE CHAIRMAN SHOW — Full Platform Logic (Final Version)
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
  UPI_ID: "Please Mail on overactingofficial7@gmail.com",
  TELEGRAM_PROXY: "https://tcs-telegram-proxy.sumitshrivas24.workers.dev",
  ADMIN_EMAIL: "overactingofficial7@gmail.com"
};

const AI_CONFIG = {
  PROXY_URL: "https://tcs-ai-proxy.sumitshrivas24.workers.dev",
  MAX_WORDS: 40
};

const IMGBB_KEY = '42eeb26299ccd04102779f92f5db31cf';

let currentUser = null;
let userProfile = null;
let activeTab = 'home';
let userDoubts = [];
let doubtFilter = 'all';
let currentAnswerDoubtId = null;
let expertDoubtFilter = 'open';

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

window.closeModal = function(id) {
  const el = $(id);
  if (el) el.classList.remove('show');
  document.body.style.overflow = '';
};
window.openModal = function(id) {
  const el = $(id);
  if (el) el.classList.add('show');
  document.body.style.overflow = 'hidden';
};

function formatTime(ts) {
  if (!ts) return 'Just now';
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ══════════════════════════════════════════════════════════════
   IMAGE UPLOAD — ImgBB
   ══════════════════════════════════════════════════════════════ */
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Not an image file'));
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
          },
          'image/jpeg', quality
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File read failed'));
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
  try {
    const compressed = await compressImage(file, 1200, 0.8);
    const base64 = await fileToBase64(compressed);
    const base64Data = base64.split(',')[1];

    const formData = new FormData();
    formData.append('image', base64Data);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Upload failed');
    console.log('✅ Uploaded to ImgBB:', data.data.url);
    return data.data.url;
  } catch (err) {
    console.error('❌ ImgBB upload error:', err);
    throw new Error('Image upload failed: ' + err.message);
  }
}

/* ─────────────── SECTION 3: AUTH ─────────────── */
$('googleSignInBtn')?.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    $('loginError').style.display = 'none';
    await auth.signInWithPopup(provider);
  } catch (err) {
    console.error('Sign in error:', err);
    $('loginError').textContent = err.message;
    $('loginError').style.display = 'block';
  }
});

$('signOutBtn')?.addEventListener('click', () => {
  if (confirm('Sign out?')) {
    userProfile = null;
    userDoubts = [];
    currentUser = null;
    auth.signOut();
  }
});

const authTimeout = setTimeout(() => {
  if (!currentUser) {
    const loader = $('bootLoader');
    if (loader) loader.classList.add('hide');
    const ls = $('loginScreen');
    if (ls) { ls.style.display = 'flex'; ls.classList.remove('hide'); }
  }
}, 3000);

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
  if (ls) { ls.classList.add('hide'); }
  const app = $('app');
  if (app) app.style.display = 'block';
  setTimeout(() => { if (ls) ls.style.display = 'none'; }, 500);
  const loader = $('bootLoader');
  if (loader) loader.classList.add('hide');
}
function showLogin() {
  const ls = $('loginScreen');
  const app = $('app');
  if (ls) ls.style.display = 'flex';
  if (app) app.style.display = 'none';
  setTimeout(() => { if (ls) ls.classList.remove('hide'); }, 50);
  const loader = $('bootLoader');
  if (loader) loader.classList.add('hide');
}

/* ─────────────── SECTION 4: USER PROFILE ─────────────── */
async function ensureUserProfile(user) {
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'User',
      photoURL: user.photoURL || '',
      role: 'student',
      class: '',
      bio: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      doubtsAsked: 0,
      doubtsSolved: 0,
      rating: 0
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
  const name = userProfile.name || 'User';
  const avatar = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`;

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

  updateExpertPanelVisibility();
}

$('userMenuBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  $('userDropdown')?.classList.toggle('show');
});
document.addEventListener('click', () => {
  const dd = $('userDropdown');
  if (dd) dd.classList.remove('show');
});
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

/* ─────────────── SECTION 5: TAB SWITCHING ─────────────── */
window.switchToTab = function(tabId) {
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const target = $(tabId);
  if (target) target.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');
  activeTab = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'doubts') { loadDoubts(); updateLiveExperts(); }
  if (tabId === 'experts') loadExperts();
  if (tabId === 'expertDashboard') loadExpertDashboard();
};

document.addEventListener('click', (e) => {
  const navBtn = e.target.closest('.nav-item[data-tab]');
  if (navBtn) switchToTab(navBtn.dataset.tab);
  const gotoBtn = e.target.closest('[data-goto]');
  if (gotoBtn) {
    switchToTab(gotoBtn.dataset.goto);
    const dd = $('userDropdown');
    if (dd) dd.classList.remove('show');
  }
});

/* ─────────────── SECTION 6: EXPERTS ─────────────── */
const EXPERT_SECTIONS = [
  { id:'school', title:'Class 1 to 10', icon:'fa-school', color:'linear-gradient(135deg,#3b82f6,#2563eb)', desc:'Foundation subjects: Maths, Science, English' },
  { id:'senior', title:'Class 11 to 12', icon:'fa-book-open', color:'linear-gradient(135deg,#8b5cf6,#7c3aed)', desc:'PCM, PCB, Commerce, Arts' },
  { id:'jee-neet', title:'JEE & NEET', icon:'fa-bullseye', color:'linear-gradient(135deg,#f59e0b,#d97706)', desc:'Competitive exam preparation' },
  { id:'college', title:'College & Advanced', icon:'fa-graduation-cap', color:'linear-gradient(135deg,#10b981,#059669)', desc:'B.Tech, BSc, MSc, advanced topics' }
];

async function loadExperts() {
  const container = $('expertSections');
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading experts…</p></div>';

  try {
    const snap = await db.collection('experts').where('verified', '==', true).limit(100).get();
    const experts = [];
    snap.forEach(d => experts.push({ id: d.id, ...d.data() }));

    container.innerHTML = EXPERT_SECTIONS.map(section => {
      const sectionExperts = experts.filter(e => e.section === section.id);
      const expertsHtml = sectionExperts.length
        ? sectionExperts.map(e => expertCardHtml(e)).join('')
        : '<div class="empty-state" style="padding:1.5rem;grid-column:1/-1;"><p style="font-size:.82rem;color:var(--text-muted);">No experts yet in this section. <button class="btn-ghost" style="padding:.3rem .8rem;font-size:.78rem;margin-left:.5rem;" onclick="becomeExpert(\''+section.id+'\')">Become one</button></p></div>';

      return `
        <div class="expert-section">
          <div class="expert-section-header">
            <div class="expert-section-title">
              <div class="expert-section-icon" style="background:${section.color}">
                <i class="fa-solid ${section.icon}"></i>
              </div>
              <div>
                <div>${section.title}</div>
                <div class="expert-section-meta">${section.desc}</div>
              </div>
            </div>
            <div class="expert-section-meta">${sectionExperts.length} expert${sectionExperts.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="experts-grid">${expertsHtml}</div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Could not load experts</h4><p>' + escapeHtml(err.message) + '</p></div>';
  }
}
window.loadExperts = loadExperts;

function expertCardHtml(e) {
  const avatar = e.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name || 'Expert')}&background=2563eb&color=fff`;
  const rating = e.rating ? e.rating.toFixed(1) : 'New';
  const subjects = (e.subjects || []).slice(0, 3);
  return `
    <div class="expert-card">
      <div class="expert-top">
        <img class="expert-avatar" src="${escapeHtml(avatar)}" alt="">
        <div>
          <div class="expert-name">${escapeHtml(e.name || 'Expert')}</div>
          <div class="expert-title">${escapeHtml(e.title || 'Subject Expert')}</div>
        </div>
      </div>
      <div class="expert-rating"><i class="fa-solid fa-star"></i> ${rating} ${e.totalRatings ? `(${e.totalRatings})` : ''}</div>
      <div class="expert-subjects">
        ${subjects.map(s => `<span class="expert-subject-tag">${escapeHtml(s)}</span>`).join('')}
      </div>
      <div class="expert-actions">
        <button onclick="requestDoubt('${e.id}')">Ask Doubt</button>
      </div>
    </div>`;
}

window.becomeExpert = function(sectionId) {
  const section = EXPERT_SECTIONS.find(s => s.id === sectionId);
  if (!section) return;
  if (!confirm(`Apply as an expert for "${section.title}"?`)) return;

  db.collection('experts').doc(currentUser.uid).set({
    uid: currentUser.uid,
    name: userProfile.name,
    email: userProfile.email,
    photoURL: userProfile.photoURL,
    section: sectionId,
    title: 'Subject Expert',
    subjects: [],
    rating: 0,
    totalRatings: 0,
    verified: false,
    status: 'pending',
    appliedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    toast('success', 'Application submitted!', 'Admin will verify you within 24 hours.');
  }).catch(err => toast('warn', 'Failed', err.message));
};

window.requestDoubt = function(expertId) {
  switchToTab('doubts');
  setTimeout(() => openModal('newDoubtModal'), 300);
};

const becomeExpertBtn = $('becomeExpertBtn');
if (becomeExpertBtn) {
  becomeExpertBtn.addEventListener('click', () => {
    if (userProfile?.role === 'expert') {
      toast('info', 'You are already an expert!');
      switchToTab('expertDashboard');
      return;
    }
    switchToTab('experts');
    toast('info', 'Pick a section', 'Click "Become one" under the section you want to teach.');
  });
}

/* ─────────────── SECTION 7: DOUBTS ─────────────── */
async function loadDoubts() {
  const grid = $('doubtsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  try {
    const snap = await db.collection('doubts')
      .where('userId', '==', currentUser.uid)
      .limit(100)
      .get();

    userDoubts = [];
    snap.forEach(d => userDoubts.push({ id: d.id, ...d.data() }));

    userDoubts.sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime() || 0;
      return tb - ta;
    });

    if (doubtFilter !== 'all') {
      userDoubts = userDoubts.filter(d => d.status === doubtFilter);
    }

    if (!userDoubts.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><h4>No doubts yet</h4><p>Click "Ask New Doubt" to get started</p></div>';
      return;
    }

    grid.innerHTML = userDoubts.map(d => `
      <div class="doubt-card" onclick="viewDoubt('${d.id}')">
        <div class="doubt-header">
          <span class="doubt-subject"><i class="fa-solid fa-book"></i> ${escapeHtml(d.subject)}</span>
          <span class="doubt-status ${d.status}">${d.status}</span>
        </div>
        <div class="doubt-question">${escapeHtml(d.question)}</div>
        <div class="doubt-meta">
          <span><i class="fa-solid fa-clock"></i> ${formatTime(d.createdAt?.toDate?.()?.getTime())}</span>
          ${d.answerCount ? `<span><i class="fa-solid fa-comments"></i> ${d.answerCount} answers</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Error loading doubts</h4><p>' + escapeHtml(err.message) + '</p></div>';
  }
}
window.loadDoubts = loadDoubts;

$$('#doubtFilters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    $$('#doubtFilters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    doubtFilter = chip.dataset.status;
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
    $('doubtImagePreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:150px;border-radius:8px;margin-top:8px;">`;
  };
  reader.readAsDataURL(file);
});

$('postDoubtBtn')?.addEventListener('click', async () => {
  const subject = $('doubtSubject').value;
  const doubtClass = $('doubtClass').value;
  const question = $('doubtQuestion').value.trim();
  const imageFile = $('doubtImage').files[0];

  if (!question) { toast('warn', 'Please type your question'); return; }

  const btn = $('postDoubtBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading…';

  try {
    let imageUrl = '';
    if (imageFile) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading image…';
      imageUrl = await uploadToImgBB(imageFile);
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting…';

    const newDoc = await db.collection('doubts').add({
      userId: currentUser.uid,
      userName: userProfile.name,
      userPhoto: userProfile.photoURL || '',
      subject, class: doubtClass, question, imageUrl,
      status: 'open',
      answerCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(currentUser.uid).update({
      doubtsAsked: firebase.firestore.FieldValue.increment(1)
    }).catch(() => {});

    toast('success', 'Doubt posted!', 'An expert will answer soon.');
    closeModal('newDoubtModal');
    $('doubtQuestion').value = '';
    $('doubtImage').value = '';
    $('doubtImagePreview').innerHTML = '';
    loadDoubts();

    // Auto-open the doubt + trigger AI answer
    setTimeout(() => viewDoubt(newDoc.id), 400);
  } catch (err) {
    console.error(err);
    toast('warn', 'Failed to post', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post Doubt';
  }
});

/* ─────────────── SECTION 8: STATS ─────────────── */
async function loadStats() {
  try {
    const [doubtsCount, expertsCount, usersCount] = await Promise.all([
      db.collection('doubts').count().get(),
      db.collection('experts').where('verified', '==', true).count().get(),
      db.collection('users').count().get()
    ]);
    if ($('statDoubts')) $('statDoubts').textContent = doubtsCount.data().count;
    if ($('statExperts')) $('statExperts').textContent = expertsCount.data().count;
    if ($('statStudents')) $('statStudents').textContent = usersCount.data().count;
  } catch (err) {
    console.warn('Stats error:', err);
  }

  if ($('miniDoubts')) $('miniDoubts').textContent = userProfile?.doubtsAsked || 0;
  if ($('miniSolved')) $('miniSolved').textContent = userProfile?.doubtsSolved || 0;
  if ($('miniRating')) $('miniRating').textContent = userProfile?.rating ? userProfile.rating.toFixed(1) : '—';
}

/* ─────────────── SECTION 9: EXPERT DASHBOARD ─────────────── */
function updateExpertPanelVisibility() {
  const isExpert = userProfile?.role === 'expert' || userProfile?.role === 'admin';
  const btn = $('navExpertDashboard');
  if (btn) btn.style.display = isExpert ? 'flex' : 'none';
}

async function loadExpertDashboard() {
  if (userProfile?.role !== 'expert' && userProfile?.role !== 'admin') {
    toast('warn', 'Access denied', 'Only experts can access this panel.');
    switchToTab('home');
    return;
  }

  try {
    const snap = await db.collection('doubts').limit(500).get();
    let openCount = 0, answeredCount = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data.status === 'open') openCount++;
      if (data.answeredBy === currentUser.uid) answeredCount++;
    });
    if ($('esOpenCount')) $('esOpenCount').textContent = openCount;
    if ($('esAnsweredCount')) $('esAnsweredCount').textContent = answeredCount;
    if ($('esRating')) $('esRating').textContent = userProfile.rating ? userProfile.rating.toFixed(1) : '—';
    if ($('esEarnings')) $('esEarnings').textContent = '₹' + (userProfile.earnings || 0);
  } catch (err) {
    console.warn('Stats failed:', err);
  }

  loadExpertDoubts();
}
window.loadExpertDashboard = loadExpertDashboard;

async function loadExpertDoubts() {
  const list = $('expertDoubtsList');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  try {
    let snap;
    if (expertDoubtFilter === 'open') {
      snap = await db.collection('doubts').where('status', '==', 'open').limit(50).get();
    } else if (expertDoubtFilter === 'answered') {
      snap = await db.collection('doubts').where('answeredBy', '==', currentUser.uid).limit(50).get();
    } else {
      snap = await db.collection('doubts').limit(50).get();
    }

    const doubts = [];
    snap.forEach(d => doubts.push({ id: d.id, ...d.data() }));

    doubts.sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime() || 0;
      return tb - ta;
    });

    if (!doubts.length) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><h4>No doubts found</h4><p>Check back later!</p></div>';
      return;
    }

    list.innerHTML = doubts.map(d => expertDoubtCardHtml(d)).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Error loading</h4><p>' + escapeHtml(err.message) + '</p></div>';
  }
}

function expertDoubtCardHtml(d) {
  const avatar = d.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.userName || 'Student')}&background=2563eb&color=fff`;
  const when = d.createdAt?.toDate?.() ? formatTime(d.createdAt.toDate().getTime()) : 'Just now';
  const isAnswered = d.status === 'answered';
  const isMine = d.answeredBy === currentUser.uid;

  return `
    <div class="expert-doubt-card">
      <div class="doubt-header">
        <span class="doubt-subject"><i class="fa-solid fa-book"></i> ${escapeHtml(d.subject || 'General')}</span>
        <span class="doubt-status ${d.status}">${d.status}</span>
      </div>
      <div class="student-info">
        <img src="${escapeHtml(avatar)}" alt="">
        <span>${escapeHtml(d.userName || 'Student')}</span>
        <span style="margin-left:auto;font-size:.72rem;color:var(--text-muted)">${when}</span>
      </div>
      <div class="edc-question">${escapeHtml(d.question || '')}</div>
      ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" style="max-width:100%;border-radius:8px;margin-bottom:.7rem;cursor:pointer" onclick="openImageViewer('${escapeHtml(d.imageUrl)}')">` : ''}
      <div class="edc-actions">
        ${!isAnswered ? `
          <button class="primary" onclick="viewDoubt('${d.id}')">
            <i class="fa-solid fa-eye"></i> View
          </button>
        ` : isMine ? `
          <button disabled style="cursor:default">
            <i class="fa-solid fa-check" style="color:var(--success)"></i> You answered
          </button>
        ` : `
          <button disabled style="cursor:default;opacity:.6">
            <i class="fa-solid fa-check"></i> Answered
          </button>
        `}
      </div>
    </div>
  `;
}

document.addEventListener('click', (e) => {
  const chip = e.target.closest('#expertDoubtFilters .chip');
  if (chip) {
    $$('#expertDoubtFilters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    expertDoubtFilter = chip.dataset.status;
    loadExpertDoubts();
  }
});

/* ══════════════════════════════════════════════════════════════
   AI EXPERT SYSTEM
   ══════════════════════════════════════════════════════════════ */
const EXPERT_POOL = [
  { name: 'Dr. Rajesh Sharma', title: 'Physics & Mathematics', exp: 12, subject: 'PCM' },
  { name: 'Prof. Anjali Verma', title: 'Chemistry Specialist', exp: 9, subject: 'Chemistry' },
  { name: 'Dr. Vikram Mehta', title: 'IIT-JEE Physics', exp: 15, subject: 'Physics' },
  { name: 'Ms. Priya Nair', title: 'Biology & NEET Expert', exp: 7, subject: 'Biology' },
  { name: 'Mr. Arun Patel', title: 'Mathematics Professor', exp: 11, subject: 'Mathematics' },
  { name: 'Dr. Sneha Reddy', title: 'Organic Chemistry', exp: 10, subject: 'Chemistry' },
  { name: 'Prof. Karan Singh', title: 'Computer Science', exp: 8, subject: 'CS' },
  { name: 'Ms. Meera Iyer', title: 'English Literature', exp: 6, subject: 'English' },
  { name: 'Dr. Aditya Joshi', title: 'Physics Olympiad Coach', exp: 14, subject: 'Physics' },
  { name: 'Prof. Neha Gupta', title: 'NEET Biology', exp: 9, subject: 'Biology' },
  { name: 'Mr. Rohan Malhotra', title: 'JEE Mathematics', exp: 13, subject: 'Mathematics' },
  { name: 'Dr. Kavita Desai', title: 'Inorganic Chemistry', exp: 12, subject: 'Chemistry' },
  { name: 'Prof. Suresh Kumar', title: 'Physics & Math', exp: 18, subject: 'PCM' },
  { name: 'Ms. Ananya Bose', title: 'Science & English', exp: 5, subject: 'General' },
  { name: 'Dr. Harsh Vardhan', title: 'Advanced Mathematics', exp: 16, subject: 'Mathematics' },
  { name: 'Prof. Ritu Agarwal', title: 'Biology & Zoology', exp: 10, subject: 'Biology' },
  { name: 'Mr. Nikhil Chopra', title: 'Physics IIT', exp: 8, subject: 'Physics' },
  { name: 'Dr. Pooja Saxena', title: 'Chemistry PhD', exp: 11, subject: 'Chemistry' },
  { name: 'Prof. Manish Tiwari', title: 'Maths & Stats', exp: 13, subject: 'Mathematics' },
  { name: 'Dr. Sunita Kapoor', title: 'Senior Biology Expert', exp: 17, subject: 'Biology' }
];

function getRandomExperts(count = 20) {
  return [...EXPERT_POOL].sort(() => Math.random() - 0.5).slice(0, count);
}

function getSessionExperts() {
  const key = 'tcs_experts_' + (currentUser?.uid || 'guest');
  let stored = null;
  try { stored = JSON.parse(sessionStorage.getItem(key)); } catch(e) {}
  if (!stored || !Array.isArray(stored) || stored.length < 15) {
    stored = getRandomExperts(20);
    try { sessionStorage.setItem(key, JSON.stringify(stored)); } catch(e) {}
  }
  return stored;
}

function pickExpertForDoubt() {
  const sessionExperts = getSessionExperts();
  return sessionExperts[Math.floor(Math.random() * sessionExperts.length)];
}

function expertAvatarUrl(expert) {
  const colors = ['2563eb', '7c3aed', '059669', 'd97706', 'dc2626', '0891b2'];
  const color = colors[Math.abs(hashCode(expert.name)) % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=${color}&color=fff&bold=true&size=128`;
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i);
  return h;
}

async function getAIAnswer(question, subject, cls) {
  const expert = pickExpertForDoubt();

  const res = await fetch(AI_CONFIG.PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: question,
      subject: subject,
      class: cls,
      expertName: expert.name,
      expertExp: expert.exp
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('AI service error: ' + errText.slice(0, 150));
  }

  const data = await res.json();
  if (!data.ok || !data.answer) {
    throw new Error(data.error || 'No answer received');
  }

  let answer = data.answer.trim();


  return { answer, expert };
}

function typeWriter(element, text, speed = 22) {
  return new Promise(resolve => {
    element.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'ai-cursor';
    element.appendChild(cursor);

    let i = 0;
    const textNode = document.createTextNode('');
    element.insertBefore(textNode, cursor);

    function type() {
      if (i < text.length) {
        textNode.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        setTimeout(() => {
          cursor.remove();
          resolve();
        }, 400);
      }
    }
    type();
  });
}

/* ─── View Doubt + AI Answer ─── */
window.viewDoubt = async function(id) {
  const modalEl = $('doubtDetailsModal');
  const bodyEl = $('doubtDetailsBody');
  if (!modalEl || !bodyEl) {
    toast('warn', 'Error', 'Modal not found. Please refresh.');
    return;
  }

  modalEl.classList.add('show');
  document.body.style.overflow = 'hidden';
  bodyEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  try {
    const doc = await db.collection('doubts').doc(id).get();
    if (!doc.exists) {
      bodyEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Doubt not found</h4></div>';
      return;
    }
    const d = doc.data();

    let answersSnap;
    try {
      answersSnap = await db.collection('doubts').doc(id).collection('answers')
        .orderBy('createdAt', 'asc').get();
    } catch (e) {
      answersSnap = { empty: true, size: 0, docs: [] };
    }

    let answersHtml = '';
    if (!answersSnap.empty) {
      answersHtml = answersSnap.docs.map(ansDoc => {
        const a = ansDoc.data();
        const expert = a.expert || { name: a.expertName || 'Expert', title: 'Subject Expert', exp: 10 };
        const avatar = expertAvatarUrl(expert);
        return `
          <div class="ai-answer-card">
            <div class="ai-answer-header">
              <img src="${avatar}" alt="" onclick="showExpertProfile('${escapeHtml(expert.name)}', ${expert.exp || 10}, '${escapeHtml(expert.title || '')}')" style="cursor:pointer">
              <div>
                <div class="name" onclick="showExpertProfile('${escapeHtml(expert.name)}', ${expert.exp || 10}, '${escapeHtml(expert.title || '')}')" style="cursor:pointer;color:var(--accent-primary)">${escapeHtml(expert.name)}</div>
                <div class="title">${escapeHtml(expert.title)} • ${expert.exp || 10}+ yrs exp</div>
              </div>
              <span class="ai-badge" style="margin-left:auto"><i class="fa-solid fa-shield-halved"></i> Trusted</span>
            </div>
            <div class="ai-answer-text">${escapeHtml(a.text || '')}</div>
            ${a.imageUrl ? `<img src="${escapeHtml(a.imageUrl)}" style="max-width:100%;border-radius:8px;margin-top:.8rem;cursor:pointer" onclick="openImageViewer('${escapeHtml(a.imageUrl)}')">` : ''}
            <div class="ai-answer-footer">
              <button onclick="copyAnswer(this, ${JSON.stringify(a.text || '')})"><i class="fa-regular fa-copy"></i> Copy</button>
              <button onclick="markHelpful('${id}')"><i class="fa-regular fa-thumbs-up"></i> Helpful</button>
            </div>
          </div>
        `;
      }).join('');
    }

    bodyEl.innerHTML = `
      <div class="original-doubt">
        <div class="od-header">
          <span class="doubt-subject"><i class="fa-solid fa-book"></i> ${escapeHtml(d.subject || 'General')}</span>
          <span class="doubt-status ${d.status || 'open'}">${d.status || 'open'}</span>
        </div>
        <div class="od-question">${escapeHtml(d.question || '')}</div>
        ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" style="max-width:100%;border-radius:8px;margin-top:.6rem;cursor:pointer" onclick="openImageViewer('${escapeHtml(d.imageUrl)}')">` : ''}
      </div>
      <h4 style="margin-bottom:.8rem;display:flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-comments" style="color:var(--accent-primary)"></i>
        Expert Answer
      </h4>
      <div id="answerArea">${answersHtml}</div>
    `;

    if (answersSnap.empty) {
      setTimeout(() => generateAndShowAIAnswer(id, d), 400);
    }
  } catch (err) {
    console.error('viewDoubt error:', err);
    bodyEl.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h4>Could not load doubt</h4>
        <p>${escapeHtml(err.message)}</p>
        <button class="btn-primary" style="margin-top:1rem" onclick="closeModal('doubtDetailsModal')">Close</button>
      </div>
    `;
  }
};

async function generateAndShowAIAnswer(doubtId, doubtData) {
  const area = $('answerArea');
  if (!area) return;

  area.innerHTML = `
    <div class="ai-answer-card">
      <div class="ai-thinking">
        <i class="fa-solid fa-brain" style="color:var(--accent-secondary)"></i>
        <span>An expert is thinking</span>
        <span class="ai-thinking-dots"><span></span><span></span><span></span></span>
      </div>
    </div>
  `;

  try {
    const { answer, expert } = await getAIAnswer(
      doubtData.question,
      doubtData.subject,
      doubtData.class || 'General'
    );

    const avatar = expertAvatarUrl(expert);

    area.innerHTML = `
      <div class="ai-answer-card">
        <div class="ai-answer-header">
          <img src="${avatar}" alt="" onclick="showExpertProfile('${escapeHtml(expert.name)}', ${expert.exp}, '${escapeHtml(expert.title)}')" style="cursor:pointer">
          <div>
            <div class="name" onclick="showExpertProfile('${escapeHtml(expert.name)}', ${expert.exp}, '${escapeHtml(expert.title)}')" style="cursor:pointer;color:var(--accent-primary)">${escapeHtml(expert.name)}</div>
            <div class="title">${escapeHtml(expert.title)} • ${expert.exp}+ yrs exp</div>
          </div>
          <span class="ai-badge" style="margin-left:auto"><i class="fa-solid fa-shield-halved"></i> Trusted</span>
        </div>
        <div class="ai-answer-text" id="typewriterText"></div>
        <div class="ai-answer-footer" id="aiFooter" style="display:none">
          <button onclick="copyAnswer(this, ${JSON.stringify(answer)})"><i class="fa-regular fa-copy"></i> Copy</button>
          <button onclick="markHelpful('${doubtId}')"><i class="fa-regular fa-thumbs-up"></i> Helpful</button>
        </div>
      </div>
    `;

    await typeWriter($('typewriterText'), answer, 22);

    const footer = $('aiFooter');
    if (footer) footer.style.display = 'flex';

    try {
      await db.collection('doubts').doc(doubtId).collection('answers').add({
        expertName: expert.name,
        expertTitle: expert.title,
        expert: { name: expert.name, title: expert.title, exp: expert.exp },
        text: answer,
        imageUrl: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        helpful: 0
      });

      await db.collection('doubts').doc(doubtId).update({
        status: 'answered',
        answeredByName: expert.name,
        answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
        answerCount: firebase.firestore.FieldValue.increment(1)
      });

      await db.collection('users').doc(currentUser.uid).update({
        doubtsSolved: firebase.firestore.FieldValue.increment(1)
      }).catch(() => {});
    } catch (saveErr) {
      console.warn('Save failed:', saveErr);
    }
  } catch (err) {
    console.error('AI Generation Error:', err);
    area.innerHTML = `
      <div class="ai-answer-card">
        <div style="color:var(--danger);display:flex;align-items:flex-start;gap:8px;">
          <i class="fa-solid fa-triangle-exclamation" style="margin-top:2px"></i>
          <div>
            <div style="font-weight:600;margin-bottom:4px">Could not generate answer</div>
            <div style="font-size:.78rem;color:var(--text-muted);font-family:var(--font-mono);word-break:break-all">
              ${escapeHtml(err.message)}
            </div>
          </div>
        </div>
        <button class="btn-ghost" style="margin-top:.8rem" onclick="viewDoubt('${doubtId}')">
          <i class="fa-solid fa-rotate-right"></i> Retry
        </button>
      </div>
    `;
  }
}

window.copyAnswer = function(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  });
};

window.markHelpful = function(doubtId) {
  toast('success', 'Thanks!', 'Marked as helpful');
};

/* ─── Expert Profile Modal ─── */
window.showExpertProfile = function(name, exp, title) {
  const expert = EXPERT_POOL.find(e => e.name === name) || { name, exp, title, subject: 'General' };
  const avatar = expertAvatarUrl(expert);
  const solved = 500 + Math.floor(Math.random() * 2000);
  const rating = (4.5 + Math.random() * 0.5).toFixed(1);
  const students = 1000 + Math.floor(Math.random() * 5000);

  if ($('expertProfileBody')) {
    $('expertProfileBody').innerHTML = `
      <div class="expert-profile-header">
        <img src="${avatar}" alt="">
        <h4>${escapeHtml(name)}</h4>
        <p>${escapeHtml(title || 'Subject Expert')}</p>
      </div>
      <div class="expert-stats-grid">
        <div class="expert-stat-box">
          <div class="v">${exp}+</div>
          <div class="l">Years Exp</div>
        </div>
        <div class="expert-stat-box">
          <div class="v">${solved}</div>
          <div class="l">Doubts Solved</div>
        </div>
        <div class="expert-stat-box">
          <div class="v">${rating}★</div>
          <div class="l">Rating</div>
        </div>
      </div>
      <div class="expert-bio">
        <strong><i class="fa-solid fa-quote-left"></i> About</strong>
        ${escapeHtml(name)} is a highly experienced ${escapeHtml(expert.subject || 'subject')} expert with ${exp} years of teaching experience.
        Has helped over ${students.toLocaleString('en-IN')} students crack their exams.
      </div>
    `;
  }
  openModal('expertProfileModal');
};

/* ─── Live Experts Bar ─── */
function updateLiveExperts() {
  const sessionExperts = getSessionExperts();
  const onlineCount = 8 + Math.floor(Math.random() * 8);

  if ($('liveCount')) $('liveCount').textContent = onlineCount;

  if ($('liveAvatars')) {
    const shown = sessionExperts.slice(0, 5);
    $('liveAvatars').innerHTML = shown.map((e, i) => 
      `<img src="${expertAvatarUrl(e)}" alt="${escapeHtml(e.name)}" title="${escapeHtml(e.name)}" style="animation-delay:${i * 0.08}s">`
    ).join('');
  }
}

setInterval(() => {
  if ($('liveCount') && activeTab === 'doubts') {
    const newCount = 8 + Math.floor(Math.random() * 8);
    $('liveCount').textContent = newCount;
  }
}, 8000);

/* ─────────────── SECTION 10: IMAGE VIEWER ─────────────── */
window.openImageViewer = function(url) {
  if ($('viewerImage')) $('viewerImage').src = url;
  openModal('imageViewerModal');
};

/* ─────────────── SECTION 11: KEYBOARD SHORTCUTS ─────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => {
      m.classList.remove('show');
    });
    document.body.style.overflow = '';
  }
});

/* ─────────────── SECTION 12: SCROLL + BACK TO TOP ─────────────── */
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  const sp = $('scrollProgress');
  if (sp) sp.style.width = scrolled + '%';

  const btt = $('backToTop');
  if (btt) {
    if (h.scrollTop > 400) btt.classList.add('show');
    else btt.classList.remove('show');
  }
});

$('backToTop')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ══════════════════════════════════════════════════════════════
   TASKS SYSTEM
   ══════════════════════════════════════════════════════════════ */
let tasks = [];
let currentTaskIndex = 0;
let taskTimerStart = 0;
let taskTimerInterval = null;
let totalTaskTime = 0;
let victoryConfettiAnim = null;
let taskSeconds = 0;

function loadTasks() {
  const key = 'tcs_tasks_' + (currentUser?.uid || 'guest');
  try { tasks = JSON.parse(localStorage.getItem(key)) || []; }
  catch { tasks = []; }
  renderTasks();
}

function saveTasks() {
  const key = 'tcs_tasks_' + (currentUser?.uid || 'guest');
  try { localStorage.setItem(key, JSON.stringify(tasks)); } catch {}
}

function renderTasks() {
  const list = $('tasksList');
  if (!list) return;

  if (!tasks.length) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clipboard-list"></i>
        <h4>No tasks yet</h4>
        <p>Add your first task above to get started</p>
      </div>`;
  } else {
    list.innerHTML = tasks.map((t, i) => `
      <div class="task-item ${t.done ? 'done' : ''}">
        <div class="task-num">${i + 1}</div>
        <div class="task-text">${escapeHtml(t.text)}</div>
        <div class="task-actions">
          <button class="delete-btn" onclick="deleteTask(${i})" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  const startBtn = $('startTasksBtn');
  if (startBtn) startBtn.disabled = tasks.length === 0;
}

window.deleteTask = function(i) {
  tasks.splice(i, 1);
  saveTasks();
  renderTasks();
};

$('addTaskBtn')?.addEventListener('click', () => {
  const input = $('taskInput');
  const text = input.value.trim();
  if (!text) { toast('warn', 'Please enter a task'); return; }
  if (tasks.length >= 20) { toast('warn', 'Max 20 tasks'); return; }
  tasks.push({ text, done: false, timeSpent: 0 });
  input.value = '';
  saveTasks();
  renderTasks();
  toast('success', 'Task added!');
});

$('taskInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('addTaskBtn').click();
});

$('clearTasksBtn')?.addEventListener('click', () => {
  if (!tasks.length) return;
  if (!confirm('Clear all tasks?')) return;
  tasks = [];
  saveTasks();
  renderTasks();
  toast('success', 'Tasks cleared');
});

$('startTasksBtn')?.addEventListener('click', () => {
  if (!tasks.length) return;
  currentTaskIndex = 0;
  totalTaskTime = 0;
  openTaskFocus();
});

function openTaskFocus() {
  const overlay = $('taskFocusOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  renderTaskFocus();
  startTaskTimer();
}

function closeTaskFocus() {
  const overlay = $('taskFocusOverlay');
  if (overlay) overlay.classList.remove('show');
  document.body.style.overflow = '';
  stopTaskTimer();
}

$('closeFocusBtn')?.addEventListener('click', closeTaskFocus);

function renderTaskFocus() {
  const total = tasks.length;
  const step = currentTaskIndex + 1;
  if ($('currentStepNum')) $('currentStepNum').textContent = step;
  if ($('totalStepNum')) $('totalStepNum').textContent = total;
  if ($('taskCurrentText')) $('taskCurrentText').textContent = tasks[currentTaskIndex]?.text || '';

  const prev = $('prevTaskBtn');
  if (prev) prev.disabled = currentTaskIndex === 0;

  const next = $('nextTaskBtn');
  if (next) {
    if (currentTaskIndex === total - 1) {
      next.innerHTML = 'Finish <i class="fa-solid fa-flag-checkered"></i>';
    } else {
      next.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
    }
  }
}

$('prevTaskBtn')?.addEventListener('click', () => {
  if (currentTaskIndex > 0) {
    if (tasks[currentTaskIndex]) {
      tasks[currentTaskIndex].timeSpent = (tasks[currentTaskIndex].timeSpent || 0) + (Date.now() - taskTimerStart);
    }
    currentTaskIndex--;
    resetTaskTimer();
    renderTaskFocus();
  }
});

$('nextTaskBtn')?.addEventListener('click', () => {
  if (tasks[currentTaskIndex]) {
    tasks[currentTaskIndex].timeSpent = (tasks[currentTaskIndex].timeSpent || 0) + (Date.now() - taskTimerStart);
    tasks[currentTaskIndex].done = true;
  }
  totalTaskTime += Date.now() - taskTimerStart;

  if (currentTaskIndex === tasks.length - 1) {
    saveTasks();
    stopTaskTimer();
    closeTaskFocus();
    showVictory();
  } else {
    currentTaskIndex++;
    resetTaskTimer();
    renderTaskFocus();
  }
});

function startTaskTimer() {
  taskTimerStart = Date.now();
  taskSeconds = 0;
  updateTaskTimerDisplay(0);
  stopTaskTimer();
  taskTimerInterval = setInterval(() => {
    taskSeconds++;
    updateTaskTimerDisplay(taskSeconds);
  }, 1000);
}

function stopTaskTimer() {
  if (taskTimerInterval) {
    clearInterval(taskTimerInterval);
    taskTimerInterval = null;
  }
}

function resetTaskTimer() {
  stopTaskTimer();
  taskTimerStart = Date.now();
  taskSeconds = 0;
  updateTaskTimerDisplay(0);
  startTaskTimer();
}

function updateTaskTimerDisplay(secs) {
  if ($('taskTimerText')) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    $('taskTimerText').textContent = `${m}:${s}`;
  }
  const fill = $('timerFill');
  if (fill) {
    const circumference = 565.48;
    const progress = (secs % 60) / 60;
    fill.style.strokeDashoffset = circumference * (1 - progress);
  }
}

function showVictory() {
  const totalSecs = Math.floor(totalTaskTime / 1000);
  const m = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  if ($('victoryTotalTime')) $('victoryTotalTime').textContent = `${m}:${s}`;
  const v = $('victoryOverlay');
  if (v) v.classList.add('show');
  launchVictoryConfetti();
}

$('victoryCloseBtn')?.addEventListener('click', () => {
  const v = $('victoryOverlay');
  if (v) v.classList.remove('show');
  document.body.style.overflow = '';
  if (victoryConfettiAnim) cancelAnimationFrame(victoryConfettiAnim);
});

function launchVictoryConfetti() {
  const canvas = $('victoryConfetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#fde68a'];
  const pieces = [];
  for (let i = 0; i < 150; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      p.vy += 0.05;

      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
        p.vy = 2 + Math.random() * 4;
      }
    });
    victoryConfettiAnim = requestAnimationFrame(draw);
  }
  draw();
}

/* ─────────────── SECTION 13: INIT APP ─────────────── */
function initApp() {
  loadStats();
  updateUserUI();
  loadTasks();
  updateLiveExperts();
}

/* ─────────────── SECTION 14: BOOT ─────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = $('bootLoader');
    if (loader) loader.classList.add('hide');
  }, 1500);
});

console.log('🚀 The Chairman Show — App Loaded Successfully');
/* ══════════════════════════════════════════════════════════════
   ADMIN PANEL + LIVE WORKSHOPS SYSTEM
   ══════════════════════════════════════════════════════════════ */

let currentManageWorkshopId = null;
let allWorkshopsCache = [];
let allRequestsCache = [];

/* ─── Admin Visibility Check ─── */
function isAdmin() {
  return userProfile?.role === 'admin';
}

function updateAdminVisibility() {
  const adminNav = $('navAdmin');
  if (adminNav) {
    adminNav.style.display = isAdmin() ? 'flex' : 'none';
  }
}

/* ─── Load Admin Dashboard ─── */
async function loadAdminDashboard() {
  if (!isAdmin()) {
    toast('warn', 'Access denied', 'Only admins can access this panel.');
    switchToTab('home');
    return;
  }
  loadAdminWorkshops();
  loadAdminRequests();
}
window.loadAdminDashboard = loadAdminDashboard;

/* ─── Admin Tabs Switch ─── */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.admin-tab');
  if (tab) {
    $$('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.atab;
    $$('.admin-panel').forEach(p => p.classList.remove('active'));
    const panel = $('adminPanel' + target.charAt(0).toUpperCase() + target.slice(1));
    if (panel) panel.classList.add('active');
  }
});

/* ══════════════════════════════════════════════════════════════
   WORKSHOPS — Admin CRUD
   ══════════════════════════════════════════════════════════════ */

async function loadAdminWorkshops() {
  const list = $('adminWorkshopsList');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  try {
    const snap = await db.collection('workshops').limit(100).get();
    allWorkshopsCache = [];
    snap.forEach(d => allWorkshopsCache.push({ id: d.id, ...d.data() }));

    allWorkshopsCache.sort((a, b) => {
      const ta = a.scheduledAt?.toDate?.()?.getTime() || 0;
      const tb = b.scheduledAt?.toDate?.()?.getTime() || 0;
      return tb - ta;
    });

    if (!allWorkshopsCache.length) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-video"></i><h4>No workshops yet</h4><p>Click "Create Workshop" to get started</p></div>';
      return;
    }

    list.innerHTML = allWorkshopsCache.map(w => {
      const status = getWorkshopStatus(w);
      const scheduled = w.scheduledAt?.toDate?.() ? formatTime(w.scheduledAt.toDate().getTime()) : 'Not scheduled';
      const allowedCount = (w.allowedUsers || []).length;
      return `
        <div class="admin-workshop-card">
          <div class="awc-header">
            <div class="awc-title">${escapeHtml(w.title || 'Untitled')}</div>
            <span class="awc-status ${status.class}">${status.label}</span>
          </div>
          <div class="awc-meta">
            <span><i class="fa-solid fa-user-tie"></i> ${escapeHtml(w.expertName || 'Expert')}</span>
            <span><i class="fa-solid fa-book"></i> ${escapeHtml(w.subject || 'General')}</span>
            <span><i class="fa-solid fa-clock"></i> ${scheduled}</span>
            <span><i class="fa-solid fa-users"></i> ${allowedCount} user${allowedCount !== 1 ? 's' : ''} allowed</span>
          </div>
          <div class="awc-actions">
            <button class="primary" onclick="manageAccess('${w.id}')">
              <i class="fa-solid fa-users-gear"></i> Access
            </button>
            <button onclick="editWorkshop('${w.id}')">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="danger" onclick="deleteWorkshop('${w.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Error loading workshops</h4><p>' + escapeHtml(err.message) + '</p></div>';
  }
}
window.loadAdminWorkshops = loadAdminWorkshops;

function getWorkshopStatus(w) {
  if (!w.scheduledAt?.toDate) return { class: 'upcoming', label: 'Upcoming' };
  const now = Date.now();
  const start = w.scheduledAt.toDate().getTime();
  const duration = (w.duration || 60) * 60 * 1000;
  const end = start + duration;

  if (now < start) return { class: 'upcoming', label: 'Upcoming' };
  if (now >= start && now <= end) return { class: 'live', label: '🔴 Live' };
  return { class: 'ended', label: 'Ended' };
}

/* ─── Create Workshop ─── */
$('createWorkshopBtn')?.addEventListener('click', () => {
  // Reset form
  if ($('cwTitle')) $('cwTitle').value = '';
  if ($('cwDescription')) $('cwDescription').value = '';
  if ($('cwExpert')) $('cwExpert').value = '';
  if ($('cwLink')) $('cwLink').value = '';
  if ($('cwDate')) $('cwDate').value = '';
  if ($('cwTime')) $('cwTime').value = '';
  if ($('cwDuration')) $('cwDuration').value = 60;
  if ($('cwSubject')) $('cwSubject').value = 'Mathematics';
  openModal('createWorkshopModal');
});

$('saveWorkshopBtn')?.addEventListener('click', async () => {
  if (!isAdmin()) return;

  const title = $('cwTitle').value.trim();
  const description = $('cwDescription').value.trim();
  const expertName = $('cwExpert').value.trim();
  const subject = $('cwSubject').value;
  const link = $('cwLink').value.trim();
  const date = $('cwDate').value;
  const time = $('cwTime').value;
  const duration = parseInt($('cwDuration').value) || 60;

  if (!title || !expertName || !link || !date || !time) {
    toast('warn', 'Please fill all required fields');
    return;
  }

  const btn = $('saveWorkshopBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating…';

  try {
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      throw new Error('Invalid date/time');
    }

    await db.collection('workshops').add({
      title,
      description,
      expertName,
      subject,
      link,
      scheduledAt: firebase.firestore.Timestamp.fromDate(scheduledAt),
      duration,
      allowedUsers: [],
      createdBy: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    toast('success', 'Workshop created!', 'Add users to allow access');
    closeModal('createWorkshopModal');
    loadAdminWorkshops();
  } catch (err) {
    console.error(err);
    toast('warn', 'Failed to create', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Create Workshop';
  }
});

/* ─── Delete Workshop ─── */
window.deleteWorkshop = async function(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete this workshop? Users will lose access.')) return;

  try {
    await db.collection('workshops').doc(id).delete();
    toast('success', 'Workshop deleted');
    loadAdminWorkshops();
  } catch (err) {
    toast('warn', 'Delete failed', err.message);
  }
};

/* ─── Edit Workshop ─── */
window.editWorkshop = function(id) {
  const w = allWorkshopsCache.find(x => x.id === id);
  if (!w) return;

  if ($('cwTitle')) $('cwTitle').value = w.title || '';
  if ($('cwDescription')) $('cwDescription').value = w.description || '';
  if ($('cwExpert')) $('cwExpert').value = w.expertName || '';
  if ($('cwSubject')) $('cwSubject').value = w.subject || 'Mathematics';
  if ($('cwLink')) $('cwLink').value = w.link || '';
  if ($('cwDuration')) $('cwDuration').value = w.duration || 60;

  if (w.scheduledAt?.toDate) {
    const d = w.scheduledAt.toDate();
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().slice(0, 5);
    if ($('cwDate')) $('cwDate').value = dateStr;
    if ($('cwTime')) $('cwTime').value = timeStr;
  }

  // Change save button to update mode
  const btn = $('saveWorkshopBtn');
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Update Workshop';
  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating…';
    try {
      const scheduledAt = new Date(`${$('cwDate').value}T${$('cwTime').value}:00`);
      await db.collection('workshops').doc(id).update({
        title: $('cwTitle').value.trim(),
        description: $('cwDescription').value.trim(),
        expertName: $('cwExpert').value.trim(),
        subject: $('cwSubject').value,
        link: $('cwLink').value.trim(),
        scheduledAt: firebase.firestore.Timestamp.fromDate(scheduledAt),
        duration: parseInt($('cwDuration').value) || 60
      });
      toast('success', 'Workshop updated!');
      closeModal('createWorkshopModal');
      loadAdminWorkshops();
      location.reload(); // Simple reload to reset button
    } catch (err) {
      toast('warn', 'Update failed', err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Update Workshop';
    }
  };

  openModal('createWorkshopModal');
};

/* ══════════════════════════════════════════════════════════════
   MANAGE ACCESS
   ══════════════════════════════════════════════════════════════ */

window.manageAccess = async function(workshopId) {
  if (!isAdmin()) return;
  currentManageWorkshopId = workshopId;

  const w = allWorkshopsCache.find(x => x.id === workshopId);
  if (!w) return;

  if ($('manageInfo')) {
    $('manageInfo').innerHTML = `<i class="fa-solid fa-video"></i> ${escapeHtml(w.title)}`;
  }
  if ($('accessEmail')) $('accessEmail').value = '';

  renderAccessList(w.allowedUsers || []);
  openModal('manageAccessModal');
};

function renderAccessList(allowedUsers) {
  const list = $('accessList');
  const count = $('accessCount');
  if (!list) return;

  if (count) count.textContent = allowedUsers.length;

  if (!allowedUsers.length) {
    list.innerHTML = '<div class="empty-state" style="padding:1rem;"><p style="font-size:.82rem;">No users allowed yet</p></div>';
    return;
  }

  list.innerHTML = allowedUsers.map((u, i) => {
    const email = u.email || u;
    const name = u.name || email.split('@')[0];
    const avatar = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`;
    return `
      <div class="access-user">
        <img src="${escapeHtml(avatar)}" alt="">
        <div class="access-user-info">
          <div class="name">${escapeHtml(name)}</div>
          <div class="email">${escapeHtml(email)}</div>
        </div>
        <button onclick="removeAccess(${i})" title="Remove">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  }).join('');
}

window.removeAccess = async function(index) {
  if (!isAdmin() || !currentManageWorkshopId) return;
  const w = allWorkshopsCache.find(x => x.id === currentManageWorkshopId);
  if (!w) return;

  const allowedUsers = [...(w.allowedUsers || [])];
  const removed = allowedUsers.splice(index, 1);

  try {
    await db.collection('workshops').doc(currentManageWorkshopId).update({ allowedUsers });
    w.allowedUsers = allowedUsers;
    renderAccessList(allowedUsers);
    toast('success', 'Removed', (removed[0]?.email || removed[0]) + ' removed');
  } catch (err) {
    toast('warn', 'Failed', err.message);
  }
};

$('addAccessBtn')?.addEventListener('click', async () => {
  if (!isAdmin() || !currentManageWorkshopId) return;
  const email = $('accessEmail').value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    toast('warn', 'Please enter valid email');
    return;
  }

  const w = allWorkshopsCache.find(x => x.id === currentManageWorkshopId);
  if (!w) return;

  const allowedUsers = [...(w.allowedUsers || [])];
  if (allowedUsers.some(u => (u.email || u).toLowerCase() === email)) {
    toast('warn', 'User already added');
    return;
  }

  // Try to find user by email
  let userData = { email, name: email.split('@')[0] };
  try {
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!usersSnap.empty) {
      const u = usersSnap.docs[0].data();
      userData = { uid: usersSnap.docs[0].id, email, name: u.name || email.split('@')[0], photoURL: u.photoURL || '' };
    }
  } catch (e) {}

  allowedUsers.push(userData);

  const btn = $('addAccessBtn');
  btn.disabled = true;

  try {
    await db.collection('workshops').doc(currentManageWorkshopId).update({ allowedUsers });
    w.allowedUsers = allowedUsers;
    renderAccessList(allowedUsers);
    $('accessEmail').value = '';
    toast('success', 'User added!', email + ' can now join');
  } catch (err) {
    toast('warn', 'Failed to add', err.message);
  } finally {
    btn.disabled = false;
  }
});

$('accessEmail')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('addAccessBtn')?.click();
});

/* ══════════════════════════════════════════════════════════════
   ACCESS REQUESTS
   ══════════════════════════════════════════════════════════════ */

async function loadAdminRequests() {
  const list = $('adminRequestsList');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';

  try {
    const snap = await db.collection('access_requests').where('status', '==', 'pending').limit(100).get();
    allRequestsCache = [];
    snap.forEach(d => allRequestsCache.push({ id: d.id, ...d.data() }));

    const badge = $('pendingCount');
    if (badge) {
      if (allRequestsCache.length > 0) {
        badge.textContent = allRequestsCache.length;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (!allRequestsCache.length) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><h4>No pending requests</h4><p>Access requests from students will appear here</p></div>';
      return;
    }

    list.innerHTML = allRequestsCache.map(r => {
      const avatar = r.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.userName || 'User')}&background=7c3aed&color=fff`;
      const when = r.requestedAt?.toDate?.() ? formatTime(r.requestedAt.toDate().getTime()) : 'Just now';
      return `
        <div class="admin-request-card">
          <img class="arc-avatar" src="${escapeHtml(avatar)}" alt="">
          <div class="arc-info">
            <div class="name">${escapeHtml(r.userName || 'User')}</div>
            <div class="email">${escapeHtml(r.userEmail || '')}</div>
            <div class="workshop-want"><i class="fa-solid fa-video"></i> ${escapeHtml(r.workshopTitle || 'Workshop')}</div>
            <div class="time"><i class="fa-solid fa-clock"></i> ${when}</div>
          </div>
          <div class="arc-actions">
            <button class="approve" onclick="approveRequest('${r.id}')">
              <i class="fa-solid fa-check"></i> Approve
            </button>
            <button class="reject" onclick="rejectRequest('${r.id}')">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Error loading requests</h4><p>' + escapeHtml(err.message) + '</p></div>';
  }
}
window.loadAdminRequests = loadAdminRequests;

window.approveRequest = async function(requestId) {
  if (!isAdmin()) return;
  const r = allRequestsCache.find(x => x.id === requestId);
  if (!r) return;

  try {
    // Get workshop
    const wDoc = await db.collection('workshops').doc(r.workshopId).get();
    if (!wDoc.exists) {
      toast('warn', 'Workshop no longer exists');
      await db.collection('access_requests').doc(requestId).delete();
      loadAdminRequests();
      return;
    }
    const w = wDoc.data();
    const allowedUsers = [...(w.allowedUsers || [])];
    if (!allowedUsers.some(u => (u.email || u).toLowerCase() === r.userEmail.toLowerCase())) {
      allowedUsers.push({
        uid: r.userId,
        email: r.userEmail,
        name: r.userName || r.userEmail.split('@')[0],
        photoURL: r.userPhoto || ''
      });
    }

    await db.collection('workshops').doc(r.workshopId).update({ allowedUsers });
    await db.collection('access_requests').doc(requestId).update({
      status: 'approved',
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    toast('success', 'Approved!', r.userName + ' can now join');
    loadAdminRequests();
  } catch (err) {
    toast('warn', 'Approval failed', err.message);
  }
};

window.rejectRequest = async function(requestId) {
  if (!isAdmin()) return;
  if (!confirm('Reject this request?')) return;

  try {
    await db.collection('access_requests').doc(requestId).update({
      status: 'rejected',
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    toast('success', 'Request rejected');
    loadAdminRequests();
  } catch (err) {
    toast('warn', 'Failed', err.message);
  }
};

/* ══════════════════════════════════════════════════════════════
   STUDENT VIEW — LIVE WORKSHOPS
   ══════════════════════════════════════════════════════════════ */

async function loadStudentWorkshops() {
  const grid = $('workshopsGrid');
  if (!grid) return;

  // Agar admin hai to sab dikhao
  const isUserAdmin = isAdmin();

  try {
    const snap = await db.collection('workshops').limit(50).get();
    const workshops = [];
    snap.forEach(d => {
      const data = d.data();
      // Filter: allowed users only (unless admin)
      const allowed = (data.allowedUsers || []).some(u => 
        (u.uid && u.uid === currentUser.uid) || 
        (u.email && u.email.toLowerCase() === (currentUser.email || '').toLowerCase())
      );
      if (isUserAdmin || allowed) {
        workshops.push({ id: d.id, ...data });
      }
    });

    if (!workshops.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-video"></i><h4>No live workshops available</h4><p>Check back later for upcoming sessions</p></div>';
      return;
    }

    workshops.sort((a, b) => {
      const ta = a.scheduledAt?.toDate?.()?.getTime() || 0;
      const tb = b.scheduledAt?.toDate?.()?.getTime() || 0;
      return ta - tb; // Soonest first
    });

    grid.innerHTML = workshops.map(w => renderWorkshopCard(w)).join('');
  } catch (err) {
    console.error('Workshops load error:', err);
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-video"></i><h4>No live workshops available</h4><p>Check back later</p></div>';
  }
}
window.loadStudentWorkshops = loadStudentWorkshops;

function renderWorkshopCard(w) {
  const status = getWorkshopStatus(w);
  const scheduled = w.scheduledAt?.toDate?.() ? formatTime(w.scheduledAt.toDate().getTime()) : 'Not scheduled';
  const isLive = status.class === 'live';

  const allowed = (w.allowedUsers || []).some(u => 
    (u.uid && u.uid === currentUser.uid) || 
    (u.email && u.email.toLowerCase() === (currentUser.email || '').toLowerCase())
  ) || isAdmin();

  return `
    <div class="workshop-card ${isLive ? 'live' : ''} ${!allowed ? 'locked' : ''}">
      ${isLive ? '<div class="workshop-live-badge"><span class="workshop-live-dot"></span> LIVE</div>' : ''}
      <div class="workshop-title">${escapeHtml(w.title || 'Workshop')}</div>
      ${w.description ? `<div class="workshop-description">${escapeHtml(w.description)}</div>` : ''}
      <div class="workshop-expert">
        <i class="fa-solid fa-user-tie"></i> ${escapeHtml(w.expertName || 'Expert')}
      </div>
      <div class="workshop-time">
        <i class="fa-solid fa-clock"></i> ${scheduled} • ${w.duration || 60} min
      </div>
      <div class="workshop-actions">
        ${allowed ? `
          <button class="join" onclick="joinWorkshop('${escapeHtml(w.link || '')}')">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Join
          </button>
        ` : `
          <button class="request" onclick="requestWorkshopAccess('${w.id}')">
            <i class="fa-solid fa-lock-open"></i> Request Access
          </button>
        `}
      </div>
    </div>
  `;
}

window.joinWorkshop = function(link) {
  if (!link) {
    toast('warn', 'No link available');
    return;
  }
  window.open(link, '_blank', 'noopener');
  toast('success', 'Opening workshop…');
};

window.requestWorkshopAccess = async function(workshopId) {
  const w = allWorkshopsCache.find(x => x.id === workshopId) || 
            (await db.collection('workshops').doc(workshopId).get()).data();
  if (!w) return;

  try {
    // Check existing request
    const existing = await db.collection('access_requests')
      .where('userId', '==', currentUser.uid)
      .where('workshopId', '==', workshopId)
      .limit(1)
      .get();

    if (!existing.empty) {
      toast('info', 'Request already sent', 'Wait for admin approval');
      return;
    }

    await db.collection('access_requests').add({
      workshopId,
      workshopTitle: w.title || 'Workshop',
      userId: currentUser.uid,
      userName: userProfile.name,
      userEmail: userProfile.email,
      userPhoto: userProfile.photoURL || '',
      status: 'pending',
      requestedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    toast('success', 'Request sent!', 'Admin will review it soon');
  } catch (err) {
    toast('warn', 'Failed to send request', err.message);
  }
};

/* ══════════════════════════════════════════════════════════════
   HOOK INTO EXISTING SYSTEM
   ══════════════════════════════════════════════════════════════ */

// Extend switchToTab to load admin + workshops
const _prevSwitchToTab = window.switchToTab;
window.switchToTab = function(tabId) {
  _prevSwitchToTab(tabId);
  if (tabId === 'admin') loadAdminDashboard();
  if (tabId === 'experts') loadStudentWorkshops();
};

// Extend updateUserUI to show admin nav
const _prevUpdateUserUI = updateUserUI;
updateUserUI = function() {
  _prevUpdateUserUI();
  updateAdminVisibility();
};

// Check for pending requests count (admin only)
async function checkPendingRequests() {
  if (!isAdmin()) return;
  try {
    const snap = await db.collection('access_requests').where('status', '==', 'pending').count().get();
    const badge = $('pendingCount');
    if (badge && snap.data().count > 0) {
      badge.textContent = snap.data().count;
      badge.style.display = 'flex';
    }
  } catch (e) {}
}

// Init admin when app loads
const _prevInitApp = initApp;
initApp = function() {
  _prevInitApp();
  updateAdminVisibility();
  if (isAdmin()) {
    setTimeout(checkPendingRequests, 2000);
  }
};

console.log('🛡️ Admin Panel + Workshops System Loaded');
