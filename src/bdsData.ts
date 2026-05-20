import { Flashcard, SavedMnemonic, DepartmentQuota, ResearchProject, ReferenceDOC } from "./types";

export const SEED_FLASHCARDS: Flashcard[] = [
  {
    id: "fc_1",
    question: "What is the primary setting reaction of Glass Ionomer Cement (GIC)?",
    answer: "An acid-base reaction between polyalkenoic acid and fluoroaluminosilicate glass.",
    hint: "Think about structural components reacting together with protons.",
    explanation: "When mixed, the polyacrylic acid attacks the glass particles, releasing calcium, aluminum, sodium, and fluorine ions to form a cross-linked silica gel matrix with polycarboxylate salts.",
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
    category: "Dental Materials"
  },
  {
    id: "fc_2",
    question: "Which cranial nerve innervates all muscles of mastication, and what is its specific functional path?",
    answer: "Trigeminal Nerve (CN V) - Specifically the Mandibular Division (V3).",
    hint: "It exits the skull through the foramen ovale.",
    explanation: "V3 supplies motor innervation to the Temporalis, Masseter, Medial Pterygoid, and Lateral Pterygoid muscles, as well as tensor tympani, tensor veli palatini, anterior belly of digastric, and mylohyoid.",
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
    category: "Gross Anatomy"
  },
  {
    id: "fc_3",
    question: "What is the classic histological presentation of Lichen Planus in oral tissue?",
    answer: "Sawtooth rete pegs, liquefaction degeneration of the basal layer, and a dense band-like T-lymphocytic infiltrate.",
    hint: "Colloquially looks like pointed teeth and a purple barrier line under the epithelium.",
    explanation: "Lichen Planus presents as an immunologically mediated interface dermatitis. You also find Civatte bodies (apoptotic keratinocytes) in the lower epithelium.",
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
    category: "Oral Pathology"
  },
  {
    id: "fc_4",
    question: "What are the key pharmacological actions of epinephrine when combined with 2% lidocaine in local anesthetic cartridges?",
    answer: "Vasoconstriction, which prolongs duration of local anesthesia, reduces surgical bleeding, and limits systemic toxicity/absorption.",
    hint: "Think of blood vessels narrowing under alpha-1 stimulation.",
    explanation: "The epinephrine stimulates alpha-1 adrenergic receptors on blood vessels of the injection site, localized flow rate reduces, retarding lidocaine clearance by local perfusion.",
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
    category: "Dental Pharmacology"
  },
  {
    id: "fc_5",
    question: "Explain the difference between primary and secondary dentin formation.",
    answer: "Primary dentin forms before root completion; secondary dentin is a slow, physiological process forming after root completion.",
    hint: "One is formed during initial development; the other continues throughout life.",
    explanation: "Secondary dentin is laid down in a somewhat asymmetrical pattern, narrowing the pulp chamber as a person ages. Tertiary dentin is formed in response to noxious stimulations (decay, wear).",
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date(Date.now() + 86400000).toISOString(), // Review scheduled for tomorrow
    category: "Dental Anatomy"
  },
  {
    id: "fc_6",
    question: "What is the toxic dose threshold of Lidocaine with epinephrine in a healthy adult?",
    answer: "7 mg/kg of body weight (up to a absolute maximum of 500 mg).",
    hint: "Without vasoconstrictor, the threshold drops to around 4.4 mg/kg.",
    explanation: "Lidocaine toxicity affects the central nervous system first (perioral numbness, metallic taste, seizures) followed by cardiovascular collapse due to sodium-channel blockade.",
    repetitions: 1,
    interval: 3,
    easeFactor: 2.6,
    nextReviewDate: new Date().toISOString(),
    category: "General Pharmacology"
  }
];

export const SEED_MNEMONICS: SavedMnemonic[] = [
  {
    id: "mnem_1",
    topic: "Branches of the Facial Nerve (CN VII)",
    context: "Exits via Stylomastoid foramen to supply muscles of facial expression.",
    phrase: "To Zanzibar By Motor Car",
    mapping: [
      { letter: "T", concept: "Temporal branch", detail: "Innervates the frontalis, corrugator supercilii, and orbicularis oculi muscles." },
      { letter: "Z", concept: "Zygomatic branch", detail: "Innervates the orbicularis oculi and zygomaticus muscles." },
      { letter: "B", concept: "Buccal branch", detail: "Innervates the buccinator and upper lip oral muscles." },
      { letter: "M", concept: "Marginal Mandibular", detail: "Innervates the depressor anguli oris and lower lip muscles." },
      { letter: "C", concept: "Cervical branch", detail: "Innervates the platysma muscle in the neck." }
    ],
    memoryPalace: "Walk into your kitchen: See an electric wall clock glowing (Temporal time), look down on the counter to find a zebra eating a piece of gum (Zygomatic), open the microwave to find a raw buccinator muscle ballooning (Buccal), turn to the kitchen sink where a mini boat motor is spinning the soapy water (Marginal Mandibular), and finally look at the doorway where a massive warm wool scarf (Cervical platysma) hangs.",
    clinicalPearls: [
      "Damage to CN VII results in Bell's Palsy, causing complete ipsilateral facial paralysis and loss of corneal reflex.",
      "The superficial temporal artery and anterior division run very close to these branches."
    ]
  },
  {
    id: "mnem_2",
    topic: "Surgical Extraction Stages & Complications",
    context: "A systematic framework to address teeth luxation and socket recovery.",
    phrase: "APEX: Access, Progress, Luxate, Extract",
    mapping: [
      { letter: "Access", concept: "Clear Mucoperiosteal flap & bone removal", detail: "Ensure deep visibility. Use a round surgical bur with copious saline irrigation." },
      { letter: "Progress", concept: "Engaging the periodontal ligament space", detail: "Use straight elevator or luxator at a 45-degree angle." },
      { letter: "Luxate", concept: "Controlled expansion of local alveolar walls", detail: "Lever and rotate slowly. Wait for bone deformation without applying snapping force." },
      { letter: "Extract", concept: "Delivery of root and socket toilet suction", detail: "Check root tips for complete extraction, curette apical granulomas, and irrigate cleanly." }
    ],
    memoryPalace: "Visualize the extraction surgery room: Head over to the operating chair where a huge neon sign says 'ACCESS APPROVED', open the instrument tray to watch progress dials climbing, look at the elevator tip glowing turquoise, and see the extracted tooth flying directly into a shiny clean gold bucket labeled 'SUCCESS'.",
    clinicalPearls: [
      "Always inspect extracted teeth for apical root curvatures or segment fractures.",
      "Never curette aggressively inside sockets near the lower alveolar nerve canal or maxillary sinus floor."
    ]
  }
];

export const SEED_DEPARTMENT_QUOTAS: DepartmentQuota[] = [
  {
    department: "Conservative Dentistry & Endodontics",
    items: [
      { id: "c-1", procedureName: "Class I/II Composite Restorations", targetCount: 20, completedCount: 14 },
      { id: "c-2", procedureName: "Class I/II Amalgam/GIC Restorations", targetCount: 15, completedCount: 11 },
      { id: "c-3", procedureName: "Anterior Teeth Root Canal Treatments (RCT)", targetCount: 5, completedCount: 3 },
      { id: "c-4", procedureName: "Posterior Tooth RCT (Observing/Assisting)", targetCount: 3, completedCount: 2 }
    ]
  },
  {
    department: "Prosthodontics, Crown & Bridge",
    items: [
      { id: "p-1", procedureName: "Complete Denture (CD) fabrication cases", targetCount: 5, completedCount: 3 },
      { id: "p-2", procedureName: "Removable Partial Dentures (RPD) designed", targetCount: 10, completedCount: 8 },
      { id: "p-3", procedureName: "Single Crown Preparation & temporization", targetCount: 3, completedCount: 1 }
    ]
  },
  {
    department: "Oral & Maxillofacial Surgery",
    items: [
      { id: "s-1", procedureName: "Simple Dental Extractions (Arches I/II/III)", targetCount: 50, completedCount: 38 },
      { id: "s-2", procedureName: "Suturing practice & soft tissue biopsies", targetCount: 5, completedCount: 3 },
      { id: "s-3", procedureName: "Local Anesthesia blocks (inferior alveolar, etc)", targetCount: 60, completedCount: 51 }
    ]
  },
  {
    department: "Periodontics",
    items: [
      { id: "pe-1", procedureName: "Full-mouth Ultrasonic & Hand Scaling (SRP)", targetCount: 30, completedCount: 24 },
      { id: "pe-2", procedureName: "Local Drug Delivery (LDA) application", targetCount: 3, completedCount: 1 }
    ]
  }
];

export const SEED_RESEARCH_PROJECTS: ResearchProject[] = [
  {
    id: "proj_sample_1",
    title: "Comparing push-out bond strength of bioceramic vs resin-based endodontic sealers",
    specialty: "Conservative Dentistry & Endodontics",
    description: "Conducting an in-vitro slice push-out study using a Universal Testing Machine. Goal is to determine if calcium silicate sealers provide superior structural bond strength to root dentin compared to traditional epoxy resin-based sealers (AH Plus). Extraction and cleaning of single-rooted human premolar teeth has been completed.",
    studyType: "In Vitro",
    targetDate: "2026-09-15",
    notes: "Teeth extracted from orthodontic patients. Storage in saline at room temperature. Slicing planned at 1mm thickness using diamond disk wafer under water cooling.",
    references: [
      "Elnaghy AM et al. Push-Out Bond Strength of Bioceramic Root Canal Sealer. J Endod, 2018.",
      "Malamed SF. Textbook of Endodontics Reference Chapter 12."
    ],
    milestones: [
      { id: "m1-1", name: "Institutional Ethics Review & Clearance", completed: true, dueDate: "2026-05-15", description: "Submission of materials sheet and tooth storage protocols" },
      { id: "m1-2", name: "Sample Collection (N=30 natural teeth)", completed: true, dueDate: "2026-06-10", description: "Collect human premolars from Oral Surgery orthodontic extraction clinics" },
      { id: "m1-3", name: "Sample Slicing & Core Instrumentation", completed: false, dueDate: "2026-07-01", description: "Embed teeth in acrylic resin rings and obtain micro slices" },
      { id: "m1-4", name: "UTM Machine Testing & Statistics", completed: false, dueDate: "2026-07-25", description: "Exert slow axial push output strength and draft SPSS files" }
    ],
    tasks: [
      { id: "t1-1", text: "Obtain formal IRB exemption/ethical waiver code", dueDate: "2026-05-30", completed: true, priority: "High" },
      { id: "t1-2", text: "Clean teeth surface and remove periodontal ligament tissues", dueDate: "2026-06-15", completed: true, priority: "High" },
      { id: "t1-3", text: "Schedule testing lab slot on Universal Testing Machine (UTM)", dueDate: "2026-06-28", completed: false, priority: "Medium" }
    ]
  }
];

export const SEED_REFERENCE_DOCS: ReferenceDOC[] = [
  {
    id: "ref_doc_1",
    title: "IRB Clinical Research Consent Form",
    category: "Regulatory Templates",
    description: "Standard model of ethical clearance document for dental and medical clinical surveys.",
    content: `INFORMED CONSENT FORM (CLINICAL WORKSHOPS & RESEARCH)

Title of Study: Assessment of Dental Awareness
BDS Academic Investigator: ____________________
Faculty Coordinator: ___________________________

I, the undersigned, understand that:
1. This is a strictly academic research seeking oral metrics.
2. Participation involves physical assessment & short visual questionnaire.
3. No personal identifiable markers will ever be released.
4. I can withdraw at any time.

Signed (Patient): ________________________   Date: ________
Signed (BDS Student): ____________________   Date: ________`
  },
  {
    id: "ref_doc_2",
    title: "PubMed Search syntax cheat-sheet",
    category: "Literature Indexing",
    description: "Formulas and Boolean rules for quick PubMed literature retrieval.",
    content: `PUBMED QUICK SEARCH BOOSTER CHEAT-SHEET

Formula 1: Specialty [Mesh] AND "Dental Materials"[Mesh] AND "Mechanical Stress"[Mesh]
Formula 2: ("Salivary diagnostics" OR "Oral fluid biomarkers") AND "Periodontitis"[Mesh]
Formula 3: ("Bioceramic sealer" OR "Mineral Trioxide Aggregate") AND "Microleakage"[Mesh]

Use * with root words to auto-include plurals (e.g., dent* returns dentin, dentine, dentistry, dentition).`
  }
];
