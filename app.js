/* ══════════════════════════════════════════════════════════════
   THE CHAIRMAN SHOW — Full Platform Logic
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
const storage = firebase.storage();

// ⚠️ CHANGE THESE:
const CONFIG = {
  UPI_ID: "yourname@upi",
  TELEGRAM_PROXY: "https://tcs-telegram-proxy.sumitshrivas24.workers.dev",  // ⬅️ ये
  ADMIN_EMAIL: "youremail@gmail.com"
};

let currentUser = null;
let userProfile = null;

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

function closeModal(id) { $(id).classList.remove('show'); document.body.style.overflow = ''; }
function openModal(id) { $(id).classList.add('show'); document.body.style.overflow = 'hidden'; }

function formatTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function debounce(fn, wait) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

/* ─────────────── SECTION 3: AUTH ─────────────── */
$('googleSignInBtn').addEventListener('click', async () => {
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

$('signOutBtn').addEventListener('click', () => {
  if (confirm('Sign out?')) auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    await ensureUserProfile(user);
    showApp();
    initApp();
  } else {
    currentUser = null;
    showLogin();
  }
});

function showApp() {
  $('loginScreen').classList.add('hide');
  $('app').style.display = 'block';
  setTimeout(() => $('loginScreen').style.display = 'none', 500);
}
function showLogin() {
  $('loginScreen').style.display = 'flex';
  $('app').style.display = 'none';
  setTimeout(() => $('loginScreen').classList.remove('hide'), 50);
  $('bootLoader').classList.add('hide');
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
      role: 'student',               // student | expert | admin
      class: '',
      bio: '',
      subscription: 'free',          // free | basic | premium
      subscriptionExpiry: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      doubtsAsked: 0,
      doubtsSolved: 0,
      rating: 0,
      totalRatings: 0
    };
    await ref.set(profile);
    userProfile = profile;
  } else {
    userProfile = snap.data();
  }
  updateUserUI();
}

function updateUserUI() {
  const name = userProfile.name || 'User';
  const avatar = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`;
  $('navUserName').textContent = name.split(' ')[0];
  $('navUserAvatar').src = avatar;
  $('ddUserName').textContent = name;
  $('ddUserEmail').textContent = userProfile.email;
  $('ddUserAvatar').src = avatar;
  $('profileAvatar').src = avatar;
  $('profileName').textContent = name;
  $('profileEmail').textContent = userProfile.email;
  $('profileDisplayName').value = name;
  $('profileClass').value = userProfile.class || '';
  $('profileBio').value = userProfile.bio || '';
  
  const subEl = $('subStatus');
  if (userProfile.subscription === 'free') {
    subEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> Free plan — upgrade for unlimited doubts';
  } else {
    subEl.innerHTML = `<i class="fa-solid fa-crown" style="color:var(--warning)"></i> ${userProfile.subscription.toUpperCase()} plan active`;
  }
}

// User dropdown
$('userMenuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('userDropdown').classList.toggle('show');
});
document.addEventListener('click', () => $('userDropdown').classList.remove('show'));
$('userDropdown').addEventListener('click', (e) => e.stopPropagation());

// Save profile
$('saveProfileBtn').addEventListener('click', async () => {
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
let activeTab = 'home';
function switchToTab(tabId) {
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const target = $(tabId);
  if (target) target.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');
  activeTab = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'doubts') loadDoubts();
  if (tabId === 'experts') loadExperts();
  if (tabId === 'subscription') loadPlans();
  if (tabId === 'community') { /* chat init */ }
}
window.switchToTab = switchToTab;

document.addEventListener('click', (e) => {
  const navBtn = e.target.closest('.nav-item[data-tab]');
  if (navBtn) switchToTab(navBtn.dataset.tab);
  const gotoBtn = e.target.closest('[data-goto]');
  if (gotoBtn) { switchToTab(gotoBtn.dataset.goto); $('userDropdown').classList.remove('show'); }
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
        <button onclick="contactExpert('${e.id}')">Message</button>
        <button class="primary" onclick="requestDoubt('${e.id}')">Ask Doubt</button>
      </div>
    </div>`;
}
window.expertCardHtml = expertCardHtml;

window.becomeExpert = function(sectionId) {
  const section = EXPERT_SECTIONS.find(s => s.id === sectionId);
  if (!confirm(`Apply as an expert for "${section.title}"?\n\nYou'll need to fill a short form and wait for verification.`)) return;
  // Simple: mark user as pending expert
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
    notifyTelegram(`📝 New expert application:\nName: ${userProfile.name}\nEmail: ${userProfile.email}\nSection: ${section.title}`);
  }).catch(err => toast('warn', 'Failed', err.message));
};

window.contactExpert = function(expertId) {
  toast('info', 'Contact expert', 'Direct messaging coming soon. For now, ask a doubt!');
};

window.requestDoubt = function(expertId) {
  switchToTab('doubts');
  setTimeout(() => openModal('newDoubtModal'), 300);
};

/* ─────────────── SECTION 7: DOUBTS ─────────────── */
let doubtFilter = 'all';
let userDoubts = [];

async function loadDoubts() {
  const grid = $('doubtsGrid');
  grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';
  try {
    let q = db.collection('doubts').where('userId', '==', currentUser.uid);
    if (doubtFilter !== 'all') q = q.where('status', '==', doubtFilter);
    const snap = await q.orderBy('createdAt', 'desc').limit(50).get();
    userDoubts = [];
    snap.forEach(d => userDoubts.push({ id: d.id, ...d.data() }));

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
          <span><i class="fa-solid fa-clock"></i> ${formatTime(d.createdAt?.toDate?.() || Date.now())}</span>
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

$('newDoubtBtn').addEventListener('click', () => {
  if (userProfile.subscription === 'free') {
    db.collection('doubts').where('userId', '==', currentUser.uid).get().then(snap => {
      const today = new Date(); today.setHours(0,0,0,0);
      const todayCount = snap.docs.filter(d => {
        const ts = d.data().createdAt?.toDate?.();
        return ts && ts >= today;
      }).length;
      if (todayCount >= 3) {
        toast('warn', 'Free plan limit', '3 doubts/day. Upgrade for unlimited.');
        switchToTab('subscription');
        return;
      }
      openModal('newDoubtModal');
    });
  } else {
    openModal('newDoubtModal');
  }
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

$('postDoubtBtn').addEventListener('click', async () => {
  const subject = $('doubtSubject').value;
  const doubtClass = $('doubtClass').value;
  const question = $('doubtQuestion').value.trim();
  const imageFile = $('doubtImage').files[0];

  if (!question) { toast('warn', 'Please type your question'); return; }

  const btn = $('postDoubtBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting…';

  try {
    let imageUrl = '';
    if (imageFile) {
      const ref = storage.ref(`doubts/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
      await ref.put(imageFile);
      imageUrl = await ref.getDownloadURL();
    }

    await db.collection('doubts').add({
      userId: currentUser.uid,
      userName: userProfile.name,
      userPhoto: userProfile.photoURL,
      subject, class: doubtClass, question,
      imageUrl,
      status: 'open',
      answerCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(currentUser.uid).update({
      doubtsAsked: firebase.firestore.FieldValue.increment(1)
    });

    notifyTelegram(`🆕 New Doubt!\nStudent: ${userProfile.name}\nSubject: ${subject}\nClass: ${doubtClass}\n\n${question.slice(0,200)}`);

    toast('success', 'Doubt posted!', 'An expert will answer soon.');
    closeModal('newDoubtModal');
    $('doubtQuestion').value = '';
    $('doubtImage').value = '';
    $('doubtImagePreview').innerHTML = '';
    loadDoubts();
  } catch (err) {
    console.error(err);
    toast('warn', 'Failed to post', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post Doubt';
  }
});

window.viewDoubt = function(id) {
  const d = userDoubts.find(x => x.id === id);
  if (!d) return;
  toast('info', d.subject + ' — ' + d.status, d.question.slice(0, 80) + '…');
};

/* ─────────────── SECTION 8: SUBSCRIPTION ─────────────── */
const PLANS = [
  { id:'free', name:'Free', price:0, period:'forever', features:['3 doubts/day','Community chat','Basic support'], popular:false },
  { id:'basic', name:'Basic', price:99, period:'/month', features:['20 doubts/day','Priority support','Voice messages','Image sharing'], popular:false },
  { id:'premium', name:'Premium', price:299, period:'/month', features:['Unlimited doubts','1-on-1 expert calls','24/7 priority','Ad-free experience','Download solutions'], popular:true }
];

let selectedPlan = null;

function loadPlans() {
  const grid = $('plansGrid');
  grid.innerHTML = PLANS.map(p => `
    <div class="plan-card ${p.popular ? 'popular' : ''}">
      <div class="plan-name">${p.name}</div>
      <div class="plan-price">₹${p.price}<small>${p.price === 0 ? '' : p.period}</small></div>
      <div class="plan-period">${p.price === 0 ? 'Free forever' : 'per month'}</div>
      <ul class="plan-features">
        ${p.features.map(f => `<li><i class="fa-solid fa-check"></i> ${escapeHtml(f)}</li>`).join('')}
      </ul>
      <button class="btn-primary" onclick="selectPlan('${p.id}')" ${userProfile.subscription === p.id ? 'disabled' : ''}>
        ${userProfile.subscription === p.id ? '<i class="fa-solid fa-check"></i> Current Plan' : (p.price === 0 ? 'Get Started' : 'Choose Plan')}
      </button>
    </div>
  `).join('');
}
window.loadPlans = loadPlans;

window.selectPlan = function(planId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan || plan.price === 0) { toast('info', 'Free plan is active'); return; }
  selectedPlan = plan;
  $('payAmount').textContent = plan.price;
  $('upiIdDisplay').textContent = CONFIG.UPI_ID;
  $('paymentSection').style.display = 'block';
  $('paymentSection').scrollIntoView({ behavior: 'smooth' });
};

$('copyUpiBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(CONFIG.UPI_ID).then(() => toast('success', 'UPI ID copied!'));
});

let proofFile = null;
$('proofUpload').addEventListener('change', (e) => {
  proofFile = e.target.files[0];
  if (!proofFile) return;
  const reader = new FileReader();
  reader.onload = ev => {
    $('proofPreview').innerHTML = `<img src="${ev.target.result}" alt="proof">`;
    $('submitPaymentBtn').disabled = false;
  };
  reader.readAsDataURL(proofFile);
});

$('submitPaymentBtn').addEventListener('click', async () => {
  if (!proofFile || !selectedPlan) return;
  const btn = $('submitPaymentBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading…';

  try {
    const ref = storage.ref(`payments/${currentUser.uid}/${Date.now()}_${proofFile.name}`);
    await ref.put(proofFile);
    const url = await ref.getDownloadURL();

    await db.collection('payments').add({
      userId: currentUser.uid,
      userName: userProfile.name,
      userEmail: userProfile.email,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      amount: selectedPlan.price,
      screenshotUrl: url,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    notifyTelegram(`💰 New payment!\nUser: ${userProfile.name}\nEmail: ${userProfile.email}\nPlan: ${selectedPlan.name} (₹${selectedPlan.price})\nScreenshot: ${url}\n\n⚠️ Verify manually in Firebase console and activate plan.`);

    toast('success', 'Payment submitted!', 'Verification within 2 hours.');
    $('paymentSection').style.display = 'none';
    $('proofPreview').innerHTML = '';
    $('proofUpload').value = '';
  } catch (err) {
    console.error(err);
    toast('warn', 'Upload failed', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Payment Proof';
  }
});

/* ─────────────── SECTION 9: TELEGRAM NOTIFICATIONS ─────────────── */
async function notifyTelegram(message) {
  try {
    await fetch(CONFIG.TELEGRAM_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'System', email: 'system@tcs', msg: message })
    });
  } catch (err) { console.warn('Telegram notify failed:', err); }
}

/* ─────────────── SECTION 10: SUPPORT FORM ─────────────── */
$('supportForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const status = $('spStatus');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
  try {
    const res = await fetch(CONFIG.TELEGRAM_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: $('spName').value,
        email: $('spEmail').value,
        msg: $('spMsg').value
      })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      status.innerHTML = '<span style="color:var(--success)"><i class="fa-solid fa-check-circle"></i> Sent! We\'ll reply soon.</span>';
      e.target.reset();
    } else throw new Error(data.description || 'Failed');
  } catch (err) {
    status.innerHTML = `<span style="color:var(--danger)"><i class="fa-solid fa-circle-xmark"></i> ${escapeHtml(err.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
    setTimeout(() => { status.innerHTML = ''; }, 6000);
  }
});

/* ─────────────── SECTION 11: STATS ─────────────── */
async function loadStats() {
  try {
    const [doubtCount, expertCount, userCount] = await Promise.all([
      db.collection('doubts').count().get(),
      db.collection('experts').where('verified', '==', true).count().get(),
      db.collection('users').count().get()
    ]);
    $('statDoubts').textContent = doubtCount.data().count;
    $('statExperts').textContent = expertCount.data().count;
    $('statStudents').textContent = userCount.data().count;
  } catch (err) { console.warn('Stats error:', err); }

  $('miniDoubts').textContent = userProfile.doubtsAsked || 0;
  $('miniSolved').textContent = userProfile.doubtsSolved || 0;
  $('miniRating').textContent = userProfile.rating ? userProfile.rating.toFixed(1) : '—';
}

/* ─────────────── SECTION 12: BACK TO TOP + SCROLL ─────────────── */
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)) * 100;
  $('scrollProgress').style.width = scrolled + '%';
  $('backToTop').classList.toggle('show', h.scrollTop > 400);
});
$('backToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ─────────────── SECTION 13: INIT APP ─────────────── */
function initApp() {
  loadStats();
  updateUserUI();
  // Preload experts silently
  db.collection('experts').where('verified', '==', true).limit(1).get().catch(() => {});
}

/* ─────────────── SECTION 14: BOOT ─────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!currentUser) $('bootLoader').classList.add('hide');
  }, 1500);
});

// Handle image viewer
window.openImageViewer = function(url) {
  $('viewerImage').src = url;
  openModal('imageViewerModal');
};
