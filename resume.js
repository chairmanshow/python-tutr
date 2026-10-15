/* ══════════════════════════════════════════════════════════════
   AI RESUME BUILDER — COMPLETE CLIENT LOGIC
   The Chairman Show — ATS Resume Generator for Indian Students
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─────────────── 1. FIREBASE INITIALIZATION ───────────────
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
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      auth = firebase.auth();
      db = firebase.firestore();
    }
  } catch (err) {
    console.warn('[Resume Builder] Firebase init:', err.message);
  }

  const CONFIG = {
    AI_PROXY: "https://tcs-ai-proxy.sumitshrivas24.workers.dev/",
    STORAGE_KEY: "tcs_resume_builder_data_v1",
    HISTORY_KEY: "tcs_resume_builder_history_v1",
    GUEST_KEY: "tcs_resume_guest_uid"
  };

  const TEMPLATE_NAMES = {
    'modern-minimal': 'Modern Minimal (Single Column)',
    'classic-professional': 'Classic Professional (Two Column)',
    'creative-purple': 'Creative Purple (Product & Design)',
    'tech-dark': 'Tech Dark (<Developer/> Theme)',
    'fresher-friendly': 'Fresher Friendly (Chairman Pick)',
    'two-column-elegant': 'Two-Column Elegant (Balanced)',
    'sidebar-classic': 'Sidebar Classic (Visual Accent)',
    'timeline-style': 'Timeline Style (Career Journey)'
  };

  // Helper DOM selectors
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─────────────── 2. DEFAULT STATE / SAMPLE DATA ───────────────
  const defaultResumeData = {
    template: 'fresher-friendly',
    themeColor: 'gold',
    fontSize: 'font-standard',
    zoom: 100,
    atsScore: 82,
    sectionsVisibility: {
      photo: true,
      summary: true,
      education: true,
      skills: true,
      projects: true,
      experience: true,
      certifications: true
    },
    personal: {
      fullName: 'Aryan Sharma',
      email: 'aryan.sharma@gmail.com',
      phone: '+91 98765 43210',
      city: 'Bengaluru, Karnataka',
      linkedIn: 'linkedin.com/in/aryansharma',
      gitHub: 'github.com/aryansharma',
      targetRole: 'Full Stack Developer',
      photoBase64: ''
    },
    education: [
      {
        id: 'edu_1',
        degree: 'B.Tech in Computer Science & Engineering',
        college: 'Vellore Institute of Technology (VIT)',
        year: '2021 - 2025 (Expected)',
        cgpa: '8.8 / 10.0'
      },
      {
        id: 'edu_2',
        degree: 'Senior Secondary (Class XII) - CBSE',
        college: 'Delhi Public School, R.K. Puram',
        year: '2021',
        cgpa: '94.6%'
      }
    ],
    skills: {
      technical: [
        'Python', 'JavaScript (ES6+)', 'React.js', 'Node.js',
        'Express.js', 'PostgreSQL', 'MongoDB', 'Docker',
        'Data Structures & Algorithms', 'Git & GitHub', 'RESTful APIs'
      ],
      soft: [
        'Analytical Problem Solving', 'Agile Collaboration',
        'Technical Documentation', 'Team Leadership'
      ]
    },
    projects: [
      {
        id: 'proj_1',
        name: 'AI-Powered Campus Placement Portal',
        techStack: 'React, Node.js, Express, PostgreSQL, Groq AI API',
        link: 'github.com/aryansharma/campus-placement-ai',
        description: 'Engineered an automated resume screener and test evaluator handling 1,500+ student profiles with 99.2% uptime. Implemented secure JWT role-based auth and automated email notifications.'
      },
      {
        id: 'proj_2',
        name: 'Real-Time Collaborative Code Editor',
        techStack: 'Socket.io, Monaco Editor, Redis, Docker',
        link: 'github.com/aryansharma/collab-code-web',
        description: 'Architected low-latency synchronized coding environment supporting 50+ concurrent websocket sessions. Integrated custom Python AST sandboxed execution engine reducing test latency by 35%.'
      }
    ],
    experience: [
      {
        id: 'exp_1',
        role: 'Full Stack Web Development Intern',
        company: 'Bharat Fintech Labs, Bengaluru',
        duration: 'May 2024 - July 2024',
        achievements: 'Spearheaded conversion of legacy customer KYC flow into responsive React micro-frontends, cutting drop-off rates by 22%. Refactored 14 backend REST endpoints with Redis caching, boosting throughput by 40%.'
      }
    ],
    certifications: [
      {
        id: 'cert_1',
        name: 'AWS Certified Cloud Practitioner',
        provider: 'Amazon Web Services (AWS)',
        date: 'Jan 2024',
        link: 'aws.amazon.com/verify'
      },
      {
        id: 'cert_2',
        name: 'The Chairman Show: Python & DSA Master Certification',
        provider: 'The Chairman Show Foundation',
        date: 'Oct 2023',
        link: 'thechairmanshow.com/cert'
      }
    ],
    summary: 'Proactive Computer Science undergraduate specializing in full-stack architecture and high-performance algorithms. Proven track record building production-grade web applications with modern React and Node.js ecosystems. Passionate about solving complex distributed system bottlenecks in fast-paced software engineering teams.'
  };

  // Working state copy
  let state = JSON.parse(JSON.stringify(defaultResumeData));
  let currentStep = 1;
  let activeResumeId = null;

  // ─────────────── 3. TOAST UTILITY ───────────────
  function toast(type, title, sub) {
    const stack = $('toastStack');
    if (!stack) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'circle-check' : (type === 'error' ? 'triangle-exclamation' : 'circle-info');
    t.innerHTML = `
      <i class="fa-solid fa-${icon}"></i>
      <div>
        <div style="font-weight:700;">${escapeHtml(title)}</div>
        ${sub ? `<div style="font-size:0.75rem;opacity:0.85;">${escapeHtml(sub)}</div>` : ''}
      </div>
    `;
    stack.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 250);
    }, 3800);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function getGuestUid() {
    let uid = localStorage.getItem(CONFIG.GUEST_KEY);
    if (!uid) {
      uid = 'guest_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem(CONFIG.GUEST_KEY, uid);
    }
    return uid;
  }

  // ─────────────── 4. SCREEN & STEP SWITCHING ───────────────
  function showScreen(name) {
    $$('.screen-section').forEach(s => s.classList.remove('active'));
    if (name === 'templates') {
      $('screenTemplates').classList.add('active');
      $('screenWorkspace').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (name === 'workspace') {
      $('screenTemplates').classList.remove('active');
      $('screenWorkspace').style.display = 'block';
      $('screenWorkspace').classList.add('active');
      renderActiveTemplateName();
      renderLivePreview();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function setStep(stepNum) {
    stepNum = Math.max(1, Math.min(7, stepNum));
    currentStep = stepNum;

    // Update stepper progress bar & dots
    const percent = ((currentStep - 1) / 6) * 100;
    $('stepProgressFill').style.width = `${Math.max(14.28, percent)}%`;

    $$('.step-dot').forEach(btn => {
      const s = parseInt(btn.dataset.step, 10);
      btn.classList.remove('active', 'completed');
      if (s === currentStep) btn.classList.add('active');
      else if (s < currentStep) btn.classList.add('completed');
    });

    // Update Panes
    $$('.step-pane').forEach((pane, idx) => {
      if (idx + 1 === currentStep) pane.classList.add('active');
      else pane.classList.remove('active');
    });

    // Navigation buttons
    $('prevStepBtn').style.visibility = currentStep === 1 ? 'hidden' : 'visible';
    $('currentStepNum').textContent = currentStep;

    const nextBtn = $('nextStepBtn');
    if (currentStep === 7) {
      nextBtn.innerHTML = `<span>Preview & Export</span> <i class="fa-solid fa-check"></i>`;
    } else {
      nextBtn.innerHTML = `<span>Next Step</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  }

  function renderActiveTemplateName() {
    const lbl = $('activeTemplateName');
    if (lbl) lbl.textContent = TEMPLATE_NAMES[state.template] || state.template;
  }

  // ─────────────── 5. POPULATE FORM CONTROLS FROM STATE ───────────────
  function populateFormFromState() {
    // Personal
    $('inpFullName').value = state.personal.fullName || '';
    $('inpEmail').value = state.personal.email || '';
    $('inpPhone').value = state.personal.phone || '';
    $('inpCity').value = state.personal.city || '';
    $('inpLinkedIn').value = state.personal.linkedIn || '';
    $('inpGitHub').value = state.personal.gitHub || '';
    $('inpTargetRole').value = state.personal.targetRole || '';

    if (state.personal.photoBase64) {
      $('photoPreviewImg').src = state.personal.photoBase64;
      $('photoPreviewImg').style.display = 'block';
      $('photoPlaceholderIcon').style.display = 'none';
      $('removePhotoBtn').style.display = 'inline-block';
    } else {
      $('photoPreviewImg').src = '';
      $('photoPreviewImg').style.display = 'none';
      $('photoPlaceholderIcon').style.display = 'block';
      $('removePhotoBtn').style.display = 'none';
    }

    // Dynamic Lists
    renderEducationList();
    renderSkillsChips();
    renderProjectsList();
    renderExperienceList();
    renderCertificationsList();

    // Summary
    $('inpSummary').value = state.summary || '';
    updateSummaryWordCount();

    // Top ATS badge & Score
    updateAtsGauge(state.atsScore || 75);
  }

  function updateSummaryWordCount() {
    const text = $('inpSummary').value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    $('summaryWordCount').textContent = `${count} words`;
  }

  // ─────────────── 6. DYNAMIC LIST RENDERERS ───────────────
  function renderEducationList() {
    const container = $('educationList');
    container.innerHTML = '';
    state.education.forEach((edu, idx) => {
      const card = document.createElement('div');
      card.className = 'entry-card';
      card.innerHTML = `
        <div class="entry-card-header">
          <div class="entry-card-title"><i class="fa-solid fa-graduation-cap"></i> Degree #${idx + 1}</div>
          <button class="btn-remove-entry" data-remove-edu="${edu.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <div class="form-grid-2">
          <div class="fg-group">
            <label class="form-label">Degree / Course</label>
            <input type="text" class="cine-input edu-degree" data-id="${edu.id}" value="${escapeHtml(edu.degree)}" placeholder="e.g. B.Tech in CSE">
          </div>
          <div class="fg-group">
            <label class="form-label">College / University</label>
            <input type="text" class="cine-input edu-college" data-id="${edu.id}" value="${escapeHtml(edu.college)}" placeholder="e.g. VIT Vellore">
          </div>
          <div class="fg-group">
            <label class="form-label">Year / Duration</label>
            <input type="text" class="cine-input edu-year" data-id="${edu.id}" value="${escapeHtml(edu.year)}" placeholder="e.g. 2021 - 2025">
          </div>
          <div class="fg-group">
            <label class="form-label">CGPA / Percentage</label>
            <input type="text" class="cine-input edu-cgpa" data-id="${edu.id}" value="${escapeHtml(edu.cgpa)}" placeholder="e.g. 8.5 / 10 or 88%">
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderSkillsChips() {
    // Tech
    const techBox = $('techSkillsChips');
    techBox.innerHTML = '';
    state.skills.technical.forEach(skill => {
      const pill = document.createElement('span');
      pill.className = 'skill-tag-pill';
      pill.innerHTML = `
        <span>${escapeHtml(skill)}</span>
        <button class="btn-remove-chip" data-remove-tech="${escapeHtml(skill)}"><i class="fa-solid fa-xmark"></i></button>
      `;
      techBox.appendChild(pill);
    });
    $('techSkillsCount').textContent = `${state.skills.technical.length} added`;

    // Soft
    const softBox = $('softSkillsChips');
    softBox.innerHTML = '';
    state.skills.soft.forEach(skill => {
      const pill = document.createElement('span');
      pill.className = 'skill-tag-pill soft';
      pill.innerHTML = `
        <span>${escapeHtml(skill)}</span>
        <button class="btn-remove-chip" data-remove-soft="${escapeHtml(skill)}"><i class="fa-solid fa-xmark"></i></button>
      `;
      softBox.appendChild(pill);
    });
    $('softSkillsCount').textContent = `${state.skills.soft.length} added`;
  }

  function renderProjectsList() {
    const container = $('projectsList');
    container.innerHTML = '';
    state.projects.forEach((proj, idx) => {
      const card = document.createElement('div');
      card.className = 'entry-card';
      card.innerHTML = `
        <div class="entry-card-header">
          <div class="entry-card-title"><i class="fa-solid fa-diagram-project"></i> Project #${idx + 1}</div>
          <button class="btn-remove-entry" data-remove-proj="${proj.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <div class="form-grid-2">
          <div class="fg-group">
            <label class="form-label">Project Title</label>
            <input type="text" class="cine-input proj-name" data-id="${proj.id}" value="${escapeHtml(proj.name)}" placeholder="e.g. Campus Placement Portal">
          </div>
          <div class="fg-group">
            <label class="form-label">Tech Stack (comma separated)</label>
            <input type="text" class="cine-input proj-tech" data-id="${proj.id}" value="${escapeHtml(proj.techStack)}" placeholder="e.g. React, Node.js, PostgreSQL">
          </div>
          <div class="fg-group fg-span-2">
            <label class="form-label">Project URL / GitHub Repo</label>
            <input type="text" class="cine-input proj-link" data-id="${proj.id}" value="${escapeHtml(proj.link || '')}" placeholder="github.com/username/project">
          </div>
          <div class="fg-group fg-span-2">
            <label class="form-label">Description & Achievements</label>
            <textarea class="cine-textarea proj-desc" rows="3" data-id="${proj.id}" placeholder="What did you build? What was the outcome? Use action verbs and numbers...">${escapeHtml(proj.description)}</textarea>
            <div class="entry-ai-toolbar">
              <button type="button" class="btn-ai-pill-sm btn-ai-rewrite-proj" data-id="${proj.id}">
                <i class="fa-solid fa-wand-magic-sparkles"></i> AI Rewrite to Professional English
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderExperienceList() {
    const container = $('experienceList');
    container.innerHTML = '';
    if (!state.experience.length) {
      container.innerHTML = `
        <div style="padding:1.5rem;text-align:center;background:#141520;border-radius:var(--r-md);color:var(--text-muted);font-size:0.85rem;">
          No work experience added yet. As a fresher, you can leave this empty or add virtual internships & college club roles!
        </div>
      `;
      return;
    }

    state.experience.forEach((exp, idx) => {
      const card = document.createElement('div');
      card.className = 'entry-card';
      card.innerHTML = `
        <div class="entry-card-header">
          <div class="entry-card-title"><i class="fa-solid fa-briefcase"></i> Experience #${idx + 1}</div>
          <button class="btn-remove-entry" data-remove-exp="${exp.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <div class="form-grid-2">
          <div class="fg-group">
            <label class="form-label">Job Title / Role</label>
            <input type="text" class="cine-input exp-role" data-id="${exp.id}" value="${escapeHtml(exp.role)}" placeholder="e.g. Software Engineer Intern">
          </div>
          <div class="fg-group">
            <label class="form-label">Company / Organization</label>
            <input type="text" class="cine-input exp-company" data-id="${exp.id}" value="${escapeHtml(exp.company)}" placeholder="e.g. Bharat Fintech Labs">
          </div>
          <div class="fg-group fg-span-2">
            <label class="form-label">Duration & Location</label>
            <input type="text" class="cine-input exp-duration" data-id="${exp.id}" value="${escapeHtml(exp.duration)}" placeholder="e.g. May 2024 - July 2024 | Bengaluru">
          </div>
          <div class="fg-group fg-span-2">
            <label class="form-label">Key Responsibilities & Quantified Achievements</label>
            <textarea class="cine-textarea exp-achieve" rows="3" data-id="${exp.id}" placeholder="Spearheaded migration... Reduced query time by 30%...">${escapeHtml(exp.achievements)}</textarea>
            <div class="entry-ai-toolbar">
              <button type="button" class="btn-ai-pill-sm btn-ai-rewrite-exp" data-id="${exp.id}">
                <i class="fa-solid fa-wand-magic-sparkles"></i> AI Enhance Bullet Points
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderCertificationsList() {
    const container = $('certificationsList');
    container.innerHTML = '';
    state.certifications.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'entry-card';
      card.innerHTML = `
        <div class="entry-card-header">
          <div class="entry-card-title"><i class="fa-solid fa-award"></i> Certificate #${idx + 1}</div>
          <button class="btn-remove-entry" data-remove-cert="${c.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <div class="form-grid-2">
          <div class="fg-group">
            <label class="form-label">Certification Name</label>
            <input type="text" class="cine-input cert-name" data-id="${c.id}" value="${escapeHtml(c.name)}" placeholder="e.g. AWS Certified Cloud Practitioner">
          </div>
          <div class="fg-group">
            <label class="form-label">Issuing Organization</label>
            <input type="text" class="cine-input cert-provider" data-id="${c.id}" value="${escapeHtml(c.provider)}" placeholder="e.g. Amazon Web Services">
          </div>
          <div class="fg-group">
            <label class="form-label">Issue Date</label>
            <input type="text" class="cine-input cert-date" data-id="${c.id}" value="${escapeHtml(c.date)}" placeholder="e.g. Jan 2024">
          </div>
          <div class="fg-group">
            <label class="form-label">Credential Verification Link</label>
            <input type="text" class="cine-input cert-link" data-id="${c.id}" value="${escapeHtml(c.link || '')}" placeholder="e.g. aws.amazon.com/verify">
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ─────────────── 7. LIVE RESUME PREVIEW RENDERER ───────────────
  function renderLivePreview() {
    const paper = $('resumePreview');
    if (!paper) return;

    // Reset Classes
    paper.className = `resume-sheet-paper template-${state.template} ${state.fontSize} theme-${state.themeColor}`;

    const vis = state.sectionsVisibility;
    const p = state.personal;

    // Build sub components
    const contactItems = [];
    if (p.phone) contactItems.push(`<span><i class="fa-solid fa-phone"></i> ${escapeHtml(p.phone)}</span>`);
    if (p.email) contactItems.push(`<span><i class="fa-solid fa-envelope"></i> ${escapeHtml(p.email)}</span>`);
    if (p.city) contactItems.push(`<span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.city)}</span>`);
    if (p.linkedIn) contactItems.push(`<span><i class="fa-brands fa-linkedin"></i> ${escapeHtml(p.linkedIn)}</span>`);
    if (p.gitHub) contactItems.push(`<span><i class="fa-brands fa-github"></i> ${escapeHtml(p.gitHub)}</span>`);

    const contactBarHtml = contactItems.join(' • ');

    // Education HTML
    let educationHtml = '';
    if (vis.education && state.education.length) {
      educationHtml = `
        <div class="cv-section">
          <div class="cv-section-title"><i class="fa-solid fa-graduation-cap"></i> Education</div>
          ${state.education.map(edu => `
            <div class="cv-item">
              <div class="cv-item-head">
                <span>${escapeHtml(edu.degree)}</span>
                <span>${escapeHtml(edu.year)}</span>
              </div>
              <div class="cv-item-sub">
                <span>${escapeHtml(edu.college)}</span>
                <span>${escapeHtml(edu.cgpa)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Skills HTML
    let skillsHtml = '';
    if (vis.skills && (state.skills.technical.length || state.skills.soft.length)) {
      skillsHtml = `
        <div class="cv-section">
          <div class="cv-section-title"><i class="fa-solid fa-code"></i> Skills & Proficiencies</div>
          ${state.skills.technical.length ? `
            <div style="margin-bottom:5pt;">
              <strong style="font-size:8.8pt;color:var(--cv-header);">Technical:</strong>
              <div class="cv-tags-wrap">
                ${state.skills.technical.map(t => `<span class="cv-tag">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          ${state.skills.soft.length ? `
            <div>
              <strong style="font-size:8.8pt;color:var(--cv-header);">Soft Skills:</strong>
              <div class="cv-tags-wrap">
                ${state.skills.soft.map(s => `<span class="cv-tag">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Projects HTML
    let projectsHtml = '';
    if (vis.projects && state.projects.length) {
      projectsHtml = `
        <div class="cv-section">
          <div class="cv-section-title"><i class="fa-solid fa-diagram-project"></i> Key Projects</div>
          ${state.projects.map(proj => `
            <div class="cv-item">
              <div class="cv-item-head">
                <span>${escapeHtml(proj.name)} ${proj.link ? `<small style="font-weight:400;color:#64748b;">(${escapeHtml(proj.link)})</small>` : ''}</span>
              </div>
              <div class="cv-item-sub">
                <span><strong>Tech:</strong> ${escapeHtml(proj.techStack)}</span>
              </div>
              <ul class="cv-bullet-list">
                ${proj.description.split('\n').filter(Boolean).map(bullet => `<li>${escapeHtml(bullet.replace(/^[•\-*]\s*/, ''))}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Experience HTML
    let experienceHtml = '';
    if (vis.experience && state.experience.length) {
      experienceHtml = `
        <div class="cv-section">
          <div class="cv-section-title"><i class="fa-solid fa-briefcase"></i> Work Experience</div>
          ${state.experience.map(exp => `
            <div class="cv-item">
              <div class="cv-item-head">
                <span>${escapeHtml(exp.role)}</span>
                <span>${escapeHtml(exp.duration)}</span>
              </div>
              <div class="cv-item-sub">
                <span>${escapeHtml(exp.company)}</span>
              </div>
              <ul class="cv-bullet-list">
                ${exp.achievements.split('\n').filter(Boolean).map(bullet => `<li>${escapeHtml(bullet.replace(/^[•\-*]\s*/, ''))}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Certifications HTML
    let certsHtml = '';
    if (vis.certifications && state.certifications.length) {
      certsHtml = `
        <div class="cv-section">
          <div class="cv-section-title"><i class="fa-solid fa-award"></i> Certifications</div>
          ${state.certifications.map(c => `
            <div class="cv-item" style="margin-bottom:4pt;">
              <div class="cv-item-head">
                <span>${escapeHtml(c.name)}</span>
                <span>${escapeHtml(c.date)}</span>
              </div>
              <div class="cv-item-sub">
                <span>${escapeHtml(c.provider)}</span>
                ${c.link ? `<span>${escapeHtml(c.link)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Summary HTML
    let summaryHtml = '';
    if (vis.summary && state.summary) {
      summaryHtml = `
        <div class="cv-section">
          <div class="cv-section-title"><i class="fa-solid fa-user"></i> Professional Summary</div>
          <p style="margin:0;color:#374151;line-height:1.5;">${escapeHtml(state.summary)}</p>
        </div>
      `;
    }

    // Photo HTML (if enabled and present)
    const photoImgTag = (vis.photo && p.photoBase64)
      ? `<img src="${p.photoBase64}" alt="Photo" style="width:58pt;height:58pt;border-radius:50%;object-fit:cover;border:2px solid var(--cv-accent, #D4AF37);">`
      : '';

    // ────────────── RENDER ACCORDING TO SELECTED TEMPLATE ──────────────
    switch (state.template) {

      // 1. MODERN MINIMAL (Single Column)
      case 'modern-minimal':
        paper.innerHTML = `
          <div class="cv-header-block">
            <h1 class="cv-name">${escapeHtml(p.fullName)}</h1>
            <div class="cv-target-role">${escapeHtml(p.targetRole)}</div>
            <div class="cv-contact-bar">${contactBarHtml}</div>
          </div>
          ${summaryHtml}
          ${educationHtml}
          ${skillsHtml}
          ${projectsHtml}
          ${experienceHtml}
          ${certsHtml}
        `;
        break;

      // 2. CLASSIC PROFESSIONAL (Serif Two Column)
      case 'classic-professional':
        paper.innerHTML = `
          <div class="cv-header-block">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <h1 class="cv-name">${escapeHtml(p.fullName)}</h1>
                <div style="font-size:10.5pt;font-style:italic;color:#475569;margin-top:2pt;">${escapeHtml(p.targetRole)}</div>
              </div>
              ${photoImgTag}
            </div>
            <div class="cv-contact-bar">${contactBarHtml}</div>
          </div>
          ${summaryHtml}
          <div class="cv-two-col-layout">
            <div>
              ${projectsHtml}
              ${experienceHtml}
            </div>
            <div>
              ${educationHtml}
              ${skillsHtml}
              ${certsHtml}
            </div>
          </div>
        `;
        break;

      // 3. CREATIVE PURPLE
      case 'creative-purple':
        paper.innerHTML = `
          <div class="cv-header-block">
            <div>
              <h1 class="cv-name">${escapeHtml(p.fullName)}</h1>
              <div style="font-size:11pt;font-weight:700;color:var(--cv-accent);margin:2pt 0 4pt;">${escapeHtml(p.targetRole)}</div>
              <div style="font-size:8.5pt;color:#64748b;">${contactBarHtml}</div>
            </div>
            ${photoImgTag}
          </div>
          ${summaryHtml}
          ${skillsHtml}
          ${projectsHtml}
          ${experienceHtml}
          ${educationHtml}
          ${certsHtml}
        `;
        break;

      // 4. TECH DARK
      case 'tech-dark':
        paper.innerHTML = `
          <div class="cv-header-block">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <h1 class="cv-name">&lt;${escapeHtml(p.fullName)}/&gt;</h1>
                <div class="cv-target-role">/* ${escapeHtml(p.targetRole)} */</div>
              </div>
              ${photoImgTag}
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:8.2pt;color:#94a3b8;margin-top:6pt;">${contactBarHtml}</div>
          </div>
          ${summaryHtml}
          ${skillsHtml}
          ${projectsHtml}
          ${experienceHtml}
          ${educationHtml}
          ${certsHtml}
        `;
        break;

      // 5. FRESHER FRIENDLY (Education & Projects prioritized)
      case 'fresher-friendly':
      default:
        paper.innerHTML = `
          <div class="cv-gold-accent-bar"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12pt;border-bottom:1.5px solid #e2e8f0;padding-bottom:10pt;">
            <div>
              <h1 class="cv-name">${escapeHtml(p.fullName)}</h1>
              <div style="font-size:11pt;font-weight:700;color:var(--cv-accent);letter-spacing:0.04em;">${escapeHtml(p.targetRole)}</div>
              <div style="font-size:8.5pt;color:#475569;margin-top:4pt;">${contactBarHtml}</div>
            </div>
            ${photoImgTag}
          </div>
          ${summaryHtml}
          ${educationHtml}
          ${skillsHtml}
          ${projectsHtml}
          ${experienceHtml}
          ${certsHtml}
        `;
        break;

      // 6. TWO-COLUMN ELEGANT
      case 'two-column-elegant':
        paper.innerHTML = `
          <div style="text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:10pt;margin-bottom:12pt;">
            <h1 style="font-size:22pt;font-weight:800;color:var(--cv-header);margin:0;">${escapeHtml(p.fullName)}</h1>
            <div style="font-size:10.5pt;font-weight:600;color:var(--cv-accent);margin:2pt 0 4pt;">${escapeHtml(p.targetRole)}</div>
            <div style="font-size:8.5pt;color:#4b5563;">${contactBarHtml}</div>
          </div>
          ${summaryHtml}
          <div class="cv-split-grid">
            <div class="cv-col-left">
              ${projectsHtml}
              ${experienceHtml}
            </div>
            <div>
              ${educationHtml}
              ${skillsHtml}
              ${certsHtml}
            </div>
          </div>
        `;
        break;

      // 7. SIDEBAR CLASSIC
      case 'sidebar-classic':
        paper.innerHTML = `
          <div class="cv-side-panel">
            <div style="text-align:center;margin-bottom:16pt;">
              ${photoImgTag ? photoImgTag : `<div style="width:48pt;height:48pt;border-radius:50%;background:#334155;margin:0 auto 8pt;display:flex;align-items:center;justify-content:center;color:#94a3b8;"><i class="fa-solid fa-user"></i></div>`}
              <h2 style="font-size:14pt;font-weight:800;color:#fff;margin:4pt 0 2pt;">${escapeHtml(p.fullName)}</h2>
              <div style="font-size:8.8pt;color:var(--cv-accent);">${escapeHtml(p.targetRole)}</div>
            </div>
            <div class="cv-section" style="margin-bottom:14pt;">
              <div class="cv-section-title">Contact</div>
              <div style="font-size:8pt;line-height:1.6;color:#cbd5e1;">
                ${p.phone ? `<div><i class="fa-solid fa-phone"></i> ${escapeHtml(p.phone)}</div>` : ''}
                ${p.email ? `<div><i class="fa-solid fa-envelope"></i> ${escapeHtml(p.email)}</div>` : ''}
                ${p.city ? `<div><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.city)}</div>` : ''}
                ${p.linkedIn ? `<div><i class="fa-brands fa-linkedin"></i> ${escapeHtml(p.linkedIn)}</div>` : ''}
                ${p.gitHub ? `<div><i class="fa-brands fa-github"></i> ${escapeHtml(p.gitHub)}</div>` : ''}
              </div>
            </div>
            ${skillsHtml}
            ${certsHtml}
          </div>
          <div class="cv-main-panel">
            ${summaryHtml}
            ${educationHtml}
            ${projectsHtml}
            ${experienceHtml}
          </div>
        `;
        break;

      // 8. TIMELINE STYLE
      case 'timeline-style':
        paper.innerHTML = `
          <div style="margin-bottom:14pt;border-bottom:1px solid #e2e8f0;padding-bottom:10pt;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <h1 style="font-size:22pt;font-weight:800;color:var(--cv-header);margin:0;">${escapeHtml(p.fullName)}</h1>
                <div style="font-size:10.5pt;font-weight:600;color:var(--cv-accent);margin:2pt 0 4pt;">${escapeHtml(p.targetRole)}</div>
                <div style="font-size:8.5pt;color:#64748b;">${contactBarHtml}</div>
              </div>
              ${photoImgTag}
            </div>
          </div>
          ${summaryHtml}
          <div class="cv-section">
            <div class="cv-section-title"><i class="fa-solid fa-timeline"></i> Academic & Career Timeline</div>
            <div class="cv-timeline-wrap">
              ${state.education.map(edu => `
                <div class="cv-timeline-item">
                  <div class="cv-timeline-dot"></div>
                  <div class="cv-item-head"><span>${escapeHtml(edu.degree)}</span> <span>${escapeHtml(edu.year)}</span></div>
                  <div class="cv-item-sub"><span>${escapeHtml(edu.college)}</span> <span>${escapeHtml(edu.cgpa)}</span></div>
                </div>
              `).join('')}
              ${state.experience.map(exp => `
                <div class="cv-timeline-item">
                  <div class="cv-timeline-dot" style="background:var(--primary-gold);"></div>
                  <div class="cv-item-head"><span>${escapeHtml(exp.role)}</span> <span>${escapeHtml(exp.duration)}</span></div>
                  <div class="cv-item-sub"><span>${escapeHtml(exp.company)}</span></div>
                  <p style="margin:2pt 0 0;font-size:8.8pt;color:#4b5563;">${escapeHtml(exp.achievements)}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ${skillsHtml}
          ${projectsHtml}
          ${certsHtml}
        `;
        break;
    }
  }

  // ─────────────── 8. ATS SCORE GAUGE & AUDIT ───────────────
  function updateAtsGauge(score) {
    const num = $('atsGaugeNumber');
    const badge = $('topAtsScoreBadge');
    const circle = $('atsGauge');
    if (!num) return;

    num.textContent = score;
    badge.textContent = `${score}/100`;

    let color = '#ef4444'; // Red
    if (score >= 80) color = '#10b981'; // Green
    else if (score >= 65) color = '#f59e0b'; // Amber

    circle.style.borderColor = color;
    badge.style.background = color;
  }

  async function runAtsAudit() {
    const runBtn = $('runAtsAuditBtn');
    runBtn.disabled = true;
    runBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing ATS...`;

    // Extract text payload
    const resumePlainText = generatePlainTextResume();
    const prompt = `Analyze this student resume against common Indian and MNC ATS criteria (TCS, Infosys, Google, Amazon, startups) for the target role "${state.personal.targetRole || 'Software Engineer'}".
Resume Text:
${resumePlainText}

Return STRICT JSON ONLY in this exact format:
{
  "score": 78,
  "issues": [
    "Missing keywords: AWS, Docker",
    "Phone number format non-standard",
    "No quantified achievements in experience"
  ],
  "suggestions": [
    "Add 'Software Engineer' keyword to summary",
    "Use bullet points instead of paragraphs"
  ]
}`;

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          subject: 'Resume Builder',
          mode: 'career-counselor',
          studentData: { role: state.personal.targetRole }
        })
      });

      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();
      const rawText = data.answer || data.response || data.text || '';

      // Parse JSON from answer
      let parsed = null;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { /* ignore */ }
      }

      if (!parsed || typeof parsed.score !== 'number') {
        parsed = calculateFallbackAtsScore();
      }

      state.atsScore = parsed.score;
      updateAtsGauge(parsed.score);

      // Render issues & suggestions
      const issuesList = $('atsIssuesList');
      const suggList = $('atsSuggestionsList');
      issuesList.innerHTML = (parsed.issues || []).map(i => `<li>${escapeHtml(i)}</li>`).join('') || '<li>None detected! Clean structure.</li>';
      suggList.innerHTML = (parsed.suggestions || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>Resume matches standard ATS parsing rules.</li>';

      $('atsDetailsBox').style.display = 'block';
      $('atsCardStatus').textContent = `Audit Complete! Scored ${parsed.score}/100. Review issues below:`;

      toast('success', `ATS Score: ${parsed.score}/100`, 'Review feedback recommendations.');
    } catch (err) {
      console.warn('[ATS Audit Error]', err);
      const fallback = calculateFallbackAtsScore();
      state.atsScore = fallback.score;
      updateAtsGauge(fallback.score);

      const issuesList = $('atsIssuesList');
      const suggList = $('atsSuggestionsList');
      issuesList.innerHTML = fallback.issues.map(i => `<li>${escapeHtml(i)}</li>`).join('');
      suggList.innerHTML = fallback.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('');

      $('atsDetailsBox').style.display = 'block';
      $('atsCardStatus').textContent = `Heuristic ATS Analysis Complete (${fallback.score}/100).`;
      toast('info', `ATS Score: ${fallback.score}/100`, 'Evaluated via built-in ATS heuristics.');
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Run ATS Check`;
    }
  }

  function calculateFallbackAtsScore() {
    let score = 55;
    const issues = [];
    const suggestions = [];

    if (state.personal.fullName && state.personal.email && state.personal.phone) {
      score += 10;
    } else {
      issues.push("Missing core contact details (Email or Phone).");
      suggestions.push("Ensure full phone with country code (+91) and professional email.");
    }

    if (state.skills.technical.length >= 6) {
      score += 10;
    } else {
      issues.push("Technical skills section has fewer than 6 keywords.");
      suggestions.push("Add core technologies like Python, SQL, Git, and Docker.");
    }

    if (state.projects.length >= 2) {
      score += 12;
    } else {
      issues.push("Less than 2 technical projects listed.");
      suggestions.push("Add at least 2 complete GitHub repositories with tech stack listed.");
    }

    if (state.summary && state.summary.length >= 60) {
      score += 8;
    } else {
      issues.push("Professional summary is too short or missing.");
      suggestions.push("Add a 3-sentence summary highlighting your engineering focus.");
    }

    if (state.personal.targetRole) {
      score += 5;
    } else {
      suggestions.push("Specify a target role (e.g. Software Engineer) to increase ATS relevancy.");
    }

    return {
      score: Math.min(96, score),
      issues: issues.length ? issues : ["Slightly low density of cloud infrastructure keywords."],
      suggestions: suggestions.length ? suggestions : ["Add metrics and percentages to project bullet points."]
    };
  }

  // ─────────────── 9. AI HELPER ENDPOINTS ───────────────
  async function aiGenerateSummary() {
    const btn = $('aiGenerateSummaryBtn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Writing...`;

    const prompt = `Write a high-impact, professional 3-sentence ATS-friendly resume summary for an Indian student.
Target Role: ${state.personal.targetRole || 'Full Stack Developer'}
Skills: ${state.skills.technical.slice(0, 6).join(', ')}
Education: ${state.education[0]?.degree || 'B.Tech CSE'}
Projects: ${state.projects.map(p => p.name).join(', ')}

Return ONLY the summary paragraph without quotes, markdown headers, or placeholders.`;

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          subject: 'Resume Summary',
          mode: 'career-counselor'
        })
      });
      const data = await resp.json();
      const text = (data.answer || data.response || '').trim();
      if (text) {
        state.summary = text.replace(/^"|"$/g, '');
        $('inpSummary').value = state.summary;
        updateSummaryWordCount();
        renderLivePreview();
        toast('success', 'Summary Generated', 'ATS-tuned objective created!');
      }
    } catch (e) {
      toast('error', 'AI Summary Error', 'Using smart preset fallback.');
      state.summary = `Motivated ${state.personal.targetRole || 'Software Engineering'} student with solid foundations in ${state.skills.technical.slice(0, 3).join(', ')}. Demonstrated experience building responsive web applications and scalable APIs with a passion for continuous learning.`;
      $('inpSummary').value = state.summary;
      updateSummaryWordCount();
      renderLivePreview();
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate Summary`;
    }
  }

  async function aiSuggestSkills() {
    const btn = $('aiSuggestSkillsBtn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Suggesting...`;

    const targetRole = state.personal.targetRole || 'Software Engineer';
    const prompt = `List the top 6 must-have technical skills for a fresher "${targetRole}" in India to pass company ATS screening. Return ONLY a comma-separated list of skill names.`;

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, subject: 'Skills', mode: 'career-counselor' })
      });
      const data = await resp.json();
      const text = data.answer || data.response || '';
      const list = text.split(/,|\n/).map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(s => s.length > 1 && s.length < 30);

      let addedCount = 0;
      list.forEach(skill => {
        if (!state.skills.technical.includes(skill)) {
          state.skills.technical.push(skill);
          addedCount++;
        }
      });

      renderSkillsChips();
      renderLivePreview();
      toast('success', `Added ${addedCount} Skills`, `Optimized for ${targetRole}`);
    } catch (e) {
      // Fallback
      ['Git & GitHub', 'REST APIs', 'PostgreSQL', 'Docker'].forEach(s => {
        if (!state.skills.technical.includes(s)) state.skills.technical.push(s);
      });
      renderSkillsChips();
      renderLivePreview();
      toast('info', 'Skills Suggested', 'Added standard core skills.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-sparkles"></i> AI Suggest Skills`;
    }
  }

  async function aiRewriteProject(projId, btn) {
    const proj = state.projects.find(p => p.id === projId);
    if (!proj) return;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rewriting...`;

    const prompt = `Rewrite this rough student project description into 2 crisp, high-impact bullet points using strong action verbs (Engineered, Architected, Optimized) and quantified metrics (e.g. 99% uptime, reduced latency by 30%) suitable for an ATS resume:
Project Title: ${proj.name}
Tech Stack: ${proj.techStack}
Draft: ${proj.description}

Return ONLY the bullet points, each on a new line starting with •`;

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, subject: 'Project Description', mode: 'career-counselor' })
      });
      const data = await resp.json();
      const text = (data.answer || data.response || '').trim();
      if (text) {
        proj.description = text;
        renderProjectsList();
        renderLivePreview();
        toast('success', 'Project Rewritten', 'Transformed with action verbs & metrics.');
      }
    } catch (e) {
      proj.description = `• Engineered scalable full-stack application using ${proj.techStack}, reducing page load latency by 28%.\n• Implemented secure REST APIs with automated validation handling concurrent user requests.`;
      renderProjectsList();
      renderLivePreview();
      toast('info', 'Enhanced Project', 'Applied industry action verbs.');
    }
  }

  async function aiRewriteExperience(expId, btn) {
    const exp = state.experience.find(e => e.id === expId);
    if (!exp) return;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enhancing...`;

    const prompt = `Rewrite this work experience into 2 high-impact ATS bullet points using Google's X-Y-Z formula (Accomplished [X] as measured by [Y], by doing [Z]):
Role: ${exp.role} at ${exp.company}
Draft: ${exp.achievements}

Return ONLY the 2 bullet points, each on a new line starting with •`;

    try {
      const resp = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, subject: 'Work Experience', mode: 'career-counselor' })
      });
      const data = await resp.json();
      const text = (data.answer || data.response || '').trim();
      if (text) {
        exp.achievements = text;
        renderExperienceList();
        renderLivePreview();
        toast('success', 'Experience Polished', 'Rewritten with X-Y-Z formula.');
      }
    } catch (e) {
      exp.achievements = `• Spearheaded feature development in ${exp.company}, accelerating sprint delivery velocity by 25%.\n• Optimized database query pipelines and resolved critical bugs to elevate application performance.`;
      renderExperienceList();
      renderLivePreview();
      toast('info', 'Experience Polished', 'Standard action bullet applied.');
    }
  }

  // ─────────────── 10. PLAIN TEXT & PDF EXPORT ───────────────
  function generatePlainTextResume() {
    const p = state.personal;
    const lines = [];

    lines.push(p.fullName.toUpperCase());
    lines.push(`${p.email} | ${p.phone} | ${p.city}`);
    if (p.linkedIn || p.gitHub) lines.push(`${p.linkedIn} | ${p.gitHub}`);
    lines.push('\nTARGET ROLE: ' + p.targetRole);

    if (state.summary) {
      lines.push('\n--- PROFESSIONAL SUMMARY ---');
      lines.push(state.summary);
    }

    if (state.education.length) {
      lines.push('\n--- EDUCATION ---');
      state.education.forEach(e => {
        lines.push(`${e.degree} - ${e.college} (${e.year}) | Grade: ${e.cgpa}`);
      });
    }

    if (state.skills.technical.length || state.skills.soft.length) {
      lines.push('\n--- SKILLS ---');
      if (state.skills.technical.length) lines.push('Technical: ' + state.skills.technical.join(', '));
      if (state.skills.soft.length) lines.push('Soft Skills: ' + state.skills.soft.join(', '));
    }

    if (state.projects.length) {
      lines.push('\n--- KEY PROJECTS ---');
      state.projects.forEach(pr => {
        lines.push(`${pr.name} [Tech: ${pr.techStack}]`);
        if (pr.link) lines.push(`Link: ${pr.link}`);
        lines.push(pr.description);
      });
    }

    if (state.experience.length) {
      lines.push('\n--- EXPERIENCE ---');
      state.experience.forEach(ex => {
        lines.push(`${ex.role} at ${ex.company} (${ex.duration})`);
        lines.push(ex.achievements);
      });
    }

    if (state.certifications.length) {
      lines.push('\n--- CERTIFICATIONS ---');
      state.certifications.forEach(c => {
        lines.push(`${c.name} - ${c.provider} (${c.date})`);
      });
    }

    return lines.join('\n');
  }

  function copyPlainText() {
    const text = generatePlainTextResume();
    navigator.clipboard.writeText(text).then(() => {
      toast('success', 'Copied to Clipboard!', 'Plain text format ready for online job portal forms.');
    }).catch(() => {
      toast('error', 'Clipboard Error', 'Please grant clipboard permissions.');
    });
  }

  async function downloadPdf() {
    const paper = $('resumePreview');
    if (!paper) return;

    const btn = $('downloadPdfBtn');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rendering PDF...`;

    try {
      if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        throw new Error('PDF generation libraries loading. Please try again.');
      }

      // Temporarily reset transforms on paper for sharp capture
      const origTransform = paper.style.transform;
      paper.style.transform = 'none';

      const canvas = await html2canvas(paper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: state.template === 'tech-dark' ? '#0f172a' : '#ffffff',
        logging: false
      });

      paper.style.transform = origTransform;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const imgProps = pdf.getImageProperties(imgData);
      const renderHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, renderHeight));

      const cleanName = (state.personal.fullName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${cleanName}_Resume.pdf`);

      toast('success', 'PDF Downloaded!', `${cleanName}_Resume.pdf generated in high resolution.`);
    } catch (err) {
      console.error('[PDF Export Error]', err);
      toast('error', 'Export Failed', 'Falling back to browser print engine.');
      window.print();
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }

  // ─────────────── 11. FIRESTORE PERSISTENCE & CLOUD SAVE ───────────────
  async function saveToFirestore() {
    const btn = $('saveCloudBtn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    const uid = currentUser ? currentUser.uid : getGuestUid();
    const resumeId = activeResumeId || ('res_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
    activeResumeId = resumeId;

    const payload = {
      id: resumeId,
      userId: uid,
      createdAt: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      template: state.template,
      themeColor: state.themeColor,
      fontSize: state.fontSize,
      atsScore: state.atsScore || 80,
      publicUrl: `${window.location.origin}/resume?id=${resumeId}`,
      data: {
        personal: state.personal,
        education: state.education,
        skills: state.skills,
        projects: state.projects,
        experience: state.experience,
        certifications: state.certifications,
        summary: state.summary
      }
    };

    // Save locally always
    saveLocalHistory(payload);

    try {
      if (db) {
        await db.collection('users').doc(uid).collection('resumes').doc(resumeId).set(payload, { merge: true });
        // Also save to a public readable collection for shared links
        await db.collection('publicResumes').doc(resumeId).set(payload, { merge: true });
        toast('success', 'Saved to Cloud!', 'Synced to your Chairman Show profile.');
      } else {
        toast('info', 'Saved Locally', 'Saved to browser cache (Firestore offline).');
      }
      updateSavedBadgeCount();
    } catch (err) {
      console.warn('[Firestore Save Error]', err);
      toast('info', 'Saved in Browser', 'Saved to offline cache.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span class="hide-mobile">Save to Cloud</span>`;
    }
  }

  function saveLocalHistory(record) {
    try {
      const history = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || '[]');
      const filtered = history.filter(h => h.id !== record.id);
      filtered.unshift({
        id: record.id,
        fullName: record.data.personal.fullName,
        targetRole: record.data.personal.targetRole,
        template: record.template,
        atsScore: record.atsScore,
        updatedAt: record.updatedAt,
        data: record.data
      });
      localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(filtered.slice(0, 15)));
    } catch (e) { /* ignore */ }
  }

  function updateSavedBadgeCount() {
    const list = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || '[]');
    const badge = $('savedCountBadge');
    if (badge) {
      if (list.length > 0) {
        badge.textContent = list.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function renderSavedResumesDrawer() {
    const container = $('savedResumesList');
    const history = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || '[]');
    if (!history.length) {
      container.innerHTML = `<div style="text-align:center;padding:2rem 1rem;color:var(--text-muted);font-size:0.85rem;">No saved resumes yet. Click "Save to Cloud" in the builder to archive revisions.</div>`;
      return;
    }

    container.innerHTML = history.map(item => `
      <div class="saved-resume-item" data-load-id="${item.id}">
        <div class="sri-name">${escapeHtml(item.fullName || 'Untitled Resume')}</div>
        <div style="font-size:0.78rem;color:var(--primary-gold-bright);margin-bottom:0.25rem;">${escapeHtml(item.targetRole || 'Fresher')}</div>
        <div class="sri-meta">
          <span><i class="fa-solid fa-layer-group"></i> ${escapeHtml(TEMPLATE_NAMES[item.template] || item.template)}</span>
          <span style="color:#10b981;font-weight:700;">ATS: ${item.atsScore || 75}/100</span>
        </div>
      </div>
    `).join('');
  }

  // ─────────────── 12. PUBLIC SHAREABLE URL HANDLING (?id=...) ───────────────
  async function checkPublicUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const resumeId = urlParams.get('id');
    if (!resumeId) return;

    activeResumeId = resumeId;
    $('publicViewBanner').style.display = 'block';

    try {
      // 1. Check local history first
      const local = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || '[]');
      const match = local.find(item => item.id === resumeId);
      if (match && match.data) {
        state.template = match.template || 'fresher-friendly';
        state.personal = match.data.personal;
        state.education = match.data.education;
        state.skills = match.data.skills;
        state.projects = match.data.projects;
        state.experience = match.data.experience;
        state.certifications = match.data.certifications;
        state.summary = match.data.summary;
        populateFormFromState();
        showScreen('workspace');
        return;
      }

      // 2. Query Firestore publicResumes collection
      if (db) {
        const snap = await db.collection('publicResumes').doc(resumeId).get();
        if (snap.exists) {
          const doc = snap.data();
          state.template = doc.template || 'fresher-friendly';
          state.personal = doc.data.personal;
          state.education = doc.data.education;
          state.skills = doc.data.skills;
          state.projects = doc.data.projects;
          state.experience = doc.data.experience;
          state.certifications = doc.data.certifications;
          state.summary = doc.data.summary;
          populateFormFromState();
          showScreen('workspace');
          toast('success', 'Shared Resume Loaded', `Viewing ${state.personal.fullName}'s resume.`);
          return;
        }
      }
    } catch (err) {
      console.warn('[Public load error]', err);
    }
  }

  function openShareModal() {
    const resumeId = activeResumeId || ('res_' + Date.now().toString(36));
    activeResumeId = resumeId;
    const shareUrl = `${window.location.origin}/resume?id=${resumeId}`;
    $('shareUrlInput').value = shareUrl;
    $('shareModal').style.display = 'flex';

    // Auto save so the link is alive in public collection
    saveToFirestore();
  }

  // ─────────────── 13. EVENT LISTENERS & WIRING ───────────────
  function initEventListeners() {
    // 1. Template selection cards (Screen 1)
    $$('.btn-select-template').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const t = e.currentTarget.dataset.select;
        if (t) {
          state.template = t;
          renderActiveTemplateName();
          renderLivePreview();
          showScreen('workspace');
        }
      });
    });

    // 2. Navigation bar actions
    $('navTemplatesBtn')?.addEventListener('click', () => showScreen('templates'));
    $('backToTemplatesBtn')?.addEventListener('click', () => showScreen('templates'));

    $('loadSampleBtn')?.addEventListener('click', () => {
      state = JSON.parse(JSON.stringify(defaultResumeData));
      populateFormFromState();
      renderLivePreview();
      toast('info', 'Loaded Sample Resume', 'Fresher engineering template populated!');
    });

    // 3. Stepper navigation
    $$('.step-dot').forEach(btn => {
      btn.addEventListener('click', () => setStep(parseInt(btn.dataset.step, 10)));
    });

    $('nextStepBtn')?.addEventListener('click', () => {
      if (currentStep < 7) {
        setStep(currentStep + 1);
      } else {
        // Step 7 complete: Switch mobile to preview if mobile
        if (window.innerWidth <= 1024) {
          $('tabTogglePreview')?.click();
        }
        toast('success', 'Resume Ready!', 'Use top bar to Download PDF or check ATS score.');
      }
    });

    $('prevStepBtn')?.addEventListener('click', () => setStep(currentStep - 1));

    // 4. Live input synchronizers (Step 1: Personal)
    ['inpFullName', 'inpEmail', 'inpPhone', 'inpCity', 'inpLinkedIn', 'inpGitHub', 'inpTargetRole'].forEach(id => {
      $(id)?.addEventListener('input', (e) => {
        const key = id.replace('inp', '');
        const normKey = key.charAt(0).toLowerCase() + key.slice(1);
        state.personal[normKey] = e.target.value;
        renderLivePreview();
      });
    });

    // Photo file upload
    $('inpPhotoFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast('error', 'File Too Large', 'Please select an image smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        state.personal.photoBase64 = evt.target.result;
        $('photoPreviewImg').src = evt.target.result;
        $('photoPreviewImg').style.display = 'block';
        $('photoPlaceholderIcon').style.display = 'none';
        $('removePhotoBtn').style.display = 'inline-block';
        renderLivePreview();
      };
      reader.readAsDataURL(file);
    });

    $('removePhotoBtn')?.addEventListener('click', () => {
      state.personal.photoBase64 = '';
      $('photoPreviewImg').src = '';
      $('photoPreviewImg').style.display = 'none';
      $('photoPlaceholderIcon').style.display = 'block';
      $('removePhotoBtn').style.display = 'none';
      $('inpPhotoFile').value = '';
      renderLivePreview();
    });

    // 5. Education dynamic list
    $('addEducationBtn')?.addEventListener('click', () => {
      state.education.push({
        id: 'edu_' + Date.now(),
        degree: '',
        college: '',
        year: '',
        cgpa: ''
      });
      renderEducationList();
      renderLivePreview();
    });

    $('educationList')?.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const edu = state.education.find(x => x.id === id);
      if (!edu) return;

      if (e.target.classList.contains('edu-degree')) edu.degree = e.target.value;
      if (e.target.classList.contains('edu-college')) edu.college = e.target.value;
      if (e.target.classList.contains('edu-year')) edu.year = e.target.value;
      if (e.target.classList.contains('edu-cgpa')) edu.cgpa = e.target.value;
      renderLivePreview();
    });

    $('educationList')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-edu]');
      if (!btn) return;
      const id = btn.dataset.removeEdu;
      state.education = state.education.filter(x => x.id !== id);
      renderEducationList();
      renderLivePreview();
    });

    // 6. Skills
    const addTechSkill = (skill) => {
      skill = skill.trim();
      if (!skill || state.skills.technical.includes(skill)) return;
      state.skills.technical.push(skill);
      renderSkillsChips();
      renderLivePreview();
    };

    $('addTechSkillBtn')?.addEventListener('click', () => {
      addTechSkill($('inpTechSkill').value);
      $('inpTechSkill').value = '';
    });

    $('inpTechSkill')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTechSkill(e.target.value);
        e.target.value = '';
      }
    });

    $$('.sq-chip').forEach(btn => {
      btn.addEventListener('click', (e) => addTechSkill(e.currentTarget.dataset.skill));
    });

    const addSoftSkill = (skill) => {
      skill = skill.trim();
      if (!skill || state.skills.soft.includes(skill)) return;
      state.skills.soft.push(skill);
      renderSkillsChips();
      renderLivePreview();
    };

    $('addSoftSkillBtn')?.addEventListener('click', () => {
      addSoftSkill($('inpSoftSkill').value);
      $('inpSoftSkill').value = '';
    });

    $('inpSoftSkill')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSoftSkill(e.target.value);
        e.target.value = '';
      }
    });

    $$('.sq-chip-soft').forEach(btn => {
      btn.addEventListener('click', (e) => addSoftSkill(e.currentTarget.dataset.skill));
    });

    $('techSkillsChips')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-tech]');
      if (!btn) return;
      state.skills.technical = state.skills.technical.filter(s => s !== btn.dataset.removeTech);
      renderSkillsChips();
      renderLivePreview();
    });

    $('softSkillsChips')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-soft]');
      if (!btn) return;
      state.skills.soft = state.skills.soft.filter(s => s !== btn.dataset.removeSoft);
      renderSkillsChips();
      renderLivePreview();
    });

    // AI Skills suggest
    $('aiSuggestSkillsBtn')?.addEventListener('click', aiSuggestSkills);

    // 7. Projects
    $('addProjectBtn')?.addEventListener('click', () => {
      state.projects.push({
        id: 'proj_' + Date.now(),
        name: '',
        techStack: '',
        link: '',
        description: ''
      });
      renderProjectsList();
      renderLivePreview();
    });

    $('projectsList')?.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const p = state.projects.find(x => x.id === id);
      if (!p) return;

      if (e.target.classList.contains('proj-name')) p.name = e.target.value;
      if (e.target.classList.contains('proj-tech')) p.techStack = e.target.value;
      if (e.target.classList.contains('proj-link')) p.link = e.target.value;
      if (e.target.classList.contains('proj-desc')) p.description = e.target.value;
      renderLivePreview();
    });

    $('projectsList')?.addEventListener('click', (e) => {
      const rmBtn = e.target.closest('[data-remove-proj]');
      if (rmBtn) {
        state.projects = state.projects.filter(x => x.id !== rmBtn.dataset.removeProj);
        renderProjectsList();
        renderLivePreview();
        return;
      }
      const rwBtn = e.target.closest('.btn-ai-rewrite-proj');
      if (rwBtn) {
        aiRewriteProject(rwBtn.dataset.id, rwBtn);
      }
    });

    // 8. Experience
    $('addExperienceBtn')?.addEventListener('click', () => {
      state.experience.push({
        id: 'exp_' + Date.now(),
        role: '',
        company: '',
        duration: '',
        achievements: ''
      });
      renderExperienceList();
      renderLivePreview();
    });

    $('experienceList')?.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const ex = state.experience.find(x => x.id === id);
      if (!ex) return;

      if (e.target.classList.contains('exp-role')) ex.role = e.target.value;
      if (e.target.classList.contains('exp-company')) ex.company = e.target.value;
      if (e.target.classList.contains('exp-duration')) ex.duration = e.target.value;
      if (e.target.classList.contains('exp-achieve')) ex.achievements = e.target.value;
      renderLivePreview();
    });

    $('experienceList')?.addEventListener('click', (e) => {
      const rmBtn = e.target.closest('[data-remove-exp]');
      if (rmBtn) {
        state.experience = state.experience.filter(x => x.id !== rmBtn.dataset.removeExp);
        renderExperienceList();
        renderLivePreview();
        return;
      }
      const rwBtn = e.target.closest('.btn-ai-rewrite-exp');
      if (rwBtn) {
        aiRewriteExperience(rwBtn.dataset.id, rwBtn);
      }
    });

    // 9. Certifications
    $('addCertBtn')?.addEventListener('click', () => {
      state.certifications.push({
        id: 'cert_' + Date.now(),
        name: '',
        provider: '',
        date: '',
        link: ''
      });
      renderCertificationsList();
      renderLivePreview();
    });

    $('certificationsList')?.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const c = state.certifications.find(x => x.id === id);
      if (!c) return;

      if (e.target.classList.contains('cert-name')) c.name = e.target.value;
      if (e.target.classList.contains('cert-provider')) c.provider = e.target.value;
      if (e.target.classList.contains('cert-date')) c.date = e.target.value;
      if (e.target.classList.contains('cert-link')) c.link = e.target.value;
      renderLivePreview();
    });

    $('certificationsList')?.addEventListener('click', (e) => {
      const rmBtn = e.target.closest('[data-remove-cert]');
      if (rmBtn) {
        state.certifications = state.certifications.filter(x => x.id !== rmBtn.dataset.removeCert);
        renderCertificationsList();
        renderLivePreview();
      }
    });

    // 10. Summary & ATS Check
    $('inpSummary')?.addEventListener('input', (e) => {
      state.summary = e.target.value;
      updateSummaryWordCount();
      renderLivePreview();
    });

    $('aiGenerateSummaryBtn')?.addEventListener('click', aiGenerateSummary);
    $('runAtsAuditBtn')?.addEventListener('click', runAtsAudit);
    $('topAtsCheckBtn')?.addEventListener('click', () => {
      setStep(7);
      runAtsAudit();
    });

    // 11. Top Actions
    $('downloadPdfBtn')?.addEventListener('click', downloadPdf);
    $('publicDownloadPdfBtn')?.addEventListener('click', downloadPdf);
    $('copyPlainTextBtn')?.addEventListener('click', copyPlainText);
    $('saveCloudBtn')?.addEventListener('click', saveToFirestore);
    $('shareLinkBtn')?.addEventListener('click', openShareModal);

    // 12. Preview Customizers (Toolbar)
    $('selectFontSize')?.addEventListener('change', (e) => {
      state.fontSize = e.target.value;
      renderLivePreview();
    });

    $$('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        $$('.color-dot').forEach(d => d.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.themeColor = e.currentTarget.dataset.color;
        renderLivePreview();
      });
    });

    // Zoom
    $('zoomInBtn')?.addEventListener('click', () => {
      state.zoom = Math.min(140, state.zoom + 10);
      applyZoom();
    });

    $('zoomOutBtn')?.addEventListener('click', () => {
      state.zoom = Math.max(60, state.zoom - 10);
      applyZoom();
    });

    function applyZoom() {
      $('zoomLabel').textContent = `${state.zoom}%`;
      $('resumePreview').style.transform = `scale(${state.zoom / 100})`;
    }

    // Toggle Sections Floating Menu
    $('toggleSectionsMenuBtn')?.addEventListener('click', () => {
      const m = $('sectionsMenuModal');
      m.style.display = m.style.display === 'none' ? 'block' : 'none';
    });

    $('closeSectionsMenuBtn')?.addEventListener('click', () => {
      $('sectionsMenuModal').style.display = 'none';
    });

    ['secTogglePhoto', 'secToggleSummary', 'secToggleEducation', 'secToggleSkills', 'secToggleProjects', 'secToggleExperience', 'secToggleCertifications'].forEach(id => {
      $(id)?.addEventListener('change', (e) => {
        const sec = id.replace('secToggle', '').toLowerCase();
        state.sectionsVisibility[sec] = e.target.checked;
        renderLivePreview();
      });
    });

    // 13. Mobile Editor / Preview Tab Toggle
    $('tabToggleEditor')?.addEventListener('click', () => {
      $('tabToggleEditor').classList.add('active');
      $('tabTogglePreview').classList.remove('active');
      $('editorCol').classList.remove('mobile-hidden');
      $('previewCol').classList.add('mobile-hidden');
    });

    $('tabTogglePreview')?.addEventListener('click', () => {
      $('tabTogglePreview').classList.add('active');
      $('tabToggleEditor').classList.remove('active');
      $('editorCol').classList.add('mobile-hidden');
      $('previewCol').classList.remove('mobile-hidden');
    });

    // 14. Action Verbs Modal
    $('aiSuggestVerbsBtn')?.addEventListener('click', () => $('verbsModal').style.display = 'flex');
    $('closeVerbsModalBtn')?.addEventListener('click', () => $('verbsModal').style.display = 'none');
    $$('.verb-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.target.textContent);
        toast('info', `Copied "${e.target.textContent}"`, 'Paste into your project or experience bullet point.');
      });
    });

    // 15. Saved Resumes Drawer
    $('myResumesBtn')?.addEventListener('click', () => {
      renderSavedResumesDrawer();
      $('resumesDrawerOverlay').classList.add('active');
      $('resumesDrawer').classList.add('active');
    });

    $('closeResumesDrawerBtn')?.addEventListener('click', closeResumesDrawer);
    $('resumesDrawerOverlay')?.addEventListener('click', closeResumesDrawer);

    function closeResumesDrawer() {
      $('resumesDrawerOverlay').classList.remove('active');
      $('resumesDrawer').classList.remove('active');
    }

    $('savedResumesList')?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-load-id]');
      if (!item) return;
      const id = item.dataset.loadId;
      const history = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || '[]');
      const match = history.find(h => h.id === id);
      if (match && match.data) {
        state.template = match.template;
        state.personal = match.data.personal;
        state.education = match.data.education;
        state.skills = match.data.skills;
        state.projects = match.data.projects;
        state.experience = match.data.experience;
        state.certifications = match.data.certifications;
        state.summary = match.data.summary;
        activeResumeId = id;
        populateFormFromState();
        renderLivePreview();
        closeResumesDrawer();
        showScreen('workspace');
        toast('success', 'Resume Restored', 'Loaded from your saved library.');
      }
    });

    // 16. Share Modal
    $('closeShareModalBtn')?.addEventListener('click', () => $('shareModal').style.display = 'none');
    $('copyShareUrlBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText($('shareUrlInput').value);
      toast('success', 'Link Copied!', 'Share with recruiters, friends or college placement cells.');
    });

    $('shareWhatsappBtn')?.addEventListener('click', () => {
      const url = encodeURIComponent($('shareUrlInput').value);
      const text = encodeURIComponent(`Check out my verified ATS resume on The Chairman Show: ${url}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    });

    $('shareLinkedInBtn')?.addEventListener('click', () => {
      const url = encodeURIComponent($('shareUrlInput').value);
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    });

    // AI Tips for Personal
    $$('[data-ai-help="personal"]').forEach(b => {
      b.addEventListener('click', () => {
        toast('info', 'ATS Tip for Personal Info', 'Indian recruiters prefer standard email formats (e.g. aryan.sharma@gmail.com) and clear city names rather than full street addresses.');
      });
    });
  }

  // ─────────────── 14. INITIAL BOOT & AUTH ───────────────
  function init() {
    initEventListeners();
    populateFormFromState();
    updateSavedBadgeCount();

    if (auth) {
      auth.onAuthStateChanged(user => {
        currentUser = user;
      });
    }

    // Check if ?id= is present in URL
    checkPublicUrlParams();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
