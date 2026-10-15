import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COURSES_FILE = path.join(__dirname, 'courses-data.json');

function readCoursesFromFile() {
  try {
    if (fs.existsSync(COURSES_FILE)) {
      const data = fs.readFileSync(COURSES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Courses] Read error, resetting default:', err.message);
  }
  return [];
}

function writeCoursesToFile(courses) {
  try {
    fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Courses] Write error:', err);
    return false;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// Lazy-initialize Gemini AI
let genAI = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  if (!genAI) {
    try {
      genAI = new GoogleGenAI({ apiKey });
    } catch {
      genAI = null;
    }
  }
  return genAI;
}

// ─── CHAIRMAN SUPER REVISION API (TEXT + PPT/NOTES MULTIMODAL) ───
app.post('/api/super-revision', async (req, res) => {
  try {
    const { notesText, images = [], subject = 'General Study', detailLevel = 'comprehensive', layout = 'radial' } = req.body;

    if (!notesText && (!images || images.length === 0)) {
      return res.status(400).json({
        error: 'Please provide either text notes or upload photos of notes/PPT slides.'
      });
    }

    const ai = getGeminiClient();

    const systemInstructions = `You are "Chairman Super Revision" — an elite academic mindmap and visual revision architect for "The Chairman Show" learning platform.
Your mission is to convert messy study notes, syllabus outlines, handwritten notes photos, or an entire set of PPT lecture slides into a structured, highly aesthetic, high-yield active-recall Mindmap JSON.

Rules:
1. Identify the core overarching topic as the root node.
2. Break down the content into 3 to 6 major branches (Level 1: Themes / PPT Slide Sections).
3. Each major branch must contain 2 to 5 specific key principles, mechanisms, formulas, or concepts (Level 2).
4. Provide Level 3 sub-items for high-yield exam takeaways, memory mnemonics, pitfalls, or step-by-step points where appropriate.
5. Provide actionable exam tips, high-yield mnemonics, and key formulas.
6. Make labels concise, punchy, and clear for quick glance revision.
7. Return strictly valid JSON matching this schema without markdown fences:
{
  "title": "Topic Title (e.g. Molecular Basis of Inheritance)",
  "subject": "e.g. NEET Biology / Physics / Computer Science",
  "root": {
    "id": "root",
    "label": "Central Topic Label",
    "icon": "🧠",
    "tag": "CORE THEME",
    "color": "#D4AF37",
    "summary": "1-2 sentence big-picture concept overview",
    "children": [
      {
        "id": "node-1",
        "label": "Major Slide / Theme 1",
        "icon": "⚡",
        "tag": "THEME 1",
        "color": "#9333ea",
        "summary": "Key takeaway",
        "examTip": "Common exam trap or high-yield point",
        "mnemonic": "Memory trick if applicable",
        "formula": "Key formula if applicable",
        "children": [
          {
            "id": "node-1-1",
            "label": "Sub-concept / Core Mechanism",
            "icon": "📌",
            "tag": "KEY POINT",
            "color": "#06b6d4",
            "summary": "Essential explanation",
            "examTip": "Exam tip",
            "formula": "Formula",
            "mnemonic": "Mnemonic",
            "children": []
          }
        ]
      }
    ]
  },
  "quickRevisionSummary": [
    "High-yield takeaway 1...",
    "High-yield takeaway 2...",
    "High-yield takeaway 3..."
  ],
  "examMnemonics": [
    { "concept": "Concept name", "mnemonic": "ACRONYM / Memory phrase", "meaning": "How to decode it" }
  ],
  "highYieldFormulas": [
    { "name": "Law / Formula Name", "formula": "Mathematical / logical expression", "notes": "When to apply in questions" }
  ],
  "activeRecallQuestions": [
    { "question": "Active recall question to test mastery", "answer": "Crisp answer", "difficulty": "Medium" }
  ]
}`;

    const contents = [];
    let promptText = `Generate a Chairman Super Revision Mindmap.\nSubject: ${subject}\nDetail Level: ${detailLevel}\nPreferred Layout: ${layout}\n`;

    if (notesText && notesText.trim()) {
      promptText += `\nSTUDY NOTES / PPT CONTENT:\n${notesText.trim()}\n`;
    }

    if (images && images.length > 0) {
      promptText += `\nANALYZING ${images.length} UPLOADED NOTE / PPT SLIDE IMAGE(S). Please read all visible slide text, diagrams, formulas, titles, bullet points, and structures across all uploaded slides to create a unified, exhaustive revision mindmap.\n`;
      contents.push(promptText);

      // Add each image as inlineData
      for (const img of images) {
        if (img && img.base64) {
          // Remove potential data URI prefix if present
          const cleanBase64 = img.base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
          const mimeType = img.mimeType || 'image/jpeg';
          contents.push({
            inlineData: {
              mimeType,
              data: cleanBase64
            }
          });
        }
      }
    } else {
      contents.push(promptText);
    }

    let parsedData = null;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: systemInstructions,
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const responseText = response.text || '';
        try {
          parsedData = JSON.parse(responseText);
        } catch {
          const match = responseText.match(/\{[\s\S]*\}/);
          if (match) parsedData = JSON.parse(match[0]);
        }
      } catch {
        // Quiet fallback to secondary proxy or heuristic builder
      }
    }

    // 2. Fallback to Cloudflare Worker Proxy
    if (!parsedData || !parsedData.root) {
      try {
        const cfPrompt = `Generate a Chairman Super Revision Mindmap strictly in JSON format without conversational text. Subject: ${subject}. Content: ${notesText || 'Slide Revision Notes'}. Schema: { "title": "Topic", "subject": "${subject}", "root": { "id": "root", "label": "Topic", "summary": "...", "children": [ { "id": "1", "label": "Slide Theme 1", "summary": "...", "examTip": "...", "mnemonic": "...", "children": [] } ] }, "quickRevisionSummary": ["..."], "examMnemonics": [{"concept": "...", "mnemonic": "...", "meaning": "..."}], "highYieldFormulas": [], "activeRecallQuestions": [{"question": "...", "answer": "..."}] }`;
        const cfResp = await fetch('https://tcs-ai-proxy.sumitshrivas24.workers.dev/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: cfPrompt,
            subject: 'Super Revision'
          })
        });

        if (cfResp.ok) {
          const cfData = await cfResp.json();
          const raw = cfData.answer || cfData.text || cfData.response || JSON.stringify(cfData);
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            parsedData = JSON.parse(match[0]);
          }
        }
      } catch (cfErr) {
        console.warn('[Server] Cloudflare proxy worker fallback error:', cfErr.message);
      }
    }

    // 3. Fallback to resilient structured mindmap builder
    if (!parsedData || !parsedData.root) {
      const lines = (notesText || '').split('\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0] ? lines[0].replace(/^(slide\s*\d+:?|#+)\s*/i, '').slice(0, 50) : `${subject} Revision`;
      const branchThemes = [];

      lines.forEach((line, idx) => {
        if (line.match(/^(slide\s*\d+|#+|\d+\.|\bunit\b|\bchapter\b)/i) || branchThemes.length === 0) {
          const cleanLabel = line.replace(/^(slide\s*\d+:?|#+|\d+\.\s*)/i, '').slice(0, 45);
          branchThemes.push({
            id: `node-${branchThemes.length + 1}`,
            label: cleanLabel || `Core Theme ${branchThemes.length + 1}`,
            icon: idx % 2 === 0 ? "⚡" : "📌",
            tag: `THEME ${branchThemes.length + 1}`,
            color: ['#D4AF37', '#9333ea', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][branchThemes.length % 6],
            summary: `Key takeaways and principles from ${cleanLabel}.`,
            examTip: `High-yield exam concept: thoroughly memorize core definitions and diagrams.`,
            children: []
          });
        } else if (branchThemes.length > 0 && branchThemes[branchThemes.length - 1].children.length < 5) {
          const cleanSub = line.replace(/^[-*•]\s*/, '').slice(0, 55);
          if (cleanSub) {
            branchThemes[branchThemes.length - 1].children.push({
              id: `sub-${branchThemes.length}-${branchThemes[branchThemes.length - 1].children.length + 1}`,
              label: cleanSub,
              icon: "🔹",
              tag: "KEY POINT",
              color: branchThemes[branchThemes.length - 1].color,
              summary: cleanSub,
              children: []
            });
          }
        }
      });

      if (branchThemes.length === 0) {
        branchThemes.push({
          id: "node-1",
          label: "Core Principles & Overview",
          icon: "⚡",
          tag: "THEME 1",
          color: "#D4AF37",
          summary: "Primary conceptual foundation of the topic.",
          children: []
        });
      }

      parsedData = {
        title,
        subject,
        root: {
          id: "root",
          label: title,
          icon: "🧠",
          tag: "CORE TOPIC",
          color: "#D4AF37",
          summary: `Comprehensive mindmap covering all aspects of ${title}.`,
          children: branchThemes
        },
        quickRevisionSummary: lines.slice(0, 5).map(l => l.replace(/^[-*•\d.]+\s*/, '')),
        examMnemonics: [
          { concept: title, mnemonic: "FAST REVISION", meaning: "Focus, Active recall, Spaced review, Testing" }
        ],
        highYieldFormulas: [],
        activeRecallQuestions: [
          { question: `What is the main overarching principle of ${title}?`, answer: `Key concepts encompass: ${branchThemes.map(b => b.label).join(', ')}.`, difficulty: "Medium" }
        ]
      };
    }

    return res.json({
      success: true,
      mindmap: parsedData
    });

  } catch (error) {
    console.error('[Server] /api/super-revision error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate mindmap'
    });
  }
});

// ─── COURSES MANAGEMENT & LIVE SESSIONS API ───
const ENROLL_REQUESTS_FILE = path.join(__dirname, 'enrollment-requests.json');

function readEnrollRequests() {
  try {
    if (fs.existsSync(ENROLL_REQUESTS_FILE)) {
      return JSON.parse(fs.readFileSync(ENROLL_REQUESTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[EnrollRequests] Read error:', err.message);
  }
  return [];
}

function writeEnrollRequests(requests) {
  try {
    fs.writeFileSync(ENROLL_REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[EnrollRequests] Write error:', err);
    return false;
  }
}

// Get all courses
app.get('/api/courses', (req, res) => {
  const courses = readCoursesFromFile();
  res.json({ success: true, courses });
});

// Create or update a course
app.post('/api/courses', (req, res) => {
  try {
    const courseData = req.body;
    if (!courseData || !courseData.title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    let courses = readCoursesFromFile();
    const id = courseData.id || ('course-' + Date.now());

    // Normalize youtube video ID
    let ytVid = courseData.liveClass?.youtubeVideoId || '';
    const ytUrl = courseData.liveClass?.youtubeUrl || '';
    if (!ytVid && ytUrl) {
      const match = ytUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})/);
      if (match) ytVid = match[1];
    }

    const newOrUpdatedCourse = {
      id,
      title: courseData.title.trim(),
      subtitle: courseData.subtitle ? courseData.subtitle.trim() : '',
      description: courseData.description ? courseData.description.trim() : '',
      category: courseData.category || 'General',
      level: courseData.level || 'All Levels',
      instructor: courseData.instructor || 'The Chairman',
      thumbnail: courseData.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      isPaid: Boolean(courseData.isPaid),
      price: Number(courseData.price || 0),
      originalPrice: Number(courseData.originalPrice || 0),
      payment: {
        upiId: courseData.payment?.upiId || 'chairman@upi',
        razorpayLink: courseData.payment?.razorpayLink || '',
        paymentInstructions: courseData.payment?.paymentInstructions || ''
      },
      allowedStudents: Array.isArray(courseData.allowedStudents)
        ? courseData.allowedStudents.map(s => String(s).trim().toLowerCase()).filter(Boolean)
        : (courseData.isPaid ? [] : ['all']),
      features: Array.isArray(courseData.features) ? courseData.features : [
        '🔴 Live YouTube Interactive Classes',
        '🧠 Chairman Super Revision Mindmaps',
        '💬 Real-time Doubt Support',
        '📜 Certificate of Completion'
      ],
      liveClass: {
        enabled: Boolean(courseData.liveClass?.enabled),
        title: courseData.liveClass?.title || 'Live Class Session',
        youtubeUrl: ytUrl,
        youtubeVideoId: ytVid,
        startTime: courseData.liveClass?.startTime || new Date(Date.now() + 86400000).toISOString(),
        status: courseData.liveClass?.status || 'upcoming',
        durationMinutes: Number(courseData.liveClass?.durationMinutes || 90),
        agenda: courseData.liveClass?.agenda || 'Interactive lecture & live doubt solving'
      },
      modules: Array.isArray(courseData.modules) ? courseData.modules : [],
      enrolledCount: Number(courseData.enrolledCount || 1),
      rating: Number(courseData.rating || 4.9),
      updatedAt: new Date().toISOString(),
      createdAt: courseData.createdAt || new Date().toISOString()
    };

    const existingIndex = courses.findIndex(c => c.id === id);
    if (existingIndex >= 0) {
      courses[existingIndex] = { ...courses[existingIndex], ...newOrUpdatedCourse };
    } else {
      courses.unshift(newOrUpdatedCourse);
    }

    writeCoursesToFile(courses);
    res.json({ success: true, course: newOrUpdatedCourse, courses });
  } catch (err) {
    console.error('[Courses API] Error saving course:', err);
    res.status(500).json({ error: 'Failed to save course: ' + err.message });
  }
});

// Delete a course
app.delete('/api/courses/:id', (req, res) => {
  try {
    const { id } = req.params;
    let courses = readCoursesFromFile();
    const initialLen = courses.length;
    courses = courses.filter(c => c.id !== id);

    if (courses.length === initialLen) {
      return res.status(404).json({ error: 'Course not found' });
    }

    writeCoursesToFile(courses);
    res.json({ success: true, message: 'Course deleted successfully', courses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Allow a student for a paid course
app.post('/api/courses/:id/allow-student', (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let courses = readCoursesFromFile();
    const course = courses.find(c => c.id === id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const normalized = email.trim().toLowerCase();
    if (!course.allowedStudents) course.allowedStudents = [];
    if (!course.allowedStudents.includes(normalized)) {
      course.allowedStudents.push(normalized);
      writeCoursesToFile(courses);
    }

    res.json({ success: true, allowedStudents: course.allowedStudents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to allow student' });
  }
});

// Submit enrollment / payment proof request
app.post('/api/courses/:id/enroll-request', (req, res) => {
  try {
    const { id } = req.params;
    const { studentEmail, studentName, paymentMethod, paymentRef, note } = req.body;

    if (!studentEmail) return res.status(400).json({ error: 'Student email is required' });

    const courses = readCoursesFromFile();
    const course = courses.find(c => c.id === id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const requests = readEnrollRequests();
    const newRequest = {
      id: 'req-' + Date.now(),
      courseId: id,
      courseTitle: course.title,
      price: course.price,
      studentEmail: studentEmail.trim().toLowerCase(),
      studentName: studentName || 'Student',
      paymentMethod: paymentMethod || 'upi',
      paymentRef: paymentRef || '',
      note: note || '',
      status: 'pending', // 'pending' | 'approved' | 'rejected'
      createdAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    writeEnrollRequests(requests);

    res.json({ success: true, request: newRequest });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit enrollment request' });
  }
});

// Admin get enrollment requests
app.get('/api/courses/enrollment-requests', (req, res) => {
  const requests = readEnrollRequests();
  res.json({ success: true, requests });
});

// Admin approve enrollment request
app.post('/api/courses/enrollment-requests/:requestId/approve', (req, res) => {
  try {
    const { requestId } = req.params;
    let requests = readEnrollRequests();
    const reqItem = requests.find(r => r.id === requestId);
    if (!reqItem) return res.status(404).json({ error: 'Request not found' });

    reqItem.status = 'approved';
    reqItem.approvedAt = new Date().toISOString();
    writeEnrollRequests(requests);

    // Also add to course allowedStudents
    let courses = readCoursesFromFile();
    const course = courses.find(c => c.id === reqItem.courseId);
    if (course) {
      if (!course.allowedStudents) course.allowedStudents = [];
      const normEmail = reqItem.studentEmail.toLowerCase();
      if (!course.allowedStudents.includes(normEmail)) {
        course.allowedStudents.push(normEmail);
        writeCoursesToFile(courses);
      }
    }

    res.json({ success: true, request: reqItem, courses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

app.get('/courses', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/career', (req, res) => {
  res.sendFile(path.join(__dirname, 'career.html'));
});

app.get('/career-counselor', (req, res) => {
  res.sendFile(path.join(__dirname, 'career.html'));
});

app.get('/study', (req, res) => {
  res.sendFile(path.join(__dirname, 'study.html'));
});

app.get('/study-dost', (req, res) => {
  res.sendFile(path.join(__dirname, 'study-dost.html'));
});

app.get('/super-revision', (req, res) => {
  res.sendFile(path.join(__dirname, 'study-dost.html'));
});

app.get('/revision', (req, res) => {
  res.sendFile(path.join(__dirname, 'study-dost.html'));
});

app.get('/mindmap', (req, res) => {
  res.sendFile(path.join(__dirname, 'study-dost.html'));
});

app.get('/mindmaps', (req, res) => {
  res.sendFile(path.join(__dirname, 'study-dost.html'));
});

app.get('/roadmap', (req, res) => {
  res.sendFile(path.join(__dirname, 'study-dost.html'));
});

app.get('/task-roadmap', (req, res) => {
  res.sendFile(path.join(__dirname, 'study-dost.html'));
});

app.get('/resume', (req, res) => {
  res.sendFile(path.join(__dirname, 'resume.html'));
});

app.get('/resume-builder', (req, res) => {
  res.sendFile(path.join(__dirname, 'resume.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[The Chairman Show] Server running on http://0.0.0.0:${PORT}`);
});
