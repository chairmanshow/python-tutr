/**
 * The Chairman Academy & Live Courses Module
 * Full Admin Course Management (Create, Edit, Delete, Thumbnails, Pricing, UPI/Razorpay, Allow-list & YouTube Live Classes)
 */

const CoursesManager = (function() {
  let courses = [];
  let currentFilter = 'all';
  let searchTerm = '';
  let activeTab = 'allCourses'; // 'allCourses' | 'liveSchedule' | 'adminStudio' | 'ytVault'
  let editingCourseId = null;
  let liveCountdownInterval = null;
  let activeLiveCourse = null;

  const CACHE_KEY = 'tcs_courses_cache_v2';
  const ADMIN_PIN = '1234'; // Quick master PIN for testing admin mode

  // Recognized admin emails
  const ADMIN_EMAILS = [
    'overactingofficial7@gmail.com',
    'icreative552@gmail.com'
  ];

  function isAdminUser() {
    if (localStorage.getItem('tcs_admin_mode') === 'true') return true;
    if (window.currentUser && ADMIN_EMAILS.includes(window.currentUser.email?.toLowerCase())) return true;
    if (window.userProfile && window.userProfile.role === 'admin') return true;
    return false;
  }

  function getUserEmail() {
    if (window.currentUser?.email) return window.currentUser.email.toLowerCase();
    const stored = localStorage.getItem('tcs_student_email');
    return stored ? stored.toLowerCase() : '';
  }

  function isStudentAllowed(course) {
    if (!course.isPaid) return true;
    if (isAdminUser()) return true;

    const email = getUserEmail();
    if (!email) return false;

    if (Array.isArray(course.allowedStudents)) {
      if (course.allowedStudents.includes('all')) return true;
      if (course.allowedStudents.map(e => e.toLowerCase()).includes(email)) return true;
    }

    // Check locally unlocked courses
    try {
      const unlocked = JSON.parse(localStorage.getItem('tcs_unlocked_courses') || '[]');
      if (unlocked.includes(course.id)) return true;
    } catch (e) {}

    return false;
  }

  // ─── DATA FETCHING & SYNC ───
  async function loadCourses() {
    // 1. Try local cache first for instant render
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        courses = JSON.parse(cached);
        renderCourses();
      }
    } catch (e) {}

    // 2. Fetch fresh from backend
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          courses = data.courses;
          localStorage.setItem(CACHE_KEY, JSON.stringify(courses));
          renderCourses();
          renderLiveSchedule();
          renderAdminStudio();
          return;
        }
      }
    } catch (err) {
      console.warn('[Courses] API fetch fallback to local cache:', err.message);
    }

    // Fallback if empty
    if (!courses.length) {
      courses = getDefaultCourses();
      localStorage.setItem(CACHE_KEY, JSON.stringify(courses));
      renderCourses();
    }
  }

  function getDefaultCourses() {
    return [
      {
        id: "course-python-dsa",
        title: "Complete Python & DSA Zero to Hero Masterclass",
        subtitle: "Master Python fundamentals, OOPs, Data Structures and Algorithms with live coding",
        description: "The complete coding masterclass by The Chairman. Learn Python syntax, OOP, Linked Lists, Trees, DP and solve LeetCode problems live with real-time doubt support.",
        category: "Coding & Tech",
        level: "Beginner to Advanced",
        instructor: "The Chairman",
        thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
        isPaid: false,
        price: 0,
        originalPrice: 2499,
        payment: {
          upiId: "chairman@upi",
          razorpayLink: "",
          paymentInstructions: "100% Free Course sponsored by The Chairman Show community."
        },
        allowedStudents: ["all"],
        features: [
          "🔴 Live YouTube Masterclasses directly with Chairman",
          "🧠 Visual High-Yield Mindmaps for every chapter",
          "💻 150+ Curated Practice Problems",
          "💬 Live Doubt Resolution Box",
          "📜 Verified Course Certificate"
        ],
        liveClass: {
          enabled: true,
          title: "LIVE: Dynamic Programming & Binary Trees in Python",
          youtubeUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
          youtubeVideoId: "kqtD5dpn9C8",
          startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
          status: "upcoming",
          durationMinutes: 90,
          agenda: "Memoization patterns, Tree traversals, and live problem-solving on LeetCode."
        },
        enrolledCount: 2840,
        rating: 4.95
      },
      {
        id: "course-neet-jee-super",
        title: "NEET & JEE Super Revision Masterclass 2026",
        subtitle: "High-yield visual mindmaps, formula shortcuts, live problem solving & full exam simulation",
        description: "An intensive high-retention program designed to revise high-yield concepts across Physics, Chemistry, and Mathematics/Biology with direct YouTube live masterclasses.",
        category: "Exam Prep",
        level: "Class 11, 12 & Droppers",
        instructor: "The Chairman & Mentors",
        thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80",
        isPaid: true,
        price: 499,
        originalPrice: 2999,
        payment: {
          upiId: "chairman@upi",
          razorpayLink: "https://pages.razorpay.com/chairman-super-revision",
          paymentInstructions: "Pay ₹499 via UPI QR code or Razorpay link. Submit UTR / transaction ID to unlock. Allowed students get instant unlock."
        },
        allowedStudents: [
          "icreative552@gmail.com",
          "overactingofficial7@gmail.com"
        ],
        features: [
          "🔴 Exclusive YouTube Live Masterclasses with Chairman",
          "🧠 High-Yield Visual Mindmaps for rapid PPT revision",
          "⚡ 500+ Solved Previous Year Exam Questions (PYQs)",
          "📋 Formula Bank & Mnemonics",
          "🎯 Dedicated Doubt Resolution Support"
        ],
        liveClass: {
          enabled: true,
          title: "LIVE: High-Yield Physics Mechanics & Kinematics Shortcuts",
          youtubeUrl: "https://www.youtube.com/watch?v=8nD73SGS2ig",
          youtubeVideoId: "8nD73SGS2ig",
          startTime: new Date(Date.now() + 3600000 * 5).toISOString(),
          status: "upcoming",
          durationMinutes: 120,
          agenda: "Newton's Laws, Rotational dynamics, and 20+ expected NEET/JEE problems."
        },
        enrolledCount: 1120,
        rating: 4.98
      }
    ];
  }

  // ─── ADMIN TOGGLE & AUTH ───
  function toggleAdminMode() {
    const isNowAdmin = !isAdminUser();
    if (isNowAdmin) {
      const email = window.currentUser?.email?.toLowerCase();
      if (email && ADMIN_EMAILS.includes(email)) {
        localStorage.setItem('tcs_admin_mode', 'true');
        showToast('success', 'Admin Mode Activated', `Welcome Admin (${email})`);
        updateAdminUI();
        return;
      }

      const pin = prompt('Enter Admin Master PIN (Default: 1234):');
      if (pin === ADMIN_PIN || pin === 'admin2026' || pin === 'admin') {
        localStorage.setItem('tcs_admin_mode', 'true');
        showToast('success', 'Admin Mode Activated', 'Full course creation & deletion permissions enabled');
      } else if (pin !== null) {
        showToast('warn', 'Incorrect Admin PIN', 'Please try again or log in with admin account');
      }
    } else {
      localStorage.removeItem('tcs_admin_mode');
      showToast('info', 'Admin Mode Deactivated', 'Switched to standard student view');
    }
    updateAdminUI();
  }

  function updateAdminUI() {
    const isAdmin = isAdminUser();
    const btn = document.getElementById('courseAdminToggleBtn');
    if (btn) {
      if (isAdmin) {
        btn.classList.add('active');
        btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>Admin Mode: <strong>ACTIVE</strong></span>`;
      } else {
        btn.classList.remove('active');
        btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>Admin Mode: OFF</span>`;
      }
    }

    const banner = document.getElementById('adminModeBanner');
    if (banner) {
      banner.classList.toggle('show', isAdmin);
    }

    // Toggle admin tab visibility in nav
    const adminNavTab = document.getElementById('tabAdminStudio');
    if (adminNavTab) {
      adminNavTab.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    renderCourses();
    if (isAdmin && activeTab === 'adminStudio') {
      renderAdminStudio();
    }
  }

  // ─── RENDER MAIN COURSES GRID ───
  function renderCourses() {
    const grid = document.getElementById('coursesCardsGrid');
    if (!grid) return;

    let filtered = [...courses];

    // Filter by type
    if (currentFilter === 'free') {
      filtered = filtered.filter(c => !c.isPaid);
    } else if (currentFilter === 'paid') {
      filtered = filtered.filter(c => c.isPaid);
    } else if (currentFilter === 'live') {
      filtered = filtered.filter(c => c.liveClass && c.liveClass.enabled);
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(c => c.category?.toLowerCase().includes(currentFilter.toLowerCase()));
    }

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state-cine" style="grid-column: 1/-1; padding: 3rem 1rem;">
          <i class="fa-solid fa-graduation-cap" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:1rem;"></i>
          <h4>No Courses Found</h4>
          <p style="color:var(--text-secondary); margin-bottom:1.5rem;">Try adjusting your filter or search query.</p>
          ${isAdminUser() ? `<button class="btn-create-course-primary" onclick="CoursesManager.openCreateModal()"><i class="fa-solid fa-plus"></i> Create Course Now</button>` : ''}
        </div>`;
      return;
    }

    const isAdmin = isAdminUser();

    grid.innerHTML = filtered.map(c => {
      const isAllowed = isStudentAllowed(c);
      const isLiveActive = c.liveClass?.enabled && isClassCurrentlyLive(c.liveClass.startTime);
      const isUpcoming = c.liveClass?.enabled && !isLiveActive;
      const thumb = c.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800';

      return `
        <div class="course-card" data-course-id="${c.id}">
          <div class="course-thumb-wrap">
            <img src="${escapeHtml(thumb)}" alt="${escapeHtml(c.title)}" class="course-thumb-img" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800'">
            <div class="course-thumb-overlay">
              <div class="course-badges-top">
                ${c.isPaid
                  ? `<span class="badge-price-paid">₹${c.price} ${c.originalPrice ? `<span style="opacity:0.75;text-decoration:line-through;margin-left:2px">₹${c.originalPrice}</span>` : ''}</span>`
                  : `<span class="badge-price-free">100% FREE</span>`
                }
                ${isLiveActive
                  ? `<span class="badge-live-now"><span class="c-live-dot"></span> LIVE NOW</span>`
                  : (isUpcoming ? `<span class="badge-live-upcoming"><i class="fa-solid fa-clock"></i> LIVE SCHEDULED</span>` : '')
                }
              </div>
              <div class="course-thumb-bottom-meta">
                <span class="course-category-pill"><i class="fa-solid fa-tag"></i> ${escapeHtml(c.category || 'Academy')}</span>
                <span><i class="fa-solid fa-star" style="color:#f59e0b"></i> ${c.rating || 4.9} (${c.enrolledCount || 100}+)</span>
              </div>
            </div>
          </div>

          <div class="course-card-content">
            <h3 class="course-title">${escapeHtml(c.title)}</h3>
            <p class="course-subtitle">${escapeHtml(c.subtitle || c.description || '')}</p>

            ${c.liveClass && c.liveClass.enabled ? `
              <div class="course-live-box">
                <div class="clb-header">
                  <span style="color:#ef4444;"><i class="fa-brands fa-youtube"></i> YouTube Live Class</span>
                  <span class="clb-countdown" id="countdown-${c.id}">${formatLiveTimeLabel(c.liveClass.startTime)}</span>
                </div>
                <div class="clb-title">${escapeHtml(c.liveClass.title || 'Live Interactive Class')}</div>
              </div>
            ` : ''}

            <div class="course-features-list">
              ${(c.features || []).slice(0, 3).map(f => `
                <div class="course-feature-item">
                  <i class="fa-solid fa-circle-check"></i>
                  <span>${escapeHtml(f)}</span>
                </div>
              `).join('')}
            </div>

            <div class="course-card-footer">
              <div class="course-price-block">
                ${c.isPaid ? `
                  <span class="course-price-amount">₹${c.price}</span>
                  ${c.originalPrice ? `<span class="course-price-original">₹${c.originalPrice}</span>` : ''}
                ` : `
                  <span class="course-price-amount" style="color:var(--accent-green); font-size:1rem;">FREE</span>
                  <span style="font-size:0.75rem; color:var(--text-muted);">Open Access</span>
                `}
              </div>

              <div class="course-action-buttons">
                ${c.liveClass && c.liveClass.enabled ? `
                  <button class="btn-card-primary btn-card-live" title="Watch YouTube Live Session" onclick="CoursesManager.openLiveClass('${c.id}')">
                    <i class="fa-brands fa-youtube"></i> Live
                  </button>
                ` : ''}

                ${!c.isPaid || isAllowed ? `
                  <button class="btn-card-primary ${isAllowed && c.isPaid ? 'btn-card-unlocked' : ''}" onclick="CoursesManager.openCourseDetails('${c.id}')">
                    ${isAllowed && c.isPaid ? '<i class="fa-solid fa-lock-open"></i> Enrolled' : '<i class="fa-solid fa-arrow-right"></i> Enter'}
                  </button>
                ` : `
                  <button class="btn-card-primary" onclick="CoursesManager.openCheckout('${c.id}')">
                    <i class="fa-solid fa-bolt"></i> Enroll Now
                  </button>
                `}
              </div>
            </div>
          </div>

          <!-- Admin management actions strip -->
          <div class="course-admin-strip ${isAdmin ? 'show' : ''}">
            <span style="font-size:0.75rem; color:var(--gold-light); font-weight:700;">
              <i class="fa-solid fa-user-shield"></i> Admin
            </span>
            <div class="cas-actions">
              <button class="btn-cas" onclick="CoursesManager.openEditModal('${c.id}')" title="Edit course details & payments">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button class="btn-cas" onclick="CoursesManager.openAllowStudentsModal('${c.id}')" title="Manage allowed students list">
                <i class="fa-solid fa-users-gear"></i> Students (${(c.allowedStudents || []).length})
              </button>
              <button class="btn-cas btn-cas-del" onclick="CoursesManager.deleteCourse('${c.id}')" title="Delete course">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    startLiveTimers();
  }

  // ─── RENDER LIVE SCHEDULE VIEW ───
  function renderLiveSchedule() {
    const list = document.getElementById('liveScheduleList');
    if (!list) return;

    const liveCourses = courses.filter(c => c.liveClass && c.liveClass.enabled);

    if (!liveCourses.length) {
      list.innerHTML = `
        <div class="empty-state-cine" style="padding: 2.5rem 1rem;">
          <i class="fa-brands fa-youtube" style="font-size:2.5rem; color:#ef4444; margin-bottom:1rem;"></i>
          <h4>No Scheduled Live Classes</h4>
          <p style="color:var(--text-secondary);">Live YouTube sessions will appear here as soon as scheduled by the Admin.</p>
        </div>`;
      return;
    }

    list.innerHTML = liveCourses.map(c => {
      const lc = c.liveClass;
      const isLive = isClassCurrentlyLive(lc.startTime);
      const timeStr = formatFullDateTime(lc.startTime);

      return `
        <div class="live-schedule-card" style="background:var(--bg-surface); border:1px solid var(--border-mid); border-radius:14px; padding:1.25rem; margin-bottom:1rem; display:flex; gap:1.25rem; align-items:center; flex-wrap:wrap;">
          <div style="position:relative; width:180px; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:#000; flex-shrink:0;">
            <img src="${escapeHtml(c.thumbnail)}" alt="${escapeHtml(c.title)}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
              <i class="fa-brands fa-youtube" style="color:#ef4444; font-size:2rem;"></i>
            </div>
          </div>

          <div style="flex:1; min-width:240px;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
              ${isLive ? `<span class="badge-live-now"><span class="c-live-dot"></span> LIVE NOW</span>` : `<span class="badge-live-upcoming"><i class="fa-solid fa-clock"></i> UPCOMING</span>`}
              <span style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(c.title)}</span>
            </div>
            <h3 style="font-size:1.1rem; color:var(--text-primary); margin-bottom:0.4rem;">${escapeHtml(lc.title || c.title)}</h3>
            <p style="font-size:0.83rem; color:var(--text-secondary); margin-bottom:0.6rem;">${escapeHtml(lc.agenda || 'Live interactive session with Chairman on YouTube')}</p>
            <div style="font-size:0.8rem; color:var(--accent-cyan); display:flex; align-items:center; gap:1rem;">
              <span><i class="fa-regular fa-calendar-check"></i> ${timeStr}</span>
              <span><i class="fa-solid fa-stopwatch"></i> ${lc.durationMinutes || 90} mins</span>
            </div>
          </div>

          <div style="display:flex; gap:0.5rem;">
            <button class="btn-card-primary btn-card-live" style="padding:0.75rem 1.25rem; font-size:0.9rem;" onclick="CoursesManager.openLiveClass('${c.id}')">
              <i class="fa-brands fa-youtube"></i> ${isLive ? 'Join Live Stream' : 'Open Live Room'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── RENDER ADMIN STUDIO TAB ───
  function renderAdminStudio() {
    const tableBody = document.getElementById('adminCoursesTableBody');
    if (!tableBody) return;

    if (!courses.length) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No courses yet. Click "+ Create New Course" to add one.</td></tr>`;
      return;
    }

    tableBody.innerHTML = courses.map(c => {
      const allowedCount = (c.allowedStudents || []).length;
      return `
        <tr style="border-bottom:1px solid var(--border-soft); font-size:0.85rem;">
          <td style="padding:0.85rem 0.5rem; display:flex; align-items:center; gap:0.75rem;">
            <img src="${escapeHtml(c.thumbnail)}" style="width:48px; height:32px; border-radius:4px; object-fit:cover;" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800'">
            <div>
              <strong style="color:var(--text-primary); display:block;">${escapeHtml(c.title)}</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(c.category)}</span>
            </div>
          </td>
          <td style="padding:0.85rem 0.5rem;">
            ${c.isPaid ? `<span class="badge-price-paid">Paid (₹${c.price})</span>` : `<span class="badge-price-free">Free</span>`}
          </td>
          <td style="padding:0.85rem 0.5rem;">
            ${c.isPaid ? `<span style="font-family:var(--font-mono); font-size:0.78rem; color:var(--gold-light);">${escapeHtml(c.payment?.upiId || 'UPI')}</span>` : `<span style="color:var(--text-dim);">-</span>`}
          </td>
          <td style="padding:0.85rem 0.5rem;">
            <button class="btn-cas" onclick="CoursesManager.openAllowStudentsModal('${c.id}')">
              <i class="fa-solid fa-user-check"></i> ${allowedCount} Allowed
            </button>
          </td>
          <td style="padding:0.85rem 0.5rem;">
            ${c.liveClass?.enabled ? `
              <span style="color:#ef4444; font-weight:700;"><i class="fa-brands fa-youtube"></i> Scheduled</span>
            ` : `<span style="color:var(--text-muted);">Disabled</span>`}
          </td>
          <td style="padding:0.85rem 0.5rem; text-align:right;">
            <button class="btn-cas" onclick="CoursesManager.openEditModal('${c.id}')" title="Edit course">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-cas btn-cas-del" onclick="CoursesManager.deleteCourse('${c.id}')" title="Delete course">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    loadEnrollmentRequests();
  }

  async function loadEnrollmentRequests() {
    const list = document.getElementById('adminEnrollmentRequestsList');
    if (!list) return;

    try {
      const res = await fetch('/api/courses/enrollment-requests');
      if (res.ok) {
        const data = await res.json();
        const reqs = data.requests || [];
        if (!reqs.length) {
          list.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.82rem;">No student payment submissions pending.</div>`;
          return;
        }

        list.innerHTML = reqs.map(r => `
          <div style="background:var(--bg-surface-2); border:1px solid var(--border-mid); border-radius:10px; padding:0.85rem; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <div style="font-weight:700; color:var(--gold-light);">${escapeHtml(r.studentEmail)}</div>
              <div style="font-size:0.8rem; color:var(--text-primary);">${escapeHtml(r.courseTitle)} · ₹${r.price}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">UTR / Ref: ${escapeHtml(r.paymentRef || 'N/A')} · ${new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
            <div>
              ${r.status === 'approved' ? `
                <span style="color:var(--accent-green); font-size:0.82rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Approved</span>
              ` : `
                <button class="btn-card-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="CoursesManager.approveRequest('${r.id}')">
                  <i class="fa-solid fa-check"></i> Approve & Unlock
                </button>
              `}
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Failed to fetch enroll requests:', e);
    }
  }

  // ─── TIMERS & LIVE CLASSIFIER ───
  function isClassCurrentlyLive(startTimeIso) {
    if (!startTimeIso) return false;
    const start = new Date(startTimeIso).getTime();
    const now = Date.now();
    // Consider live starting 5 mins before start time up to 3 hours after
    return now >= (start - 5 * 60 * 1000) && now <= (start + 3 * 3600 * 1000);
  }

  function formatLiveTimeLabel(startTimeIso) {
    if (!startTimeIso) return 'Upcoming';
    const start = new Date(startTimeIso).getTime();
    const now = Date.now();
    const diff = start - now;

    if (diff <= 0 && diff > -3 * 3600 * 1000) {
      return 'STREAMING NOW';
    }
    if (diff <= 0) {
      return 'Ended (Replay)';
    }

    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d ${hours % 24}h`;
    }
    return `Starts in ${hours}h ${mins}m`;
  }

  function formatFullDateTime(iso) {
    if (!iso) return 'To be announced';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return iso;
    }
  }

  function startLiveTimers() {
    if (liveCountdownInterval) clearInterval(liveCountdownInterval);
    liveCountdownInterval = setInterval(() => {
      courses.forEach(c => {
        if (c.liveClass && c.liveClass.enabled) {
          const el = document.getElementById(`countdown-${c.id}`);
          if (el) {
            el.textContent = formatLiveTimeLabel(c.liveClass.startTime);
          }
        }
      });
    }, 30000);
  }

  // ─── LIVE STREAM THEATER MODAL ───
  function openLiveClass(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course || !course.liveClass) {
      showToast('warn', 'Live Class Not Available', 'This course does not currently have a live session.');
      return;
    }

    activeLiveCourse = course;
    const lc = course.liveClass;
    const isLive = isClassCurrentlyLive(lc.startTime);

    // Extract YouTube video ID
    let videoId = lc.youtubeVideoId;
    if (!videoId && lc.youtubeUrl) {
      const match = lc.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})/);
      if (match) videoId = match[1];
    }
    if (!videoId) videoId = 'dQw4w9WgXcQ'; // Fallback sample live stream ID

    const modalBody = document.getElementById('liveClassModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="live-theatre-layout">
        <div>
          <div class="live-player-container">
            <iframe class="live-player-iframe"
              src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>

          <div class="live-stream-info">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
              <span class="${isLive ? 'badge-live-now' : 'badge-live-upcoming'}">
                ${isLive ? '<span class="c-live-dot"></span> LIVE ON YOUTUBE' : '<i class="fa-solid fa-clock"></i> SCHEDULED SESSION'}
              </span>
              <span style="font-size:0.8rem; color:var(--text-secondary);">
                <i class="fa-solid fa-user-tie" style="color:var(--gold-primary);"></i> Instructor: ${escapeHtml(course.instructor || 'The Chairman')}
              </span>
            </div>

            <h2 class="live-stream-title">${escapeHtml(lc.title || course.title)}</h2>
            <div class="live-stream-meta">
              <span><i class="fa-solid fa-calendar-days"></i> ${formatFullDateTime(lc.startTime)}</span>
              <span>·</span>
              <span><i class="fa-solid fa-hourglass-half"></i> ${lc.durationMinutes || 90} Minutes</span>
              <span>·</span>
              <span style="color:var(--gold-light);"><i class="fa-solid fa-book-open"></i> ${escapeHtml(course.category || 'General')}</span>
            </div>
            <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.5; margin-bottom:1rem;">
              ${escapeHtml(lc.agenda || course.description || '')}
            </p>

            <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
              <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener" class="btn-card-primary" style="background:#ef4444; color:#fff; text-decoration:none;">
                <i class="fa-brands fa-youtube"></i> Watch on YouTube App
              </a>
              <button class="btn-card-primary" style="background:var(--bg-surface-3); color:var(--gold-light); border:1px solid var(--border-gold);" onclick="window.location.href='/super-revision'">
                <i class="fa-solid fa-brain"></i> Open Super Revision Mindmap
              </button>
            </div>
          </div>
        </div>

        <!-- Live Interaction / Doubts Chat Box -->
        <div class="live-interaction-box">
          <div class="lib-header">
            <span><i class="fa-solid fa-comments"></i> Live Doubts & Chat</span>
            <span style="font-size:0.72rem; color:var(--accent-green);"><i class="fa-solid fa-circle"></i> Connected</span>
          </div>

          <div class="lib-chat-messages" id="liveChatMessages">
            <div class="live-chat-bubble">
              <div class="lcb-author"><span class="lcb-admin-badge">INSTRUCTOR</span> The Chairman</div>
              <div class="lcb-text">Welcome students! Drop all your doubts and questions here directly during the live session.</div>
            </div>
            <div class="live-chat-bubble">
              <div class="lcb-author">Aman Sharma</div>
              <div class="lcb-text">Sir can you explain the time complexity in this problem once more?</div>
            </div>
            <div class="live-chat-bubble">
              <div class="lcb-author"><span class="lcb-admin-badge">INSTRUCTOR</span> The Chairman</div>
              <div class="lcb-text">Sure Aman! It's O(N log N) because we partition in halves like merge sort.</div>
            </div>
          </div>

          <div class="lib-input-area">
            <input type="text" id="liveChatInput" placeholder="Ask doubt in live class..." onkeydown="if(event.key==='Enter') CoursesManager.sendLiveChatMessage()">
            <button onclick="CoursesManager.sendLiveChatMessage()"><i class="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    `;

    openModal('liveClassModal');
  }

  function sendLiveChatMessage() {
    const input = document.getElementById('liveChatInput');
    const container = document.getElementById('liveChatMessages');
    if (!input || !container) return;

    const text = input.value.trim();
    if (!text) return;

    const author = window.currentUser?.displayName || (isAdminUser() ? 'Admin / Chairman' : 'Student');
    const isAdmin = isAdminUser();

    const bubble = document.createElement('div');
    bubble.className = 'live-chat-bubble';
    bubble.innerHTML = `
      <div class="lcb-author">
        ${isAdmin ? '<span class="lcb-admin-badge">ADMIN</span>' : ''} ${escapeHtml(author)}
      </div>
      <div class="lcb-text">${escapeHtml(text)}</div>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    input.value = '';

    // Simulate responsive answer if asked by student
    if (!isAdmin) {
      setTimeout(() => {
        const reply = document.createElement('div');
        reply.className = 'live-chat-bubble';
        reply.innerHTML = `
          <div class="lcb-author"><span class="lcb-admin-badge">INSTRUCTOR</span> The Chairman</div>
          <div class="lcb-text">Noted! Adding this concept to the live slide notes right now. 👍</div>
        `;
        container.appendChild(reply);
        container.scrollTop = container.scrollHeight;
      }, 1500);
    }
  }

  // ─── CHECKOUT & PAYMENT MODAL ───
  function openCheckout(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const modalBody = document.getElementById('courseCheckoutModalBody');
    if (!modalBody) return;

    const upiId = course.payment?.upiId || 'chairman@upi';
    const amount = course.price || 499;
    const courseTitle = course.title || 'Course Masterclass';
    const razorpayLink = course.payment?.razorpayLink || '';

    // Standard UPI Intent URI for QR code
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('The Chairman Show')}&am=${amount}&cu=INR&tn=${encodeURIComponent(courseTitle.substring(0, 30))}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

    modalBody.innerHTML = `
      <div class="checkout-course-hero">
        <img src="${escapeHtml(course.thumbnail)}" class="cch-thumb" alt="${escapeHtml(courseTitle)}">
        <div class="cch-details">
          <h4>${escapeHtml(courseTitle)}</h4>
          <span style="font-size:0.78rem; color:var(--text-secondary);"><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(course.category)}</span>
          <div class="cch-price">₹${amount} <span style="font-size:0.75rem; color:var(--text-dim); text-decoration:line-through;">₹${course.originalPrice || amount * 3}</span></div>
        </div>
      </div>

      <div class="payment-methods-tabs">
        <button class="pm-tab-btn active" id="btnPmUpi" onclick="CoursesManager.switchPaymentTab('upi')">
          <i class="fa-solid fa-qrcode"></i> Scan UPI QR Code
        </button>
        <button class="pm-tab-btn" id="btnPmRazorpay" onclick="CoursesManager.switchPaymentTab('razorpay')">
          <i class="fa-solid fa-credit-card"></i> Razorpay Payment Link
        </button>
      </div>

      <!-- UPI Panel -->
      <div id="panelPmUpi" class="upi-payment-panel">
        <div class="upi-qr-frame">
          <img src="${qrUrl}" alt="Scan to pay ₹${amount}" class="upi-qr-img">
        </div>
        <div class="upi-id-pill">
          <span>${escapeHtml(upiId)}</span>
          <button class="btn-copy-upi-pill" onclick="CoursesManager.copyUpi('${escapeHtml(upiId)}')" title="Copy UPI ID">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
        <p style="font-size:0.78rem; color:var(--text-secondary); max-width:380px; margin-bottom:1rem;">
          Scan with Google Pay, PhonePe, Paytm or BHIM UPI. Amount: <strong>₹${amount}</strong>
        </p>

        <a href="${upiUri}" class="btn-card-primary" style="margin-bottom:1.25rem;">
          <i class="fa-solid fa-mobile-screen"></i> Open UPI App on Mobile
        </a>

        <!-- Submission form for UTR / Proof -->
        <div style="width:100%; max-width:440px; background:var(--bg-surface-3); border-radius:10px; padding:1rem; text-align:left;">
          <label style="font-size:0.8rem; font-weight:700; color:var(--text-primary); display:block; margin-bottom:0.35rem;">
            Enter Your Registered Email & Payment Ref (UTR):
          </label>
          <input type="email" id="checkoutStudentEmail" placeholder="your.email@example.com" value="${escapeHtml(getUserEmail())}" style="width:100%; padding:0.5rem; margin-bottom:0.5rem; background:var(--bg-surface); border:1px solid var(--border-mid); border-radius:6px; color:var(--text-primary); font-size:0.82rem;">
          <input type="text" id="checkoutPaymentUtr" placeholder="12-digit UTR / Transaction Reference ID" style="width:100%; padding:0.5rem; margin-bottom:0.75rem; background:var(--bg-surface); border:1px solid var(--border-mid); border-radius:6px; color:var(--text-primary); font-size:0.82rem; font-family:var(--font-mono);">
          <button class="btn-card-primary" style="width:100%; justify-content:center;" onclick="CoursesManager.submitPaymentVerification('${course.id}', 'upi')">
            <i class="fa-solid fa-shield-halved"></i> Verify & Request Instant Access
          </button>
        </div>
      </div>

      <!-- Razorpay Panel -->
      <div id="panelPmRazorpay" class="razorpay-panel" style="display:none;">
        <i class="fa-solid fa-credit-card" style="font-size:2.5rem; color:#0744a6; margin-bottom:0.75rem;"></i>
        <h4 style="font-size:1.1rem; color:var(--text-primary); margin-bottom:0.35rem;">Pay via Razorpay Official Gateway</h4>
        <p style="font-size:0.83rem; color:var(--text-secondary); max-width:400px; margin:0 auto 1.25rem;">
          Pay safely using Debit Card, Credit Card, Netbanking, Wallets or EMI.
        </p>

        ${razorpayLink ? `
          <a href="${escapeHtml(razorpayLink)}" target="_blank" rel="noopener" class="btn-pay-razorpay-direct">
            <i class="fa-solid fa-lock"></i> Pay ₹${amount} on Razorpay Page
          </a>
        ` : `
          <div style="background:var(--bg-surface-3); padding:0.85rem; border-radius:8px; font-size:0.82rem; color:var(--text-secondary); margin-bottom:1rem;">
            Admin has configured direct UPI payment. Please use the UPI QR Code tab above.
          </div>
        `}

        <div style="width:100%; max-width:440px; margin:0 auto; background:var(--bg-surface-3); border-radius:10px; padding:1rem; text-align:left;">
          <label style="font-size:0.8rem; font-weight:700; color:var(--text-primary); display:block; margin-bottom:0.35rem;">
            Already paid on Razorpay? Enter your payment email:
          </label>
          <input type="email" id="checkoutRzpEmail" placeholder="your.email@example.com" value="${escapeHtml(getUserEmail())}" style="width:100%; padding:0.5rem; margin-bottom:0.5rem; background:var(--bg-surface); border:1px solid var(--border-mid); border-radius:6px; color:var(--text-primary); font-size:0.82rem;">
          <button class="btn-card-primary" style="width:100%; justify-content:center;" onclick="CoursesManager.submitPaymentVerification('${course.id}', 'razorpay')">
            <i class="fa-solid fa-check-circle"></i> Unlock Course Access
          </button>
        </div>
      </div>

      <div style="margin-top:1rem; text-align:center; font-size:0.8rem; color:var(--text-muted);">
        Pre-approved student? <a href="javascript:void(0)" onclick="CoursesManager.checkVipAccess('${course.id}')" style="color:var(--gold-primary); text-decoration:underline;">Click here to check VIP unlock</a>
      </div>
    `;

    openModal('courseCheckoutModal');
  }

  function switchPaymentTab(tab) {
    const upiBtn = document.getElementById('btnPmUpi');
    const rzpBtn = document.getElementById('btnPmRazorpay');
    const upiPanel = document.getElementById('panelPmUpi');
    const rzpPanel = document.getElementById('panelPmRazorpay');

    if (tab === 'upi') {
      upiBtn?.classList.add('active');
      rzpBtn?.classList.remove('active');
      if (upiPanel) upiPanel.style.display = 'flex';
      if (rzpPanel) rzpPanel.style.display = 'none';
    } else {
      rzpBtn?.classList.add('active');
      upiBtn?.classList.remove('active');
      if (upiPanel) upiPanel.style.display = 'none';
      if (rzpPanel) rzpPanel.style.display = 'block';
    }
  }

  function copyUpi(upiId) {
    navigator.clipboard.writeText(upiId).then(() => {
      showToast('success', 'UPI ID Copied', upiId);
    }).catch(() => {
      prompt('Copy UPI ID:', upiId);
    });
  }

  async function submitPaymentVerification(courseId, method) {
    const emailInput = method === 'upi' ? document.getElementById('checkoutStudentEmail') : document.getElementById('checkoutRzpEmail');
    const utrInput = document.getElementById('checkoutPaymentUtr');

    const email = emailInput?.value.trim().toLowerCase();
    const utr = utrInput?.value.trim();

    if (!email || !email.includes('@')) {
      showToast('warn', 'Valid Email Required', 'Please provide your email to unlock access.');
      return;
    }

    localStorage.setItem('tcs_student_email', email);

    // Save unlock request
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: email,
          studentName: window.currentUser?.displayName || email.split('@')[0],
          paymentMethod: method,
          paymentRef: utr || 'RZP-ONLINE',
          note: 'Submitted via checkout dialog'
        })
      });

      if (res.ok) {
        // Unlock optimistically for student experience
        try {
          const unlocked = JSON.parse(localStorage.getItem('tcs_unlocked_courses') || '[]');
          if (!unlocked.includes(courseId)) {
            unlocked.push(courseId);
            localStorage.setItem('tcs_unlocked_courses', JSON.stringify(unlocked));
          }
        } catch (e) {}

        closeModal('courseCheckoutModal');
        showToast('success', 'Enrollment Request Submitted!', 'Access granted! You can now explore the course materials.');
        renderCourses();
        openCourseDetails(courseId);
      } else {
        throw new Error('Server request failed');
      }
    } catch (err) {
      // Offline fallback: optimistic unlock
      try {
        const unlocked = JSON.parse(localStorage.getItem('tcs_unlocked_courses') || '[]');
        if (!unlocked.includes(courseId)) {
          unlocked.push(courseId);
          localStorage.setItem('tcs_unlocked_courses', JSON.stringify(unlocked));
        }
      } catch (e) {}
      closeModal('courseCheckoutModal');
      showToast('success', 'Access Granted', 'Your submission has been recorded locally.');
      renderCourses();
      openCourseDetails(courseId);
    }
  }

  function checkVipAccess(courseId) {
    const email = prompt('Enter your student email to verify VIP access:');
    if (!email) return;

    const norm = email.trim().toLowerCase();
    localStorage.setItem('tcs_student_email', norm);

    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (isStudentAllowed(course)) {
      closeModal('courseCheckoutModal');
      showToast('success', 'VIP Access Verified!', 'Welcome to the course.');
      renderCourses();
      openCourseDetails(courseId);
    } else {
      showToast('warn', 'Not in Allow-List', 'This email is not yet pre-approved by the Admin. Please submit payment or request access.');
    }
  }

  // ─── COURSE DETAILS & SYLLABUS MODAL ───
  function openCourseDetails(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const modalBody = document.getElementById('courseDetailsModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div>
        <div style="position:relative; width:100%; aspect-ratio:21/9; border-radius:12px; overflow:hidden; margin-bottom:1.25rem;">
          <img src="${escapeHtml(course.thumbnail)}" style="width:100%; height:100%; object-fit:cover;">
          <div style="position:absolute; inset:0; background:linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%); display:flex; align-items:flex-end; padding:1.25rem;">
            <div>
              <span class="${course.isPaid ? 'badge-price-paid' : 'badge-price-free'}">${course.isPaid ? 'PREMIUM MASTERCLASS' : '100% FREE'}</span>
              <h2 style="font-size:1.4rem; color:#fff; margin-top:0.4rem;">${escapeHtml(course.title)}</h2>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
          <div>
            <h4 style="font-size:1rem; color:var(--text-primary); margin-bottom:0.5rem;">About This Course</h4>
            <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1.25rem;">
              ${escapeHtml(course.description || course.subtitle || '')}
            </p>

            <h4 style="font-size:1rem; color:var(--text-primary); margin-bottom:0.75rem;">What You Will Learn</h4>
            <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
              ${(course.features || []).map(f => `
                <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text-secondary);">
                  <i class="fa-solid fa-circle-check" style="color:var(--gold-primary);"></i>
                  <span>${escapeHtml(f)}</span>
                </div>
              `).join('')}
            </div>

            <!-- Modules list if available -->
            ${course.modules && course.modules.length ? `
              <h4 style="font-size:1rem; color:var(--text-primary); margin-bottom:0.75rem;">Course Syllabus</h4>
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                ${course.modules.map(m => `
                  <div style="background:var(--bg-surface-2); border:1px solid var(--border-mid); border-radius:8px; padding:0.85rem;">
                    <div style="font-weight:700; color:var(--gold-light); font-size:0.9rem; margin-bottom:0.5rem;">${escapeHtml(m.title)}</div>
                    ${(m.lessons || []).map(l => `
                      <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:var(--text-secondary); padding:0.3rem 0; border-top:1px solid var(--border-soft);">
                        <span><i class="fa-regular fa-circle-play" style="color:var(--gold-primary);"></i> ${escapeHtml(l.title)}</span>
                        <span style="font-size:0.75rem; color:var(--text-dim);">${escapeHtml(l.duration || '')}</span>
                      </div>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Sidebar Actions -->
          <div style="background:var(--bg-surface-2); border:1px solid var(--border-mid); border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; gap:1rem; height:fit-content;">
            <div style="text-align:center;">
              <span style="font-size:0.8rem; color:var(--text-muted);">Enrollment Status</span>
              <div style="font-size:1.1rem; font-weight:800; color:var(--accent-green); margin-top:0.2rem;">
                <i class="fa-solid fa-circle-check"></i> Unlocked & Active
              </div>
            </div>

            ${course.liveClass && course.liveClass.enabled ? `
              <button class="btn-card-primary btn-card-live" style="width:100%; justify-content:center;" onclick="CoursesManager.openLiveClass('${course.id}')">
                <i class="fa-brands fa-youtube"></i> Enter Live Classroom
              </button>
            ` : ''}

            <button class="btn-card-primary" style="width:100%; justify-content:center; background:var(--bg-surface-3); color:var(--gold-light); border:1px solid var(--border-gold);" onclick="window.location.href='/super-revision'">
              <i class="fa-solid fa-brain"></i> Chairman Super Revision
            </button>

            <div style="border-top:1px solid var(--border-soft); padding-top:0.75rem; font-size:0.78rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.4rem;">
              <div><i class="fa-solid fa-chalkboard-user"></i> Instructor: ${escapeHtml(course.instructor || 'The Chairman')}</div>
              <div><i class="fa-solid fa-certificate"></i> Certificate of Completion</div>
              <div><i class="fa-solid fa-infinity"></i> Lifetime Access</div>
            </div>
          </div>
        </div>
      </div>
    `;

    openModal('courseDetailsModal');
  }

  // ─── ADMIN: CREATE & EDIT MODAL ───
  function openCreateModal() {
    if (!isAdminUser()) {
      showToast('warn', 'Admin Access Required', 'Please enable Admin Mode to create courses.');
      return;
    }
    editingCourseId = null;
    populateCourseForm({});
    document.getElementById('courseEditorModalTitle').textContent = 'Create New Course Masterclass';
    openModal('courseEditorModal');
  }

  function openEditModal(courseId) {
    if (!isAdminUser()) {
      showToast('warn', 'Admin Access Required', 'Please enable Admin Mode to edit courses.');
      return;
    }
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    editingCourseId = courseId;
    populateCourseForm(course);
    document.getElementById('courseEditorModalTitle').textContent = `Edit Course: ${course.title}`;
    openModal('courseEditorModal');
  }

  function populateCourseForm(c) {
    document.getElementById('cefTitle').value = c.title || '';
    document.getElementById('cefSubtitle').value = c.subtitle || '';
    document.getElementById('cefCategory').value = c.category || 'Coding & Tech';
    document.getElementById('cefLevel').value = c.level || 'All Levels';
    document.getElementById('cefInstructor').value = c.instructor || 'The Chairman';
    document.getElementById('cefDescription').value = c.description || '';
    document.getElementById('cefThumbnail').value = c.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800';
    updateThumbnailPreview(c.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800');

    // Pricing
    const isPaid = Boolean(c.isPaid);
    document.getElementById('cefIsPaid').checked = isPaid;
    document.getElementById('cefPaidFields').style.display = isPaid ? 'grid' : 'none';
    document.getElementById('cefPrice').value = c.price || 499;
    document.getElementById('cefOriginalPrice').value = c.originalPrice || 2499;
    document.getElementById('cefUpiId').value = c.payment?.upiId || 'chairman@upi';
    document.getElementById('cefRazorpayLink').value = c.payment?.razorpayLink || '';

    // Allowed students
    const allowed = (c.allowedStudents || []).filter(e => e !== 'all');
    document.getElementById('cefAllowedStudents').value = allowed.join(', ');

    // Live Class
    const lc = c.liveClass || {};
    const liveEnabled = Boolean(lc.enabled);
    document.getElementById('cefLiveEnabled').checked = liveEnabled;
    document.getElementById('cefLiveFields').style.display = liveEnabled ? 'block' : 'none';
    document.getElementById('cefLiveTitle').value = lc.title || '';
    document.getElementById('cefLiveYoutubeUrl').value = lc.youtubeUrl || '';

    // Format start time for input datetime-local
    let dateVal = '';
    if (lc.startTime) {
      try {
        const d = new Date(lc.startTime);
        dateVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch (e) {}
    } else {
      const d = new Date(Date.now() + 86400000);
      dateVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    document.getElementById('cefLiveStartTime').value = dateVal;
    document.getElementById('cefLiveAgenda').value = lc.agenda || '';
    document.getElementById('cefLiveDuration').value = lc.durationMinutes || 90;

    // Features
    const feats = c.features || [
      '🔴 Live YouTube Interactive Classes',
      '🧠 Chairman Super Revision Mindmaps',
      '💬 Real-time Doubt Support',
      '📜 Certificate of Completion'
    ];
    document.getElementById('cefFeatures').value = feats.join('\n');
  }

  function updateThumbnailPreview(url) {
    const preview = document.getElementById('cefThumbPreview');
    if (preview && url) {
      preview.src = url;
      preview.style.display = 'block';
    }
  }

  function setThumbnailPreset(url) {
    document.getElementById('cefThumbnail').value = url;
    updateThumbnailPreview(url);
  }

  function handleThumbnailUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      document.getElementById('cefThumbnail').value = dataUrl;
      updateThumbnailPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function saveCourseFromForm() {
    const title = document.getElementById('cefTitle').value.trim();
    if (!title) {
      showToast('warn', 'Title Required', 'Please enter a course title.');
      return;
    }

    const subtitle = document.getElementById('cefSubtitle').value.trim();
    const category = document.getElementById('cefCategory').value;
    const level = document.getElementById('cefLevel').value;
    const instructor = document.getElementById('cefInstructor').value.trim() || 'The Chairman';
    const description = document.getElementById('cefDescription').value.trim();
    const thumbnail = document.getElementById('cefThumbnail').value.trim() || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800';

    const isPaid = document.getElementById('cefIsPaid').checked;
    const price = isPaid ? parseInt(document.getElementById('cefPrice').value || 0, 10) : 0;
    const originalPrice = isPaid ? parseInt(document.getElementById('cefOriginalPrice').value || 0, 10) : 0;
    const upiId = document.getElementById('cefUpiId').value.trim() || 'chairman@upi';
    const razorpayLink = document.getElementById('cefRazorpayLink').value.trim();

    // Allowed students list
    const allowedRaw = document.getElementById('cefAllowedStudents').value;
    let allowedStudents = allowedRaw.split(/[,;\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!isPaid) {
      allowedStudents = ['all'];
    }

    // Live Class
    const liveEnabled = document.getElementById('cefLiveEnabled').checked;
    const liveTitle = document.getElementById('cefLiveTitle').value.trim();
    const liveYoutubeUrl = document.getElementById('cefLiveYoutubeUrl').value.trim();
    const liveStartTimeRaw = document.getElementById('cefLiveStartTime').value;
    const liveAgenda = document.getElementById('cefLiveAgenda').value.trim();
    const liveDuration = parseInt(document.getElementById('cefLiveDuration').value || 90, 10);

    let startTimeIso = new Date().toISOString();
    if (liveStartTimeRaw) {
      try {
        startTimeIso = new Date(liveStartTimeRaw).toISOString();
      } catch (e) {}
    }

    // Extract video ID
    let ytVid = '';
    if (liveYoutubeUrl) {
      const match = liveYoutubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})/);
      if (match) ytVid = match[1];
      else if (liveYoutubeUrl.length === 11) ytVid = liveYoutubeUrl;
    }

    // Features
    const featsRaw = document.getElementById('cefFeatures').value;
    const features = featsRaw.split('\n').map(s => s.trim()).filter(Boolean);

    const payload = {
      id: editingCourseId || ('course-' + Date.now()),
      title,
      subtitle,
      category,
      level,
      instructor,
      description,
      thumbnail,
      isPaid,
      price,
      originalPrice,
      payment: {
        upiId,
        razorpayLink,
        paymentInstructions: isPaid ? `Scan UPI QR or pay via Razorpay. Admin: ${upiId}` : 'Free'
      },
      allowedStudents,
      features,
      liveClass: {
        enabled: liveEnabled,
        title: liveTitle || `${title} - Live Session`,
        youtubeUrl: liveYoutubeUrl,
        youtubeVideoId: ytVid,
        startTime: startTimeIso,
        durationMinutes: liveDuration,
        agenda: liveAgenda || 'Interactive live masterclass'
      }
    };

    // Save to server
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.courses) {
          courses = data.courses;
        } else {
          updateLocalCourse(payload);
        }
      } else {
        updateLocalCourse(payload);
      }
    } catch (err) {
      updateLocalCourse(payload);
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(courses));
    closeModal('courseEditorModal');
    showToast('success', editingCourseId ? 'Course Updated' : 'Course Created Successfully', title);
    renderCourses();
    renderLiveSchedule();
    renderAdminStudio();
  }

  function updateLocalCourse(payload) {
    const idx = courses.findIndex(c => c.id === payload.id);
    if (idx >= 0) {
      courses[idx] = { ...courses[idx], ...payload };
    } else {
      courses.unshift(payload);
    }
  }

  // ─── ADMIN: DELETE COURSE ───
  async function deleteCourse(courseId) {
    if (!isAdminUser()) {
      showToast('warn', 'Admin Access Required', 'Only admin can delete courses.');
      return;
    }

    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (!confirm(`Are you sure you want to permanently delete "${course.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.courses) courses = data.courses;
        else courses = courses.filter(c => c.id !== courseId);
      } else {
        courses = courses.filter(c => c.id !== courseId);
      }
    } catch (err) {
      courses = courses.filter(c => c.id !== courseId);
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(courses));
    showToast('info', 'Course Deleted', course.title);
    renderCourses();
    renderLiveSchedule();
    renderAdminStudio();
  }

  // ─── ADMIN: ALLOW STUDENTS MODAL ───
  let activeAllowCourseId = null;

  function openAllowStudentsModal(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    activeAllowCourseId = courseId;
    document.getElementById('allowModalCourseTitle').textContent = course.title;
    renderAllowedStudentsList(course);
    openModal('allowStudentsModal');
  }

  function renderAllowedStudentsList(course) {
    const list = document.getElementById('allowedStudentsList');
    if (!list) return;

    const students = course.allowedStudents || [];
    if (!students.length) {
      list.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding:0.5rem 0;">No individual students allowed yet.</div>`;
      return;
    }

    list.innerHTML = students.map(email => `
      <div style="display:inline-flex; align-items:center; gap:0.4rem; background:var(--bg-surface-3); border:1px solid var(--border-gold); padding:0.3rem 0.6rem; border-radius:9999px; font-size:0.78rem; color:var(--gold-light); margin:0.25rem;">
        <span>${escapeHtml(email)}</span>
        <button onclick="CoursesManager.removeAllowedStudent('${course.id}', '${escapeHtml(email)}')" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:0.75rem; padding:0 0.1rem;" title="Remove access">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join('');
  }

  async function addAllowedStudent() {
    const input = document.getElementById('newAllowedStudentEmail');
    if (!input || !activeAllowCourseId) return;

    const email = input.value.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showToast('warn', 'Invalid Email', 'Please enter a valid student email address.');
      return;
    }

    const course = courses.find(c => c.id === activeAllowCourseId);
    if (!course) return;

    if (!course.allowedStudents) course.allowedStudents = [];
    if (!course.allowedStudents.includes(email)) {
      course.allowedStudents.push(email);
    }

    try {
      await fetch(`/api/courses/${activeAllowCourseId}/allow-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (e) {}

    localStorage.setItem(CACHE_KEY, JSON.stringify(courses));
    input.value = '';
    renderAllowedStudentsList(course);
    showToast('success', 'Student Allowed', `Access granted to ${email}`);
    renderCourses();
  }

  function removeAllowedStudent(courseId, email) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    course.allowedStudents = (course.allowedStudents || []).filter(e => e.toLowerCase() !== email.toLowerCase());

    fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course)
    }).catch(() => {});

    localStorage.setItem(CACHE_KEY, JSON.stringify(courses));
    renderAllowedStudentsList(course);
    showToast('info', 'Student Removed', `Revoked access for ${email}`);
    renderCourses();
  }

  async function approveRequest(requestId) {
    try {
      const res = await fetch(`/api/courses/enrollment-requests/${requestId}/approve`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.courses) courses = data.courses;
        showToast('success', 'Request Approved', 'Student granted full course access.');
        renderAdminStudio();
        renderCourses();
      }
    } catch (err) {
      showToast('warn', 'Approval Error', err.message);
    }
  }

  // ─── TAB NAVIGATION & FILTERS ───
  function switchCoursesTab(tabId) {
    activeTab = tabId;

    document.querySelectorAll('.c-nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tabBtn_${tabId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Panes
    const pAll = document.getElementById('paneAllCourses');
    const pLive = document.getElementById('paneLiveSchedule');
    const pAdmin = document.getElementById('paneAdminStudio');
    const pYt = document.getElementById('paneYtVault');

    if (pAll) pAll.style.display = tabId === 'allCourses' ? 'block' : 'none';
    if (pLive) pLive.style.display = tabId === 'liveSchedule' ? 'block' : 'none';
    if (pAdmin) pAdmin.style.display = tabId === 'adminStudio' ? 'block' : 'none';
    if (pYt) pYt.style.display = tabId === 'ytVault' ? 'block' : 'none';

    if (tabId === 'liveSchedule') renderLiveSchedule();
    if (tabId === 'adminStudio') renderAdminStudio();
    if (tabId === 'ytVault' && window.YouTube) window.YouTube.ensureLoaded();
  }

  function bindEvents() {
    // Nav Tab Buttons
    document.getElementById('tabBtn_allCourses')?.addEventListener('click', () => switchCoursesTab('allCourses'));
    document.getElementById('tabBtn_liveSchedule')?.addEventListener('click', () => switchCoursesTab('liveSchedule'));
    document.getElementById('tabBtn_ytVault')?.addEventListener('click', () => switchCoursesTab('ytVault'));
    document.getElementById('tabBtn_adminStudio')?.addEventListener('click', () => switchCoursesTab('adminStudio'));

    // Admin Toggle Button
    document.getElementById('courseAdminToggleBtn')?.addEventListener('click', toggleAdminMode);

    // Filter chips
    document.querySelectorAll('#coursesFilterChips .c-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#coursesFilterChips .c-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter || 'all';
        renderCourses();
      });
    });

    // Search bar
    const search = document.getElementById('coursesSearchInput');
    if (search) {
      search.addEventListener('input', (e) => {
        searchTerm = e.target.value.trim();
        renderCourses();
      });
    }

    // IsPaid checkbox toggle in modal
    document.getElementById('cefIsPaid')?.addEventListener('change', (e) => {
      const paidFields = document.getElementById('cefPaidFields');
      if (paidFields) paidFields.style.display = e.target.checked ? 'grid' : 'none';
    });

    // LiveEnabled checkbox toggle in modal
    document.getElementById('cefLiveEnabled')?.addEventListener('change', (e) => {
      const liveFields = document.getElementById('cefLiveFields');
      if (liveFields) liveFields.style.display = e.target.checked ? 'block' : 'none';
    });

    // Thumbnail input change
    document.getElementById('cefThumbnail')?.addEventListener('input', (e) => {
      updateThumbnailPreview(e.target.value);
    });

    // Thumbnail file upload
    document.getElementById('cefThumbFile')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleThumbnailUpload(e.target.files[0]);
      }
    });
  }

  function showToast(type, title, sub) {
    if (typeof window.toast === 'function') {
      window.toast(type, title, sub);
    } else {
      console.log(`[Toast ${type}] ${title} - ${sub}`);
    }
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function init() {
    bindEvents();
    loadCourses();
    updateAdminUI();
  }

  return {
    init,
    openCreateModal,
    openEditModal,
    deleteCourse,
    openLiveClass,
    sendLiveChatMessage,
    openCheckout,
    switchPaymentTab,
    copyUpi,
    submitPaymentVerification,
    checkVipAccess,
    openCourseDetails,
    openAllowStudentsModal,
    addAllowedStudent,
    removeAllowedStudent,
    approveRequest,
    saveCourseFromForm,
    setThumbnailPreset,
    toggleAdminMode,
    switchCoursesTab
  };
})();

// Attach globally
window.CoursesManager = CoursesManager;
document.addEventListener('DOMContentLoaded', () => {
  CoursesManager.init();
});
