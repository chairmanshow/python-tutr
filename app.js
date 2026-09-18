/* ══════════════════════════════════════════════════════════════
   THE CHAIRMAN SHOW — Full Platform Logic (Fixed Version)
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
  UPI_ID: "Please Mail on overactingofficial7@gmail.com to access platform",
  TELEGRAM_PROXY: "https://tcs-telegram-proxy.sumitshrivas24.workers.dev",
  ADMIN_EMAIL: "overactingofficial7@gmail.com"
};

const IMGBB_KEY = '42eeb26299ccd04102779f92f5db31cf';

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
    $('loginScreen').style.display = 'flex';
    $('loginScreen').classList.remove('hide');
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
  $('loginScreen').classList.add('hide');
  $('app').style.display = 'block';
  setTimeout(() => $('loginScreen').style.display = 'none', 500);
  $('bootLoader').classList.add('hide');
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
      role: 'student',
      class: '',
      bio: '',
      subscription: 'free',
      subscriptionExpiry: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      doubtsAsked: 0,
      doubtsSolved: 0,
      earnings: 0,
      rating: 0,
      totalRatings: 0
    };
    await ref.set(profile);
    userProfile = profile;
  } else {
    userProfile = snap.data();
    // Ensure defaults for older profiles
    userProfile.subscription = userProfile.subscription || 'free';
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

  const subEl = $('subStatus');
  if (subEl) {
    const sub = userProfile.subscription || 'free';
    if (sub === 'free') {
      subEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> Free plan — upgrade for unlimited doubts';
    } else {
      subEl.innerHTML = `<i class="fa-solid fa-crown" style="color:var(--warning)"></i> ${sub.toUpperCase()} plan active`;
    }
  }

  updateExpertPanelVisibility();
}

$('userMenuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('userDropdown').classList.toggle('show');
});
document.addEventListener('click', () => {
  const dd = $('userDropdown');
  if (dd) dd.classList.remove('show');
});
$('userDropdown').addEventListener('click', (e) => e.stopPropagation());

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
  if (tabId === 'expertDashboard') loadExpertDashboard();
  if (tabId === 'subscription') loadPlans();
}
window.switchToTab = switchToTab;

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
        <button onclick="contactExpert('${e.id}')">Message</button>
        <button class="primary" onclick="requestDoubt('${e.id}')">Ask Doubt</button>
      </div>
    </div>`;
}

window.becomeExpert = function(sectionId) {
  const section = EXPERT_SECTIONS.find(s => s.id === sectionId);
  if (!section) return;
  if (!confirm(`Apply as an expert for "${section.title}"?\n\nYou'll need to fill a short form and wait for verification.`)) return;

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

// "Become an Expert" from user dropdown
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
let doubtFilter = 'all';
let userDoubts = [];

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

    // Sort by createdAt desc (client-side, no index needed)
    userDoubts.sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime() || 0;
      return tb - ta;
    });

    // Filter client-side
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

$('newDoubtBtn').addEventListener('click', async () => {
  const sub = userProfile.subscription || 'free';
  if (sub === 'free') {
    try {
      const snap = await db.collection('doubts').where('userId', '==', currentUser.uid).get();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayCount = snap.docs.filter(d => {
        const ts = d.data().createdAt?.toDate?.();
        return ts && ts >= today;
      }).length;
      if (todayCount >= 3) {
        toast('warn', 'Free plan limit', '3 doubts/day. Upgrade for unlimited.');
        switchToTab('subscription');
        return;
      }
    } catch (err) {
      console.warn('Limit check failed:', err);
    }
  }
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

$('postDoubtBtn').addEventListener('click', async () => {
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

    await db.collection('doubts').add({
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

    notifyTelegram(`🆕 New Doubt!\nStudent: ${userProfile.name}\nSubject: ${subject}\nClass: ${doubtClass}\n\n${question.slice(0, 200)}`);

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

/* ─────────────── SECTION 8: SUBSCRIPTION ─────────────── */
const PLANS = [
  { id:'free', name:'Free', price:0, period:'forever', features:['3 doubts/day','Community chat','Basic support'], popular:false },
  { id:'basic', name:'Basic', price:99, period:'/month', features:['20 doubts/day','Priority support','Voice messages','Image sharing'], popular:false },
  { id:'premium', name:'Premium', price:299, period:'/month', features:['Unlimited doubts','1-on-1 expert calls','24/7 priority','Ad-free experience','Download solutions'], popular:true }
];

let selectedPlan = null;

function loadPlans() {
  const grid = $('plansGrid');
  if (!grid) return;
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
    const url = await uploadToImgBB(proofFile);

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
    proofFile = null;
    selectedPlan = null;
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
    } else throw new Error(data.description || data.error || 'Failed');
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
    // Fallback: try simple get for counts
    try {
      const [d, e, u] = await Promise.all([
        db.collection('doubts').limit(100).get(),
        db.collection('experts').limit(100).get(),
        db.collection('users').limit(100).get()
      ]);
      if ($('statDoubts')) $('statDoubts').textContent = d.size;
      if ($('statExperts')) $('statExperts').textContent = e.size;
      if ($('statStudents')) $('statStudents').textContent = u.size;
    } catch (_) {}
  }

  if ($('miniDoubts')) $('miniDoubts').textContent = userProfile?.doubtsAsked || 0;
  if ($('miniSolved')) $('miniSolved').textContent = userProfile?.doubtsSolved || 0;
  if ($('miniRating')) $('miniRating').textContent = userProfile?.rating ? userProfile.rating.toFixed(1) : '—';
}

/* ─────────────── SECTION 12: EXPERT DASHBOARD ─────────────── */
let currentAnswerDoubtId = null;
let expertDoubtFilter = 'open';

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
          <button class="primary" onclick="openAnswerModal('${d.id}')">
            <i class="fa-solid fa-pen"></i> Answer
          </button>
        ` : isMine ? `
          <button disabled style="cursor:default">
            <i class="fa-solid fa-check" style="color:var(--success)"></i> You answered this
          </button>
        ` : `
          <button disabled style="cursor:default;opacity:.6">
            <i class="fa-solid fa-check"></i> Already answered
          </button>
        `}
      </div>
    </div>
  `;
}

window.openAnswerModal = async function(doubtId) {
  try {
    const doc = await db.collection('doubts').doc(doubtId).get();
    if (!doc.exists) { toast('warn', 'Doubt not found'); return; }
    const d = doc.data();

    currentAnswerDoubtId = doubtId;
    if ($('odSubject')) $('odSubject').textContent = d.subject || 'General';
    if ($('odStatus')) {
      $('odStatus').textContent = d.status;
      $('odStatus').className = 'doubt-status ' + d.status;
    }
    if ($('odQuestion')) $('odQuestion').textContent = d.question || '';
    if ($('odImage')) {
      $('odImage').innerHTML = d.imageUrl
        ? `<img src="${escapeHtml(d.imageUrl)}" style="max-width:100%;border-radius:8px;margin-top:.6rem;cursor:pointer" onclick="openImageViewer('${escapeHtml(d.imageUrl)}')">`
        : '';
    }
    if ($('odMeta')) {
      $('odMeta').innerHTML = `
        <span><i class="fa-regular fa-user"></i> ${escapeHtml(d.userName || 'Student')}</span>
        <span><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(d.class || 'N/A')}</span>
        <span><i class="fa-regular fa-clock"></i> ${d.createdAt?.toDate?.() ? formatTime(d.createdAt.toDate().getTime()) : 'Just now'}</span>
      `;
    }

    if ($('answerText')) $('answerText').value = '';
    if ($('answerImage')) $('answerImage').value = '';
    if ($('answerImagePreview')) $('answerImagePreview').innerHTML = '';

    openModal('answerDoubtModal');
  } catch (err) {
    toast('warn', 'Error', err.message);
  }
};

// Answer image preview
document.addEventListener('change', (e) => {
  if (e.target.id === 'answerImage') {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      $('answerImagePreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:150px;border-radius:8px;margin-top:8px;">`;
    };
    reader.readAsDataURL(file);
  }
});

// Submit answer
document.addEventListener('click', async (e) => {
  if (e.target.closest('#submitAnswerBtn')) {
    const btn = $('submitAnswerBtn');
    const text = $('answerText').value.trim();
    const imageFile = $('answerImage').files[0];

    if (!text) { toast('warn', 'Please write an answer'); return; }
    if (!currentAnswerDoubtId) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

    try {
      let imageUrl = '';
      if (imageFile) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading image…';
        imageUrl = await uploadToImgBB(imageFile);
      }

      await db.collection('doubts').doc(currentAnswerDoubtId)
        .collection('answers').add({
          expertId: currentUser.uid,
          expertName: userProfile.name,
          expertPhoto: userProfile.photoURL || '',
          expertTitle: userProfile.title || 'Subject Expert',
          text: text,
          imageUrl: imageUrl,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          helpful: 0
        });

      await db.collection('doubts').doc(currentAnswerDoubtId).update({
        status: 'answered',
        answeredBy: currentUser.uid,
        answeredByName: userProfile.name,
        answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
        answerCount: firebase.firestore.FieldValue.increment(1)
      });

      await db.collection('users').doc(currentUser.uid).update({
        doubtsSolved: firebase.firestore.FieldValue.increment(1),
        earnings: firebase.firestore.FieldValue.increment(10)
      }).catch(() => {});

      notifyTelegram(
        `✅ Doubt Answered!\nExpert: ${userProfile.name}\nDoubt ID: ${currentAnswerDoubtId}\nAnswer: ${text.slice(0, 150)}...`
      );

      toast('success', 'Answer submitted!', '+₹10 added to your earnings');
      closeModal('answerDoubtModal');
      currentAnswerDoubtId = null;
      loadExpertDoubts();
    } catch (err) {
      console.error(err);
      toast('warn', 'Failed', err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Answer';
    }
  }
});

// Expert dashboard filter chips
document.addEventListener('click', (e) => {
  const chip = e.target.closest('#expertDoubtFilters .chip');
  if (chip) {
    $$('#expertDoubtFilters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    expertDoubtFilter = chip.dataset.status;
    loadExpertDoubts();
  }
});

// Student view: doubt details
window.viewDoubt = async function(id) {
  try {
    const doc = await db.collection('doubts').doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();

    const answersSnap = await db.collection('doubts').doc(id).collection('answers')
      .orderBy('createdAt', 'asc').get();

    const answersHtml = answersSnap.empty
      ? '<div class="empty-state" style="padding:2rem 1rem"><i class="fa-solid fa-hourglass-half"></i><h4>Waiting for expert</h4><p>Your doubt is visible to experts. You\'ll be notified when answered.</p></div>'
      : answersSnap.docs.map(ansDoc => {
          const a = ansDoc.data();
          const when = a.createdAt?.toDate?.() ? formatTime(a.createdAt.toDate().getTime()) : 'Just now';
          const avatar = a.expertPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.expertName)}&background=7c3aed&color=fff`;
          return `
            <div class="answer-card">
              <div class="expert-header">
                <img src="${escapeHtml(avatar)}" alt="">
                <div>
                  <div class="name">${escapeHtml(a.expertName)}</div>
                  <div class="title">${escapeHtml(a.expertTitle || 'Subject Expert')} • ${when}</div>
                </div>
              </div>
              <div class="answer-text">${escapeHtml(a.text)}</div>
              ${a.imageUrl ? `<img class="answer-img" src="${escapeHtml(a.imageUrl)}" onclick="openImageViewer('${escapeHtml(a.imageUrl)}')">` : ''}
            </div>
          `;
        }).join('');

    if ($('doubtDetailsBody')) {
      $('doubtDetailsBody').innerHTML = `
        <div class="original-doubt">
          <div class="od-header">
            <span class="doubt-subject"><i class="fa-solid fa-book"></i> ${escapeHtml(d.subject)}</span>
            <span class="doubt-status ${d.status}">${d.status}</span>
          </div>
          <div class="od-question">${escapeHtml(d.question)}</div>
          ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" style="max-width:100%;border-radius:8px;margin-top:.6rem;cursor:pointer" onclick="openImageViewer('${escapeHtml(d.imageUrl)}')">` : ''}
        </div>
        <h4 style="margin-bottom:.8rem;display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-comments" style="color:var(--accent-primary)"></i>
          Expert Answers (${answersSnap.size})
        </h4>
        ${answersHtml}
      `;
    }

    openModal('doubtDetailsModal');
  } catch (err) {
    console.error(err);
    toast('warn', 'Error', err.message);
  }
};

/* ─────────────── SECTION 13: IMAGE VIEWER ─────────────── */
window.openImageViewer = function(url) {
  if ($('viewerImage')) $('viewerImage').src = url;
  openModal('imageViewerModal');
};

/* ─────────────── SECTION 14: KEYBOARD SHORTCUTS ─────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => {
      m.classList.remove('show');
    });
    document.body.style.overflow = '';
  }
});

/* ─────────────── SECTION 15: SCROLL PROGRESS + BACK TO TOP ─────────────── */
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

/* ─────────────── SECTION 16: INIT APP ─────────────── */
function initApp() {
  loadStats();
  updateUserUI();
}

/* ─────────────── SECTION 17: BOOT ─────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = $('bootLoader');
    if (loader) loader.classList.add('hide');
  }, 1500);
});
/* ══════════════════════════════════════════════════════════════
   AI DOUBT SOLVING SYSTEM (NEW)
   ══════════════════════════════════════════════════════════════ */

// ⚙️ CONFIG — apni API key yahan daalo
const AI_CONFIG = {
  GROQ_KEY: 'gsk_YOUR_GROQ_KEY_HERE',   // ⬅️ YAHAN APNI GROQ KEY DAALO
  GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions',
  MODEL: 'llama-3.1-8b-instant',         // Fast & free
  MAX_WORDS: 40
};

/* ─── 20 EXPERT NAMES POOL ─── */
const EXPERT_POOL = [
  { name: 'Dr. Rajesh Sharma', title: 'Physics & Mathematics', exp: 12, subject: 'PCM', avatar: 'RS' },
  { name: 'Prof. Anjali Verma', title: 'Chemistry Specialist', exp: 9, subject: 'Chemistry', avatar: 'AV' },
  { name: 'Dr. Vikram Mehta', title: 'IIT-JEE Physics', exp: 15, subject: 'Physics', avatar: 'VM' },
  { name: 'Ms. Priya Nair', title: 'Biology & NEET Expert', exp: 7, subject: 'Biology', avatar: 'PN' },
  { name: 'Mr. Arun Patel', title: 'Mathematics Professor', exp: 11, subject: 'Mathematics', avatar: 'AP' },
  { name: 'Dr. Sneha Reddy', title: 'Organic Chemistry', exp: 10, subject: 'Chemistry', avatar: 'SR' },
  { name: 'Prof. Karan Singh', title: 'Computer Science', exp: 8, subject: 'CS', avatar: 'KS' },
  { name: 'Ms. Meera Iyer', title: 'English Literature', exp: 6, subject: 'English', avatar: 'MI' },
  { name: 'Dr. Aditya Joshi', title: 'Physics Olympiad Coach', exp: 14, subject: 'Physics', avatar: 'AJ' },
  { name: 'Prof. Neha Gupta', title: 'NEET Biology', exp: 9, subject: 'Biology', avatar: 'NG' },
  { name: 'Mr. Rohan Malhotra', title: 'JEE Mathematics', exp: 13, subject: 'Mathematics', avatar: 'RM' },
  { name: 'Dr. Kavita Desai', title: 'Inorganic Chemistry', exp: 12, subject: 'Chemistry', avatar: 'KD' },
  { name: 'Prof. Suresh Kumar', title: 'Physics & Math', exp: 18, subject: 'PCM', avatar: 'SK' },
  { name: 'Ms. Ananya Bose', title: 'Science & English', exp: 5, subject: 'General', avatar: 'AB' },
  { name: 'Dr. Harsh Vardhan', title: 'Advanced Mathematics', exp: 16, subject: 'Mathematics', avatar: 'HV' },
  { name: 'Prof. Ritu Agarwal', title: 'Biology & Zoology', exp: 10, subject: 'Biology', avatar: 'RA' },
  { name: 'Mr. Nikhil Chopra', title: 'Physics IIT', exp: 8, subject: 'Physics', avatar: 'NC' },
  { name: 'Dr. Pooja Saxena', title: 'Chemistry PhD', exp: 11, subject: 'Chemistry', avatar: 'PS' },
  { name: 'Prof. Manish Tiwari', title: 'Maths & Stats', exp: 13, subject: 'Mathematics', avatar: 'MT' },
  { name: 'Dr. Sunita Kapoor', title: 'Senior Biology Expert', exp: 17, subject: 'Biology', avatar: 'SK' }
];

/* ─── Get random experts for current session ─── */
function getRandomExperts(count = 20) {
  const shuffled = [...EXPERT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/* ─── Pick a random expert for a doubt ─── */
function pickExpertForDoubt() {
  const sessionExperts = getSessionExperts();
  return sessionExperts[Math.floor(Math.random() * sessionExperts.length)];
}

/* ─── Session storage for per-user random experts ─── */
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

/* ─── Generate expert avatar URL ─── */
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

/* ─── CALL GROQ AI ─── */
async function getAIAnswer(question, subject, cls) {
  const expert = pickExpertForDoubt();

  const systemPrompt = `You are ${expert.name}, an Indian expert teacher in ${subject} with ${expert.exp} years of experience.
Answer the student's ${subject} doubt (Class: ${cls}) in 30-40 words MAXIMUM.
Be precise, use simple language, include the key formula/concept if relevant.
Never exceed 40 words. Never mention you are an AI. Sign nothing.`;

  try {
    const res = await fetch(AI_CONFIG.GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.GROQ_KEY}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.6,
        max_tokens: 100
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('AI service error: ' + err.slice(0, 100));
    }

    const data = await res.json();
    let answer = data.choices?.[0]?.message?.content?.trim() || '';

    // Enforce word limit
    const words = answer.split(/\s+/);
    if (words.length > 45) {
      answer = words.slice(0, 42).join(' ') + '...';
    }

    return { answer, expert };
  } catch (err) {
    console.error('AI error:', err);
    throw err;
  }
}

/* ─── TYPEWRITER ANIMATION ─── */
function typeWriter(element, text, speed = 25) {
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

/* ══════════════════════════════════════════════════════════════
   OVERRIDE: viewDoubt → AI answer with animation
   ══════════════════════════════════════════════════════════════ */
window.viewDoubt = async function(id) {
  try {
    const doc = await db.collection('doubts').doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();

    // Check if doubt already has an AI answer stored
    const answersSnap = await db.collection('doubts').doc(id).collection('answers')
      .orderBy('createdAt', 'asc').get();

    let answersHtml = '';

    if (!answersSnap.empty) {
      // Show existing answer(s)
      const ansDocs = answersSnap.docs;
      answersHtml = ansDocs.map(ansDoc => {
        const a = ansDoc.data();
        const when = a.createdAt?.toDate?.() ? formatTime(a.createdAt.toDate().getTime()) : 'Just now';
        const expert = a.expert || { name: a.expertName || 'Expert', title: 'Subject Expert', exp: 10, avatar: 'E' };
        const avatar = expertAvatarUrl(expert);
        return `
          <div class="ai-answer-card">
            <div class="ai-answer-header">
              <img src="${avatar}" alt="" onclick="showExpertProfile('${escapeHtml(expert.name)}', ${expert.exp || 10}, '${escapeHtml(expert.title || '')}')" style="cursor:pointer">
              <div>
                <div class="name" onclick="showExpertProfile('${escapeHtml(expert.name)}', ${expert.exp || 10}, '${escapeHtml(expert.title || '')}')" style="cursor:pointer;color:var(--accent-primary)">${escapeHtml(expert.name)}</div>
                <div class="title">${escapeHtml(expert.title)} • ${expert.exp || 10}+ yrs exp</div>
              </div>
              <span class="ai-badge" style="margin-left:auto"><i class="fa-solid fa-bolt"></i> AI</span>
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

    // Build modal body
    if ($('doubtDetailsBody')) {
      $('doubtDetailsBody').innerHTML = `
        <div class="original-doubt">
          <div class="od-header">
            <span class="doubt-subject"><i class="fa-solid fa-book"></i> ${escapeHtml(d.subject)}</span>
            <span class="doubt-status ${d.status}">${d.status}</span>
          </div>
          <div class="od-question">${escapeHtml(d.question)}</div>
          ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" style="max-width:100%;border-radius:8px;margin-top:.6rem;cursor:pointer" onclick="openImageViewer('${escapeHtml(d.imageUrl)}')">` : ''}
        </div>
        <h4 style="margin-bottom:.8rem;display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-comments" style="color:var(--accent-primary)"></i>
          Expert Answer
        </h4>
        <div id="answerArea">${answersHtml}</div>
      `;
    }

    openModal('doubtDetailsModal');

    // If no answer exists yet → generate AI answer with animation
    if (answersSnap.empty) {
      setTimeout(async () => {
        await generateAndShowAIAnswer(id, d);
      }, 400);
    }
  } catch (err) {
    console.error(err);
    toast('warn', 'Error', err.message);
  }
};

/* ─── Generate AI answer + typewriter animation ─── */
async function generateAndShowAIAnswer(doubtId, doubtData) {
  const area = $('answerArea');
  if (!area) return;

  // Show thinking state
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
          <span class="ai-badge" style="margin-left:auto"><i class="fa-solid fa-bolt"></i> AI</span>
        </div>
        <div class="ai-answer-text" id="typewriterText"></div>
        <div class="ai-answer-footer" id="aiFooter" style="display:none">
          <button onclick="copyAnswer(this, ${JSON.stringify(answer)})"><i class="fa-regular fa-copy"></i> Copy</button>
          <button onclick="markHelpful('${doubtId}')"><i class="fa-regular fa-thumbs-up"></i> Helpful</button>
        </div>
      </div>
    `;

    // Typewriter effect
    await typeWriter($('typewriterText'), answer, 22);

    // Show footer
    const footer = $('aiFooter');
    if (footer) footer.style.display = 'flex';

    // Save to Firestore
    try {
      await db.collection('doubts').doc(doubtId).collection('answers').add({
        expertId: 'ai_expert',
        expertName: expert.name,
        expertPhoto: avatar,
        expertTitle: expert.title,
        expert: { name: expert.name, title: expert.title, exp: expert.exp, avatar: expert.avatar },
        text: answer,
        imageUrl: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        helpful: 0,
        isAI: true
      });

      await db.collection('doubts').doc(doubtId).update({
        status: 'answered',
        answeredBy: 'ai_expert',
        answeredByName: expert.name,
        answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
        answerCount: firebase.firestore.FieldValue.increment(1)
      });

      await db.collection('users').doc(currentUser.uid).update({
        doubtsSolved: firebase.firestore.FieldValue.increment(1)
      }).catch(() => {});

      toast('success', 'Answer ready!', `Answered by ${expert.name}`);
    } catch (saveErr) {
      console.warn('Save failed:', saveErr);
    }
  } catch (err) {
    area.innerHTML = `
      <div class="ai-answer-card">
        <div style="color:var(--danger);display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Could not generate answer. Please try again.</span>
        </div>
        <button class="btn-ghost" style="margin-top:.8rem" onclick="viewDoubt('${doubtId}')">Retry</button>
      </div>
    `;
  }
}

/* ─── Copy answer to clipboard ─── */
window.copyAnswer = function(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  });
};

/* ─── Mark helpful ─── */
window.markHelpful = function(doubtId) {
  toast('success', 'Thanks!', 'Marked as helpful');
};

/* ══════════════════════════════════════════════════════════════
   EXPERT PROFILE MODAL
   ══════════════════════════════════════════════════════════════ */
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
        Specializes in step-by-step explanations and concept clarity.
      </div>
      <button class="btn-primary" style="width:100%;justify-content:center;margin-top:1rem" onclick="closeModal('expertProfileModal');switchToTab('doubts');setTimeout(()=>openModal('newDoubtModal'),300)">
        <i class="fa-solid fa-paper-plane"></i> Ask a Doubt
      </button>
    `;
  }
  openModal('expertProfileModal');
};

/* ══════════════════════════════════════════════════════════════
   LIVE EXPERTS BAR (Doubts tab)
   ══════════════════════════════════════════════════════════════ */
function updateLiveExperts() {
  const sessionExperts = getSessionExperts();
  const onlineCount = 8 + Math.floor(Math.random() * 8); // 8-15

  if ($('liveCount')) $('liveCount').textContent = onlineCount;

  if ($('liveAvatars')) {
    const shown = sessionExperts.slice(0, 5);
    $('liveAvatars').innerHTML = shown.map((e, i) => 
      `<img src="${expertAvatarUrl(e)}" alt="${escapeHtml(e.name)}" title="${escapeHtml(e.name)}" style="animation-delay:${i * 0.08}s">`
    ).join('');
  }
}

// Update count every 8 seconds for "live" feel
setInterval(() => {
  if ($('liveCount') && activeTab === 'doubts') {
    const newCount = 8 + Math.floor(Math.random() * 8);
    $('liveCount').textContent = newCount;
  }
}, 8000);

/* ══════════════════════════════════════════════════════════════
   TASKS SYSTEM
   ══════════════════════════════════════════════════════════════ */
let tasks = [];
let currentTaskIndex = 0;
let taskTimerStart = 0;
let taskTimerInterval = null;
let totalTaskTime = 0;
let victoryConfettiAnim = null;

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

/* Add task */
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

/* Clear all */
$('clearTasksBtn')?.addEventListener('click', () => {
  if (!tasks.length) return;
  if (!confirm('Clear all tasks?')) return;
  tasks = [];
  saveTasks();
  renderTasks();
  toast('success', 'Tasks cleared');
});

/* Start focus mode */
$('startTasksBtn')?.addEventListener('click', () => {
  if (!tasks.length) return;
  currentTaskIndex = 0;
  totalTaskTime = 0;
  openTaskFocus();
});

function openTaskFocus() {
  $('taskFocusOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  renderTaskFocus();
  startTaskTimer();
}

function closeTaskFocus() {
  $('taskFocusOverlay').classList.remove('show');
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
    // Save time for current task
    if (tasks[currentTaskIndex]) {
      tasks[currentTaskIndex].timeSpent = (tasks[currentTaskIndex].timeSpent || 0) + (Date.now() - taskTimerStart);
    }
    currentTaskIndex--;
    resetTaskTimer();
    renderTaskFocus();
  }
});

$('nextTaskBtn')?.addEventListener('click', () => {
  // Save time for current task
  if (tasks[currentTaskIndex]) {
    tasks[currentTaskIndex].timeSpent = (tasks[currentTaskIndex].timeSpent || 0) + (Date.now() - taskTimerStart);
    tasks[currentTaskIndex].done = true;
  }
  totalTaskTime += Date.now() - taskTimerStart;

  if (currentTaskIndex === tasks.length - 1) {
    // Victory!
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

/* ─── TIMER ─── */
let taskSeconds = 0;

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
  // Update ring (60s per full circle)
  const fill = $('timerFill');
  if (fill) {
    const circumference = 565.48;
    const progress = (secs % 60) / 60;
    fill.style.strokeDashoffset = circumference * (1 - progress);
  }
}

/* ─── VICTORY ─── */
function showVictory() {
  const totalSecs = Math.floor(totalTaskTime / 1000);
  const m = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  if ($('victoryTotalTime')) $('victoryTotalTime').textContent = `${m}:${s}`;
  $('victoryOverlay').classList.add('show');
  launchVictoryConfetti();
}

$('victoryCloseBtn')?.addEventListener('click', () => {
  $('victoryOverlay').classList.remove('show');
  document.body.style.overflow = '';
  if (victoryConfettiAnim) cancelAnimationFrame(victoryConfettiAnim);
});

/* ─── Confetti animation ─── */
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

/* ─── Init tasks on app start ─── */
const _origInitApp = initApp;
initApp = function() {
  _origInitApp();
  loadTasks();
  updateLiveExperts();
};

/* ─── Refresh live experts when switching to doubts tab ─── */
const _origSwitchToTab = window.switchToTab;
window.switchToTab = function(tabId) {
  _origSwitchToTab(tabId);
  if (tabId === 'doubts') updateLiveExperts();
};

console.log('🚀 AI Doubt System Loaded');
