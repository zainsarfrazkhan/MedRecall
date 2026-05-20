import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it in your AI Studio Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Spaced Repetition Flashcard Builder Endpoint (AI Active Recall)
app.post("/api/gemini/generate-spaced-flashcards", async (req, res) => {
  try {
    const { topic, difficulty, targetAudience } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required to generate flashcards." });
    }

    const ai = getGeminiClient();

    const prompt = `Generate a set of 5 highly effective medical/dental study flashcards for active recall on the following topic:
- Study Topic: "${topic}"
- High-recall Focus Level: "${difficulty || "Intermediate"}"
- Target Audience: "${targetAudience || "Medical & BDS (Dental) Students"}"

Ensure each card splits complex concepts into small, digestable chunks to maximize retention and prevent cognitive overload.
Format the output strictly as a JSON array matching the specified schema. Keep the questions direct and answer short but highly informative.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Medical Education director specializing in spaced repetition and cognitive retrieval sciences. Create active-recall flashcarcs that break down complex anatomy, physiology, dental materials, pathways, or clinical diagnoses.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "A high-retention question for active recall." },
              answer: { type: Type.STRING, description: "Direct, concise answer or fact to confirm." },
              hint: { type: Type.STRING, description: "A helpful contextual clue for when the student is struggling." },
              explanation: { type: Type.STRING, description: "Detailed clinical explanation or reasoning supporting this fact." }
            },
            required: ["question", "answer", "hint", "explanation"]
          }
        }
      }
    });

    const parsedCards = JSON.parse(response.text || "[]");
    res.json({ cards: parsedCards });
  } catch (error: any) {
    console.error("Gemini flashcard generator error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the flashcard generator AI." });
  }
});

// 2. AI Mnemonic & Memory Palace Generator Endpoint
app.post("/api/gemini/generate-mnemonics", async (req, res) => {
  try {
    const { listToRemember, context } = req.body;
    if (!listToRemember) {
      return res.status(400).json({ error: "The list or concepts to remember is required." });
    }

    const ai = getGeminiClient();

    const prompt = `Create a high-retention verbal mnemonic and spatial story (Memory Palace) to help clinical medical or dental students memorize this set of concepts:
- List of facts to remember: "${listToRemember}"
- Clinical Context: "${context || "General Medical/Dental Licensing Prep"}"

Structure your response strictly as a JSON object matching the schema provided. Generate:
1. A highly catchy mnemonic phrase (acronym or memory hook).
2. A mapping showing exactly how each letter or anchor represents a concept.
3. A descriptive, sensory-rich 'Memory Palace' scene (e.g. visualizing a dental clinic or hospital ward room with stations) to cement the memory spatially.
4. Two key high-yield 'clinical pearls' derived from this list.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the world's best medical cognitive strategist and textbook coach. You create unforgettable, amusing, highly sensory and clinically sound memory mnemonics.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phrase: { type: Type.STRING, description: "The overarching acronym or phrase. e.g., 'To Zanzibar By Motor Car' for facial nerve branches." },
            mapping: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  letter: { type: Type.STRING, description: "The letter or word anchor from the mnemonic phrase." },
                  concept: { type: Type.STRING, description: "The medical/dental concept or anatomical structure mapped." },
                  detail: { type: Type.STRING, description: "A quick explanation or clinical tip about this concept." }
                },
                required: ["letter", "concept", "detail"]
              }
            },
            memoryPalace: { type: Type.STRING, description: "A highly visual, step-by-step room walk and spatial story mapping these items to landmarks in a familiar room." },
            clinicalPearls: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Two clinical pearls or exam tips relating to these concepts."
            }
          },
          required: ["phrase", "mapping", "memoryPalace", "clinicalPearls"]
        }
      }
    });

    const parsedMnemonic = JSON.parse(response.text || "{}");
    res.json({ mnemonic: parsedMnemonic });
  } catch (error: any) {
    console.error("Gemini mnemonic generator error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the mnemonic advisor AI." });
  }
});

// 3. BDS Research Idea Evaluation Endpoint
app.post("/api/gemini/evaluate-project-idea", async (req, res) => {
  try {
    const { title, specialty, description, studyType } = req.body;
    if (!title || !specialty) {
      return res.status(400).json({ error: "Title and Specialty are required." });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert academic research adviser for dental / medical students in their final year.
Evaluate the following research project proposal details:
- Project Title: "${title}"
- Specialty: "${specialty}" (e.g. Endodontics, Oral Surgery, Orthodontics, Pathology)
- Methodology/Description: "${description || "None provided"}"
- Proposed Study Class: "${studyType || "Undergraduate level"}"

Provide a structured, detailed clinical and academic critique designed for clinical dental students. Format the response strictly using markdown with clean headings:

# Academic Critique and Feasibility
- Highlight overall clinical value, innovation, and whether it represents appropriate student-level research.
- Advise on potential ethical or human clinical research clearance concerns (especially relevant for in vivo human tissue work, patient questionnaires, plaque scores, or saliva collection).

# Refined Methodology Suggestions
- Clarify whether this should be: In Vivo (patient trials/surveys), In Vitro (lab study, e.g., testing dental materials on extracted natural teeth), or a Questionnaire-based survey.
- Recommend realistic sample sizes.
- Specify clinical procedures, indices (e.g., DMFT, Plaque Index, Gingival Index), or laboratory equipment (e.g., Universal Testing Machine, Stereomicroscope, Scanning Electron Microscope) to use.

# Expected Statistical Tools
- Recommend standard statistical tests suitable for this data (e.g., Chi-square, Student's t-test, ANOVA) and tools like SPSS, Excel or GraphPad Prism.

# Recommended Standard PubMed Search Queries & References
- Suggest exactly three specific keyword search patterns or Boolean operators (e.g., "Endodontic sealer AND microleakage AND bovine teeth") that the student can copy-paste straight into PubMed to gather robust references.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a senior BDS Academic Dean and Expert Dental Researcher. Give inspiring, helpful, practical, and highly scientifically accurate dental project reviews without clinical fluff.",
      }
    });

    res.json({ output: response.text });
  } catch (error: any) {
    console.error("Gemini project-idea evaluation error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the dental advisor AI engine." });
  }
});

// 4. Clinical Case Report assistant
app.post("/api/gemini/outline-case-report", async (req, res) => {
  try {
    const { chiefComplaint, findings, specialty } = req.body;
    if (!chiefComplaint) {
      return res.status(400).json({ error: "Chief complaint is required." });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert clinical instructor. A medical/dental final year student needs to draft a clinical case report for clinical logbooks/grading based on these initial inputs:
- Specialty: "${specialty || "General Dentistry"}"
- Chief Complaint: "${chiefComplaint}"
- Clinical and/or Radiographic findings: "${findings || "To be entered"}"

Please provide a highly professional, clinical-grade outline and draft for this Case Report. Format the response strictly using markdown. Include the following sections with headings:
- **1. Patient Demographics & Presenting Complaint**: Detailed structure of presenting history (HPI, PMH, Dental history).
- **2. Recommended Clinical Examinations**: Clinical assessment plan (e.g., percussion test, vitality testing, periodontal probing depths, soft tissue inspection, general physical assessment).
- **3. Radiographic & Diagnostic Aids**: List specific recommended examinations (IOPA, Bitewing, OPG, CBCT, MRI, Chest X-rays) what landmarks to look for.
- **4. Differential & Definitive Diagnosis**: Based on the clinical details, suggest likely diagnoses.
- **5. Step-by-Step Clinical Treatment Protocol**: Comprehensive sequence of visits.
- **6. Direct Student Teaching Pearls**: Key theoretical concepts or viva-voce questions that examiners will ask.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Clinical Director with decades of hospital and academic tutoring experience. Ensure terminology is professional and correct.",
      }
    });

    res.json({ output: response.text });
  } catch (error: any) {
    console.error("Gemini case-report outline error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the case outline advisor." });
  }
});

// 5. General Dental/Medical Advisor Chat Support
app.post("/api/gemini/dental-advisor-chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGeminiClient();

    // Map the array format [{ sender: 'user' | 'assistant', text: string }] to role-based format
    const promptHistory = messages.map(m => {
      const role = m.sender === "user" ? "user" : "model";
      return `${role === "user" ? "Medical/Dental Student" : "Senior Mentor"}: ${m.text}`;
    }).join("\n");

    const fullPrompt = `${promptHistory}\nSenior Mentor:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
      config: {
        systemInstruction: "You are 'MedRecall Senior Academic Mentor'. You answer questions from Final Year Medicine & Dental (BDS) students preparing for their final MBBS/BDS theory examinations, clinical practical exams, OSPE/OSCE, and clinical case presentations. Cover clinical procedures, protocols, standard textbook references (e.g., Davidson's Medicine, Bailey & Love Surgery, Malamed Local Anesthesia, Shafer's Oral Pathology), drug dosages, material properties, and diagnostics. Always format with professional, clear hierarchy.",
      }
    });

    res.json({ output: response.text });
  } catch (error: any) {
    console.error("Gemini bds-advisor chat error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the advisor chat engine." });
  }
});

// Serve static assets and frontend rendering
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MedRecall Server running on port ${PORT}`);
  });
}

startServer();
