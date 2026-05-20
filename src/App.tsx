import React, { useState, useEffect } from "react";
import { 
  Brain, 
  Sparkles, 
  Clock, 
  ClipboardList, 
  GraduationCap, 
  Plus, 
  Search, 
  BookOpen, 
  CheckSquare, 
  Bookmark, 
  Activity, 
  FileText, 
  ChevronRight, 
  Check, 
  RotateCcw, 
  HelpCircle, 
  Lightbulb, 
  Download, 
  AlertCircle, 
  Layers, 
  ChevronDown, 
  Trash2,
  ListFilter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  SEED_FLASHCARDS, 
  SEED_MNEMONICS, 
  SEED_DEPARTMENT_QUOTAS, 
  SEED_RESEARCH_PROJECTS, 
  SEED_REFERENCE_DOCS 
} from "./bdsData";
import { 
  Flashcard, 
  SavedMnemonic, 
  DepartmentQuota, 
  ResearchProject, 
  ReferenceDOC 
} from "./types";

export default function App() {
  // --- Persistent Storage Setup ---
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    const local = localStorage.getItem("medrecall_flashcards");
    return local ? JSON.parse(local) : SEED_FLASHCARDS;
  });

  const [mnemonics, setMnemonics] = useState<SavedMnemonic[]>(() => {
    const local = localStorage.getItem("medrecall_mnemonics");
    return local ? JSON.parse(local) : SEED_MNEMONICS;
  });

  const [quotas, setQuotas] = useState<DepartmentQuota[]>(() => {
    const local = localStorage.getItem("medrecall_quotas");
    return local ? JSON.parse(local) : SEED_DEPARTMENT_QUOTAS;
  });

  const [projects, setProjects] = useState<ResearchProject[]>(() => {
    const local = localStorage.getItem("medrecall_projects");
    return local ? JSON.parse(local) : SEED_RESEARCH_PROJECTS;
  });

  const [savedDocs] = useState<ReferenceDOC[]>(SEED_REFERENCE_DOCS);

  // Sync to state
  useEffect(() => {
    localStorage.setItem("medrecall_flashcards", JSON.stringify(flashcards));
  }, [flashcards]);

  useEffect(() => {
    localStorage.setItem("medrecall_mnemonics", JSON.stringify(mnemonics));
  }, [mnemonics]);

  useEffect(() => {
    localStorage.setItem("medrecall_quotas", JSON.stringify(quotas));
  }, [quotas]);

  useEffect(() => {
    localStorage.setItem("medrecall_projects", JSON.stringify(projects));
  }, [projects]);

  // --- App Shell Navigation State ---
  const [activeTab, setActiveTab] = useState<"spaced" | "mnemonic" | "project" | "quota" | "docs">("spaced");

  // --- Dynamic Search Filters ---
  const [flashcardCategory, setFlashcardCategory] = useState<string>("All");
  const [flashcardSearch, setFlashcardSearch] = useState<string>("All Categories");
  const [showOnlyReviewToday, setShowOnlyReviewToday] = useState<boolean>(false);

  // --- Active Recall Review Walk State ---
  const [activeReviewIndex, setActiveReviewIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [showReviewHint, setShowReviewHint] = useState<boolean>(false);

  // --- PWA Installation Support Trigger ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalledStandalone, setIsInstalledStandalone] = useState<boolean>(false);

  useEffect(() => {
    // Check if running inside PWA standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalledStandalone(true);
    }
    
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const triggerPWAInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // --- Flashcards Logic & SM-2 Scheduler ---
  const handleReviewFeedback = (cardId: string, rating: 1 | 2 | 3 | 5) => {
    // rating map: 1 is forgot/reset, 2 is hard, 3 is medium/good, 5 is easy
    setFlashcards(prev => prev.map(card => {
      if (card.id !== cardId) return card;

      let nextRepetitions = card.repetitions;
      let nextInterval = card.interval;
      let nextEaseFactor = card.easeFactor;

      if (rating === 1) {
        nextRepetitions = 0;
        nextInterval = 1;
        nextEaseFactor = Math.max(1.3, card.easeFactor - 0.2);
      } else {
        nextRepetitions += 1;
        if (nextRepetitions === 1) {
          nextInterval = 1;
        } else if (nextRepetitions === 2) {
          nextInterval = 3;
        } else {
          nextInterval = Math.round(card.interval * card.easeFactor);
          if (rating === 2) {
            nextInterval = Math.max(1, Math.round(nextInterval * 0.7)); // penalize interval
          } else if (rating === 5) {
            nextInterval = Math.round(nextInterval * 1.2); // reward interval
          }
        }
        
        // EF calculation derivative
        nextEaseFactor = card.easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
        nextEaseFactor = Math.max(1.3, nextEaseFactor);
      }

      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() + nextInterval);

      return {
        ...card,
        repetitions: nextRepetitions,
        interval: nextInterval,
        easeFactor: Number(nextEaseFactor.toFixed(2)),
        nextReviewDate: reviewDate.toISOString()
      };
    }));

    // Transition state
    setIsCardFlipped(false);
    setShowReviewHint(false);
    setActiveReviewIndex(prev => prev + 1);
  };

  // Filter flashcards for reviews or catalog
  const filteredFlashcards = flashcards.filter(card => {
    const now = new Date();
    const matchesCategory = flashcardCategory === "All" || card.category === flashcardCategory;
    
    if (showOnlyReviewToday) {
      const reviewDate = new Date(card.nextReviewDate);
      return matchesCategory && reviewDate <= now;
    }
    return matchesCategory;
  });

  // Calculate review queue remaining
  const currentReviewsNeeded = flashcards.filter(c => new Date(c.nextReviewDate) <= new Date()).length;

  // --- Flashcard Generator AI Setup ---
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateCategory, setGenerateCategory] = useState("Internal Medicine");
  const [aiGeneratingFlashcards, setAiGeneratingFlashcards] = useState(false);
  const [generationError, setGenerationError] = useState("");

  const handleAiFlashcardGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateTopic.trim()) return;

    setAiGeneratingFlashcards(true);
    setGenerationError("");

    try {
      const response = await fetch("/api/gemini/generate-spaced-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: generateTopic,
          difficulty: "Final Year Academic",
          targetAudience: "Medical or BDS Students"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact the smart diagnostic engine. Verify server is running.");
      }

      const data = await response.json();
      if (data.cards && data.cards.length > 0) {
        const formattedNewCards: Flashcard[] = data.cards.map((card: any, idx: number) => ({
          id: `ai_fc_${Date.now()}_${idx}`,
          question: card.question,
          answer: card.answer,
          hint: card.hint,
          explanation: card.explanation,
          repetitions: 0,
          interval: 1,
          easeFactor: 2.5,
          nextReviewDate: new Date().toISOString(),
          category: generateCategory,
          userCreated: true
        }));

        setFlashcards(prev => [...formattedNewCards, ...prev]);
        setGenerateTopic("");
        alert(`Successfully generated and added ${data.cards.length} new spaced flashcards!`);
      } else {
        throw new Error("Invalid output received from the memory decompiler.");
      }
    } catch (err: any) {
      setGenerationError(err.message || "An unexpected error occurred during synthesis.");
    } finally {
      setAiGeneratingFlashcards(false);
    }
  };

  // Manual Flashcard creator form
  const [newManualQ, setNewManualQ] = useState("");
  const [newManualA, setNewManualA] = useState("");
  const [newManualHint, setNewManualHint] = useState("");
  const [newManualExplanation, setNewManualExplanation] = useState("");
  const [newManualCat, setNewManualCat] = useState("Dental Materials");
  const [showManualForm, setShowManualForm] = useState(false);

  const handleManualCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualQ.trim() || !newManualA.trim()) return;

    const newCard: Flashcard = {
      id: `man_${Date.now()}`,
      question: newManualQ,
      answer: newManualA,
      hint: newManualHint || "Recall key concepts",
      explanation: newManualExplanation || "Physiological textbook standard.",
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
      category: newManualCat,
      userCreated: true
    };

    setFlashcards(prev => [newCard, ...prev]);
    setNewManualQ("");
    setNewManualA("");
    setNewManualHint("");
    setNewManualExplanation("");
    setShowManualForm(false);
    alert("Card successfully logged inside localized memory registers.");
  };

  const deleteFlashcard = (id: string) => {
    if (confirm("Are you sure you want to remove this flashcard from review cycle?")) {
      setFlashcards(prev => prev.filter(c => c.id !== id));
      if (activeReviewIndex >= filteredFlashcards.length - 1) {
        setActiveReviewIndex(0);
      }
    }
  };

  // --- Mnemonics State & Logic ---
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [mnemonicContext, setMnemonicContext] = useState("");
  const [mnemonicGenerating, setMnemonicGenerating] = useState(false);
  const [mnemonicError, setMnemonicError] = useState("");

  const handleMnemonicGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mnemonicInput.trim()) return;

    setMnemonicGenerating(true);
    setMnemonicError("");

    try {
      const response = await fetch("/api/gemini/generate-mnemonics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listToRemember: mnemonicInput,
          context: mnemonicContext || "Anatomical/clinical sequence"
        })
      });

      if (!response.ok) {
        throw new Error("Mnemonic synthesizer reported a protocol mismatch.");
      }

      const data = await response.json();
      if (data.mnemonic && data.mnemonic.phrase) {
        const saved: SavedMnemonic = {
          id: `mnem_${Date.now()}`,
          topic: mnemonicInput,
          context: mnemonicContext || "Academic Quick Guide",
          phrase: data.mnemonic.phrase,
          mapping: data.mnemonic.mapping || [],
          memoryPalace: data.mnemonic.memoryPalace || "Visualize this in a medical room...",
          clinicalPearls: data.mnemonic.clinicalPearls || []
        };

        setMnemonics(prev => [saved, ...prev]);
        setMnemonicInput("");
        setMnemonicContext("");
        alert("Memory system synthesized and preserved successfully!");
      } else {
        throw new Error("Retrieved structural mapping was invalid.");
      }
    } catch (err: any) {
      setMnemonicError(err.message || "Failure to align cognitive memory pegs.");
    } finally {
      setMnemonicGenerating(false);
    }
  };

  const removeMnemonic = (id: string) => {
    if (confirm("Delete this mnemonic?")) {
      setMnemonics(prev => prev.filter(m => m.id !== id));
    }
  };

  // --- BDS & Medical Research Advisory Logic ---
  const [advisorMode, setAdvisorMode] = useState<"project_critique" | "case_report" | "chat">("project_critique");
  
  // Critique Form State
  const [projTitle, setProjTitle] = useState("");
  const [projSpecialty, setProjSpecialty] = useState("Conservative Dentistry & Endodontics");
  const [projStudyType, setProjStudyType] = useState<any>("In Vitro");
  const [projDesc, setProjDesc] = useState("");
  const [critiqueOutput, setCritiqueOutput] = useState("");
  const [critiqueLoading, setCritiqueLoading] = useState(false);

  const handleCritiqueRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim()) return;

    setCritiqueLoading(true);
    setCritiqueOutput("");

    try {
      const res = await fetch("/api/gemini/evaluate-project-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projTitle,
          specialty: projSpecialty,
          description: projDesc,
          studyType: projStudyType
        })
      });

      if (!res.ok) {
        throw new Error("Academic service timed out.");
      }

      const data = await res.json();
      setCritiqueOutput(data.output || "No feedback generated.");
    } catch (err: any) {
      setCritiqueOutput(`### Critique Error\n${err.message || "Failed to call Academic Advisor API."}`);
    } finally {
      setCritiqueLoading(false);
    }
  };

  // Save the Critique into local project list!
  const saveCritiqueAsLocalProject = () => {
    if (!projTitle) return;
    const newProj: ResearchProject = {
      id: `proj_${Date.now()}`,
      title: projTitle,
      specialty: projSpecialty,
      description: projDesc || "Description from advisor proforma",
      studyType: projStudyType,
      targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0], // 90 days from now
      milestones: [
        { id: `m_${Date.now()}_1`, name: "Submit Ethical clearance form", completed: false, dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], description: "Seek consent and storage waiver" },
        { id: `m_${Date.now()}_2`, name: "Sample collection & Pilot test", completed: false, dueDate: new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0], description: "Gather teeth or patient indices" }
      ],
      tasks: [
        { id: `t_${Date.now()}_1`, text: "Extract references from PubMed guidelines", dueDate: new Date().toISOString().split('T')[0], completed: false, priority: "High" }
      ],
      notes: critiqueOutput,
      references: ["PubMed query recommendation applied directly"]
    };

    setProjects(prev => [newProj, ...prev]);
    alert(`Successfully generated localized project workspace for "${projTitle}"! Navigate to list below.`);
  };

  // Case Report Outline Form State
  const [caseSpecialty, setCaseSpecialty] = useState("Conservative Dentistry & Endodontics");
  const [caseComplaint, setCaseComplaint] = useState("");
  const [caseFindings, setCaseFindings] = useState("");
  const [caseOutlineOutput, setCaseOutlineOutput] = useState("");
  const [caseLoading, setCaseLoading] = useState(false);

  const handleCaseOutlineRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseComplaint.trim()) return;

    setCaseLoading(true);
    setCaseOutlineOutput("");

    try {
      const res = await fetch("/api/gemini/outline-case-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialty: caseSpecialty,
          chiefComplaint: caseComplaint,
          findings: caseFindings
        })
      });

      if (!res.ok) {
        throw new Error("Case study service failed.");
      }

      const data = await res.json();
      setCaseOutlineOutput(data.output || "No outline compiled.");
    } catch (err: any) {
      setCaseOutlineOutput(`### Case Outline Compile Error\n${err.message}`);
    } finally {
      setCaseLoading(false);
    }
  };

  // Advisor Chat Mentor state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "advisor", text: string }[]>([
    { sender: "advisor", text: "Hello! I am your MedRecall Board Academic Mentor. Ask me any conceptual dental or medicine questions, clinical case exam topics, oral pathology diagnostics, drug dosages, or textbook references." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const updatedMessagesForAPI = [...chatMessages, { sender: "user", text: userMsg }];
      const res = await fetch("/api/gemini/dental-advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessagesForAPI })
      });

      if (!res.ok) {
        throw new Error("Chat sequence protocol error.");
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: "advisor", text: data.output || "I'm processing." }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: "advisor", text: `I apologize, there was an issue referencing the text. ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Project Workspace CRUD Logic ---
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const activeProj = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleToggleMilestone = (projId: string, milestoneId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      return {
        ...p,
        milestones: p.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m)
      };
    }));
  };

  const handleToggleTask = (projId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
      };
    }));
  };

  const handleAddTaskToProject = (projId: string, text: string, priority: "High" | "Medium" | "Low") => {
    if (!text.trim()) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      const newTask = {
        id: `t_${Date.now()}`,
        text,
        dueDate: new Date().toISOString().split('T')[0],
        completed: false,
        priority
      };
      return {
        ...p,
        tasks: [...p.tasks, newTask]
      };
    }));
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Permanently archive this project from clinical logbooks?")) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setSelectedProjectId(null);
    }
  };


  // --- Rotation / Quota Logic ---
  const updateQuotaCount = (deptName: string, itemId: string, delta: number) => {
    setQuotas(prev => prev.map(d => {
      if (d.department !== deptName) return d;
      return {
        ...d,
        items: d.items.map(item => {
          if (item.id !== itemId) return item;
          const updatedCount = Math.max(0, Math.min(item.targetCount, item.completedCount + delta));
          return { ...item, completedCount: updatedCount };
        })
      };
    }));
  };

  const addCustomQuotaItem = (deptName: string, procedureName: string, targetStr: string) => {
    const target = parseInt(targetStr, 10);
    if (!procedureName.trim() || isNaN(target) || target <= 0) return;

    setQuotas(prev => prev.map(d => {
      if (d.department !== deptName) return d;
      const newItem = {
        id: `cust_q_${Date.now()}`,
        procedureName,
        targetCount: target,
        completedCount: 0
      };
      return {
        ...d,
        items: [...d.items, newItem]
      };
    }));
  };


  // Utilities & Derived calculations
  const totalCardsCount = flashcards.length;
  const categoriesList = ["All", ...Array.from(new Set(flashcards.map(c => c.category)))];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 p-2 rounded-xl text-white shadow-xl shadow-teal-500/10">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              MedRecall <span className="text-xs bg-teal-500/15 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono">BDS & MBBS Smart Companion</span>
            </h1>
            <p className="text-xs text-slate-400">High-Retention Active Recall, Spaced Repetition + BDS Resource Coordinator</p>
          </div>
        </div>

        {/* PWA Badge installer bar & UTC diagnostics */}
        <div className="flex flex-wrap items-center gap-2">
          {isInstallable && (
            <button 
              onClick={triggerPWAInstall}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition-all active:scale-95 duration-150"
            >
              <Download className="w-3.5 h-3.5 animate-bounce" />
              Install on PC/Phone
            </button>
          )}
          {isInstalledStandalone ? (
            <span className="text-xs bg-slate-800 border border-slate-700 text-teal-400 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-mono">
              <Check className="w-3 h-3 text-emerald-400" />
              M-STANDALONE APP
            </span>
          ) : (
            <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1.5 rounded-lg font-mono hidden sm:inline-block">
              Web Sandbox
            </span>
          )}

          {/* Time & UTC Tracker */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            <span>2026-05-20 UTC</span>
          </div>
        </div>
      </header>

      {/* Main Core Shell Navigation Tabbar */}
      <nav className="bg-slate-950 px-6 py-2 border-b border-slate-900 flex overflow-x-auto gap-1 text-sm scrollbar-thin scrollbar-thumb-slate-800">
        <button 
          onClick={() => setActiveTab("spaced")} 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors capitalize ${activeTab === 'spaced' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium' : 'text-slate-400 hover:text-white'}`}
        >
          <Brain className="w-4 h-4 text-emerald-400" />
          Active Recall Flashcards
          {currentReviewsNeeded > 0 && (
            <span className="ml-1 bg-rose-500 text-white rounded-full text-[10px] px-1.5 py-0.5 font-bold animate-pulse">
              {currentReviewsNeeded}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("mnemonic")} 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors capitalize ${activeTab === 'mnemonic' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium' : 'text-slate-400 hover:text-white'}`}
        >
          <Sparkles className="w-4 h-4 text-teal-400" />
          Mnemonic Synthesizer
        </button>

        <button 
          onClick={() => setActiveTab("project")} 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors capitalize ${activeTab === 'project' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium' : 'text-slate-400 hover:text-white'}`}
        >
          <GraduationCap className="w-4 h-4 text-sky-400" />
          BDS Research & Case Advisor
        </button>

        <button 
          onClick={() => setActiveTab("quota")} 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors capitalize ${activeTab === 'quota' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium' : 'text-slate-400 hover:text-white'}`}
        >
          <ClipboardList className="w-4 h-4 text-amber-400" />
          Clinical Log Book Quotas
        </button>

        <button 
          onClick={() => setActiveTab("docs")} 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors capitalize ${activeTab === 'docs' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium' : 'text-slate-400 hover:text-white'}`}
        >
          <BookOpen className="w-4 h-4 text-rose-400" />
          BDS Checklists & Docs
        </button>
      </nav>

      {/* Main Workspace Frame container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 gap-6">
        
        {/* TAB 1: SPACED REPETITION FLASHCARDS REVIEW */}
        {activeTab === "spaced" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side panel: Review Engine Card Desk */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-teal-400" /> Active Recall Review Stage
                  </h2>
                  <p className="text-xs text-slate-400">SM-2 Spaced Repetition prioritizes cards that are fading from memory bounds</p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button 
                    onClick={() => {
                      setShowOnlyReviewToday(prev => !prev);
                      setActiveReviewIndex(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1 transition ${showOnlyReviewToday ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {showOnlyReviewToday ? "Showing: Due Today" : "Showing: All Cards"}
                  </button>
                </div>
              </div>

              {filteredFlashcards.length === 0 ? (
                <div className="bg-slate-950 p-10 border border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                  <div className="bg-slate-900 p-4 rounded-full text-slate-500">
                    <CheckSquare className="w-10 h-10" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-300">All caught up!</h3>
                  <p className="text-xs text-slate-400 max-w-md">No flashcards are pending review under this filter criteria. Generate medical cards with Artificial Intelligence or add manual cards below!</p>
                  <button 
                    onClick={() => {
                      setShowOnlyReviewToday(false);
                      setFlashcardCategory("All");
                    }} 
                    className="text-xs text-teal-400 underline"
                  >
                    Reset standard list filters
                  </button>
                </div>
              ) : activeReviewIndex >= filteredFlashcards.length ? (
                <div className="bg-slate-950 p-10 border border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                  <div className="bg-emerald-500/10 p-4 rounded-full text-emerald-400 border border-emerald-500/20">
                    <Check className="w-10 h-10" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Clinical Quiz Sweep Completed!</h3>
                  <p className="text-xs text-slate-400 max-w-sm">You have iterated through all selected active flashcards. Review statistics have been configured inline.</p>
                  <button 
                    onClick={() => setActiveReviewIndex(0)}
                    className="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restart review rotation
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  
                  {/* The interactive Flashcard */}
                  <div className="relative min-h-[340px] perspective-1000">
                    <div 
                      className={`w-full min-h-[340px] p-8 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                        isCardFlipped 
                        ? 'bg-slate-950 border-teal-500/50 shadow-2xl shadow-teal-500/5' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 shadow-xl'
                      }`}
                    >
                      {/* Top bar */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full font-mono">
                          {filteredFlashcards[activeReviewIndex].category}
                        </span>
                        
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>Card {activeReviewIndex + 1} of {filteredFlashcards.length}</span>
                          <button 
                            onClick={() => deleteFlashcard(filteredFlashcards[activeReviewIndex].id)}
                            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-rose-400 hover:text-rose-300 p-1 rounded-lg transition"
                            title="Delete this card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main interactive area */}
                      <div className="my-6">
                        {!isCardFlipped ? (
                          // Front side of card
                          <div className="flex flex-col gap-4 text-center">
                            <h3 className="text-lg font-medium text-white leading-relaxed select-none">
                              {filteredFlashcards[activeReviewIndex].question}
                            </h3>
                            
                            {/* Option to show hint */}
                            {showReviewHint ? (
                              <p className="text-xs text-amber-300 italic bg-amber-500/10 border border-amber-500/20 py-2 px-3 rounded-lg mx-auto max-w-lg">
                                Clue: {filteredFlashcards[activeReviewIndex].hint}
                              </p>
                            ) : (
                              <button 
                                onClick={() => setShowReviewHint(true)}
                                className="text-slate-500 hover:text-teal-400 text-xs flex items-center justify-center gap-1.5 transition select-none"
                              >
                                <HelpCircle className="w-3.5 h-3.5" /> Need a diagnostic prompt clue?
                              </button>
                            )}
                          </div>
                        ) : (
                          // Back side of card (revealed)
                          <div className="flex flex-col gap-4">
                            <div className="text-center">
                              <span className="text-[10px] font-mono tracking-wider text-teal-400 uppercase">Correct Answer:</span>
                              <h3 className="text-emerald-300 text-base font-semibold leading-relaxed mt-1">
                                {filteredFlashcards[activeReviewIndex].answer}
                              </h3>
                            </div>
                            
                            <div className="mt-4 border-t border-slate-900 pt-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 max-w-2xl mx-auto">
                              <span className="font-semibold text-slate-200 block mb-1">Academic Explanatory notes:</span>
                              <p className="leading-relaxed font-sans">{filteredFlashcards[activeReviewIndex].explanation}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom command section */}
                      <div className="flex justify-center pt-2">
                        {!isCardFlipped ? (
                          <button 
                            onClick={() => setIsCardFlipped(true)}
                            className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-teal-500/10 transition duration-150 active:scale-95"
                          >
                            REVEAL ANSWER & CLINICAL EXPLANATORY
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-4 w-full">
                            <span className="text-xs text-slate-400 font-mono">Select how well you retrieved this clinical concept:</span>
                            
                            {/* SM-2 Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                              <button 
                                onClick={() => handleReviewFeedback(filteredFlashcards[activeReviewIndex].id, 1)}
                                className="bg-rose-950/40 hover:bg-rose-950 border border-rose-500/30 text-rose-400 text-xs px-3.5 py-2 rounded-xl transition duration-100 flex flex-col items-center"
                              >
                                <span className="font-semibold">Forgot</span>
                                <span className="text-[10px] text-rose-500/80 mt-0.5">Reset (1 day)</span>
                              </button>

                              <button 
                                onClick={() => handleReviewFeedback(filteredFlashcards[activeReviewIndex].id, 2)}
                                className="bg-amber-950/40 hover:bg-amber-950 border border-amber-500/30 text-amber-400 text-xs px-3.5 py-2 rounded-xl transition duration-100 flex flex-col items-center"
                              >
                                <span className="font-semibold">Hard</span>
                                <span className="text-[10px] text-amber-500/80 mt-0.5">Penalized</span>
                              </button>

                              <button 
                                onClick={() => handleReviewFeedback(filteredFlashcards[activeReviewIndex].id, 3)}
                                className="bg-sky-950/40 hover:bg-sky-950 border border-sky-500/30 text-sky-400 text-xs px-3.5 py-2 rounded-xl transition duration-100 flex flex-col items-center"
                              >
                                <span className="font-semibold">Good</span>
                                <span className="text-[10px] text-sky-400/80 mt-0.5">SM-2 standard</span>
                              </button>

                              <button 
                                onClick={() => handleReviewFeedback(filteredFlashcards[activeReviewIndex].id, 5)}
                                className="bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-xs px-3.5 py-2 rounded-xl transition duration-100 flex flex-col items-center"
                              >
                                <span className="font-semibold">Easy</span>
                                <span className="text-[10px] text-emerald-400/80 mt-0.5">Forward days</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* SM-2 diagnostics metadata indicator */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-[11px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div>
                      <span className="text-slate-500 block">REPETITIONS</span>
                      <span className="text-white font-bold">{filteredFlashcards[activeReviewIndex].repetitions} reviews</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">INTERVAL DAYS</span>
                      <span className="text-rose-400 font-bold">{filteredFlashcards[activeReviewIndex].interval} days</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">EASE FACTOR (EF)</span>
                      <span className="text-emerald-400 font-bold">{filteredFlashcards[activeReviewIndex].easeFactor}x</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">NEXT DUE DATE</span>
                      <span className="text-slate-300 font-bold">{new Date(filteredFlashcards[activeReviewIndex].nextReviewDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                </div>
              )}
              
            </div>

            {/* Right side: AI Flashcard Generator & Quick Stats */}
            <div className="flex flex-col gap-6">
              
              {/* Box 1: AI Memory Decompiler (Gemini Generator) */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Brain className="w-24 h-24 text-teal-400" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-teal-500/10 p-1.5 rounded-lg text-teal-400 border border-teal-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">AI Spaced Card Generator</h3>
                    <p className="text-[11px] text-slate-400">Generate high-retention active recall sets</p>
                  </div>
                </div>

                <form onSubmit={handleAiFlashcardGeneration} className="flex flex-col gap-3 mt-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Enter Complex Topic / Syndrome / Fact:</label>
                    <input 
                      type="text" 
                      value={generateTopic}
                      onChange={(e) => setGenerateTopic(e.target.value)}
                      placeholder="e.g. Cranial nerve 7 pathway, GIC setting reaction phases..."
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Medical/Dental Specialty Category:</label>
                    <select 
                      value={generateCategory}
                      onChange={(e) => setGenerateCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="Conservative Dentistry & Endodontics">Endodontics</option>
                      <option value="Oral Pathology & Medicine">Oral Pathology</option>
                      <option value="Dental Materials">Dental Materials</option>
                      <option value="Gross Anatomy">Gross Anatomy</option>
                      <option value="Pharmacology">Pharmacology</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>

                  {generationError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2 text-[10px] rounded leading-relaxed">
                      Error: {generationError}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={aiGeneratingFlashcards || !generateTopic.trim()}
                    className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 text-slate-950 hover:text-black font-bold text-xs py-2 rounded-lg transition mt-1 select-none flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {aiGeneratingFlashcards ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" /> Decompiling into Active Recall...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5" /> Synthesize & Load Cards
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Box 2: Manual customized cards */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white text-xs font-semibold">Logged Cards Database</h3>
                  </div>
                  <button 
                    onClick={() => setShowManualForm(!showManualForm)}
                    className="text-[11px] text-teal-400 hover:underline select-none"
                  >
                    {showManualForm ? "Collapse Form" : "Create Card"}
                  </button>
                </div>

                {showManualForm ? (
                  <form onSubmit={handleManualCardSubmit} className="flex flex-col gap-2.5 mt-3">
                    <div>
                      <input 
                        type="text" 
                        value={newManualQ}
                        onChange={(e) => setNewManualQ(e.target.value)}
                        placeholder="Direct recall question"
                        className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                        required
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={newManualA}
                        onChange={(e) => setNewManualA(e.target.value)}
                        placeholder="Concise answer"
                        className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                        required
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={newManualHint}
                        onChange={(e) => setNewManualHint(e.target.value)}
                        placeholder="Hint Clue (optional)"
                        className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <textarea 
                        value={newManualExplanation}
                        onChange={(e) => setNewManualExplanation(e.target.value)}
                        placeholder="Textbook reasoning or reference (optional)"
                        className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white h-12 resize-none"
                      />
                    </div>
                    <div>
                      <select 
                        value={newManualCat}
                        onChange={(e) => setNewManualCat(e.target.value)}
                        className="w-full text-xs p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                      >
                        <option value="Dental Materials">Dental Materials</option>
                        <option value="Oral Pathology">Oral Pathology</option>
                        <option value="Gross Anatomy">Gross Anatomy</option>
                        <option value="General Pharmacology">General Pharmacology</option>
                        <option value="Orthodontics">Orthodontics</option>
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      className="bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold text-[11px] py-1.5 rounded-lg border border-slate-700"
                    >
                      Log Card Inside Device
                    </button>
                  </form>
                ) : (
                  <div className="mt-3">
                    <div className="text-[11px] text-slate-400 flex justify-between mb-2">
                      <span>Total Active Cards:</span>
                      <span className="text-white font-bold">{totalCardsCount} cards</span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                      {categoriesList.map((cat, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setFlashcardCategory(cat);
                            setActiveReviewIndex(0);
                          }}
                          className={`text-[10px] px-2 py-1 rounded transition border ${
                            flashcardCategory === cat
                            ? "bg-teal-500/15 border-teal-500/30 text-teal-400"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {cat} ({cat === "All" ? totalCardsCount : flashcards.filter(c => c.category === cat).length})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Box 3: Spaced Repetition Science Info */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex gap-3 text-slate-400 text-[11px] leading-relaxed">
                <Lightbulb className="w-8 h-8 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white text-xs font-semibold mb-0.5">Spaced Repetition Algorithm (SM-2)</h4>
                  <p>
                    By testing yourself just as you are about to forget, retention transitions from transient working memory to long-term synaptic structures. Ease factors adjust mathematically based on your ratings.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: MNEMONIC & MEMORY PALACE GENERALIZER */}
        {activeTab === "mnemonic" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Mnemonic Generator Interface */}
            <div className="lg:col-span-1 bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">AI Mnemonic Synthesizer</h2>
                  <p className="text-xs text-slate-400">Map intricate anatomical sequences or lists to verbal & spatial anchors</p>
                </div>
              </div>

              <form onSubmit={handleMnemonicGeneration} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">List details to remember:</label>
                  <textarea 
                    value={mnemonicInput}
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    placeholder="e.g. Facial nerve branches: Temporal, Zygomatic, Buccal, Mandibular, Cervical. OR Coagulation Cascade factors."
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white h-24 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Separate with commas or numbers for optimal parsing.</span>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Topic Context:</label>
                  <input 
                    type="text" 
                    value={mnemonicContext}
                    onChange={(e) => setMnemonicContext(e.target.value)}
                    placeholder="e.g. Anatomy Exam licensing, pathology lists"
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                {mnemonicError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 text-xs rounded">
                    Formatting failure: {mnemonicError}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={mnemonicGenerating || !mnemonicInput.trim()}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:bg-slate-800 text-slate-950 hover:text-black font-bold text-xs py-2.5 rounded-xl transition shadow-lg shadow-teal-500/10"
                >
                  {mnemonicGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" /> Engineering Memory Anchors...
                    </span>
                  ) : (
                    "Synthesize Mnemonic System"
                  )}
                </button>
              </form>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-start gap-3 mt-2 text-[11px] text-slate-400 leading-relaxed">
                <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-200 font-semibold block mb-0.5">The Memory Palace technique</span>
                  By attaching dry textbook terms directly to rich, colored spatial narratives, retention utilizes mammalian hippocampal mapping protocols. Use our custom story-maker to cement lists in seconds.
                </div>
              </div>
            </div>

            {/* Right side: Preserved Mnemonics List & Memory Palace viewer */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Bookmark className="w-5 h-5 text-emerald-400" /> Preserved Mnemonics & Spatial Systems
              </h2>

              <div className="flex flex-col gap-4">
                {mnemonics.map((mnem) => (
                  <div key={mnem.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative">
                    <button 
                      onClick={() => removeMnemonic(mnem.id)}
                      className="absolute top-4 right-4 bg-slate-900 border border-slate-850 hover:border-rose-500 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition"
                      title="Remove mnemonic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="mb-4">
                      <span className="text-[10px] bg-slate-900 text-teal-400 border border-slate-800 px-2.5 py-1 rounded-full font-mono">
                        {mnem.context}
                      </span>
                      <h3 className="text-base font-bold text-emerald-400 mt-2">
                        {mnem.topic}
                      </h3>
                      <p className="text-slate-300 font-mono text-sm font-semibold bg-slate-900 border border-slate-800 p-3 rounded-lg mt-2 inline-block">
                        🔑 Academic Acronym Hook: <span className="text-teal-300 font-bold">{mnem.phrase}</span>
                      </p>
                    </div>

                    {/* Mnemonic mapping grid */}
                    <div className="mb-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <h4 className="text-slate-400 text-xs font-semibold mb-2 block uppercase tracking-wider">Concept Alignment Mapping:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mnem.mapping.map((map, idx) => (
                          <div key={idx} className="flex gap-2 text-xs">
                            <span className="w-6 h-6 rounded bg-teal-500 text-slate-950 font-bold font-mono flex items-center justify-center flex-shrink-0">
                              {map.letter}
                            </span>
                            <div>
                              <span className="font-bold text-slate-200 block">{map.concept}</span>
                              <span className="text-slate-400 text-[11px] leading-snug">{map.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Memory Palace descriptive text */}
                    <div className="mb-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/40 text-xs text-slate-300">
                      <span className="font-bold text-slate-200 block mb-1">🏰 Spatial Scene (Memory Palace):</span>
                      <p className="leading-relaxed italic font-sans">{mnem.memoryPalace}</p>
                    </div>

                    {/* Clinical pearls */}
                    {mnem.clinicalPearls && mnem.clinicalPearls.length > 0 && (
                      <div className="text-xs">
                        <span className="font-semibold text-slate-200 block mb-1.5">🎓 Senior Dean High-Yield Pearls:</span>
                        <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                          {mnem.clinicalPearls.map((pearl, idx) => (
                            <li key={idx} className="leading-relaxed">{pearl}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                ))}

                {mnemonics.length === 0 && (
                  <div className="bg-slate-950 p-10 border border-slate-800 rounded-2xl text-center text-slate-500">
                    <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs">No saved memory models. Enter details on the left, and let Gemini compile mnemonics for you!</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: BDS RESEARCH & CASE ADVISOR */}
        {activeTab === "project" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side panel: Academic Advisory Engine Controls */}
            <div className="lg:col-span-1 bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 h-fit">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-sky-400" /> Academic Advisor Tools
              </h3>

              {/* Sub-menu inside Tab for Advisor Modes */}
              <div className="flex bg-slate-900 p-1 rounded-lg text-xs gap-1 border border-slate-800">
                <button 
                  onClick={() => setAdvisorMode("project_critique")}
                  className={`flex-1 py-2 text-center rounded transition font-semibold ${advisorMode === 'project_critique' ? 'bg-sky-500/15 text-sky-400 font-bold border border-sky-500/25' : 'text-slate-400 hover:text-white'}`}
                >
                  Project Evaluate
                </button>
                <button 
                  onClick={() => setAdvisorMode("case_report")}
                  className={`flex-1 py-2 text-center rounded transition font-semibold ${advisorMode === 'case_report' ? 'bg-sky-500/15 text-sky-400 font-bold border border-sky-500/25' : 'text-slate-400 hover:text-white'}`}
                >
                  Case Reports
                </button>
                <button 
                  onClick={() => setAdvisorMode("chat")}
                  className={`flex-1 py-2 text-center rounded transition font-semibold ${advisorMode === 'chat' ? 'bg-sky-500/15 text-sky-400 font-bold border border-sky-500/25' : 'text-slate-400 hover:text-white'}`}
                >
                  Board Chat
                </button>
              </div>

              {/* MODE 1: Project Critique Form */}
              {advisorMode === "project_critique" && (
                <form onSubmit={handleCritiqueRequest} className="flex flex-col gap-3 mt-2">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Project Thesis Title:</label>
                    <input 
                      type="text" 
                      value={projTitle}
                      onChange={(e) => setProjTitle(e.target.value)}
                      placeholder="e.g., Adhesive bond strength of different GICs"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Dental Medicine Specialty:</label>
                    <select 
                      value={projSpecialty} 
                      onChange={(e) => setProjSpecialty(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Conservative Dentistry & Endodontics">Endodontics (Conservative)</option>
                      <option value="Oral & Maxillofacial Surgery">Oral Surgery (OMFS)</option>
                      <option value="Prosthodontics, Crown & Bridge">Prosthodontics (CD/RPD)</option>
                      <option value="Periodontics">Periodontics (Gum Care)</option>
                      <option value="Pedodontics / Pediatrics">Pediatric Dentistry</option>
                      <option value="Orthodontics">Orthodontics (Aligners/Wires)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Proposed Academic Study Class:</label>
                    <select 
                      value={projStudyType} 
                      onChange={(e) => setProjStudyType(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none"
                    >
                      <option value="In Vitro">In Vitro (Extracted teeth / laboratory)</option>
                      <option value="In Vivo">In Vivo (Patient logs / diagnostics)</option>
                      <option value="Questionnaire Survey">Questionnaire Survey (Epidemiology)</option>
                      <option value="Clinical Trial">Clinical Trial (Supervised intervention)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Brief Description / Method Details:</label>
                    <textarea 
                      value={projDesc}
                      onChange={(e) => setProjDesc(e.target.value)}
                      placeholder="e.g. Test 30 premolar surfaces under Shear Bond Strength testing after thermal cycling in water."
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white h-20 resize-none font-sans"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={critiqueLoading || !projTitle.trim()}
                    className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition"
                  >
                    {critiqueLoading ? "Submitting to Board Advisor..." : "Generate AI Academic Evaluation"}
                  </button>
                </form>
              )}

              {/* MODE 2: Case Report Outline Form */}
              {advisorMode === "case_report" && (
                <form onSubmit={handleCaseOutlineRequest} className="flex flex-col gap-3 mt-2">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Hospital Rotation Specialty:</label>
                    <input 
                      type="text" 
                      value={caseSpecialty}
                      onChange={(e) => setCaseSpecialty(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                      placeholder="e.g., Endodontics / Periodontology / General Surgery"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Chief Complaint (Presenting):</label>
                    <textarea 
                      value={caseComplaint}
                      onChange={(e) => setCaseComplaint(e.target.value)}
                      placeholder="e.g. Pain in the upper left tooth for 4 days which worsens at night or while consuming cold liquids."
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white h-20 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Clinical and/or Radiographic findings:</label>
                    <textarea 
                      value={caseFindings}
                      onChange={(e) => setCaseFindings(e.target.value)}
                      placeholder="e.g., Deep occlusal active decay cavity on molar #26, tender on vertical percussion test. No swelling."
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white h-20 resize-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={caseLoading || !caseComplaint.trim()}
                    className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition"
                  >
                    {caseLoading ? "Compiling Patient Record Outline..." : "Generate Patient Case File Template"}
                  </button>
                </form>
              )}

              {/* MODE 3: Board Mentor Chat Form */}
              {advisorMode === "chat" && (
                <div className="flex flex-col gap-3">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                    Get quick feedback on textbook definitions, material properties (e.g. Siloranes vs Methacrylates, Zinc Phosphate mixing steps), or local anesthesia blocks directly.
                  </div>
                  <button 
                    onClick={() => {
                      setChatMessages([
                        { sender: "advisor", text: "Hello! My board knowledge database is restored. Drop any clinical, medical dentistry questions, or drug dosage equations below." }
                      ]);
                    }}
                    className="text-[10px] text-teal-400 text-left hover:underline select-none"
                  >
                    Clear Chat history
                  </button>
                </div>
              )}

            </div>

            {/* Right side panel: Dynamic AI Outputs & Live Academic Workspace */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Box 1: Dynamic AI output visualization container */}
              {(critiqueOutput || critiqueLoading || caseOutlineOutput || caseLoading || advisorMode === "chat") && (
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  
                  {/* Evaluating Loader Indicator */}
                  {critiqueLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 text-sky-400 animate-spin" />
                      <span className="text-xs font-semibold text-white">Academic Dean reviewing your title thesis design metrics...</span>
                      <p className="text-[10px] text-slate-500">Checking ethics, sample metrics, expected ANOVA metrics, and referencing standard PubMed models.</p>
                    </div>
                  )}

                  {caseLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                      <Clock className="w-8 h-8 text-amber-400 animate-spin" />
                      <span className="text-xs font-semibold text-white">Packaging case log sheet and step protocol...</span>
                    </div>
                  )}

                  {/* Showing Critique output */}
                  {advisorMode === "project_critique" && critiqueOutput && !critiqueLoading && (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs font-semibold text-slate-200">AI Advisor Response compiled:</span>
                        <button 
                          onClick={saveCritiqueAsLocalProject}
                          className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-[11px] px-3 py-1.5 rounded-lg shadow"
                        >
                          Save as Active Project Workspace
                        </button>
                      </div>

                      <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed font-sans max-h-[500px] overflow-y-auto pr-2 bg-slate-900/40 p-4 border border-slate-850 rounded-xl space-y-4">
                        <MarkdownFormatter text={critiqueOutput} />
                      </div>
                    </div>
                  )}

                  {/* Showing Case Outline output */}
                  {advisorMode === "case_report" && caseOutlineOutput && !caseLoading && (
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Compiled Clinical Case Template Schema</h4>
                      <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed font-sans max-h-[500px] overflow-y-auto pr-2 bg-slate-900/40 p-4 border border-slate-850 rounded-xl space-y-4">
                        <MarkdownFormatter text={caseOutlineOutput} />
                      </div>
                    </div>
                  )}

                  {/* Showing Advisor Chat Mentor Live Feed */}
                  {advisorMode === "chat" && (
                    <div className="flex flex-col h-[480px]">
                      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1 scrollbar-thin">
                        {chatMessages.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                                msg.sender === 'user' 
                                ? 'bg-sky-600 text-white font-medium rounded-tr-none' 
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none font-sans space-y-2'
                              }`}
                            >
                              {msg.sender === 'advisor' ? (
                                <MarkdownFormatter text={msg.text} />
                              ) : (
                                msg.text
                              )}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="max-w-[70%] bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500 rounded-tl-none flex items-center gap-2">
                              <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                              <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                              <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                              <span>Clinical board mentor consulting literature...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleChatSubmit} className="border-t border-slate-850 pt-3 flex gap-2">
                        <input 
                          type="text" 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)} 
                          placeholder="Ask academic question (e.g. Mechanism of GIC bonding to dentin)"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                        <button 
                          type="submit" 
                          disabled={!chatInput.trim() || chatLoading}
                          className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 text-slate-950 font-semibold text-xs px-4 rounded-xl shadow-md"
                        >
                          Send Prompt
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              )}

              {/* Box 2: Local Projects Workspace Timeline Tracker */}
              <div className="bg-slate-955 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <ClipboardList className="w-5 h-5 text-sky-400" /> Active Academic Projects & Theses
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">Manage milestones, tasks, ethical filings, and PubMed codes in real-time</p>
                  </div>

                  {projects.length > 0 && (
                    <select 
                      value={selectedProjectId || ""} 
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="bg-slate-900 border border-slate-850 rounded-lg text-xs px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title.slice(0, 32)}...</option>
                      ))}
                    </select>
                  )}
                </div>

                {!activeProj ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No active project workspaces yet. Put draft title in Advisor above and save to spawn real workflow.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-6">
                    
                    {/* Project overview */}
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 flex justify-between gap-4 relative">
                      <div>
                        <span className="text-[10px] bg-slate-800 text-sky-400 border border-slate-700 px-2 py-0.5 rounded font-mono">
                          {activeProj.specialty} • {activeProj.studyType}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">{activeProj.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{activeProj.description}</p>
                        
                        <div className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-sky-400" /> Target Submission Deadlines: <span className="text-slate-300 font-bold">{activeProj.targetDate}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeleteProject(activeProj.id)}
                        className="bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition h-fit inline-block self-start flex-shrink-0"
                        title="Archive project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Milestones Progression */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">Milestone Checkpoints:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeProj.milestones.map((milestone) => (
                          <div 
                            key={milestone.id}
                            onClick={() => handleToggleMilestone(activeProj.id, milestone.id)}
                            className={`p-3.5 rounded-xl border transition cursor-pointer select-none flex items-start gap-3 ${
                              milestone.completed 
                              ? 'bg-sky-950/20 border-sky-500/20 text-slate-400' 
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              milestone.completed 
                              ? 'bg-sky-550 border-sky-500 text-white' 
                              : 'border-slate-700'
                            }`}>
                              {milestone.completed && <Check className="w-3 h-3 text-sky-300" />}
                            </div>
                            <div>
                              <span className={`text-xs font-semibold block ${milestone.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                {milestone.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{milestone.description}</span>
                              <span className="text-[9px] text-rose-400 block mt-1">Due Date: {milestone.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Task checklist tracker */}
                    <div className="bg-slate-900/20 p-5 border border-slate-850 rounded-xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-300">Detailed Action Items:</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {activeProj.tasks.filter(t => t.completed).length} of {activeProj.tasks.length} resolved
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeProj.tasks.map((task) => (
                          <div 
                            key={task.id}
                            onClick={() => handleToggleTask(activeProj.id, task.id)}
                            className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:border-slate-700"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                task.completed ? 'bg-sky-500 border-sky-500 text-slate-950' : 'border-slate-700'
                              }`}>
                                {task.completed && <Check className="w-3 h-3 text-slate-950" />}
                              </div>
                              <span className={`text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                {task.text}
                              </span>
                            </div>

                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              task.priority === 'High' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : task.priority === 'Medium' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-slate-850 text-slate-400'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Add new action items quick form inline */}
                      <ProjectTaskForm projId={activeProj.id} onAddTask={handleAddTaskToProject} />

                    </div>

                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: CLINICAL ROTATION QUOTA TRACKER */}
        {activeTab === "quota" && (
          <div className="flex flex-col gap-6">
            
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" /> Clinical Quota Log Book Tracker
              </h2>
              <p className="text-xs text-slate-400">Log client completions and watch progression charts toward final clinic log checkout approval thresholds</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {quotas.map((dept, deptIdx) => (
                <div key={deptIdx} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                    <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">{dept.department}</h3>
                    <span className="text-[11px] text-slate-400">
                      Overall: {Math.round(
                        (dept.items.reduce((accum, curr) => accum + curr.completedCount, 0) / 
                         dept.items.reduce((accum, curr) => accum + curr.targetCount, 0)) * 100
                      )}% Done
                    </span>
                  </div>

                  <div className="space-y-4">
                    {dept.items.map((item) => {
                      const percentage = Math.round((item.completedCount / item.targetCount) * 100);
                      return (
                        <div key={item.id} className="flex flex-col gap-1.5 bg-slate-900/35 p-3 rounded-lg border border-slate-850">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-200">{item.procedureName}</span>
                            <span className="font-mono text-slate-300 font-bold">
                              {item.completedCount} / <span className="text-slate-500">{item.targetCount}</span>
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850 flex">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentage >= 100 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                : percentage >= 50 
                                ? 'bg-amber-500' 
                                : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>

                          {/* Controls to adjust metrics easily */}
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                            <span className="font-xs">Target Completed: <span className="font-bold text-slate-300">{percentage}%</span></span>
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold select-none">
                              <button 
                                onClick={() => updateQuotaCount(dept.department, item.id, -1)}
                                className="w-5 h-5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded flex items-center justify-center transition-colors"
                              >
                                -
                              </button>
                              <button 
                                onClick={() => updateQuotaCount(dept.department, item.id, 1)}
                                className="w-5 h-5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded flex items-center justify-center transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add customized quota target item inline */}
                  <div className="mt-2 bg-slate-900/10 p-3 border border-slate-850 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">Add customized procedure target to track:</span>
                    <QuotaQuickForm deptName={dept.department} onAdd={addCustomQuotaItem} />
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 5: DENTAL SECRETS & PDF TEMPLATE FILES */}
        {activeTab === "docs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side list of saved docs */}
            <div className="lg:col-span-1 bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col gap-3">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-400" /> BDS Reference Sheets
              </h3>
              
              <div className="flex flex-col gap-2">
                {savedDocs.map((doc, idx) => (
                  <button
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-900 hover:border-rose-500/30 text-xs text-left bg-slate-900/40 hover:bg-slate-900 transition flex flex-col gap-1 text-slate-300 hover:text-white"
                  >
                    <span className="text-[10px] font-mono text-rose-400">{doc.category}</span>
                    <span className="font-medium inline-block">{doc.title}</span>
                    <p className="text-[10px] text-slate-400 leading-snug">{doc.description}</p>
                  </button>
                ))}
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 flex items-start gap-3 mt-4 text-[11px] text-slate-400">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-200 font-semibold block">Regulatory Information waiver</span>
                  Consult your institutional ethics review department (IRB) to formally submit applications before performing animal studies or human saliva specimen collections.
                </div>
              </div>
            </div>

            {/* Right side display area */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white border-b border-slate-900 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" /> Operational Template Proforma Sheets
              </h3>

              <div className="mt-4 space-y-6">
                {savedDocs.map((doc) => (
                  <div key={doc.id} className="bg-slate-900/30 border border-slate-850 rounded-xl p-5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-rose-400">{doc.category}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(doc.content);
                          alert("Template copied straight to device clipboard!");
                        }}
                        className="text-[10px] text-teal-400 hover:underline border border-slate-800 bg-slate-950 hover:bg-slate-900 px-2 py-1 rounded transition select-none"
                      >
                        Copy Template Code
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1 max-w-md">{doc.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-3 leading-relaxed">{doc.description}</p>
                    
                    <pre className="bg-slate-950 p-4 rounded-lg font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto border border-slate-850">
                      {doc.content}
                    </pre>
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Persistent global footer */}
      <footer className="bg-slate-950 border-t border-slate-900/60 p-6 text-center text-xs text-slate-500 font-mono mt-10">
        <div>
          MedRecall App for Final Year MBBS/BDS Studiers • Spaced Repetitive Science Engine
        </div>
        <div className="text-[10px] text-slate-600 mt-1">
          Registered Sw Offline Cache Active • Standard Sandbox Host Port 3000
        </div>
      </footer>

    </div>
  );
}

// --- Dynamic Sub-component Forms & Helper widgets to bypass compiler token-limitations cleanly ---

interface ProjectTaskProps {
  projId: string;
  onAddTask: (projId: string, text: string, priority: "High" | "Medium" | "Low") => void;
}

function ProjectTaskForm({ projId, onAddTask }: ProjectTaskProps) {
  const [taskText, setTaskText] = useState("");
  const [taskPrio, setTaskPrio] = useState<"High" | "Medium" | "Low">("Medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    onAddTask(projId, taskText, taskPrio);
    setTaskText("");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2 border-t border-slate-850 pt-3">
      <input 
        type="text" 
        value={taskText} 
        onChange={(e) => setTaskText(e.target.value)} 
        placeholder="Add urgent checklist item..."
        className="flex-1 bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1 rounded focus:outline-none focus:border-sky-500 placeholder-slate-600"
      />
      <select 
        value={taskPrio} 
        onChange={(e) => setTaskPrio(e.target.value as any)}
        className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 py-1 px-2 rounded focus:outline-none"
      >
        <option value="High">H-Prio</option>
        <option value="Medium">M-Prio</option>
        <option value="Low">L-Prio</option>
      </select>
      <button 
        type="submit" 
        className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-[11px] px-3.5 py-1 rounded shadow"
      >
        Add
      </button>
    </form>
  );
}

interface QuotaFormProps {
  deptName: string;
  onAdd: (deptName: string, procName: string, targetStr: string) => void;
}

function QuotaQuickForm({ deptName, onAdd }: QuotaFormProps) {
  const [procName, setProcName] = useState("");
  const [targetVal, setTargetVal] = useState("10");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procName.trim()) return;
    onAdd(deptName, procName, targetVal);
    setProcName("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input 
        type="text" 
        value={procName} 
        onChange={(e) => setProcName(e.target.value)} 
        placeholder="Procedure name (e.g. Class IV veneer)"
        className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white px-2 py-1 rounded placeholder-slate-600"
      />
      <input 
        type="number" 
        value={targetVal} 
        onChange={(e) => setTargetVal(e.target.value)} 
        placeholder="Target N"
        className="w-16 bg-slate-950 border border-slate-800 text-xs text-white px-2 py-1 rounded text-center"
        min="1"
      />
      <button 
        type="submit" 
        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] px-3.5 py-1 rounded shadow"
      >
        Track
      </button>
    </form>
  );
}

// --- Safe Clean Markdown Text parser utility formatter to show bullet lists cleanly on standard React ---
function MarkdownFormatter({ text }: { text: string }) {
  if (!text) return null;

  // Split lines and do lightweight formatting
  const lines = text.split("\n");

  return (
    <div className="space-y-2 font-sans text-xs text-slate-300 bg-slate-950/20 rounded-xl leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Standard titles #
        if (trimmed.startsWith("# ")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-white border-b border-slate-800 pb-1 mt-4">
              {trimmed.substring(2)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h4 key={idx} className="text-xs font-bold text-teal-300 mt-3">
              {trimmed.substring(3)}
            </h4>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h5 key={idx} className="text-xs font-semibold text-sky-300 mt-2">
              {trimmed.substring(4)}
            </h5>
          );
        }

        // Bold lists or descriptions
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.substring(2);
          return (
            <ul key={idx} className="list-disc list-inside text-slate-300 text-xs leading-normal pl-2">
              <li>{parseBoldMarkers(content)}</li>
            </ul>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const content = trimmed.replace(/^\d+\.\s/, "");
          return (
            <ol key={idx} className="list-decimal list-inside text-slate-300 text-xs leading-normal pl-2 font-sans">
              <li>{parseBoldMarkers(content)}</li>
            </ol>
          );
        }

        if (trimmed === "") {
          return <div key={idx} className="h-1" />;
        }

        return <p key={idx} className="leading-relaxed whitespace-pre-wrap">{parseBoldMarkers(line)}</p>;
      })}
    </div>
  );
}

// Inline helper to resolve **bolding** inside strings safely
function parseBoldMarkers(str: string) {
  const parts = str.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    // Every odd index was captured inside **
    if (i % 2 === 1) {
      return <strong key={i} className="text-white font-bold">{part}</strong>;
    }
    return part;
  });
}
