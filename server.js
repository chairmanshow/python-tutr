import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// Lazy-initialize Gemini AI
let genAI = null;
function getGeminiClient() {
  if (!genAI) {
    try {
      genAI = new GoogleGenAI();
    } catch (err) {
      console.warn('[Server] GoogleGenAI init notice:', err.message);
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
    if (!ai) {
      throw new Error('Gemini API client unavailable.');
    }

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
      } catch (parseErr) {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) parsedData = JSON.parse(match[0]);
      }
    } catch (geminiErr) {
      console.warn('[Server] Gemini API failed, switching to AI proxy worker fallback:', geminiErr.message);
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
