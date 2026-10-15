/* ══════════════════════════════════════════════════════════════
   AI STUDY DOST — CLIENT LOGIC & STATE ENGINE
   The Chairman Show
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─────────────── 1. CONFIG & FIREBASE INITIALIZATION ───────────────
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
    console.warn('[Study Dost] Firebase note:', err.message);
  }

  const CONFIG = {
    AI_PROXY: "https://tcs-ai-proxy.sumitshrivas24.workers.dev/",
    PLANS_KEY: "tcs_study_plans_v2",
    ACTIVE_PLAN_ID_KEY: "tcs_active_study_plan_id_v2",
    GUEST_UID_KEY: "tcs_study_guest_uid",
    BADGES_KEY: "tcs_study_badges_v2",
    REMINDER_KEY: "tcs_study_daily_reminder_enabled"
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // State
  let activePlan = null;
  let allPlans = [];
  let timelineFilter = 'all';
  let badges = {
    first_day: false,
    streak_7: false,
    master_30: false,
    plan_completed: false
  };

  // ─────────────── 2. UTILITIES & TOAST NOTIFICATIONS ───────────────
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function toast(type, title, sub) {
    const stack = $('toastStack');
    if (!stack) return;
    const icons = {
      success: 'fa-circle-check',
      warn: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
      error: 'fa-circle-xmark'
    };
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info}"></i>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(title || '')}</div>
        ${sub ? `<div class="toast-sub">${escapeHtml(sub)}</div>` : ''}
      </div>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  function getEffectiveUid() {
    if (auth && auth.currentUser) return auth.currentUser.uid;
    let guestUid = localStorage.getItem(CONFIG.GUEST_UID_KEY);
    if (!guestUid) {
      guestUid = 'guest_study_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(CONFIG.GUEST_UID_KEY, guestUid);
    }
    return guestUid;
  }

  // Confetti Particle Burst for Day Completion
  function fireConfetti() {
    const canvas = $('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#D4AF37', '#F4D03F', '#10b981', '#7c3aed', '#00d4ff', '#ffffff'];
    const particles = [];
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }

    let start = null;
    function render(ts) {
      if (!start) start = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.rotation += p.spin;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      if (alive) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(render);
  }

  // ─────────────── 3. THEME TOGGLE ───────────────
  (function initTheme() {
    const saved = localStorage.getItem('tcs_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const updateIcon = (theme) => {
      const icon = $('themeIcon');
      if (icon) icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    };
    updateIcon(saved);

    $('themeToggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tcs_theme', next);
      updateIcon(next);
      toast('info', next === 'light' ? '☀️ Light theme' : '🌙 Dark theme');
    });
  })();

  // ─────────────── 4. SCREEN NAVIGATION ───────────────
  function showScreen(screenId) {
    const s1 = $('studySetupView');
    const s2 = $('studyGeneratingView');
    const s3 = $('studyPlanView');

    [s1, s2, s3].forEach(s => s?.classList.remove('active'));

    if (screenId === 'setup') s1?.classList.add('active');
    else if (screenId === 'generating') s2?.classList.add('active');
    else if (screenId === 'plan') s3?.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─────────────── 5. SETUP FORM CONTROLS ───────────────
  const goalSelect = $('studyGoalSelect');
  const customGoalWrap = $('customGoalWrap');
  const customGoalInput = $('customGoalInput');
  const timeSlider = $('timeSlider');
  const sliderValBadge = $('sliderValBadge');
  const levelCards = $$('.level-card');
  const styleChips = $$('.style-chip');
  const deadlineSelect = $('deadlineSelect');
  const customDatePicker = $('customDatePicker');

  // Goal select toggle
  goalSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'Custom') {
      if (customGoalWrap) customGoalWrap.style.display = 'block';
      customGoalInput?.focus();
    } else {
      if (customGoalWrap) customGoalWrap.style.display = 'none';
    }
  });

  // Level Radio Cards
  levelCards.forEach(card => {
    card.addEventListener('click', () => {
      levelCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Slider value mapping
  const timeLabels = {
    '1': '30 Min / Day',
    '2': '1 Hour / Day',
    '3': '2 Hours / Day',
    '4': '3 Hours / Day',
    '5': '4+ Hours / Day'
  };

  timeSlider?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (sliderValBadge) sliderValBadge.textContent = timeLabels[val] || `${val} Hours / Day`;
  });

  // Style chips multi-select
  styleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const selected = $$('.style-chip.selected');
      // allow deselect only if more than 1 selected
      if (chip.classList.contains('selected') && selected.length === 1) {
        toast('warn', 'Pick at least 1 style', 'Select at least one preferred way of learning');
        return;
      }
      chip.classList.toggle('selected');
    });
  });

  function getSelectedStyles() {
    const styles = [];
    $$('.style-chip.selected').forEach(c => {
      if (c.dataset.style) styles.push(c.dataset.style);
    });
    return styles;
  }

  // Popular Presets
  const presets = {
    neetbio30: {
      goal: 'NEET Biology (Botany & Zoology)',
      level: 'Some Basics',
      timeVal: '3', // 2 hours
      deadline: '1 month',
      styles: ['Reading', 'Practice', 'Videos']
    },
    jeephys30: {
      goal: 'JEE Physics',
      level: 'Some Basics',
      timeVal: '3', // 2 hours
      deadline: '1 month',
      styles: ['Practice', 'Videos']
    },
    upscgs60: {
      goal: 'UPSC General Studies & Polity',
      level: 'Absolute Beginner',
      timeVal: '4', // 3 hours
      deadline: '2 months',
      styles: ['Reading', 'Practice', 'Projects']
    },
    class12boards30: {
      goal: 'Class 12 Board Exam (PCM/PCB)',
      level: 'Some Basics',
      timeVal: '3', // 2 hours
      deadline: '1 month',
      styles: ['Reading', 'Practice']
    },
    python30: {
      goal: 'Python Basics',
      level: 'Absolute Beginner',
      timeVal: '2', // 1 hour
      deadline: '1 month',
      styles: ['Videos', 'Practice']
    },
    dsa60: {
      goal: 'DSA in Python',
      level: 'Some Basics',
      timeVal: '3', // 2 hours
      deadline: '2 months',
      styles: ['Practice', 'Videos', 'Projects']
    }
  };

  $$('.preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = presets[btn.dataset.preset];
      if (!p) return;

      if (goalSelect) {
        goalSelect.value = p.goal;
        if (customGoalWrap) customGoalWrap.style.display = 'none';
      }

      levelCards.forEach(c => {
        const rad = c.querySelector('input[type="radio"]');
        const match = rad && rad.value === p.level;
        c.classList.toggle('selected', match);
        if (rad) rad.checked = match;
      });

      if (timeSlider) {
        timeSlider.value = p.timeVal;
        if (sliderValBadge) sliderValBadge.textContent = timeLabels[p.timeVal];
      }

      if (deadlineSelect) deadlineSelect.value = p.deadline;
      if (customDatePicker) customDatePicker.value = '';

      styleChips.forEach(c => {
        c.classList.toggle('selected', p.styles.includes(c.dataset.style));
      });

      toast('info', `Preset Applied: ${btn.textContent}`);
    });
  });

  // ─────────────── 6. CURRICULUM SYLLABUS & SMART PLAN GENERATOR ───────────────
  // Ensures 100% production-ready plans for any duration, goal, and level
  function generatePlanDays(goal, level, hoursPerDay, totalDays, styles) {
    const days = [];
    const timePerDay = hoursPerDay || '60 min';

    // Topic libraries
    const topicTrees = {
      'NEET Biology (Botany & Zoology)': [
        { title: 'Cell: The Unit of Life & Cell Cycle', topics: ['Prokaryotic vs Eukaryotic cells', 'Endomembrane system & Organelles', 'Mitosis vs Meiosis stages', 'Cell cycle regulation & checkpoints'], type: 'reading' },
        { title: 'Biomolecules & Enzyme Catalysis', topics: ['Carbohydrates, Lipids, Amino acids', 'Primary/Secondary/Tertiary protein structure', 'Nucleic acids (DNA/RNA double helix)', 'Enzyme kinetics & competitive inhibition'], type: 'practice' },
        { title: 'Plant Physiology: Photosynthesis in Higher Plants', topics: ['Light reaction (Z-scheme, Cyclic/Non-cyclic)', 'Calvin Cycle (C3 pathway)', 'C4 pathway & Kranz anatomy', 'CAM plants & Photorespiration factors'], type: 'video' },
        { title: 'Plant Physiology: Respiration in Plants', topics: ['Glycolysis steps & Net ATP yield', 'Fermentation (Lactic vs Alcoholic)', 'Krebs TCA Cycle in mitochondrial matrix', 'Electron Transport System (ETS) & Chemiosmosis'], type: 'practice' },
        { title: 'Plant Growth, Hormones & Development', topics: ['Auxins, Gibberellins, Cytokinins functions', 'Abscisic acid (ABA) & Ethylene action', 'Photoperiodism & Vernalization', 'Seed dormancy breaking'], type: 'reading' },
        { title: 'Human Physiology: Digestion & Breathing', topics: ['Digestive enzymes & GI tract absorption', 'Respiratory volumes (TV, IRV, ERV, RV)', 'Oxygen-Hemoglobin dissociation curve', 'Regulation of respiration (Pons & Medulla)'], type: 'practice' },
        { title: 'Human Physiology: Body Fluids & Circulation', topics: ['Blood groups (ABO & Rh factor)', 'Cardiac cycle stages & ECG interpretation', 'Double circulation & Hepatic portal system', 'Cardiovascular disorders (Hypertension, CAD)'], type: 'practice' },
        { title: 'Human Physiology: Excretory Products & Elimination', topics: ['Nephron structure & Glomerular filtration', 'Urine formation: Reabsorption & Secretion', 'Countercurrent mechanism in Loop of Henle', 'Renin-Angiotensin Aldosterone System (RAAS)'], type: 'practice' },
        { title: 'Human Physiology: Neural & Chemical Coordination', topics: ['Conduction of nerve impulse (Action Potential)', 'Central vs Peripheral Nervous System', 'Pituitary, Thyroid & Adrenal hormones', 'Mechanism of hormone action (peptide vs steroid)'], type: 'practice' },
        { title: 'Genetics: Principles of Inheritance & Variation', topics: ['Mendel\'s Laws of Inheritance', 'Incomplete dominance & Codominance', 'Sex determination in humans & birds', 'Mendelian disorders (Hemophilia, Sickle Cell, Thalassemia)'], type: 'practice' },
        { title: 'Molecular Basis of Inheritance', topics: ['Structure of DNA & Griffith/Hershey-Chase experiments', 'DNA Replication (semi-conservative)', 'Transcription unit & genetic code properties', 'Translation process & Lac Operon regulation'], type: 'video' },
        { title: 'Evolution & Origin of Life', topics: ['Oparin-Haldane theory & Miller-Urey experiment', 'Homologous vs Analogous organs (Divergent/Convergent)', 'Hardy-Weinberg equilibrium equation', 'Human evolutionary stages (Australopithecus to Homo sapiens)'], type: 'reading' },
        { title: 'Human Health & Diseases', topics: ['Infectious agents: Typhoid, Pneumonia, Malaria life cycle', 'Innate vs Acquired immunity (Antibody structure)', 'AIDS pathophysiology & Cancer biology', 'Vaccines and allergic hypersensitivity'], type: 'practice' },
        { title: 'Biotechnology: Principles & Recombinant DNA', topics: ['Restriction endonucleases & ligases', 'Vectors (pBR322) & Competent host', 'Polymerase Chain Reaction (PCR steps)', 'Bioreactors & downstream processing'], type: 'practice' },
        { title: 'Biotechnology & Its Applications', topics: ['Bt cotton & pest resistant RNAi plants', 'Genetically engineered Insulin (Humulin)', 'Gene therapy for ADA deficiency', 'Transgenic animals & bioethics/patents'], type: 'reading' },
        { title: 'Ecology: Organisms & Populations', topics: ['Abiotic factors & adaptational strategies', 'Population growth models (Exponential vs Logistic)', 'Age pyramids & carrying capacity', 'Population interactions (Mutualism, Parasitism, Commensalism)'], type: 'practice' },
        { title: 'Ecosystem & Biodiversity Conservation', topics: ['Energy flow & 10% trophic level law', 'Ecological pyramids (Number, Biomass, Energy)', 'Species-Area relationship (Alexander von Humboldt)', 'In-situ vs Ex-situ conservation strategies'], type: 'practice' },
        { title: 'Plant Reproduction: Flower Anatomy & Pollination', topics: ['Microsporogenesis & Megasporogenesis', 'Types of Pollination (Autogamy, Geitonogamy, Xenogamy)', 'Double fertilization & triple fusion', 'Apomixis and Polyembryony'], type: 'practice' },
        { title: 'Human Reproduction & Reproductive Health', topics: ['Spermatogenesis & Oogenesis stages', 'Menstrual cycle hormonal fluctuations', 'Fertilization, Cleavage & Implantation', 'ART techniques (IVF, ZIFT, ICSI, IUI)'], type: 'practice' },
        { title: 'NEET 90-Question Mock Test Drill', topics: ['Timed 45-minute 90-question biology practice', 'Elimination method for tricky statement questions', 'Assertion-Reason technique', 'NCERT revision on high-yield diagrams'], type: 'project' }
      ],

      'JEE Physics': [
        { title: 'Kinematics 1D & 2D Vectors', topics: ['Calculus in kinematics (v=dx/dt, a=dv/dt)', 'Projectile motion trajectory equation', 'Relative velocity in 2D (Rain-man, River-boat)', 'Constrained motion and pulley systems'], type: 'practice' },
        { title: 'Newton\'s Laws of Motion & Friction', topics: ['Free Body Diagrams (FBD) setup', 'Static vs Kinetic friction limits', 'Banking of curved roads', 'Pseudo-force in non-inertial frames'], type: 'practice' },
        { title: 'Work, Energy & Power', topics: ['Work-Energy Theorem application', 'Conservative vs Non-conservative forces', 'Potential energy curves & stability', 'Vertical circular motion tension analysis'], type: 'practice' },
        { title: 'Center of Mass & Linear Momentum', topics: ['CM of continuous bodies', 'Conservation of linear momentum', 'Elastic and Inelastic collisions in 1D & 2D', 'Variable mass systems (Rocket propulsion)'], type: 'practice' },
        { title: 'Rotational Dynamics & Torque', topics: ['Moment of Inertia (Parallel & Perpendicular axis theorems)', 'Torque & Angular momentum conservation', 'Pure rolling motion on inclined planes', 'Toppling vs Sliding dynamics'], type: 'video' },
        { title: 'Gravitation & Satellite Motion', topics: ['Kepler\'s Laws of Planetary Motion', 'Gravitational field and potential', 'Escape velocity derivation', 'Geostationary vs Polar satellite orbits'], type: 'practice' },
        { title: 'Simple Harmonic Motion (SHM)', topics: ['Kinematics & dynamics of SHM', 'Spring-block combinations (Series & Parallel)', 'Simple and compound pendulums', 'Damped and forced oscillations'], type: 'practice' },
        { title: 'Fluid Mechanics: Statics & Dynamics', topics: ['Pascal\'s Law and Archimedes Principle', 'Equation of Continuity', 'Bernoulli\'s Theorem & Applications (Torricelli, Venturi)', 'Surface tension & Viscosity (Poiseuille, Stokes Law)'], type: 'practice' },
        { title: 'Thermodynamics & Kinetic Theory of Gases', topics: ['First Law of Thermodynamics (Q = dU + W)', 'Isothermal, Adiabatic, Isochoric processes', 'Carnot engine efficiency & Second Law', 'Degrees of freedom & specific heats (Cp, Cv)'], type: 'practice' },
        { title: 'Wave Optics: Interference & Diffraction', topics: ['Huygens Principle of wavelets', 'Young\'s Double Slit Experiment (YDSE fringe width)', 'Intensity distribution & shifting of fringes', 'Single slit diffraction pattern'], type: 'video' },
        { title: 'Electrostatics: Charges & Gauss Law', topics: ['Coulomb\'s Law in vector form', 'Electric field and potential of charges', 'Gauss Law flux calculations (Sphere, Wire, Sheet)', 'Electrostatic potential energy of systems'], type: 'practice' },
        { title: 'Current Electricity: Circuits & Kirchhoff', topics: ['Drift velocity & Ohm\'s Law microscopic form', 'Kirchhoff\'s Current & Voltage Laws', 'Wheatstone bridge & Meter bridge', 'RC circuit charging & discharging transients'], type: 'practice' },
        { title: 'Magnetism: Biot-Savart & Ampere\'s Law', topics: ['Magnetic field due to straight wire, loop, solenoid', 'Force on moving charge (Lorentz force) & cyclotron', 'Torque on magnetic dipole & Moving coil galvanometer', 'Dia, Para and Ferromagnetism'], type: 'practice' },
        { title: 'Electromagnetic Induction & AC Circuits', topics: ['Faraday\'s Law and Lenz\'s Law', 'Motional EMF and Eddy currents', 'LCR series resonance circuit', 'Transformer power efficiency calculations'], type: 'practice' },
        { title: 'Modern Physics & Dual Nature', topics: ['Photoelectric effect & Einstein equation', 'Bohr\'s atomic model & Hydrogen spectrum', 'De Broglie wavelength & Davisson-Germer', 'Radioactive decay Law & Nuclear binding energy'], type: 'practice' }
      ],

      'UPSC General Studies & Polity': [
        { title: 'Historical Underpinnings & Preamble', topics: ['Regulating Act 1773 to Independence Act 1947', 'Constituent Assembly debates & drafting', 'Philosophy and Keywords of the Preamble', 'Basic Structure Doctrine (Kesavananda Bharati)'], type: 'reading' },
        { title: 'Fundamental Rights (Articles 12-35)', topics: ['Right to Equality (Articles 14-18)', 'Six Freedoms of Article 19 & reasonable restrictions', 'Right to Life and Personal Liberty (Article 21)', 'Writ jurisdiction of Supreme Court (Article 32)'], type: 'reading' },
        { title: 'DPSP & Fundamental Duties', topics: ['Socialistic, Gandhian & Liberal-Intellectual principles', 'Enforceability & conflicts with Fundamental Rights', '42nd & 44th Constitutional Amendments', 'Article 51A Fundamental Duties relevance'], type: 'reading' },
        { title: 'Union Executive: President & Prime Minister', topics: ['President election methodology (Proportional representation)', 'Pardoning powers (Article 72 vs Governor 161)', 'Council of Ministers & collective responsibility', 'Prime Minister\'s role in Cabinet governance'], type: 'reading' },
        { title: 'Parliamentary System & Legislative Process', topics: ['Lok Sabha vs Rajya Sabha constitutional powers', 'Ordinary vs Money vs Constitutional Amendment Bills', 'Parliamentary Committees (PAC, Estimates, CoPU)', 'Anti-Defection Law (10th Schedule provisions)'], type: 'reading' },
        { title: 'Judiciary: Supreme Court & High Courts', topics: ['Appointment of judges (Collegium system evolution)', 'Original, Appellate & Advisory jurisdiction', 'Judicial Review & Judicial Activism', 'Subordinate Judiciary & Gram Nyayalayas'], type: 'reading' },
        { title: 'Federalism & Inter-State Relations', topics: ['Division of powers (7th Schedule Union/State/Concurrent)', 'Finance Commission & fiscal federalism (GST Council)', 'Inter-State Council & Zonal Councils', 'Governor\'s discretionary powers and controversies'], type: 'reading' },
        { title: 'Local Governance (73rd & 74th Amendments)', topics: ['Panchayati Raj 3-tier structure & Gram Sabha', 'Urban Local Bodies (Municipalities & Corporations)', 'State Election Commission & State Finance Commission', 'PESA Act 1996 for Scheduled Areas'], type: 'reading' },
        { title: 'Constitutional & Statutory Bodies', topics: ['Election Commission of India (Article 324)', 'UPSC and SPSC mandates (Articles 315-323)', 'CAG of India (Guardian of Public Purse)', 'NITI Aayog, NHRC, CIC, CVC governance bodies'], type: 'reading' },
        { title: 'UPSC Answer Writing & Current Polity Issues', topics: ['Structuring 150/250 word GS answers with Article citations', 'Supreme Court landmark judgments compilation', 'Analyzing dynamic federalism and electoral reforms', 'Full length GS-2 mock question practice'], type: 'project' }
      ],

      'Class 12 Board Exam (PCM/PCB)': [
        { title: 'Physics: Electrostatics & Potential', topics: ['Electric charges & fields NCERT derivations', 'Gauss Theorem applications for boards', 'Capacitors in series/parallel and dielectric slab', 'Previous 5-year board questions review'], type: 'reading' },
        { title: 'Physics: Current Electricity & Magnetism', topics: ['Drift velocity derivation & Kirchhoff\'s Laws', 'Wheatstone bridge numericals', 'Biot-Savart Law derivations', 'Moving coil galvanometer conversion to ammeter/voltmeter'], type: 'practice' },
        { title: 'Physics: Optics (Ray & Wave)', topics: ['Lens Maker\'s formula derivation', 'Prism formula (minimum deviation)', 'Astronomical telescope & compound microscope', 'YDSE fringe width complete derivation'], type: 'practice' },
        { title: 'Chemistry: Solutions & Electrochemistry', topics: ['Raoult\'s Law and Colligative properties numericals', 'Van\'t Hoff factor calculations', 'Nernst equation application for cell EMF', 'Kohlrausch Law and molar conductivity'], type: 'practice' },
        { title: 'Chemistry: Chemical Kinetics & d/f-Block', topics: ['Integrated rate equation (Zero & First order derivations)', 'Arrhenius equation & activation energy', 'Transition elements variable oxidation states & color', 'Lanthanoid contraction causes and consequences'], type: 'practice' },
        { title: 'Chemistry: Organic Name Reactions & Conversions', topics: ['Aldol condensation, Cannizzaro reaction', 'Sandmeyer, Reimer-Tiemann, Kolbe reactions', 'Distinction tests (Lucas, Tollens, Fehling, Iodoform)', 'Step-up and step-down organic roadmaps'], type: 'practice' },
        { title: 'Mathematics: Calculus Deep Dive (or Biology)', topics: ['Continuity and Differentiability at a point', 'Integration by parts, partial fractions, substitutions', 'Definite integral properties and proofs', 'Differential equations general and particular solutions'], type: 'practice' },
        { title: 'Class 12 Full Sample Paper Simulation', topics: ['3-hour timed board exam sample paper test', 'Step-marking presentation practice', 'Formula derivation writing discipline', 'Error analysis and self-correction'], type: 'project' }
      ],

      'Python Basics': [
        { title: 'Python Setup & Hello World', topics: ['Python installation & VS Code', 'Interactive REPL vs Scripts', 'First program: print()', 'Comments and clean code style'], type: 'video' },
        { title: 'Variables, Integers & Floats', topics: ['Variable assignment and naming rules', 'int, float, and type conversion', 'Basic arithmetic operators', 'PEMDAS operator precedence'], type: 'practice' },
        { title: 'Strings & String Formatting', topics: ['Single/double/multiline strings', 'f-strings in Python', 'String methods (.lower(), .strip(), .replace())', 'String slicing [start:stop:step]'], type: 'practice' },
        { title: 'Booleans & Conditional Logic', topics: ['True/False booleans', 'Comparison operators (==, !=, <, >)', 'if, elif, else statements', 'Logical operators (and, or, not)'], type: 'practice' },
        { title: 'While Loops & Infinite Loop Traps', topics: ['While loop anatomy', 'Counters & loop condition flags', 'break and continue statements', 'Input validation loops'], type: 'practice' },
        { title: 'For Loops & the range() Function', topics: ['Iterating over ranges', 'range(start, stop, step)', 'Looping over strings', 'Nested for loops for patterns'], type: 'practice' },
        { title: 'Milestone Project 1: Guess the Number Game', topics: ['import random module', 'Game loop with score tracking', 'Clean player feedback messages', 'Error handling with try/except'], type: 'project' },
        { title: 'Lists Fundamentals', topics: ['Creating and indexing lists', 'Appending, inserting & removing items', 'List slicing and copying', 'in operator for membership'], type: 'practice' },
        { title: 'List Methods & Looping', topics: ['sort(), reverse(), pop()', 'Looping with enumerate()', 'Finding min(), max(), sum()', 'Two-dimensional lists (matrices)'], type: 'practice' },
        { title: 'Tuples & Immutability', topics: ['Tuples vs Lists', 'Tuple unpacking', 'When to use immutability', 'Tuples as dictionary keys'], type: 'reading' },
        { title: 'Dictionaries: Key-Value Architecture', topics: ['Creating dicts & accessing values', '.get() method with defaults', 'Adding, updating, and deleting keys', 'Looping over .keys(), .values(), .items()'], type: 'practice' },
        { title: 'Sets: Uniqueness & Math Operations', topics: ['Set creation & eliminating duplicates', 'Adding & removing elements', 'Union, intersection, difference', 'Fast membership testing (O(1))'], type: 'practice' },
        { title: 'Functions: Defining & Parameters', topics: ['def keyword & docstrings', 'Parameters vs arguments', 'Positional vs keyword arguments', 'Default argument values'], type: 'practice' },
        { title: 'Function Returns & Scope', topics: ['return statement vs print()', 'Returning multiple values', 'Local vs global variable scope', 'Pure functions concept'], type: 'practice' },
        { title: 'Milestone Project 2: Terminal Contact Book', topics: ['CRUD operations with dictionaries', 'Adding, searching & editing contacts', 'Modular function structure', 'Formatted contact cards'], type: 'project' },
        { title: 'File Handling: Reading & Writing', topics: ['open() function & with open() context manager', 'Reading text files line-by-line', 'Writing & appending to files', 'Handling FileNotFoundError'], type: 'practice' },
        { title: 'Working with CSV & JSON Data', topics: ['import csv module', 'json.loads() and json.dumps()', 'Saving app state to disk', 'Parsing API-like responses'], type: 'practice' },
        { title: 'Exception Handling & Defensiveness', topics: ['try, except, else, finally blocks', 'Catching specific exceptions (ValueError, ZeroDivisionError)', 'Raising custom exceptions', 'Logging errors cleanly'], type: 'practice' },
        { title: 'List Comprehensions & Pythonic Syntax', topics: ['Single-line list transformations', 'Filtering with if in comprehensions', 'Dictionary comprehensions', 'Clean readable code aesthetics'], type: 'practice' },
        { title: 'Object-Oriented Programming (OOP) Part 1', topics: ['Classes vs Objects concept', '__init__() constructor method', 'Instance attributes & self parameter', 'Defining class methods'], type: 'video' },
        { title: 'OOP Part 2: Inheritance & Encapsulation', topics: ['Base classes & child subclasses', 'super() method usage', 'Method overriding', 'Private attributes convention (_var)'], type: 'practice' },
        { title: 'Modules, Packages & Virtual Environments', topics: ['Creating and importing custom modules', '__name__ == "__main__" idiom', 'pip install package manager', 'requirements.txt overview'], type: 'reading' },
        { title: 'Working with Python Standard Library', topics: ['datetime module for timestamps', 'math and statistics modules', 'os and sys modules', 'collections.Counter & defaultdict'], type: 'practice' },
        { title: 'Lambda Functions, map() & filter()', topics: ['Anonymous lambda functions', 'Using lambdas with sort(key=...)', 'map() transformations', 'filter() predicates'], type: 'practice' },
        { title: 'Milestone Project 3: Bank Account Management System', topics: ['OOP BankAccount class', 'Deposit, withdraw, transfer logic', 'Transaction history logger to file', 'Pin authentication'], type: 'project' },
        { title: 'Web Requests with requests Module', topics: ['pip install requests', 'Making GET requests to free APIs', 'Checking response status codes', 'Parsing JSON weather/trivia payloads'], type: 'practice' },
        { title: 'Basic Testing with unittest / pytest', topics: ['Why write automated tests', 'Writing test cases with assert', 'Testing edge cases (empty lists, 0)', 'Running test suites'], type: 'reading' },
        { title: 'Performance, Time Complexity & Clean Code', topics: ['Time complexity intuition (O(1) vs O(N))', 'PEP 8 styling guide', 'Code refactoring techniques', 'Profiling slow functions'], type: 'practice' },
        { title: 'Capstone Project: CLI Expense Tracker & Analyzer', topics: ['Complete architecture from scratch', 'Category budgets & expense entry', 'Monthly summary calculations', 'Exporting formatted reports to CSV'], type: 'project' },
        { title: 'Certification, Portfolio & Next Steps', topics: ['Pushing capstone repo to GitHub', 'Writing a professional README.md', 'Solving 5 Chairman Show Python problems', 'Planning DSA or Web Dev next step'], type: 'project' }
      ],

      'DSA in Python': [
        { title: 'Big-O Notation & Complexity Analysis', topics: ['Time vs Space complexity', 'O(1), O(log N), O(N), O(N^2)', 'Worst, Average, Best cases', 'Analyzing loops and recursion'], type: 'video' },
        { title: 'Static Arrays vs Dynamic Lists', topics: ['Contiguous memory allocation', 'List resizing mechanics under the hood', 'In-place modifications vs copies', 'Two Pointers technique introduction'], type: 'practice' },
        { title: 'Two Pointers: Reversal & Palindromes', topics: ['Left and right converging pointers', 'Valid Palindrome problem', 'Reverse String / Array in-place', 'Container With Most Water'], type: 'practice' },
        { title: 'Sliding Window Technique (Fixed & Variable)', topics: ['Max sum subarray of size K', 'Longest substring without repeating characters', 'Expanding & shrinking window logic', 'Window state with hash maps'], type: 'practice' },
        { title: 'Prefix Sums & Range Queries', topics: ['Building 1D prefix sum arrays', 'Subarray sum equals K', 'Range sum queries in O(1)', 'Product of array except self'], type: 'practice' },
        { title: 'Hash Maps & Hash Sets in DSA', topics: ['Hash collision & hash functions', 'Two Sum problem (classic O(N))', 'Group Anagrams with sorted keys', 'Longest consecutive sequence in O(N)'], type: 'practice' },
        { title: 'Milestone 1: 10 LeetCode Easy/Medium Array Problems', topics: ['Time-boxed problem solving', 'Edge cases (empty array, negatives, duplicates)', 'Writing clean modular code', 'Explaining complexity out loud'], type: 'practice' },
        { title: 'Binary Search Fundamentals', topics: ['Search in sorted array logic', 'Avoiding integer overflow (mid calculation)', 'Upper bound vs Lower bound', 'Search in rotated sorted array'], type: 'practice' },
        { title: 'Binary Search on Answer Space', topics: ['Monotonic condition check', 'Koko Eating Bananas problem', 'Capacity to ship packages within D days', 'Minimizing maximum allocation'], type: 'practice' },
        { title: 'Recursion Principles & Call Stack', topics: ['Base case and recursive step', 'Call stack memory execution', 'Fibonacci & Factorial recursion', 'Tree recursion vs linear recursion'], type: 'video' },
        { title: 'Backtracking: Permutations & Subsets', topics: ['State space tree concept', 'Subsets / Power set generation', 'Permutations of an array', 'Backtracking template: choose, explore, unchoose'], type: 'practice' },
        { title: 'Backtracking: Combination Sum & N-Queens', topics: ['Combination Sum with target', 'Pruning invalid branches early', 'N-Queens placement logic', 'Word Search in 2D grid'], type: 'practice' },
        { title: 'Singly Linked Lists: Node Creation & Traversal', topics: ['Node class with val and next', 'Head insertion, deletion, search', 'Reverse Linked List (iterative + recursive)', 'Middle of Linked List (fast/slow pointers)'], type: 'practice' },
        { title: 'Linked Lists: Cycle Detection & Merging', topics: ['Floyd\'s Tortoise and Hare cycle detection', 'Find start of cycle node', 'Merge Two Sorted Lists', 'Remove Nth node from end of list'], type: 'practice' },
        { title: 'Stacks: LIFO Architecture & Applications', topics: ['Stack using list and collections.deque', 'Valid Parentheses problem', 'Min Stack in O(1)', 'Evaluate Reverse Polish Notation'], type: 'practice' },
        { title: 'Monotonic Stack Pattern', topics: ['Next Greater Element problem', 'Daily Temperatures', 'Largest Rectangle in Histogram', 'Monotonic decreasing stack intuition'], type: 'practice' },
        { title: 'Queues & Deques: FIFO Mechanics', topics: ['collections.deque for O(1) popleft', 'Sliding Window Maximum using Deque', 'Implementing Queue using Stacks', 'Circular Queue implementation'], type: 'practice' },
        { title: 'Binary Trees: Node Traversal Techniques', topics: ['TreeNode class architecture', 'Pre-order, In-order, Post-order traversals', 'Iterative traversals with Stack', 'Maximum depth of binary tree'], type: 'practice' },
        { title: 'Breadth-First Search (BFS) / Level Order', topics: ['Queue-based level order traversal', 'Binary Tree Right Side View', 'Zigzag Level Order Traversal', 'Minimum depth of binary tree'], type: 'practice' },
        { title: 'Binary Search Trees (BST)', topics: ['BST invariant property', 'Search, insert, and delete in BST', 'Validate Binary Search Tree', 'Lowest Common Ancestor in BST'], type: 'practice' },
        { title: 'Heap / Priority Queue in Python', topics: ['heapq module in Python (min-heap)', 'Simulating max-heap with negatives', 'Top K Frequent Elements', 'Kth Largest Element in an Array', 'Merge K Sorted Lists'], type: 'practice' },
        { title: 'Graph Representations (Adjacency List vs Matrix)', topics: ['Graph definitions (directed, undirected, weighted)', 'Building adjacency lists using defaultdict', 'Number of Islands (Grid BFS/DFS)', 'Clone Graph'], type: 'practice' },
        { title: 'Graph Traversal: DFS & BFS Deep Dive', topics: ['Detecting cycle in undirected graph', 'Rotting Oranges (Multi-source BFS)', 'Word Ladder (Shortest path BFS)', 'Connected components counting'], type: 'practice' },
        { title: 'Topological Sort & DAGs', topics: ['Kahn\'s Algorithm (indegree queue)', 'DFS-based cycle detection in directed graph', 'Course Schedule I and II', 'Alien Dictionary'], type: 'practice' },
        { title: 'Dynamic Programming: 1D Memoization & Tabulation', topics: ['Optimal substructure & overlapping subproblems', 'Climbing Stairs & Fibonacci memoization', 'House Robber problem', 'Coin Change problem (min coins)'], type: 'video' },
        { title: '1D DP: Longest Increasing Subsequence', topics: ['LIS in O(N^2) DP', 'Optimizing LIS with Binary Search to O(N log N)', 'Partition Equal Subset Sum', 'Word Break'], type: 'practice' },
        { title: '2D Dynamic Programming: Grids & Paths', topics: ['Unique Paths in 2D grid', 'Minimum Path Sum', '0/1 Knapsack problem standard', 'Target Sum with subset difference'], type: 'practice' },
        { title: '2D DP on Strings: LCS & Edit Distance', topics: ['Longest Common Subsequence (LCS)', 'Longest Palindromic Subsequence', 'Edit Distance (Insert, Delete, Replace)', 'Distinct Subsequences'], type: 'practice' },
        { title: 'Tries (Prefix Trees) & Union-Find', topics: ['TrieNode and Word Dictionary implementation', 'Disjoint Set Union (Union by Rank & Path Compression)', 'Number of Connected Components', 'Redundant Connection'], type: 'practice' },
        { title: 'Mock Tech Interview & Speed Drill', topics: ['Timed 45-minute technical problem interview simulation', 'Speaking thought process while coding', 'Testing boundary cases cleanly', 'Top 50 Blind 75 LeetCode recap'], type: 'project' }
      ]
    };

    // Pick base tree or create generic adaptive curriculum
    let baseTree = topicTrees[goal];
    if (!baseTree) {
      if (/bio|botany|zoology|neet|medical/i.test(goal)) {
        baseTree = topicTrees['NEET Biology (Botany & Zoology)'];
      } else if (/jee|phys|mechanics/i.test(goal)) {
        baseTree = topicTrees['JEE Physics'];
      } else if (/upsc|ias|civil|polity|history|pcs/i.test(goal)) {
        baseTree = topicTrees['UPSC General Studies & Polity'];
      } else if (/board|class\s*1[012]|school|ncert/i.test(goal)) {
        baseTree = topicTrees['Class 12 Board Exam (PCM/PCB)'];
      } else if (/dsa|algorithm|leetcode/i.test(goal)) {
        baseTree = topicTrees['DSA in Python'];
      } else {
        baseTree = topicTrees['Python Basics'];
      }
    }

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      // Map to template or cycle with progressive milestones
      const templateIndex = (dayNum - 1) % baseTree.length;
      const t = baseTree[templateIndex];

      const weekNum = Math.ceil(dayNum / 7);
      const isReviewDay = dayNum % 7 === 0;

      let title = t.title;
      let topics = [...t.topics];
      let resType = t.type || 'practice';

      if (isReviewDay) {
        title = `Week ${weekNum} Consolidation & Coding Sprint`;
        topics = [
          `Review Week ${weekNum} key concepts & resolve sticky doubts`,
          'Solve 3 practice coding problems without looking at solutions',
          'Document learnings in your personal Study Dost notebook',
          'Take a 15-minute reflection on weekly streak momentum'
        ];
        resType = 'project';
      } else if (dayNum > baseTree.length) {
        title = `Advanced Application: ${t.title} (Level ${Math.floor(dayNum / baseTree.length) + 1})`;
      }

      // Curate realistic resources based on student preferred styles & subject
      const resources = [];
      const isCoding = /python|code|dsa|react|web|sql|programming/i.test(goal);
      const isBio = /bio|botany|zoology|neet/i.test(goal);
      const isUPSC = /upsc|polity|civil|history|geography|pcs/i.test(goal);

      if (styles.includes('Videos')) {
        resources.push({
          type: 'video',
          title: `${isBio ? 'NEET Video Lecture' : isUPSC ? 'UPSC Video Analysis' : 'Concept Video'}: ${title.split(':')[0]}`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + (isBio ? ' NEET biology NCERT' : isUPSC ? ' UPSC' : ' tutorial'))}`
        });
      }

      if (styles.includes('Practice') || isReviewDay) {
        if (isCoding) {
          resources.push({
            type: 'practice',
            title: `Practice Arena: Coding Problem on ${topics[0]}`,
            url: '/#python'
          });
        } else if (isBio) {
          resources.push({
            type: 'practice',
            title: `NEET MCQs & PYQ Drill: ${topics[0]}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(topics[0] + ' NEET MCQs previous years questions')}`
          });
        } else if (isUPSC) {
          resources.push({
            type: 'practice',
            title: `UPSC Prelims & Mains Drill: ${topics[0]}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(topics[0] + ' UPSC Mains questions pyq')}`
          });
        } else {
          resources.push({
            type: 'practice',
            title: `Exam Practice Questions: ${topics[0]}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(topics[0] + ' sample questions exemplar')}`
          });
        }
      }

      if (styles.includes('Reading') && resources.length < 3) {
        if (isCoding) {
          resources.push({
            type: 'reading',
            title: `Official Documentation & Cheat Sheet`,
            url: 'https://docs.python.org/3/'
          });
        } else if (isBio) {
          resources.push({
            type: 'reading',
            title: `NCERT Biology Chapter Notes & Key Terms`,
            url: 'https://ncert.nic.in/textbook.php'
          });
        } else if (isUPSC) {
          resources.push({
            type: 'reading',
            title: `Standard Reference & Article Notes`,
            url: 'https://www.india.gov.in/my-government/constitution-india'
          });
        } else {
          resources.push({
            type: 'reading',
            title: `NCERT Text & Standard Summary Sheet`,
            url: 'https://ncert.nic.in/'
          });
        }
      }

      if (styles.includes('Projects') && resources.length < 3) {
        if (isCoding) {
          resources.push({
            type: 'project',
            title: `Mini-Challenge: Implement ${topics[1] || topics[0]}`,
            url: '/#python'
          });
        } else {
          resources.push({
            type: 'project',
            title: `Mind-Map & Summary Chart Exercise: ${topics[0]}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(topics[0] + ' mind map revision chart')}`
          });
        }
      }

      days.push({
        day: dayNum,
        title: title,
        topics: topics,
        estimatedTime: timePerDay,
        resources: resources,
        completed: false,
        completedAt: null,
        skipped: false,
        skipReason: '',
        notes: ''
      });
    }

    return days;
  }

  // ─────────────── 7. GENERATE PLAN VIA CLOUDFLARE WORKER / ENGINE ───────────────
  async function generateStudyPlan(formData) {
    showScreen('generating');

    const progressFill = $('genProgressFill');
    const pctText = $('genProgressPct');
    const statusText = $('genStatusText');

    let currentPct = 12;
    const progressTimer = setInterval(() => {
      if (currentPct < 90) {
        currentPct += Math.floor(Math.random() * 8) + 4;
        if (currentPct > 90) currentPct = 90;
        if (progressFill) progressFill.style.width = currentPct + '%';
        if (pctText) pctText.textContent = currentPct + '%';
      }
    }, 320);

    const g1 = $('gtick1');
    const g2 = $('gtick2');
    const g3 = $('gtick3');
    const g4 = $('gtick4');

    setTimeout(() => {
      g1?.classList.remove('active');
      g1?.classList.add('completed');
      g2?.classList.add('active');
      if (statusText) statusText.textContent = 'Formatting daily practice exercises & learning resources...';
    }, 1100);

    setTimeout(() => {
      g2?.classList.remove('active');
      g2?.classList.add('completed');
      g3?.classList.add('active');
      if (statusText) statusText.textContent = 'Calibrating streak milestones and adaptive pacing...';
    }, 2200);

    setTimeout(() => {
      g3?.classList.remove('active');
      g3?.classList.add('completed');
      g4?.classList.add('active');
      if (statusText) statusText.textContent = 'Finalizing your personalized Study Dost roadmap...';
    }, 3200);

    // Calculate total days from deadline
    let totalDays = 30;
    if (formData.customDate) {
      const target = new Date(formData.customDate);
      const diffTime = target.getTime() - Date.now();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays = Math.max(7, Math.min(diffDays, 180));
    } else {
      const map = {
        '1 week': 7,
        '2 weeks': 14,
        '1 month': 30,
        '2 months': 60,
        '3 months': 90,
        '6 months': 180
      };
      totalDays = map[formData.deadline] || 30;
    }

    const payload = {
      question: `Create a detailed day-by-day learning plan for: ${formData.goal}, ${formData.level}, ${formData.hoursPerDay}, ${formData.deadline || totalDays + ' days'} duration`,
      subject: "Study Plan",
      mode: "study-buddy",
      studentData: {
        goal: formData.goal,
        level: formData.level,
        hoursPerDay: formData.hoursPerDay,
        deadline: formData.deadline,
        totalDays: totalDays,
        style: formData.styles
      }
    };

    // Try calling Cloudflare Worker
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (err) {
      console.warn('[Study Dost] Worker fetch fallback note:', err.message);
    } finally {
      clearInterval(progressTimer);
    }

    // Build the high-quality, comprehensive day-by-day curriculum
    const days = generatePlanDays(
      formData.goal,
      formData.level,
      formData.hoursPerDay,
      totalDays,
      formData.styles
    );

    if (progressFill) progressFill.style.width = '100%';
    if (pctText) pctText.textContent = '100%';
    g4?.classList.remove('active');
    g4?.classList.add('completed');

    await new Promise(r => setTimeout(r, 600));

    const planId = 'sp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    activePlan = {
      id: planId,
      createdAt: Date.now(),
      goal: formData.goal,
      level: formData.level,
      hoursPerDay: formData.hoursPerDay,
      deadline: formData.deadline || `${totalDays} Days`,
      totalDays: totalDays,
      completedDays: 0,
      streak: 0,
      lastCompletedDate: null,
      days: days
    };

    saveActivePlanToStorage(activePlan);
    savePlanToFirestore(activePlan);

    renderPlanDashboard(activePlan);
    loadDailyMotivationalQuote(activePlan.goal);
    showScreen('plan');

    toast('success', 'Study Roadmap Created!', `Your ${totalDays}-day plan is ready to start.`);
  }

  // ─────────────── 8. RENDER PLAN DASHBOARD ───────────────
  function getCurrentActiveDayIndex(plan) {
    if (!plan || !plan.days) return 0;
    const idx = plan.days.findIndex(d => !d.completed && !d.skipped);
    return idx === -1 ? plan.days.length - 1 : idx;
  }

  function renderPlanDashboard(plan) {
    if (!plan) return;

    // Header info
    if ($('planGoalTag')) $('planGoalTag').textContent = plan.goal;
    if ($('planLevelTag')) $('planLevelTag').textContent = plan.level;
    if ($('planGoalTitle')) $('planGoalTitle').textContent = `Your ${plan.totalDays}-Day ${plan.goal} Mastery Roadmap`;
    if ($('planHoursLabel')) $('planHoursLabel').textContent = plan.hoursPerDay;
    if ($('planDaysLabel')) {
      const activeIdx = getCurrentActiveDayIndex(plan);
      $('planDaysLabel').textContent = `Day ${activeIdx + 1} of ${plan.totalDays}`;
    }
    if ($('planCompletedLabel')) $('planCompletedLabel').textContent = `${plan.completedDays} / ${plan.totalDays} Completed`;

    // Streak
    if ($('streakNumber')) $('streakNumber').textContent = plan.streak || 0;

    // Progress Ring Calculation
    const pct = plan.totalDays ? Math.round((plan.completedDays / plan.totalDays) * 100) : 0;
    if ($('ringPctText')) $('ringPctText').textContent = `${pct}%`;

    const circumference = 2 * Math.PI * 38; // r=38 -> 238.76
    const offset = circumference - (pct / 100) * circumference;
    const ringFill = $('progressRingFill');
    if (ringFill) ringFill.style.strokeDashoffset = offset;

    // Render Today's Focus Card
    renderTodayCard(plan);

    // Render Tomorrow's Preview Card
    renderTomorrowCard(plan);

    // Render Full Timeline
    renderTimeline(plan);

    // Update Badges Count UI
    checkAndUnlockBadges(plan);
  }

  // Render Today Card
  function renderTodayCard(plan) {
    const activeIdx = getCurrentActiveDayIndex(plan);
    const day = plan.days[activeIdx];
    if (!day) return;

    if ($('todayDayBadge')) {
      $('todayDayBadge').textContent = day.completed
        ? `Day ${day.day} · Completed 🎉`
        : `Day ${day.day} Focus · Active Today`;
    }
    if ($('todayTimeBadge')) {
      $('todayTimeBadge').innerHTML = `<i class="fa-regular fa-clock"></i> ${day.estimatedTime}`;
    }
    if ($('todayTitle')) $('todayTitle').textContent = day.title;

    // Topics
    const topicsEl = $('todayTopicsList');
    if (topicsEl) {
      topicsEl.innerHTML = (day.topics || []).map(t => `<li>${escapeHtml(t)}</li>`).join('');
    }

    // Resources
    const resEl = $('todayResourcesGrid');
    if (resEl) {
      resEl.innerHTML = (day.resources || []).map(r => {
        const iconMap = {
          video: 'fa-solid fa-play',
          practice: 'fa-solid fa-code',
          reading: 'fa-solid fa-book-open',
          project: 'fa-solid fa-laptop-code'
        };
        const icon = iconMap[r.type] || 'fa-solid fa-link';
        return `
          <a href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener" class="tfc-resource-item">
            <i class="${icon} res-icon ${r.type}"></i>
            <span>${escapeHtml(r.title)}</span>
            <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.72rem;color:var(--text-muted);"></i>
          </a>
        `;
      }).join('');
    }

    // Notes
    const notesInput = $('todayNotesInput');
    if (notesInput) {
      notesInput.value = day.notes || '';
    }

    // Complete Button
    const completeBtn = $('markCompleteBtn');
    if (completeBtn) {
      if (day.completed) {
        completeBtn.classList.add('completed');
        completeBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Completed! Click to Undo</span>';
      } else {
        completeBtn.classList.remove('completed');
        completeBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Mark Day as Complete</span>';
      }
    }

    // Update floating chat suggestion chips with today's topic
    updateChatSuggestions(day);
  }

  // Render Tomorrow Card
  function renderTomorrowCard(plan) {
    const activeIdx = getCurrentActiveDayIndex(plan);
    const tomorrowIdx = activeIdx + 1;
    const tomorrowCard = $('tomorrowCard');

    if (tomorrowIdx >= plan.days.length) {
      if (tomorrowCard) tomorrowCard.style.display = 'none';
      return;
    }

    if (tomorrowCard) tomorrowCard.style.display = 'block';
    const tday = plan.days[tomorrowIdx];

    if ($('tomorrowBadge')) $('tomorrowBadge').textContent = `Tomorrow's Preview · Day ${tday.day}`;
    if ($('tomorrowTitle')) $('tomorrowTitle').textContent = tday.title;
    if ($('tomorrowDesc')) $('tomorrowDesc').textContent = `Next up: ${tday.topics.slice(0, 2).join(', ')}`;

    const tpEl = $('tomorrowTopicsPreview');
    if (tpEl) {
      tpEl.innerHTML = (tday.topics || []).map(t => `<span class="skill-tag" style="margin-right:6px;display:inline-block;margin-top:4px;">${escapeHtml(t)}</span>`).join('');
    }
  }

  // Render Timeline
  function renderTimeline(plan) {
    const container = $('timelineContainer');
    if (!container) return;

    let daysToRender = plan.days;
    if (timelineFilter === 'pending') {
      daysToRender = plan.days.filter(d => !d.completed);
    } else if (timelineFilter === 'completed') {
      daysToRender = plan.days.filter(d => d.completed);
    }

    if ($('timelineCountSub')) {
      $('timelineCountSub').textContent = `${plan.completedDays} of ${plan.totalDays} Days Completed`;
    }

    const activeIdx = getCurrentActiveDayIndex(plan);

    container.innerHTML = daysToRender.map(d => {
      const isActive = d.day === (activeIdx + 1);
      const isDone = d.completed;
      const statusClass = isDone ? 'completed-day' : (isActive ? 'active-day' : '');

      return `
        <div class="timeline-day-card ${statusClass}" data-day="${d.day}">
          <div class="timeline-node">
            ${isDone ? '<i class="fa-solid fa-check"></i>' : (isActive ? '<i class="fa-solid fa-bolt"></i>' : '')}
          </div>
          <div class="td-top-row">
            <span class="td-day-label">Day ${d.day} · ${escapeHtml(d.estimatedTime)}</span>
            <label class="td-checkbox-wrap">
              <input type="checkbox" class="td-checkbox" data-day="${d.day}" ${isDone ? 'checked' : ''}>
              <span>${isDone ? 'Completed' : 'Mark Done'}</span>
            </label>
          </div>
          <div class="td-title">${escapeHtml(d.title)}</div>
          <div class="td-topics-summary">${(d.topics || []).slice(0, 3).join(' · ')}</div>
        </div>
      `;
    }).join('');
  }

  // ─────────────── 9. DAY COMPLETION & STREAK LOGIC ───────────────
  function toggleDayCompletion(dayNumber) {
    if (!activePlan) return;
    const day = activePlan.days.find(d => d.day === dayNumber);
    if (!day) return;

    const wasCompleted = day.completed;
    day.completed = !wasCompleted;
    day.completedAt = day.completed ? new Date().toISOString() : null;

    if (day.completed) {
      activePlan.completedDays = (activePlan.completedDays || 0) + 1;
      updateStreakOnComplete(activePlan);
      fireConfetti();
      toast('success', `Day ${day.day} Completed! 🎉`, 'Keep the streak alive! Great work today.');
    } else {
      activePlan.completedDays = Math.max(0, (activePlan.completedDays || 0) - 1);
      toast('info', `Day ${day.day} Unmarked`, 'Updated progress');
    }

    saveActivePlanToStorage(activePlan);
    savePlanToFirestore(activePlan);
    renderPlanDashboard(activePlan);
  }

  function updateStreakOnComplete(plan) {
    const todayStr = new Date().toDateString();
    if (plan.lastCompletedDate === todayStr) {
      // already counted today
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (plan.lastCompletedDate === yesterdayStr) {
      plan.streak = (plan.streak || 0) + 1;
    } else if (!plan.lastCompletedDate) {
      plan.streak = 1;
    } else {
      // missed a day -> restart streak to 1
      plan.streak = 1;
    }

    plan.lastCompletedDate = todayStr;
  }

  // Auto-save today's notes
  let notesDebounceTimer = null;
  $('todayNotesInput')?.addEventListener('input', (e) => {
    clearTimeout(notesDebounceTimer);
    notesDebounceTimer = setTimeout(() => {
      if (!activePlan) return;
      const activeIdx = getCurrentActiveDayIndex(activePlan);
      const day = activePlan.days[activeIdx];
      if (day) {
        day.notes = e.target.value;
        saveActivePlanToStorage(activePlan);
        savePlanToFirestore(activePlan);
        const savedMsg = $('todayNotesSavedMsg');
        if (savedMsg) {
          savedMsg.classList.add('show');
          setTimeout(() => savedMsg.classList.remove('show'), 2000);
        }
      }
    }, 600);
  });

  // Mark complete button in Today Card
  $('markCompleteBtn')?.addEventListener('click', () => {
    if (!activePlan) return;
    const activeIdx = getCurrentActiveDayIndex(activePlan);
    const day = activePlan.days[activeIdx];
    if (day) {
      toggleDayCompletion(day.day);
    }
  });

  // Checkbox in Timeline
  $('timelineContainer')?.addEventListener('change', (e) => {
    const cb = e.target.closest('.td-checkbox');
    if (!cb) return;
    const dayNum = parseInt(cb.dataset.day, 10);
    toggleDayCompletion(dayNum);
  });

  // Timeline Filter Buttons
  $$('.tl-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tl-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      timelineFilter = btn.dataset.filter;
      if (activePlan) renderTimeline(activePlan);
    });
  });

  // Tomorrow Card Expand Toggle
  $('tomorrowHeaderToggle')?.addEventListener('click', () => {
    $('tomorrowCard')?.classList.toggle('open');
  });

  // Skip Day Dialog
  $('skipDayBtn')?.addEventListener('click', () => {
    $('skipDayModal')?.classList.add('show');
  });

  $('cancelSkipBtn')?.addEventListener('click', () => {
    $('skipDayModal')?.classList.remove('show');
  });

  $('closeSkipModalBtn')?.addEventListener('click', () => {
    $('skipDayModal')?.classList.remove('show');
  });

  $('confirmSkipBtn')?.addEventListener('click', () => {
    if (!activePlan) return;
    const activeIdx = getCurrentActiveDayIndex(activePlan);
    const day = activePlan.days[activeIdx];
    const reason = $('skipReasonSelect')?.value || 'Rest day';

    if (day) {
      day.skipped = true;
      day.skipReason = reason;
      saveActivePlanToStorage(activePlan);
      savePlanToFirestore(activePlan);
      renderPlanDashboard(activePlan);
      toast('info', `Day ${day.day} Skipped (${reason})`, 'Milestone deferred. Rest up and crush it tomorrow!');
    }
    $('skipDayModal')?.classList.remove('show');
  });

  // ─────────────── 10. ACHIEVEMENTS & BADGES SYSTEM ───────────────
  const BADGE_DEFS = [
    {
      id: 'first_day',
      title: 'First Step',
      desc: 'Completed Day 1 of your study plan.',
      icon: 'fa-solid fa-flag-checkered',
      check: (p) => (p.completedDays || 0) >= 1
    },
    {
      id: 'streak_7',
      title: 'Unstoppable Momentum',
      desc: 'Maintained a 7-day learning streak.',
      icon: 'fa-solid fa-fire',
      check: (p) => (p.streak || 0) >= 7
    },
    {
      id: 'master_30',
      title: '30-Day Master',
      desc: 'Completed 30 milestones of dedicated practice.',
      icon: 'fa-solid fa-trophy',
      check: (p) => (p.completedDays || 0) >= 30
    },
    {
      id: 'plan_completed',
      title: 'Graduate',
      desc: 'Finished all milestones in your active study roadmap.',
      icon: 'fa-solid fa-graduation-cap',
      check: (p) => (p.completedDays || 0) >= (p.totalDays || 30)
    }
  ];

  function loadBadges() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.BADGES_KEY));
      if (saved && typeof saved === 'object') badges = saved;
    } catch (e) {}
  }

  function checkAndUnlockBadges(plan) {
    if (!plan) return;
    let unlockedCount = 0;

    BADGE_DEFS.forEach(b => {
      const previouslyUnlocked = badges[b.id];
      const nowUnlocked = previouslyUnlocked || b.check(plan);
      badges[b.id] = nowUnlocked;
      if (nowUnlocked) unlockedCount++;

      if (!previouslyUnlocked && nowUnlocked) {
        toast('success', `Achievement Unlocked: ${b.title}! 🏆`, b.desc);
      }
    });

    localStorage.setItem(CONFIG.BADGES_KEY, JSON.stringify(badges));
    if ($('badgeCountLabel')) $('badgeCountLabel').textContent = `${unlockedCount}/4`;

    renderBadgesModal();
  }

  function renderBadgesModal() {
    const grid = $('badgesGrid');
    if (!grid) return;

    grid.innerHTML = BADGE_DEFS.map(b => {
      const isUnlocked = badges[b.id];
      return `
        <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="badge-icon-box">
            <i class="${b.icon}"></i>
          </div>
          <div>
            <div class="badge-title">${escapeHtml(b.title)} ${isUnlocked ? '✅' : '🔒'}</div>
            <div class="badge-desc">${escapeHtml(b.desc)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  $('badgesBtn')?.addEventListener('click', () => {
    $('badgesModal')?.classList.add('show');
  });

  $('openBadgesModalBtn')?.addEventListener('click', () => {
    $('badgesModal')?.classList.add('show');
  });

  $('closeBadgesModalBtn')?.addEventListener('click', () => {
    $('badgesModal')?.classList.remove('show');
  });

  // ─────────────── 11. FLOATING CHAT WITH STUDY DOST ───────────────
  const chatDrawer = $('studyChatDrawer');
  const chatOverlay = $('studyChatDrawerOverlay');
  const chatInput = $('studyChatInput');
  const chatMessages = $('studyChatMessages');

  function openChatDrawer() {
    chatDrawer?.classList.add('open');
    chatOverlay?.classList.add('open');
    setTimeout(() => chatInput?.focus(), 150);
  }

  function closeChatDrawer() {
    chatDrawer?.classList.remove('open');
    chatOverlay?.classList.remove('open');
  }

  $('floatingChatBtn')?.addEventListener('click', openChatDrawer);
  $('chatDostHeaderBtn')?.addEventListener('click', openChatDrawer);
  $('closeStudyChatBtn')?.addEventListener('click', closeChatDrawer);
  chatOverlay?.addEventListener('click', closeChatDrawer);

  function updateChatSuggestions(day) {
    const chipsWrap = $('chatQuickChips');
    if (!chipsWrap || !day) return;
    const topTopic = day.topics?.[0] || 'today\'s topic';
    const isCoding = activePlan && /python|code|dsa|react|web|sql|programming/i.test(activePlan.goal);

    if (isCoding) {
      chipsWrap.innerHTML = `
        <button type="button" class="sc-chip" data-q="Explain ${escapeHtml(topTopic)} in simple words with an easy code example.">Explain ${escapeHtml(topTopic)}</button>
        <button type="button" class="sc-chip" data-q="Give me 2 practical coding challenges on ${escapeHtml(topTopic)}.">Practice exercises</button>
        <button type="button" class="sc-chip" data-q="How can I finish Day ${day.day} in ${day.estimatedTime}?">Study technique</button>
      `;
    } else {
      chipsWrap.innerHTML = `
        <button type="button" class="sc-chip" data-q="Explain ${escapeHtml(topTopic)} simply with key NCERT / syllabus concepts.">Explain ${escapeHtml(topTopic)}</button>
        <button type="button" class="sc-chip" data-q="Give me 3 high-yield exam practice questions on ${escapeHtml(topTopic)}.">Exam practice questions</button>
        <button type="button" class="sc-chip" data-q="What are the common pitfalls and memory tricks for ${escapeHtml(topTopic)}?">Key tricks & traps</button>
      `;
    }
  }

  $('chatQuickChips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.sc-chip');
    if (!chip) return;
    const q = chip.dataset.q;
    if (chatInput) chatInput.value = q;
    handleSendMessage(q);
  });

  async function handleSendMessage(text) {
    if (!text || !text.trim()) return;
    const query = text.trim();

    // Append user message
    appendChatMessage('user', query);
    if (chatInput) chatInput.value = '';

    // Show typing
    const typingId = appendChatMessage('dost', '<i class="fa-solid fa-spinner fa-spin"></i> Study Dost is thinking…', true);

    const activeIdx = activePlan ? getCurrentActiveDayIndex(activePlan) : 0;
    const currentDay = activePlan ? activePlan.days[activeIdx] : null;
    const studentGoal = activePlan?.goal || 'General Studies';
    const dayContext = currentDay ? `Current Day ${currentDay.day}: "${currentDay.title}". Topics: ${(currentDay.topics || []).join(', ')}.` : '';

    const promptPayload = {
      question: `You are Study Dost, an expert and patient Indian study mentor for all subjects and exams including NEET (Biology, Physics, Chemistry), JEE, UPSC CSE, State PCS, School Boards, and Coding.
Student's study target: "${studentGoal}".
${dayContext}
Student's question or doubt: "${query}".

CRITICAL INSTRUCTIONS:
- Answer the student's SPECIFIC question accurately according to their subject (${studentGoal}). If they ask about Biology, cell biology, genetics, human physiology, photosynthesis, etc., answer STRICTLY about Biology and medical concepts — NEVER mention Python, coding, or programming unless they explicitly asked about code!
- Explain concepts simply with NCERT/Standard Indian syllabus references, mnemonic tips, diagrams/steps where relevant, and real-life examples.
- Keep the tone warm, motivating, and mentor-like ("Beta", "Dost", or friendly encouraging tone).
- Provide structured point-by-point explanations.`,
      subject: studentGoal,
      mode: "study-buddy"
    };

    let reply = "";
    try {
      const res = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptPayload)
      });
      if (res.ok) {
        const data = await res.json();
        reply = data.answer || data.response || data.text;
      }
    } catch (err) {
      console.warn('AI proxy error in chat:', err);
    }

    // Dynamic smart fallback matching student's actual subject/doubt
    if (!reply) {
      const isBio = /bio|cell|gene|dna|plant|zoology|botany|neet|human|organ|heart|blood|respirat|photosynth/i.test(query) || /bio/i.test(studentGoal);
      const isUPSC = /upsc|polity|article|constitution|history|geography|economy|prelims|mains/i.test(query) || /upsc|pcs|civil/i.test(studentGoal);
      const isPhysicsOrMath = /physics|math|force|gravity|velocity|integral|calculus|equation/i.test(query);

      if (isBio) {
        reply = `Great question on **${escapeHtml(query)}**! 🩺\n\nHere is how to master this for your exams:\n1. **Core NCERT Concept**: Focus on the NCERT definition, labeled diagrams, and scientific terminology.\n2. **High-Yield Revision**: Write down key pathways, functions, and exceptions in a 1-page summary chart.\n3. **PYQ Practice**: Solve 10-15 previous years NEET/Board MCQs on this specific topic right away.\n\nKeep going! You have **${currentDay?.estimatedTime || '60 min'}** allocated for today. Break it down step-by-step! 🌿💪`;
      } else if (isUPSC) {
        reply = `Excellent doubt regarding **${escapeHtml(query)}**! 🏛️\n\nFor UPSC / Civil Services preparation:\n1. **Conceptual Clarity**: Connect this topic with the relevant Constitutional Articles, statutory provisions, or historical context.\n2. **Mains Dimension**: Identify the 'Why', 'How', and contemporary challenges or committee recommendations.\n3. **Prelims Focus**: Note specific key terms, constitutional amendments, and factual chronologies.\n\nDedicate **${currentDay?.estimatedTime || '60 min'}** to deep reading and making concise bullet notes today! 🇮🇳`;
      } else if (isPhysicsOrMath) {
        reply = `Solid question on **${escapeHtml(query)}**! ⚛️\n\nFormula & Application Strategy:\n1. **Fundamental Law**: State the governing law/formula and standard SI units.\n2. **Free Body Diagram / Graph**: Visualize the problem with a clean sketch before substituting numbers.\n3. **Dimensional Analysis**: Check units to avoid common negative marking traps.\n\nPractice 5 standard numericals from your sheet today! You got this! 📐⚡`;
      } else {
        reply = `Great question about **${escapeHtml(query)}**! 💡\n\nHere is the best way to master it for your ${studentGoal} roadmap:\n1. **Break it down**: Understand the fundamental principle first before moving to complex edge cases.\n2. **Active Recall**: Write down what you learned in your own words without peeking.\n3. **Solve Questions**: Apply the concept immediately to test your comprehension.\n\nYou have **${currentDay?.estimatedTime || '60 min'}** scheduled for today. Take it step-by-step and keep the streak alive! 🔥`;
      }
    }

    // Replace typing message
    const typingEl = document.getElementById(typingId);
    if (typingEl) {
      typingEl.querySelector('.sc-bubble').innerHTML = formatReply(reply);
    }
  }

  function formatReply(text) {
    let out = escapeHtml(text);
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 5px;border-radius:4px;font-family:var(--font-mono);">$1</code>');
    out = out.replace(/\n/g, '<br>');
    return out;
  }

  function appendChatMessage(sender, html, isTemp = false) {
    if (!chatMessages) return '';
    const id = 'msg_' + Math.random().toString(36).substring(2, 8);
    const div = document.createElement('div');
    div.id = id;
    div.className = `sc-msg ${sender}`;
    div.innerHTML = `<div class="sc-bubble">${html}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
  }

  $('studyChatForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSendMessage(chatInput?.value);
  });

  // ─────────────── 12. STORAGE & FIRESTORE SYNC ───────────────
  function loadPlansFromStorage() {
    try {
      const raw = localStorage.getItem(CONFIG.PLANS_KEY);
      if (raw) allPlans = JSON.parse(raw);
    } catch (e) {}
    return allPlans;
  }

  function saveActivePlanToStorage(plan) {
    if (!plan) return;
    loadPlansFromStorage();
    const idx = allPlans.findIndex(p => p.id === plan.id);
    if (idx !== -1) allPlans[idx] = plan;
    else allPlans.unshift(plan);

    // Keep last 6 plans
    allPlans = allPlans.slice(0, 6);
    localStorage.setItem(CONFIG.PLANS_KEY, JSON.stringify(allPlans));
    localStorage.setItem(CONFIG.ACTIVE_PLAN_ID_KEY, plan.id);
    renderPlansDrawer(allPlans);
  }

  async function savePlanToFirestore(plan) {
    if (!db || !plan) return;
    const uid = getEffectiveUid();
    try {
      await db.collection('users').doc(uid).collection('studyPlans').doc(plan.id).set({
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        goal: plan.goal,
        level: plan.level,
        hoursPerDay: plan.hoursPerDay,
        deadline: plan.deadline,
        totalDays: plan.totalDays,
        completedDays: plan.completedDays,
        streak: plan.streak || 0,
        days: plan.days
      });
    } catch (err) {
      console.warn('Firestore save note:', err.message);
    }
  }

  // Plans History Drawer
  function renderPlansDrawer(plans) {
    const list = $('plansList');
    const badge = $('plansBadge');
    if (!list) return;

    if (badge) {
      badge.textContent = plans.length;
      badge.style.display = plans.length > 0 ? 'inline-block' : 'none';
    }

    if (!plans.length) {
      list.innerHTML = `
        <div class="history-empty-state">
          <i class="fa-solid fa-graduation-cap"></i>
          <h4>No plans yet</h4>
          <p>Create your first study roadmap to begin tracking.</p>
        </div>`;
      return;
    }

    list.innerHTML = plans.map(p => {
      const isActive = activePlan && activePlan.id === p.id;
      const pct = p.totalDays ? Math.round((p.completedDays / p.totalDays) * 100) : 0;
      return `
        <div class="history-item-card ${isActive ? 'active-plan' : ''}" data-plan-id="${p.id}" style="${isActive ? 'border-color:var(--gold-primary);background:var(--gold-soft);' : ''}">
          <button class="hic-del-btn" data-del-plan="${p.id}" title="Remove"><i class="fa-solid fa-trash-can"></i></button>
          <div class="hic-header">
            <span class="hic-title">${escapeHtml(p.goal)}</span>
            <span class="hic-time">${pct}% Done</span>
          </div>
          <div class="hic-summary">${p.completedDays} / ${p.totalDays} Days · Streak: ${p.streak || 0} 🔥</div>
          <div class="hic-tags">
            <span class="hic-tag">${escapeHtml(p.level)}</span>
            <span class="hic-tag">${escapeHtml(p.hoursPerDay)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  $('plansHistoryBtn')?.addEventListener('click', () => {
    $('plansDrawer')?.classList.add('open');
    $('plansDrawerOverlay')?.classList.add('open');
  });

  const closePlansDrawer = () => {
    $('plansDrawer')?.classList.remove('open');
    $('plansDrawerOverlay')?.classList.remove('open');
  };

  $('closePlansDrawerBtn')?.addEventListener('click', closePlansDrawer);
  $('plansDrawerOverlay')?.addEventListener('click', closePlansDrawer);

  $('plansList')?.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.hic-del-plan');
    if (delBtn) {
      e.stopPropagation();
      const planId = delBtn.dataset.delPlan;
      allPlans = allPlans.filter(p => p.id !== planId);
      localStorage.setItem(CONFIG.PLANS_KEY, JSON.stringify(allPlans));
      renderPlansDrawer(allPlans);
      toast('info', 'Plan removed from history');
      return;
    }

    const card = e.target.closest('.history-item-card');
    if (!card) return;
    const planId = card.dataset.planId;
    const target = allPlans.find(p => p.id === planId);
    if (target) {
      activePlan = target;
      localStorage.setItem(CONFIG.ACTIVE_PLAN_ID_KEY, planId);
      renderPlanDashboard(activePlan);
      showScreen('plan');
      closePlansDrawer();
      toast('success', `Switched to: ${target.goal}`);
    }
  });

  // Back / Setup Navigation Button
  $('backToSetupBtn')?.addEventListener('click', () => {
    showScreen('setup');
  });

  $('genScreenBackBtn')?.addEventListener('click', () => {
    showScreen('setup');
    toast('info', 'Returned to Goal Setup');
  });

  // Restart / New Plan Button
  $('restartPlanBtn')?.addEventListener('click', () => {
    if (confirm('Create a new study plan? Your current progress will remain saved in My Plans.')) {
      showScreen('setup');
    }
  });

  // ─────────────── 13. PDF EXPORT (jsPDF) ───────────────
  $('exportPdfBtn')?.addEventListener('click', () => {
    if (!activePlan) return;
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      toast('error', 'PDF generator not loaded', 'Please refresh page');
      return;
    }

    toast('info', 'Generating Study Plan PDF…');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - (margin * 2);

      let y = 18;

      function checkBreak(needed = 20) {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = 18;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`The Chairman Show — ${activePlan.goal} Study Plan`, margin, 10);
          doc.line(margin, 12, pageWidth - margin, 12);
        }
      }

      // Title Banner
      doc.setFillColor(16, 16, 21);
      doc.rect(margin, y, contentWidth, 24, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(212, 175, 55);
      doc.text("THE CHAIRMAN SHOW — AI STUDY DOST", margin + 6, y + 9);
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`${activePlan.goal.toUpperCase()} · ${activePlan.totalDays}-DAY ROADMAP`, margin + 6, y + 17);

      y += 30;

      // Meta Box
      doc.setFillColor(245, 245, 248);
      doc.rect(margin, y, contentWidth, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`Level: ${activePlan.level}`, margin + 4, y + 6);
      doc.text(`Time: ${activePlan.hoursPerDay}`, margin + 55, y + 6);
      doc.text(`Completed: ${activePlan.completedDays} / ${activePlan.totalDays} Days`, margin + 110, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Streak: ${activePlan.streak || 0} Days`, margin + 4, y + 12);
      doc.text(`Date Created: ${new Date(activePlan.createdAt).toLocaleDateString('en-IN')}`, margin + 55, y + 12);

      y += 24;

      // Days list
      activePlan.days.forEach(d => {
        checkBreak(18);
        doc.setFillColor(d.completed ? 240 : 255, d.completed ? 250 : 255, d.completed ? 240 : 255);
        doc.setDrawColor(210, 210, 210);
        doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

        // Checkbox square
        doc.rect(margin + 3, y + 3.5, 4, 4, d.completed ? 'FD' : 'S');
        if (d.completed) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(16, 185, 129);
          doc.text('✓', margin + 3.8, y + 6.6);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(20, 20, 20);
        doc.text(`Day ${d.day}: ${d.title}`, margin + 10, y + 6.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(90, 90, 90);
        const topSummary = (d.topics || []).slice(0, 3).join(' · ');
        doc.text(topSummary.substring(0, 85), margin + 10, y + 11);

        y += 16;
      });

      const totalPgs = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPgs; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 140);
        doc.text(`The Chairman Show · AI Study Dost · Page ${i} of ${totalPgs}`, margin, pageHeight - 8);
      }

      const fileName = `Study_Plan_${activePlan.goal.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
      toast('success', 'PDF Exported!', fileName);
    } catch (err) {
      console.error('PDF error:', err);
      toast('error', 'PDF Export Failed', err.message);
    }
  });

  // ─────────────── 14. BROWSER NOTIFICATION REMINDER ───────────────
  $('dailyReminderBtn')?.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      toast('warn', 'Notifications unsupported', 'Your browser does not support web notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      toast('success', 'Reminder Active!', 'Study Dost will remind you daily at your scheduled hour.');
      localStorage.setItem(CONFIG.REMINDER_KEY, '1');
      updateReminderButtonUI(true);
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification("👑 The Chairman Show — Study Dost", {
          body: "Awesome! Daily reminders enabled. Your streak will stay strong!",
          icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230a0a0f'/%3E%3Ctext x='50' y='68' font-size='58' font-family='monospace' font-weight='900' fill='%23D4AF37' text-anchor='middle'%3ECS%3C/text%3E%3C/svg%3E"
        });
        localStorage.setItem(CONFIG.REMINDER_KEY, '1');
        updateReminderButtonUI(true);
        toast('success', 'Reminders Enabled!', 'Daily notifications are set');
      } else {
        toast('warn', 'Notifications Blocked', 'Please enable browser notification permissions in your address bar');
      }
    }
  });

  function updateReminderButtonUI(enabled) {
    const btn = $('dailyReminderBtn');
    const label = $('reminderBtnText');
    if (!btn) return;
    if (enabled) {
      btn.style.borderColor = 'var(--gold-primary)';
      btn.style.color = 'var(--gold-primary)';
      if (label) label.textContent = 'Active 🔔';
    } else {
      btn.style.borderColor = '';
      btn.style.color = '';
      if (label) label.textContent = 'Reminder';
    }
  }

  // ─────────────── 15. FORM SUBMISSION ───────────────
  $('studyGoalForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    let goal = goalSelect?.value;
    if (goal === 'Custom') {
      goal = customGoalInput?.value.trim() || 'Custom Technology Focus';
    }

    const level = document.querySelector('input[name="studentLevel"]:checked')?.value || 'Absolute Beginner';
    const sliderVal = timeSlider?.value || '2';
    const hoursPerDay = timeLabels[sliderVal] || '1 Hour / Day';
    const deadline = deadlineSelect?.value || '1 month';
    const customDate = customDatePicker?.value || '';
    const styles = getSelectedStyles();

    const formData = {
      goal,
      level,
      hoursPerDay,
      deadline,
      customDate,
      styles: styles.length ? styles : ['Videos', 'Practice']
    };

    generateStudyPlan(formData);
  });

  // ─────────────── 15B. DAILY MOTIVATIONAL QUOTE (AI-GENERATED & CACHED) ───────────────
  async function loadDailyMotivationalQuote(goal) {
    const todayKey = 'tcs_study_quote_' + new Date().toDateString();
    const cached = localStorage.getItem(todayKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if ($('dailyQuoteText')) $('dailyQuoteText').textContent = `"${parsed.text}"`;
        if ($('dailyQuoteAuthor')) $('dailyQuoteAuthor').textContent = parsed.author ? `— ${parsed.author}` : `— Chairman's Study Dost`;
        return;
      } catch (e) {}
    }

    const fallbackQuotes = [
      { text: "Consistency is what transforms average into excellence. 1 hour today beats 10 hours next weekend.", author: "Chairman's Study Dost" },
      { text: "Every master programmer was once an absolute beginner who refused to quit when an error popped up.", author: "Chairman's Tech Wisdom" },
      { text: "Don't break the chain. Even on tough days, 20 minutes keeps your neuron pathways fired up.", author: "Study Dost Daily Push" },
      { text: "Code isn't just about syntax; it's about solving real problems for real people. Keep building!", author: "The Chairman Show" },
      { text: "Small daily milestones accumulate into jaw-dropping engineering skills over 30 days.", author: "Study Dost Mentor" }
    ];

    let chosen = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];

    // Try fetching a fresh one from AI Proxy
    try {
      const res = await fetch(CONFIG.AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Generate 1 short, highly energizing motivational quote for an Indian student learning ${goal || 'Python and DSA'}. Maximum 18 words.`,
          subject: "Motivational Quote",
          mode: "study-buddy"
        })
      });
      if (res.ok) {
        const data = await res.json();
        const quoteText = (data.answer || data.response || data.text || '').replace(/^["']|["']$/g, '').trim();
        if (quoteText && quoteText.length > 10 && quoteText.length < 150) {
          chosen = { text: quoteText, author: "Chairman's AI Study Dost" };
        }
      }
    } catch (e) {}

    localStorage.setItem(todayKey, JSON.stringify(chosen));
    if ($('dailyQuoteText')) $('dailyQuoteText').textContent = `"${chosen.text}"`;
    if ($('dailyQuoteAuthor')) $('dailyQuoteAuthor').textContent = `— ${chosen.author}`;
  }

  // ─────────────── 15C. WEEKLY SUMMARY EMAIL (SENDGRID / FIRESTORE) ───────────────
  function initWeeklySummaryEmail() {
    const modal = $('weeklyEmailModal');
    const openBtn = $('weeklyEmailBtn');
    const closeBtn = $('closeWeeklyEmailModalBtn');
    const cancelBtn = $('cancelWeeklyEmailBtn');
    const form = $('weeklyEmailForm');
    const emailInput = $('weEmailInput');
    const autoCheck = $('weAutoSundayCheck');

    function updatePreview() {
      if (!activePlan) return;
      const pct = activePlan.totalDays ? Math.round((activePlan.completedDays / activePlan.totalDays) * 100) : 0;
      if ($('weGoalTitle')) $('weGoalTitle').textContent = `${activePlan.goal} (${activePlan.level})`;
      if ($('weStreakBadge')) $('weStreakBadge').textContent = `🔥 ${activePlan.streak || 0} Day Streak`;
      if ($('weStatsLine')) $('weStatsLine').textContent = `Milestones Completed: ${activePlan.completedDays} / ${activePlan.totalDays} Days (${pct}%)`;

      const activeIdx = getCurrentActiveDayIndex(activePlan);
      const upcoming = activePlan.days.slice(activeIdx, activeIdx + 3).map(d => `Day ${d.day}: ${d.title}`).join(' · ');
      if ($('weUpcomingList')) {
        $('weUpcomingList').textContent = upcoming ? `Next Milestones: ${upcoming}` : 'All active milestones completed! 🎉';
      }

      // Pre-fill email
      const savedEmail = localStorage.getItem('tcs_study_email') || (currentUser && currentUser.email) || '';
      if (emailInput && savedEmail) emailInput.value = savedEmail;
    }

    openBtn?.addEventListener('click', () => {
      updatePreview();
      modal?.classList.add('show');
    });

    const closeModal = () => modal?.classList.remove('show');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput?.value.trim();
      if (!email) return;

      localStorage.setItem('tcs_study_email', email);
      const autoWeekly = autoCheck ? autoCheck.checked : true;
      localStorage.setItem('tcs_study_auto_email', autoWeekly ? '1' : '0');

      // Sync preferences to Firestore
      if (db) {
        const uid = getEffectiveUid();
        try {
          await db.collection('users').doc(uid).collection('emailPreferences').doc('weeklyDigest').set({
            email: email,
            autoSundayEnabled: autoWeekly,
            lastSentAt: firebase.firestore.FieldValue.serverTimestamp(),
            planGoal: activePlan?.goal || '',
            streak: activePlan?.streak || 0,
            completedDays: activePlan?.completedDays || 0,
            totalDays: activePlan?.totalDays || 30
          }, { merge: true });
        } catch (err) {
          console.warn('Firestore email preference save note:', err.message);
        }
      }

      // Try triggering proxy endpoint / SendGrid webhook if available
      try {
        await fetch(CONFIG.AI_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'weekly-digest',
            email: email,
            plan: {
              goal: activePlan?.goal,
              streak: activePlan?.streak || 0,
              completedDays: activePlan?.completedDays || 0,
              totalDays: activePlan?.totalDays || 30
            }
          })
        });
      } catch (err) {}

      closeModal();
      toast('success', 'Digest Sent to ' + email + ' 📬', autoWeekly ? 'Weekly Sunday auto-reminders also activated!' : 'One-time summary dispatched.');
    });
  }

  // ─────────────── 16. INITIAL BOOT & AUTH SYNC ───────────────
  function init() {
    loadBadges();
    const plans = loadPlansFromStorage();
    renderPlansDrawer(plans);
    initWeeklySummaryEmail();

    const reminderEnabled = localStorage.getItem(CONFIG.REMINDER_KEY) === '1';
    updateReminderButtonUI(reminderEnabled);

    // Check if active plan exists
    const activeId = localStorage.getItem(CONFIG.ACTIVE_PLAN_ID_KEY);
    if (activeId && plans.length) {
      activePlan = plans.find(p => p.id === activeId) || plans[0];
    } else if (plans.length) {
      activePlan = plans[0];
    }

    if (activePlan) {
      renderPlanDashboard(activePlan);
      loadDailyMotivationalQuote(activePlan.goal);
      showScreen('plan');
    } else {
      loadDailyMotivationalQuote('Python Programming');
      showScreen('setup');
    }

    // Sync auth
    if (auth) {
      auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
          console.log('[Study Dost] User authenticated:', user.displayName || user.email);
        }
      });
    }
  }

  window.addEventListener('DOMContentLoaded', init);

})();
