export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  hint: string;
  explanation: string;
  // Spaced repetition tracking fields (SM-2 style)
  repetitions: number;
  interval: number; // in days
  easeFactor: number;
  nextReviewDate: string; // ISO string
  category: string;
  userCreated?: boolean;
}

export interface MnemonicMapping {
  letter: string;
  concept: string;
  detail: string;
}

export interface SavedMnemonic {
  id: string;
  topic: string;
  context: string;
  phrase: string;
  mapping: MnemonicMapping[];
  memoryPalace: string;
  clinicalPearls: string[];
}

export interface ClinicalQuotaItem {
  id: string;
  procedureName: string;
  targetCount: number;
  completedCount: number;
}

export interface DepartmentQuota {
  department: string;
  items: ClinicalQuotaItem[];
}

export interface ResearchMilestone {
  id: string;
  name: string;
  completed: boolean;
  dueDate: string;
  description: string;
}

export interface ResearchTask {
  id: string;
  text: string;
  dueDate: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ResearchProject {
  id: string;
  title: string;
  specialty: string;
  description: string;
  studyType: string;
  targetDate: string;
  milestones: ResearchMilestone[];
  tasks: ResearchTask[];
  notes: string;
  references: string[];
}

export interface ReferenceDOC {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
}
