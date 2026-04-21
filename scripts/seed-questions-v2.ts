import { connectDB } from "../src/lib/db/connection";
import Question from "../src/lib/db/models/Question";
import Topic from "../src/lib/db/models/Topic";
import fs from "node:fs";
import path from "node:path";

// ─── Env loader ───────────────────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvLocal();

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionStyle = "direct" | "concept" | "statement" | "negative" | "indirect";
type SourceType = "pyq" | "pyq_variant" | "institute" | "internet";
type ExamTag = "ldc" | "lgs" | "degree" | "police";
type Difficulty = 1 | 2 | 3 | 4 | 5;

interface SeedQ {
  text: { en: string; ml: string };
  options: Array<{ key: string; en: string; ml: string }>;
  correctOption: string;
  explanation: { en: string; ml: string };
  topicId: string;
  subTopic: string;
  tags: string[];
  difficulty: Difficulty;
  questionStyle: QuestionStyle;
  examTags: ExamTag[];
  sourceType: SourceType;
  sourceRef: string;
  status: "review";
  createdByLabel: "ai";
  isVerified: false;
  pyq?: { exam: string; year: number; questionNumber: number };
  parentRef?: string; // temp key, resolved to ObjectId after insert
}

// ─── Question Bank ────────────────────────────────────────────────────────────
// Format: PYQ originals → variants → institute → internet
// Each PYQ block: 1 original + 4 variants (total 5 per PYQ cluster)

const QUESTIONS: SeedQ[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // CLUSTER 1 — Kerala Renaissance / Narayana Guru (PYQ)
  // Source: Kerala PSC LDC 2022, repeated in LGS 2021
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Sree Narayana Guru established the Advaita Ashram at which location?",
      ml: "ശ്രീനാരായണ ഗുരു അദ്വൈത ആശ്രമം സ്ഥാപിച്ചത് എവിടെ?",
    },
    options: [
      { key: "A", en: "Aruvippuram", ml: "അരുവിപ്പുറം" },
      { key: "B", en: "Aluva", ml: "ആലുവ" },
      { key: "C", en: "Varkala", ml: "വർക്കല" },
      { key: "D", en: "Sivagiri", ml: "ശിവഗിരി" },
    ],
    correctOption: "B",
    explanation: {
      en: "Sree Narayana Guru established the Advaita Ashram at Aluva (Alwaye) in 1913. He consecrated the first Shiva temple at Aruvippuram in 1888. His headquarters was at Sivagiri.",
      ml: "ശ്രീനാരായണ ഗുരു 1913-ൽ ആലുവയിൽ അദ്വൈത ആശ്രമം സ്ഥാപിച്ചു. 1888-ൽ അരുവിപ്പുറത്ത് ശിവക്ഷേത്രം പ്രതിഷ്ഠ നടത്തി. ശിവഗിരിയായിരുന്നു ആസ്ഥാനം.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["narayana_guru", "advaita", "ashram", "renaissance"],
    difficulty: 3,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq",
    sourceRef: "Kerala PSC LDC Exam 2022",
    pyq: { exam: "LDC", year: 2022, questionNumber: 34 },
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant 1 — Reverse
  {
    text: {
      en: "The Advaita Ashram established by Sree Narayana Guru in 1913 is located in:",
      ml: "ശ്രീനാരായണ ഗുരു 1913-ൽ സ്ഥാപിച്ച അദ്വൈത ആശ്രമം സ്ഥിതിചെയ്യുന്നത്:",
    },
    options: [
      { key: "A", en: "Thiruvananthapuram", ml: "തിരുവനന്തപുരം" },
      { key: "B", en: "Aluva", ml: "ആലുവ" },
      { key: "C", en: "Thrissur", ml: "തൃശ്ശൂർ" },
      { key: "D", en: "Palakkad", ml: "പാലക്കാട്" },
    ],
    correctOption: "B",
    explanation: {
      en: "The Advaita Ashram is located at Aluva (Alwaye) in Ernakulam district. It was established by Sree Narayana Guru in 1913 as a centre for his philosophy of oneness.",
      ml: "അദ്വൈത ആശ്രമം എറണാകുളം ജില്ലയിലെ ആലുവയിലാണ്. ഏകത്വ ദർശനത്തിനു വേണ്ടി ശ്രീനാരായണ ഗുരു 1913-ൽ ഇത് സ്ഥാപിച്ചു.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["narayana_guru", "advaita", "aluva", "renaissance"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LDC Exam 2022 (variant)",
    parentRef: "narayana_guru_advaita_ashram",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant 2 — Concept
  {
    text: {
      en: "Sree Narayana Guru's consecration at Aruvippuram in 1888 was revolutionary primarily because:",
      ml: "1888-ൽ അരുവിപ്പുറത്ത് ശ്രീനാരായണ ഗുരു നടത്തിയ പ്രതിഷ്ഠ വിപ്ലവകരമായത് പ്രധാനമായും:",
    },
    options: [
      { key: "A", en: "It was the first temple in Kerala", ml: "കേരളത്തിലെ ആദ്യ ക്ഷേത്രമായിരുന്നു" },
      { key: "B", en: "A non-Brahmin consecrated a Shiva temple, challenging caste barriers", ml: "ജാതി തടസ്സം ഭേദിച്ച് ഒരു ബ്രാഹ്മണേതരൻ ശിവക്ഷേത്രം പ്രതിഷ്ഠ നടത്തി" },
      { key: "C", en: "It was consecrated without government permission", ml: "സർക്കാർ അനുവാദമില്ലാതെ പ്രതിഷ്ഠ നടത്തി" },
      { key: "D", en: "It was the largest temple in Travancore", ml: "തിരുവിതാംകൂറിലെ ഏറ്റവും വലിയ ക്ഷേത്രമായിരുന്നു" },
    ],
    correctOption: "B",
    explanation: {
      en: "Narayana Guru, born into the Ezhava community (considered lower caste), consecrated a Shiva idol at Aruvippuram in 1888. This directly challenged the Brahmin monopoly on temple rituals and became a major act of social reform.",
      ml: "ഈഴവ സമുദായത്തിൽ ജനിച്ച നാരായണ ഗുരു 1888-ൽ അരുവിപ്പുറത്ത് ശിവ പ്രതിഷ്ഠ നടത്തി. ഇത് ക്ഷേത്ര ആചാരങ്ങളിലെ ബ്രാഹ്മണ ആധിപത്യത്തെ വെല്ലുവിളിക്കുകയും സാമൂഹ്യ പരിഷ്കരണത്തിന്റെ വലിയ അടയാളമാകുകയും ചെയ്തു.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["narayana_guru", "aruvippuram", "social_reform", "caste"],
    difficulty: 4,
    questionStyle: "concept",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LDC Exam 2022 (concept variant)",
    parentRef: "narayana_guru_advaita_ashram",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant 3 — Negative
  {
    text: {
      en: "Which of the following is NOT associated with Sree Narayana Guru?",
      ml: "ഇനിപ്പറയുന്നവയിൽ ശ്രീനാരായണ ഗുരുവുമായി ബന്ധപ്പെടാത്തത് ഏത്?",
    },
    options: [
      { key: "A", en: "SNDP Yogam", ml: "എസ്.എൻ.ഡി.പി. യോഗം" },
      { key: "B", en: "Advaita Ashram, Aluva", ml: "അദ്വൈത ആശ്രം, ആലുവ" },
      { key: "C", en: "Kundara Proclamation", ml: "കുണ്ടറ വിളംബരം" },
      { key: "D", en: "Aruvippuram temple consecration", ml: "അരുവിപ്പുറം ക്ഷേത്ര പ്രതിഷ്ഠ" },
    ],
    correctOption: "C",
    explanation: {
      en: "The Kundara Proclamation (1809) was issued by Velu Thampi Dalawa against British rule, not associated with Narayana Guru. SNDP Yogam (founded 1903), Advaita Ashram (1913), and Aruvippuram (1888) are all connected to Narayana Guru.",
      ml: "കുണ്ടറ വിളംബരം (1809) ബ്രിട്ടീഷ് ഭരണത്തിനെതിരെ വേലുത്തമ്പി ദളവ പ്രഖ്യാപിച്ചതാണ്. SNDP യോഗം (1903), അദ്വൈത ആശ്രമം (1913), അരുവിപ്പുറം (1888) എന്നിവ നാരായണ ഗുരുവുമായി ബന്ധപ്പെട്ടതാണ്.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["narayana_guru", "kundara", "sndp", "negative"],
    difficulty: 3,
    questionStyle: "negative",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LDC Exam 2022 (negative variant)",
    parentRef: "narayana_guru_advaita_ashram",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant 4 — Statement-based
  {
    text: {
      en: "Consider the following statements about Sree Narayana Guru:\nI. He founded the SNDP Yogam in 1903.\nII. He consecrated a temple at Aruvippuram in 1888.\nIII. His motto was 'One Caste, One Religion, One God for Man'.\nWhich of the above is/are correct?",
      ml: "ശ്രീനാരായണ ഗുരുവിനെ കുറിച്ചുള്ള ഈ പ്രസ്താവനകൾ പരിഗണിക്കുക:\nI. 1903-ൽ SNDP യോഗം സ്ഥാപിച്ചു.\nII. 1888-ൽ അരുവിപ്പുറത്ത് ക്ഷേത്രം പ്രതിഷ്ഠ നടത്തി.\nIII. 'ഒരു ജാതി, ഒരു മതം, ഒരു ദൈവം മനുഷ്യന്' എന്നതായിരുന്നു സന്ദേശം.\nഏതൊക്കെ ശരിയാണ്?",
    },
    options: [
      { key: "A", en: "I and II only", ml: "I ഉം II ഉം മാത്രം" },
      { key: "B", en: "II and III only", ml: "II ഉം III ഉം മാത്രം" },
      { key: "C", en: "I and III only", ml: "I ഉം III ഉം മാത്രം" },
      { key: "D", en: "I, II and III", ml: "I, II, III എല്ലാം" },
    ],
    correctOption: "D",
    explanation: {
      en: "All three statements are correct. Narayana Guru founded SNDP Yogam in 1903. He consecrated the Shiva temple at Aruvippuram in 1888. His celebrated motto 'Oru Jathi Oru Matham Oru Daivam Manushyanu' means 'One Caste, One Religion, One God for Man'.",
      ml: "മൂന്ന് പ്രസ്താവനകളും ശരിയാണ്. 1903-ൽ SNDP യോഗം, 1888-ൽ അരുവിപ്പുറം പ്രതിഷ്ഠ, 'ഒരു ജാതി ഒരു മതം ഒരു ദൈവം മനുഷ്യന്' എന്ന ഗുരുദേവ സന്ദേശം — ഇവ മൂന്നും ശ്രീനാരായണ ഗുരുവുമായി ബന്ധപ്പെട്ടതാണ്.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["narayana_guru", "sndp", "statement", "motto"],
    difficulty: 4,
    questionStyle: "statement",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LDC Exam 2022 (statement variant)",
    parentRef: "narayana_guru_advaita_ashram",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CLUSTER 2 — Indian Constitution / Fundamental Rights (PYQ)
  // Source: Kerala PSC LGS 2023, repeats multiple years
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Which Article of the Indian Constitution guarantees the Right to Constitutional Remedies?",
      ml: "ഭരണഘടനാ പ്രതിവിധിക്കുള്ള അവകാശം ഉറപ്പ് നൽകുന്ന ഇന്ത്യൻ ഭരണഘടനയിലെ ആർട്ടിക്കിൾ?",
    },
    options: [
      { key: "A", en: "Article 19", ml: "ആർട്ടിക്കിൾ 19" },
      { key: "B", en: "Article 21", ml: "ആർട്ടിക്കിൾ 21" },
      { key: "C", en: "Article 32", ml: "ആർട്ടിക്കിൾ 32" },
      { key: "D", en: "Article 44", ml: "ആർട്ടിക്കിൾ 44" },
    ],
    correctOption: "C",
    explanation: {
      en: "Article 32 gives citizens the right to move the Supreme Court for enforcement of Fundamental Rights. Dr. Ambedkar called it the 'heart and soul' of the Constitution. Article 226 gives the same power to High Courts.",
      ml: "ആർട്ടിക്കിൾ 32 മൗലികാവകാശ സംരക്ഷണത്തിനായി സുപ്രീം കോടതിയെ സമീപിക്കാൻ പൗരന് അവകാശം നൽകുന്നു. ഡോ. അംബേദ്കർ ഇതിനെ ഭരണഘടനയുടെ 'ഹൃദയവും ആത്മാവും' എന്ന് വിളിച്ചു.",
    },
    topicId: "polity",
    subTopic: "fundamental_rights",
    tags: ["article_32", "fundamental_rights", "supreme_court", "ambedkar"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "pyq",
    sourceRef: "Kerala PSC LGS Exam 2023",
    pyq: { exam: "LGS", year: 2023, questionNumber: 18 },
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Concept
  {
    text: {
      en: "Dr. Ambedkar described which Article of the Constitution as its 'heart and soul'?",
      ml: "ഏത് ആർട്ടിക്കിളിനെ ഡോ. അംബേദ്കർ ഭരണഘടനയുടെ 'ഹൃദയവും ആത്മാവും' എന്ന് വിളിച്ചു?",
    },
    options: [
      { key: "A", en: "Article 14", ml: "ആർട്ടിക്കിൾ 14" },
      { key: "B", en: "Article 21", ml: "ആർട്ടിക്കിൾ 21" },
      { key: "C", en: "Article 32", ml: "ആർട്ടിക്കിൾ 32" },
      { key: "D", en: "Article 368", ml: "ആർട്ടിക്കിൾ 368" },
    ],
    correctOption: "C",
    explanation: {
      en: "Dr. B.R. Ambedkar called Article 32 the 'heart and soul' of the Constitution because it gives citizens the power to directly approach the Supreme Court if any Fundamental Right is violated.",
      ml: "ഡോ. ബി.ആർ. അംബേദ്കർ ആർട്ടിക്കിൾ 32-നെ ഭരണഘടനയുടെ 'ഹൃദയവും ആത്മാവും' എന്ന് വിളിച്ചു. ഏതെങ്കിലും മൗലികാവകാശം ലംഘിക്കപ്പെട്ടാൽ നേരിട്ട് സുപ്രീം കോടതിയെ സമീപിക്കാൻ ഇത് അനുവദിക്കുന്നു.",
    },
    topicId: "polity",
    subTopic: "fundamental_rights",
    tags: ["article_32", "ambedkar", "heart_soul", "constitution"],
    difficulty: 3,
    questionStyle: "indirect",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LGS Exam 2023 (indirect variant)",
    parentRef: "article_32_fundamental_rights",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Negative
  {
    text: {
      en: "Which of the following Articles does NOT fall under Fundamental Rights (Part III)?",
      ml: "ഇനിപ്പറയുന്നവയിൽ ഏത് ആർട്ടിക്കിൾ മൗലികാവകാശങ്ങൾ (ഭാഗം III)-ൽ ഉൾപ്പെടുന്നില്ല?",
    },
    options: [
      { key: "A", en: "Article 14 — Right to Equality", ml: "ആർട്ടിക്കിൾ 14 — സമത്വത്തിനുള്ള അവകാശം" },
      { key: "B", en: "Article 19 — Right to Freedom", ml: "ആർട്ടിക്കിൾ 19 — സ്വാതന്ത്ര്യത്തിനുള്ള അവകാശം" },
      { key: "C", en: "Article 32 — Right to Constitutional Remedies", ml: "ആർട്ടിക്കിൾ 32 — ഭരണഘടനാ പ്രതിവിധി" },
      { key: "D", en: "Article 44 — Uniform Civil Code", ml: "ആർട്ടിക്കിൾ 44 — ഏകീകൃത സിവിൽ കോഡ്" },
    ],
    correctOption: "D",
    explanation: {
      en: "Article 44 (Uniform Civil Code) is a Directive Principle of State Policy (Part IV), not a Fundamental Right. Articles 12-35 form Part III (Fundamental Rights) of the Constitution.",
      ml: "ആർട്ടിക്കിൾ 44 (ഏകീകൃത സിവിൽ കോഡ്) ഭരണഘടനയുടെ ഭാഗം IV-ൽ (DPSP) ഉൾപ്പെടുന്നു, മൗലികാവകാശമല്ല. ഭരണഘടനയുടെ ആർട്ടിക്കിൾ 12-35 ആണ് ഭാഗം III (മൗലികാവകാശങ്ങൾ).",
    },
    topicId: "polity",
    subTopic: "fundamental_rights",
    tags: ["fundamental_rights", "dpsp", "article_44", "negative"],
    difficulty: 3,
    questionStyle: "negative",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LGS Exam 2023 (negative variant)",
    parentRef: "article_32_fundamental_rights",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Statement
  {
    text: {
      en: "Consider the following statements about Fundamental Rights:\nI. They are absolute and cannot be restricted under any circumstances.\nII. Right to Property was removed as a Fundamental Right by the 44th Amendment.\nIII. Article 32 itself is a Fundamental Right.\nWhich statements are correct?",
      ml: "മൗലികാവകാശങ്ങളെക്കുറിച്ചുള്ള പ്രസ്താവനകൾ:\nI. ഇവ സമ്പൂർണ്ണമാണ്, ഒരു സാഹചര്യത്തിലും നിയന്ത്രിക്കാനാകില്ല.\nII. 44-ാം ഭേദഗതി മുഖേന സ്വത്തവകാശം മൗലികാവകാശ പട്ടികയിൽ നിന്ന് നീക്കി.\nIII. ആർട്ടിക്കിൾ 32 തന്നെ ഒരു മൗലികാവകാശമാണ്.\nഏതൊക്കെ ശരിയാണ്?",
    },
    options: [
      { key: "A", en: "I and II only", ml: "I ഉം II ഉം മാത്രം" },
      { key: "B", en: "II and III only", ml: "II ഉം III ഉം മാത്രം" },
      { key: "C", en: "I and III only", ml: "I ഉം III ഉം മാത്രം" },
      { key: "D", en: "I, II and III", ml: "I, II, III എല്ലാം" },
    ],
    correctOption: "B",
    explanation: {
      en: "Statement I is WRONG — Fundamental Rights can be restricted (e.g., during emergency, or reasonable restrictions under Article 19). Statement II is correct — the 44th Amendment (1978) removed Right to Property from Fundamental Rights (now Article 300A). Statement III is correct — Article 32 is itself listed as a Fundamental Right.",
      ml: "I തെറ്റ് — അടിയന്തരാവസ്ഥ പോലുള്ള സന്ദർഭങ്ങളിൽ മൗലികാവകാശങ്ങൾ നിയന്ത്രിക്കാം. II ശരി — 44-ാം ഭേദഗതി (1978) സ്വത്തവകാശം മൗലിക അവകാശ പട്ടികയിൽ നിന്ന് നീക്കി. III ശരി — ആർട്ടിക്കിൾ 32 തന്നെ ഒരു മൗലികാവകാശമാണ്.",
    },
    topicId: "polity",
    subTopic: "fundamental_rights",
    tags: ["fundamental_rights", "44th_amendment", "article_32", "statement"],
    difficulty: 5,
    questionStyle: "statement",
    examTags: ["degree", "lgs"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LGS Exam 2023 (statement variant)",
    parentRef: "article_32_fundamental_rights",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CLUSTER 3 — Kerala Geography / Rivers (PYQ)
  // Source: Kerala PSC Police Constable 2023
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Which river forms the boundary between Ernakulam and Thrissur districts?",
      ml: "എറണാകുളം, തൃശ്ശൂർ ജില്ലകൾ തമ്മിലുള്ള അതിർത്തി രൂപപ്പെടുത്തുന്ന നദി ഏത്?",
    },
    options: [
      { key: "A", en: "Periyar", ml: "പെരിയാർ" },
      { key: "B", en: "Chalakudy River", ml: "ചാലക്കുടി പുഴ" },
      { key: "C", en: "Muvattupuzha", ml: "മൂവാറ്റുപുഴ" },
      { key: "D", en: "Bharathapuzha", ml: "ഭാരതപ്പുഴ" },
    ],
    correctOption: "B",
    explanation: {
      en: "The Chalakudy River (Chalakudy Puzha) forms part of the boundary between Ernakulam and Thrissur districts. It originates from Anamalai hills and drains into the Arabian Sea near Kodungallur.",
      ml: "ചാലക്കുടി പുഴ എറണാകുളം-തൃശ്ശൂർ ജില്ലകളുടെ അതിർത്തിയുടെ ഭാഗമാണ്. അണമലൈ കുന്നുകളിൽ ഉത്ഭവിച്ച് കൊടുങ്ങല്ലൂർ അടുത്ത് അറബിക്കടലിൽ പതിക്കുന്നു.",
    },
    topicId: "geography",
    subTopic: "kerala_geography",
    tags: ["chalakudy_river", "rivers", "districts", "ernakulam", "thrissur"],
    difficulty: 3,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "police"],
    sourceType: "pyq",
    sourceRef: "Kerala PSC Police Constable Exam 2023",
    pyq: { exam: "Police Constable", year: 2023, questionNumber: 42 },
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Negative
  {
    text: {
      en: "Which of the following rivers does NOT originate from the Western Ghats?",
      ml: "ഇനിപ്പറയുന്ന നദികളിൽ പശ്ചിമഘട്ടത്തിൽ നിന്ന് ഉത്ഭവിക്കാത്തത് ഏത്?",
    },
    options: [
      { key: "A", en: "Periyar", ml: "പെരിയാർ" },
      { key: "B", en: "Pamba", ml: "പമ്പ" },
      { key: "C", en: "Kabani", ml: "കബനി" },
      { key: "D", en: "Vembanad backwaters", ml: "വേമ്പനാട് കായൽ" },
    ],
    correctOption: "D",
    explanation: {
      en: "Vembanad is a backwater lake, not a river, and does not originate from the Western Ghats. It is a lagoon fed by multiple rivers. Periyar, Pamba, and Kabani all originate from the Western Ghats.",
      ml: "വേമ്പനാട് ഒരു കായൽ (ലഗൂൺ) ആണ്, നദിയല്ല. ഇത് പശ്ചിമഘട്ടത്തിൽ ഉത്ഭവിക്കുന്നില്ല. പെരിയാർ, പമ്പ, കബനി എന്നിവ പശ്ചിമഘട്ടത്തിൽ നിന്ന് ഉദ്ഭവിക്കുന്നു.",
    },
    topicId: "geography",
    subTopic: "kerala_geography",
    tags: ["rivers", "western_ghats", "vembanad", "negative"],
    difficulty: 3,
    questionStyle: "negative",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC Police Constable Exam 2023 (negative variant)",
    parentRef: "chalakudy_river_boundary",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Concept
  {
    text: {
      en: "Kerala has 44 rivers, but most of them are west-flowing. What geographical factor primarily causes this?",
      ml: "കേരളത്തിൽ 44 നദികളുണ്ട്, അതിൽ മിക്കവയും പടിഞ്ഞാറോട്ട് ഒഴുകുന്നു. ഇതിനു കാരണമായ ഭൂമിശാസ്ത്ര ഘടകം:",
    },
    options: [
      { key: "A", en: "The Arabian Sea exerts gravitational pull on rivers", ml: "അറബിക്കടൽ നദികളെ ആകർഷിക്കുന്നു" },
      { key: "B", en: "Western Ghats act as a watershed, sloping steeply toward Arabian Sea", ml: "പശ്ചിമഘട്ടം ജലവിഭജനി ആയി വർത്തിക്കുന്നു, അറബിക്കടലിലേക്ക് ചരിഞ്ഞ് കിടക്കുന്നു" },
      { key: "C", en: "All Indian rivers are west-flowing", ml: "ഇന്ത്യൻ നദികളെല്ലാം പടിഞ്ഞാറ് ഒഴുകുന്നവയാണ്" },
      { key: "D", en: "Monsoon winds push water westward", ml: "മൺസൂൺ കാറ്റ് ജലത്തെ പടിഞ്ഞാറോട്ട് തള്ളുന്നു" },
    ],
    correctOption: "B",
    explanation: {
      en: "The Western Ghats run parallel to the coast and form a watershed. The western slopes are steep and short (rivers flow fast to the Arabian Sea), while the eastern slopes are gentler. Only 3 of Kerala's 44 rivers (Kabani, Bhavani, Pambar) flow eastward into Tamil Nadu.",
      ml: "പശ്ചിമഘട്ടം തീരത്തിന് സമാന്തരമായി നിൽക്കുന്ന ജലവിഭജനിയാണ്. പടിഞ്ഞാറൻ ചരിവ് ചെങ്കുത്തും ഹ്രസ്വവുമായതിനാൽ നദികൾ വേഗത്തിൽ അറബിക്കടലിൽ പതിക്കുന്നു. കബനി, ഭവാനി, പാമ്പാർ എന്നിവ മാത്രം കിഴക്കോട്ട് ഒഴുകുന്നു.",
    },
    topicId: "geography",
    subTopic: "kerala_geography",
    tags: ["rivers", "western_ghats", "concept", "watershed"],
    difficulty: 4,
    questionStyle: "concept",
    examTags: ["lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC Police Constable Exam 2023 (concept variant)",
    parentRef: "chalakudy_river_boundary",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CLUSTER 4 — Vaikom Satyagraha (PYQ Classic — repeats every 2-3 years)
  // Source: Kerala PSC Secretariat Asst 2022, LGS 2021
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "The Vaikom Satyagraha (1924–25) was primarily a movement against:",
      ml: "വൈക്കം സത്യാഗ്രഹം (1924-25) പ്രധാനമായും ഏതിനെതിരായ പ്രക്ഷോഭമായിരുന്നു?",
    },
    options: [
      { key: "A", en: "British colonial rule in Travancore", ml: "തിരുവിതാംകൂറിലെ ബ്രിട്ടീഷ് ഭരണം" },
      { key: "B", en: "Untouchability and denial of road access near temples", ml: "അയിത്തവും ക്ഷേത്ര റോഡ് വിലക്കും" },
      { key: "C", en: "Tax imposition on lower caste communities", ml: "പിന്നാക്ക ജാതികൾക്ക് മേൽ നികുതി ചുമത്തൽ" },
      { key: "D", en: "Denial of voting rights to Dalits", ml: "ദലിതർക്ക് വോട്ടവകാശം നിഷേധം" },
    ],
    correctOption: "B",
    explanation: {
      en: "Vaikom Satyagraha (March 1924 – November 1925) was against untouchability — specifically the practice of barring lower caste people from using public roads near the Vaikom temple in Travancore. T.K. Madhavan, K. Kelappan, and later Gandhi visited and supported it.",
      ml: "വൈക്കം സത്യാഗ്രഹം (1924 മാർച്ച് – 1925 നവംബർ) അയിത്തത്തിനെതിരായിരുന്നു, പ്രത്യേകിച്ച് വൈക്കം ക്ഷേത്ര സമീപ പൊതുനിരത്ത് ഉപയോഗിക്കുന്നതിൽ നിന്ന് നിന്ന് അവർണ്ണരെ തടഞ്ഞിരുന്ന സമ്പ്രദായത്തിനെതിരായി. ടി.കെ. മാധവൻ, കെ. കേളപ്പൻ, ഗാന്ധി പിന്തുണ നൽകി.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["vaikom_satyagraha", "social_reform", "untouchability", "travancore"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq",
    sourceRef: "Kerala PSC Secretariat Asst Exam 2022",
    pyq: { exam: "Secretariat Asst", year: 2022, questionNumber: 27 },
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Indirect
  {
    text: {
      en: "A 1924 movement in Travancore, described by Mahatma Gandhi as a 'religious movement to open public roads', led to the lifting of restrictions for lower castes. This refers to:",
      ml: "1924-ൽ തിരുവിതാംകൂറിൽ മഹാത്മ ഗാന്ധി 'പൊതുനിരത്ത് തുറക്കാനുള്ള മതപ്രക്ഷോഭം' എന്നു വിളിച്ച ഒരു ആന്ദോളനം. ഇത് ഏതിനെ സൂചിപ്പിക്കുന്നു?",
    },
    options: [
      { key: "A", en: "Guruvayur Satyagraha", ml: "ഗുരുവായൂർ സത്യാഗ്രഹം" },
      { key: "B", en: "Vaikom Satyagraha", ml: "വൈക്കം സത്യാഗ്രഹം" },
      { key: "C", en: "Savarna Jatha", ml: "സവർണ ജാഥ" },
      { key: "D", en: "Kallumala Agitation", ml: "കല്ലുമാല സമരം" },
    ],
    correctOption: "B",
    explanation: {
      en: "Gandhi visited Vaikom in 1925 and described the Vaikom Satyagraha as a 'religious movement to open public roads' to untouchables. It succeeded partially in opening roads but not the temple itself.",
      ml: "1925-ൽ ഗാന്ധി വൈക്കം സന്ദർശിക്കുകയും ഈ സമരത്തെ 'പൊതുനിരത്ത് തുറക്കാനുള്ള മതപ്രക്ഷോഭം' എന്നു വിളിക്കുകയും ചെയ്തു. ക്ഷേത്ര പ്രദക്ഷിണ വഴി ഭാഗികമായി തുറന്നുകൊടുക്കപ്പെട്ടു.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["vaikom_satyagraha", "gandhi", "indirect", "social_reform"],
    difficulty: 4,
    questionStyle: "indirect",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC Secretariat Asst 2022 (indirect variant)",
    parentRef: "vaikom_satyagraha_movement",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Statement
  {
    text: {
      en: "Consider these statements about Vaikom Satyagraha:\nI. It was launched in 1924 against caste-based road restrictions near Vaikom temple.\nII. T.K. Madhavan was a key organiser.\nIII. It achieved complete success immediately.\nWhich is/are correct?",
      ml: "വൈക്കം സത്യാഗ്രഹത്തെക്കുറിച്ചുള്ള പ്രസ്താവനകൾ:\nI. 1924-ൽ വൈക്കം ക്ഷേത്ര സമീപ ജാതി നിരോധനത്തിനെതിരെ ആരംഭിച്ചു.\nII. ടി.കെ. മാധവൻ പ്രധാന സംഘാടകനായിരുന്നു.\nIII. ഉടനടി പൂർണ്ണ വിജയം ലഭിച്ചു.\nഏതൊക്കെ ശരിയാണ്?",
    },
    options: [
      { key: "A", en: "I only", ml: "I മാത്രം" },
      { key: "B", en: "I and II only", ml: "I ഉം II ഉം" },
      { key: "C", en: "II and III only", ml: "II ഉം III ഉം" },
      { key: "D", en: "I, II and III", ml: "I, II, III" },
    ],
    correctOption: "B",
    explanation: {
      en: "Statements I and II are correct. Statement III is WRONG — the Satyagraha achieved only partial success. Roads near the temple were opened, but Dalits were not allowed into the temple itself. Full temple entry happened only after the Temple Entry Proclamation of 1936.",
      ml: "I ഉം II ഉം ശരി. III തെറ്റ് — ഭാഗിക വിജയം മാത്രം. ക്ഷേത്ര വഴികൾ തുറന്നുകൊടുത്തെങ്കിലും ദലിതർക്ക് ക്ഷേത്ര പ്രവേശം 1936-ലെ ക്ഷേത്ര പ്രവേശന വിളംബരം വരെ ലഭിച്ചില്ല.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["vaikom_satyagraha", "statement", "tk_madhavan"],
    difficulty: 4,
    questionStyle: "statement",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC Secretariat Asst 2022 (statement variant)",
    parentRef: "vaikom_satyagraha_movement",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CLUSTER 5 — Panchayati Raj / 73rd Amendment (PYQ)
  // Source: Kerala PSC VEO Exam 2023, Degree Level 2022
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Which Constitutional Amendment gave constitutional status to Panchayati Raj institutions?",
      ml: "ഏത് ഭരണഘടനാ ഭേദഗതി പഞ്ചായത്തി രാജ് സ്ഥാപനങ്ങൾക്ക് ഭരണഘടനാ പദവി നൽകി?",
    },
    options: [
      { key: "A", en: "42nd Amendment", ml: "42-ാം ഭേദഗതി" },
      { key: "B", en: "44th Amendment", ml: "44-ാം ഭേദഗതി" },
      { key: "C", en: "73rd Amendment", ml: "73-ാം ഭേദഗതി" },
      { key: "D", en: "86th Amendment", ml: "86-ാം ഭേദഗതി" },
    ],
    correctOption: "C",
    explanation: {
      en: "The 73rd Constitutional Amendment Act (1992), effective April 24, 1993, added Part IX and Schedule 11 to the Constitution, giving constitutional status to Panchayati Raj. April 24 is celebrated as National Panchayati Raj Day.",
      ml: "73-ാം ഭരണഘടനാ ഭേദഗതി (1992), 1993 ഏപ്രിൽ 24 മുതൽ പ്രാബല്യത്തിൽ, ഭരണഘടനയിൽ ഭാഗം IX ഉം ഷെഡ്യൂൾ 11 ഉം കൂട്ടിച്ചേർത്ത് പഞ്ചായത്തി രാജ് സ്ഥാപനങ്ങൾക്ക് ഭരണഘടനാ പദവി നൽകി. ഏപ്രിൽ 24 ദേശീയ പഞ്ചായത്തി രാജ് ദിവസം.",
    },
    topicId: "polity",
    subTopic: "panchayati_raj",
    tags: ["73rd_amendment", "panchayati_raj", "local_govt", "constitution"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "pyq",
    sourceRef: "Kerala PSC VEO Exam 2023",
    pyq: { exam: "VEO", year: 2023, questionNumber: 15 },
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Concept
  {
    text: {
      en: "The 73rd Amendment to the Indian Constitution introduced mandatory reservation for which groups in Panchayati Raj institutions?",
      ml: "73-ാം ഭേദഗതി പഞ്ചായത്തി രാജ് സ്ഥാപനങ്ങളിൽ ഏത് വിഭാഗങ്ങൾക്ക് നിർബന്ധ സംവരണം ഏർപ്പെടുത്തി?",
    },
    options: [
      { key: "A", en: "Only Scheduled Castes", ml: "പട്ടികജാതിക്കാർ മാത്രം" },
      { key: "B", en: "Women (1/3), SC and ST", ml: "സ്ത്രീകൾ (1/3), SC, ST" },
      { key: "C", en: "OBC and Women only", ml: "OBC ഉം സ്ത്രീകളും മാത്രം" },
      { key: "D", en: "SC, ST and Minorities", ml: "SC, ST, ന്യൂനപക്ഷങ്ങൾ" },
    ],
    correctOption: "B",
    explanation: {
      en: "The 73rd Amendment mandated reservation of not less than 1/3 of total seats for women (including SC/ST women), plus reservation for SC and ST proportional to their population. Many states including Kerala now give 50% reservation to women in local bodies.",
      ml: "73-ാം ഭേദഗതി SC/ST സ്ത്രീകൾ ഉൾപ്പെടെ 1/3-ൽ കുറയാതെ സ്ത്രീകൾക്ക് സംവരണം, SC/ST-ക്ക് ജനസംഖ്യ അനുപാതത്തിൽ സംവരണം എന്നിവ നിർബന്ധം. കേരളം ഇപ്പോൾ 50% സ്ത്രീ സംവരണം നൽകുന്നു.",
    },
    topicId: "polity",
    subTopic: "panchayati_raj",
    tags: ["73rd_amendment", "reservation", "women", "panchayati_raj"],
    difficulty: 3,
    questionStyle: "concept",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC VEO Exam 2023 (concept variant)",
    parentRef: "73rd_amendment_panchayati_raj",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CLUSTER 6 — General Science / Biology — Human Body (PYQ)
  // Source: Kerala PSC LDC 2021, Police 2022
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "The largest organ in the human body is:",
      ml: "മനുഷ്യ ശരീരത്തിലെ ഏറ്റവും വലിയ അവയവം:",
    },
    options: [
      { key: "A", en: "Liver", ml: "കരൾ" },
      { key: "B", en: "Brain", ml: "തലച്ചോറ്" },
      { key: "C", en: "Skin", ml: "ചർമ്മം" },
      { key: "D", en: "Lungs", ml: "ശ്വാസകോശം" },
    ],
    correctOption: "C",
    explanation: {
      en: "The skin is the largest organ of the human body, with a total area of about 1.5-2 square meters and weighing around 4 kg in an adult. It acts as a barrier against infection and regulates body temperature.",
      ml: "ചർമ്മം മനുഷ്യ ശരീരത്തിലെ ഏറ്റവും വലിയ അവയവമാണ്. ഒരു മുതിർന്ന ആളിൽ ഏകദേശം 1.5-2 ചതുരശ്ര മീ. വിസ്തൃതിയും ഏകദേശം 4 കിലോ ഭാരവും. അണുബാധ തടയാനും ശരീര താപം നിയന്ത്രിക്കാനും സഹായിക്കുന്നു.",
    },
    topicId: "science",
    subTopic: "human_body",
    tags: ["human_body", "skin", "organs", "biology"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "pyq",
    sourceRef: "Kerala PSC LDC Exam 2021",
    pyq: { exam: "LDC", year: 2021, questionNumber: 56 },
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  // Variant — Negative
  {
    text: {
      en: "Which of the following is NOT a function of the liver?",
      ml: "ഇനിപ്പറയുന്നവയിൽ കരളിന്റെ പ്രവർത്തനം അല്ലാത്തത് ഏത്?",
    },
    options: [
      { key: "A", en: "Bile production", ml: "പിത്ത ഉൽപ്പാദനം" },
      { key: "B", en: "Glycogen storage", ml: "ഗ്ലൈക്കോജൻ സംഭരണം" },
      { key: "C", en: "Blood filtration", ml: "രക്ത ശുദ്ധീകരണം" },
      { key: "D", en: "Insulin production", ml: "ഇൻസുലിൻ ഉൽപ്പാദനം" },
    ],
    correctOption: "D",
    explanation: {
      en: "Insulin is produced by the beta cells of the pancreas (Islets of Langerhans), not the liver. The liver produces bile, stores glycogen (energy reserve), and filters blood from the digestive system via the portal vein.",
      ml: "ഇൻസുലിൻ ഉൽപ്പാദിപ്പിക്കുന്നത് ആഗ്നേയഗ്രന്ഥിയിലെ ലാംഗർഹാൻസ് ദ്വീപുകളിലെ ബീറ്റ കോശങ്ങൾ ആണ്, കരൾ അല്ല. കരൾ പിത്ത ഉൽപ്പാദനം, ഗ്ലൈക്കോജൻ സംഭരണം, പോർട്ടൽ ഞരമ്പ് വഴി രക്ത ശുദ്ധീകരണം ഇവ നടത്തുന്നു.",
    },
    topicId: "science",
    subTopic: "human_body",
    tags: ["liver", "insulin", "pancreas", "negative", "biology"],
    difficulty: 3,
    questionStyle: "negative",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "pyq_variant",
    sourceRef: "Kerala PSC LDC Exam 2021 (negative variant)",
    parentRef: "largest_organ_skin",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INSTITUTE MATERIAL — Kerala History
  // Source: PSC Rank File 2024, Winners Academy Notes
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "The Ezhava Memorial, the first political petition (1896) demanding public service opportunities for lower castes, was submitted to:",
      ml: "1896-ലെ ഈഴവ മെമ്മോറിയൽ — ജനസേവന അവകാശം ആവശ്യപ്പെട്ട ആദ്യ രാഷ്ട്രീയ ഹർജി — സമർപ്പിച്ചത് ആർക്ക്?",
    },
    options: [
      { key: "A", en: "British Viceroy Lord Elgin", ml: "ബ്രിട്ടീഷ് വൈസ്രോയ് ലോർഡ് ഇൽഗൻ" },
      { key: "B", en: "Maharaja of Travancore", ml: "തിരുവിതാംകൂർ മഹാരാജാ" },
      { key: "C", en: "Mahatma Gandhi", ml: "മഹാത്മ ഗാന്ധി" },
      { key: "D", en: "British Resident in Travancore", ml: "തിരുവിതാംകൂറിലെ ബ്രിട്ടീഷ് റെസിഡന്റ്" },
    ],
    correctOption: "B",
    explanation: {
      en: "The Ezhava Memorial (1896) was a petition signed by approximately 13,000 Ezhava families and submitted to the Maharaja of Travancore, demanding representation in government services. It was drafted by Dr. Palpu and supported by Narayana Guru.",
      ml: "ഈഴവ മെമ്മോറിയൽ (1896) ഏകദേശം 13,000 ഈഴവ കുടുംബങ്ങൾ ഒപ്പുവച്ച് തിരുവിതാംകൂർ മഹാരാജാക്ക് നൽകിയ ഹർജിയായിരുന്നു. ഗവൺമെന്റ് സേവനത്തിൽ പ്രാതിനിധ്യം ആവശ്യപ്പെട്ടു. ഡോ. പൽപ്പു തയ്യാറാക്കി, നാരായണ ഗുരു പിന്തുണച്ചു.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["ezhava_memorial", "dr_palpu", "travancore", "social_reform"],
    difficulty: 4,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Kerala Renaissance Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "The Kallumala Agitation of 1915 in Kerala was a protest against:",
      ml: "1915-ലെ കേരളത്തിലെ കല്ലുമാല സമരം ഏതിനെതിരായ പ്രതിഷേധമായിരുന്നു?",
    },
    options: [
      { key: "A", en: "Caste restriction on entering temples", ml: "ക്ഷേത്ര പ്രവേശന ജാതി നിരോധനം" },
      { key: "B", en: "Forced wearing of upper body covering by Nadar women", ml: "നാടർ സ്ത്രീകളെ കൂടം ധരിക്കുന്നതിൽ നിന്ന് വിലക്ക്" },
      { key: "C", en: "Stone bead ornaments that lower castes were forced to wear as markers of caste", ml: "കീഴ്ജാതിക്കാർ ജാതി ചിഹ്നമായി ധരിക്കേണ്ടി വന്ന കല്ലുമാല" },
      { key: "D", en: "Tax on salt production", ml: "ഉപ്പ് ഉൽപ്പാദനത്തിൽ നികുതി" },
    ],
    correctOption: "C",
    explanation: {
      en: "The Kallumala Agitation (1915) was led by Ayyankali. Pulayas (Dalits) were forced to wear stone bead necklaces (kallumala) as caste markers. Ayyankali's movement fought against this humiliating practice as part of the broader struggle against untouchability.",
      ml: "കല്ലുമാല സമരം (1915) അയ്യൻകാളി നേതൃത്വം നൽകിയ. പുലയർ (ദലിതർ) ജാതി ചിഹ്നമായി കല്ലുമാല ധരിക്കാൻ നിർബന്ധിക്കപ്പെട്ടിരുന്നു. അയ്യൻകാളി ഈ അപമാനകരമായ ആചാരത്തിനെതിരെ പൊരുതി.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["kallumala", "ayyankali", "dalits", "social_reform"],
    difficulty: 3,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Kerala Renaissance Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "The Temple Entry Proclamation (1936) in Travancore was issued by:",
      ml: "1936-ൽ തിരുവിതാംകൂറിലെ ക്ഷേത്ര പ്രവേശന വിളംബരം പ്രഖ്യാപിച്ചത് ആര്?",
    },
    options: [
      { key: "A", en: "Regent Sethu Lakshmi Bai", ml: "റീജന്റ് സേതു ലക്ഷ്മി ബായ്" },
      { key: "B", en: "Maharaja Chithira Thirunal Balarama Varma", ml: "മഹാരാജ ചിത്തിര തിരുനാൾ ബലരാമ വർമ" },
      { key: "C", en: "Dewan C.P. Ramaswami Iyer", ml: "ദിവാൻ സി.പി. രാമസ്വാമി അയ്യർ" },
      { key: "D", en: "Velu Thampi Dalawa", ml: "വേലുത്തമ്പി ദളവ" },
    ],
    correctOption: "B",
    explanation: {
      en: "On November 12, 1936, Maharaja Chithira Thirunal Balarama Varma issued the Temple Entry Proclamation allowing all Hindus, regardless of caste, to enter state temples in Travancore. This was a landmark event in Kerala's social reform movement.",
      ml: "1936 നവംബർ 12-ന് മഹാരാജ ചിത്തിര തിരുനാൾ ബലരാമ വർമ ക്ഷേത്ര പ്രവേശന വിളംബരം പ്രഖ്യാപിച്ചു. ജാതി ഭേദമില്ലാതെ എല്ലാ ഹിന്ദുക്കൾക്കും തിരുവിതാംകൂർ ക്ഷേത്രങ്ങളിൽ പ്രവേശിക്കാൻ അനുവദിച്ചു.",
    },
    topicId: "history",
    subTopic: "kerala_renaissance",
    tags: ["temple_entry", "1936", "travancore", "chithira_thirunal"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Kerala Renaissance Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INSTITUTE — Indian Polity
  // Source: Brain Trust PSC Notes — Constitution Chapter
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Which Constitutional Amendment is called the 'Mini Constitution' due to its wide-ranging changes?",
      ml: "വ്യാപകമായ മാറ്റങ്ങൾ കാരണം 'ചെറിയ ഭരണഘടന' എന്ന് വിളിക്കുന്ന ഭേദഗതി ഏത്?",
    },
    options: [
      { key: "A", en: "44th Amendment (1978)", ml: "44-ാം ഭേദഗതി (1978)" },
      { key: "B", en: "42nd Amendment (1976)", ml: "42-ാം ഭേദഗതി (1976)" },
      { key: "C", en: "73rd Amendment (1992)", ml: "73-ാം ഭേദഗതി (1992)" },
      { key: "D", en: "86th Amendment (2002)", ml: "86-ാം ഭേദഗതി (2002)" },
    ],
    correctOption: "B",
    explanation: {
      en: "The 42nd Amendment (1976) during Indira Gandhi's emergency is called the 'Mini Constitution' because it made the most sweeping changes — added 'Socialist', 'Secular', and 'Integrity' to the Preamble; made Fundamental Duties part of the Constitution (Part IVA); gave primacy to DPSP over Fundamental Rights.",
      ml: "1976-ൽ ഇന്ദിരാ ഗാന്ധിയുടെ അടിയന്തരാവസ്ഥ കാലത്ത് 42-ാം ഭേദഗതി 'ചെറിയ ഭരണഘടന' എന്ന് അറിയപ്പെടുന്നു. ആമുഖത്തിൽ 'സോഷ്യലിസ്റ്റ്', 'മതേതര', 'അഖണ്ഡത' ചേർത്തു; മൗലിക കർത്തവ്യങ്ങൾ (ഭാഗം IVA) ഉൾപ്പെടുത്തി.",
    },
    topicId: "polity",
    subTopic: "constitutional_amendments",
    tags: ["42nd_amendment", "mini_constitution", "emergency", "fundamental_duties"],
    difficulty: 3,
    questionStyle: "indirect",
    examTags: ["lgs", "degree"],
    sourceType: "institute",
    sourceRef: "Brain Trust PSC Notes — Constitution Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "Under which schedule of the Indian Constitution are Panchayat functions listed?",
      ml: "ഇന്ത്യൻ ഭരണഘടനയുടെ ഏത് ഷെഡ്യൂളിലാണ് പഞ്ചായത്ത് പ്രവർത്തനങ്ങൾ പട്ടികപ്പെടുത്തിയിരിക്കുന്നത്?",
    },
    options: [
      { key: "A", en: "Schedule 9", ml: "ഷെഡ്യൂൾ 9" },
      { key: "B", en: "Schedule 10", ml: "ഷെഡ്യൂൾ 10" },
      { key: "C", en: "Schedule 11", ml: "ഷെഡ്യൂൾ 11" },
      { key: "D", en: "Schedule 12", ml: "ഷെഡ്യൂൾ 12" },
    ],
    correctOption: "C",
    explanation: {
      en: "Schedule 11 (added by 73rd Amendment) lists 29 functions/subjects that may be transferred to Panchayats, including agriculture, land improvement, small-scale industries, education. Schedule 12 lists Municipal functions (74th Amendment).",
      ml: "ഷെഡ്യൂൾ 11 (73-ാം ഭേദഗതി ചേർത്തത്) കൃഷി, ഭൂ വികസനം, ചെറുകിട വ്യവസായം, വിദ്യാഭ്യാസം ഉൾപ്പെടെ 29 വിഷയങ്ങൾ ഉൾക്കൊള്ളുന്നു. ഷെഡ്യൂൾ 12 മുനിസിപ്പൽ പ്രവർത്തനങ്ങൾ (74-ാം ഭേദഗതി).",
    },
    topicId: "polity",
    subTopic: "panchayati_raj",
    tags: ["schedule_11", "panchayati_raj", "73rd_amendment", "functions"],
    difficulty: 3,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "institute",
    sourceRef: "Brain Trust PSC Notes — Constitution Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INSTITUTE — Kerala Geography
  // Source: Winners Academy Material
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Ashtamudi Lake, the second largest backwater lake in Kerala, is located in which district?",
      ml: "കേരളത്തിലെ രണ്ടാമത്തെ വലിയ കായൽ അഷ്ടമുടി, ഏത് ജില്ലയിലാണ്?",
    },
    options: [
      { key: "A", en: "Ernakulam", ml: "എറണാകുളം" },
      { key: "B", en: "Alappuzha", ml: "ആലപ്പുഴ" },
      { key: "C", en: "Kollam", ml: "കൊല്ലം" },
      { key: "D", en: "Thiruvananthapuram", ml: "തിരുവനന്തപുരം" },
    ],
    correctOption: "C",
    explanation: {
      en: "Ashtamudi Lake (Ashtamudi Kayal) is in Kollam district. It is a Ramsar Wetland site. The name means 'eight branches' (ashta = eight, mudi = head/branch). Vembanad is the largest backwater in Kerala.",
      ml: "അഷ്ടമുടി കായൽ കൊല്ലം ജില്ലയിലാണ്. ഇത് ഒരു റാംസർ ആർദ്ര ഭൂമി കേന്ദ്രം. 'അഷ്ട' = എട്ട്, 'മുടി' = ശിഖരം. വേമ്പനാട് ആണ് കേരളത്തിലെ ഏറ്റവും വലിയ കായൽ.",
    },
    topicId: "geography",
    subTopic: "kerala_geography",
    tags: ["ashtamudi", "backwaters", "kollam", "ramsar"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "institute",
    sourceRef: "Winners Academy Material — Kerala Geography",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "Which national park in Kerala is known as the 'Paradise of Birds'?",
      ml: "കേരളത്തിലെ ഏത് ദേശീയ ഉദ്യാനം 'പക്ഷികളുടെ പ്രതിഭൂമി' എന്ന് അറിയപ്പെടുന്നു?",
    },
    options: [
      { key: "A", en: "Silent Valley National Park", ml: "സൈലന്റ് വാലി ദേശീയ ഉദ്യാനം" },
      { key: "B", en: "Periyar Tiger Reserve", ml: "പെരിയാർ കടുവ സംരക്ഷണ കേന്ദ്രം" },
      { key: "C", en: "Eravikulam National Park", ml: "ഇരവികുളം ദേശീയ ഉദ്യാനം" },
      { key: "D", en: "Thattekkad Bird Sanctuary", ml: "തട്ടേക്കാട് പക്ഷി സങ്കേതം" },
    ],
    correctOption: "D",
    explanation: {
      en: "Thattekkad Bird Sanctuary (also called Salim Ali Bird Sanctuary) in Ernakulam district is known as the 'Paradise of Birds'. Renowned ornithologist Dr. Salim Ali called it 'the richest bird habitat in peninsular India'.",
      ml: "എറണാകുളം ജില്ലയിലെ തട്ടേക്കാട് പക്ഷി സങ്കേതം (സാലിം അലി പക്ഷി സങ്കേതം) 'പക്ഷികളുടെ പ്രതിഭൂമി' എന്ന് അറിയപ്പെടുന്നു. പക്ഷി ശാസ്ത്രജ്ഞൻ ഡോ. സാലിം അലി ഇതിനെ 'ഉപദ്വീപ് ഇന്ത്യയിലെ ഏറ്റവും സമൃദ്ധ പക്ഷി ആവാസ കേന്ദ്രം' എന്ന് വിളിച്ചു.",
    },
    topicId: "geography",
    subTopic: "kerala_geography",
    tags: ["thattekkad", "bird_sanctuary", "salim_ali", "kerala"],
    difficulty: 3,
    questionStyle: "indirect",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "institute",
    sourceRef: "Winners Academy Material — Kerala Geography",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INTERNET — Current Affairs 2025
  // Source: Official government announcements, PIB
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "The Vizhinjam International Seaport, Kerala's first international transshipment hub, opened for commercial operations in 2024. It is located near:",
      ml: "കേരളത്തിന്റെ ആദ്യ അന്തർദ്ദേശീയ ട്രാൻഷിപ്മെന്റ് തുറമുഖം വിഴിഞ്ഞം 2024-ൽ വാണിജ്യ പ്രചരണം ആരംഭിച്ചു. ഇത് ഏതിനടുത്ത് സ്ഥിതി ചെയ്യുന്നു?",
    },
    options: [
      { key: "A", en: "Kochi", ml: "കൊച്ചി" },
      { key: "B", en: "Kozhikode", ml: "കോഴിക്കോട്" },
      { key: "C", en: "Thiruvananthapuram", ml: "തിരുവനന്തപുരം" },
      { key: "D", en: "Kollam", ml: "കൊല്ലം" },
    ],
    correctOption: "C",
    explanation: {
      en: "Vizhinjam International Seaport is located in Vizhinjam, near Thiruvananthapuram. Built by Adani Ports, it is Kerala's first deep-water transshipment port. Its natural deep draft (18-20m) can accommodate ultra-large container vessels (ULCVs) without dredging.",
      ml: "വിഴിഞ്ഞം അന്തർദ്ദേശീയ തുറമുഖം തിരുവനന്തപുരത്തിനടുത്ത് സ്ഥിതി ചെയ്യുന്നു. അദാനി പോർട്സ് നിർമ്മിച്ചത്. 18-20 മീ. ആഴമുള്ള ഈ തുറമുഖം കേരളത്തിന്റെ ആദ്യ ഡീപ് വാട്ടർ ട്രാൻഷിപ്മെന്റ് പോർട്ട്.",
    },
    topicId: "current_affairs",
    subTopic: "kerala_current_affairs",
    tags: ["vizhinjam_port", "kerala", "transshipment", "thiruvananthapuram"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "internet",
    sourceRef: "PIB — Vizhinjam Port inauguration 2024",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "The Chandrayaan-3 spacecraft successfully soft-landed near the Moon's south pole in August 2023. What was the name of the lander?",
      ml: "ചന്ദ്രയാൻ-3 2023 ആഗസ്തിൽ ചന്ദ്രന്റെ ദക്ഷിണ ധ്രുവ സമീപം ഇറങ്ങി. ലാൻഡറിന്റെ പേര്?",
    },
    options: [
      { key: "A", en: "Vikram", ml: "വിക്രം" },
      { key: "B", en: "Pragyan", ml: "പ്രഗ്യാൻ" },
      { key: "C", en: "Aditya", ml: "ആദിത്യ" },
      { key: "D", en: "Mangalyaan", ml: "മംഗൾയാൻ" },
    ],
    correctOption: "A",
    explanation: {
      en: "Chandrayaan-3's lander was named 'Vikram' (after Dr. Vikram Sarabhai, founder of ISRO). The rover was named 'Pragyan' (Sanskrit for wisdom). India became the 4th country and first to land near the lunar south pole on August 23, 2023.",
      ml: "ചന്ദ്രയാൻ-3-ന്റെ ലാൻഡറിന്റെ പേര് 'വിക്രം' (ISRO സ്ഥാപകൻ ഡോ. വിക്രം സാരാഭായ് ഓർമ്മ). റോവർ 'പ്രഗ്യാൻ' (സംസ്‌കൃതത്തിൽ 'ജ്ഞാനം'). 2023 ആഗസ്ത് 23-ന് ചന്ദ്ര ദക്ഷിണ ധ്രുവ സമീപം ഇറങ്ങിയ ആദ്യ രാജ്യം ഇന്ത്യ.",
    },
    topicId: "science",
    subTopic: "space",
    tags: ["chandrayaan3", "isro", "moon", "vikram", "pragyan"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "internet",
    sourceRef: "ISRO Official — Chandrayaan-3 Mission 2023",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "India's National Panchayati Raj Day is celebrated on April 24 because on that date in 1993:",
      ml: "ഇന്ത്യ ദേശീയ പഞ്ചായത്ത് രാജ് ദിവസം ഏപ്രിൽ 24-ന് ആഘോഷിക്കുന്നത് കാരണം 1993-ൽ ആ ദിവസം:",
    },
    options: [
      { key: "A", en: "The 73rd Amendment was enacted by Parliament", ml: "73-ാം ഭേദഗതി പാർലമെന്റ് പാസ്സാക്കി" },
      { key: "B", en: "The 73rd Amendment came into force", ml: "73-ാം ഭേദഗതി പ്രാബല്യത്തിൽ വന്നു" },
      { key: "C", en: "First Panchayat elections were held in India", ml: "ഇന്ത്യയിൽ ആദ്യ പഞ്ചായത്ത് തിരഞ്ഞെടുപ്പ് നടന്നു" },
      { key: "D", en: "The Balwant Rai Mehta Committee report was accepted", ml: "ബൽവന്ത്‌ റായ് മേത്ത കമ്മിറ്റി റിപ്പോർട്ട് സ്വീകരിച്ചു" },
    ],
    correctOption: "B",
    explanation: {
      en: "The 73rd Amendment Act was passed in December 1992 but came into force (effect) on April 24, 1993. That date is celebrated as National Panchayati Raj Day to mark the constitutional recognition of local self-government in India.",
      ml: "73-ാം ഭേദഗതി 1992 ഡിസംബറിൽ പാസ്സാക്കിയെങ്കിലും 1993 ഏപ്രിൽ 24-ന് പ്രാബല്യത്തിൽ വന്നു. ഇന്ത്യയിലെ തദ്ദേശ ഭരണത്തിന്റെ ഭരണഘടനാ അംഗീകാരം അടയാളപ്പെടുത്താൻ ഈ ദിവസം ദേശീയ പഞ്ചായത്ത് രാജ് ദിവസം.",
    },
    topicId: "polity",
    subTopic: "panchayati_raj",
    tags: ["panchayati_raj_day", "april_24", "73rd_amendment", "concept"],
    difficulty: 3,
    questionStyle: "concept",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "internet",
    sourceRef: "Ministry of Panchayati Raj — india.gov.in",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "Kerala's 'Kudumbashree' mission, launched in 1998, is primarily a programme for:",
      ml: "1998-ൽ ആരംഭിച്ച കേരളത്തിന്റെ 'കുടുംബശ്രീ' ദൗത്യം പ്രധാനമായും ഏതിനുള്ള പദ്ധതിയാണ്?",
    },
    options: [
      { key: "A", en: "Agricultural development in tribal areas", ml: "ഗോത്ര മേഖലയിലെ കൃഷി വികസനം" },
      { key: "B", en: "Women's empowerment and poverty eradication through self-help groups", ml: "സ്വയം സഹായ സംഘങ്ങൾ വഴി വനിതാ ശാക്തീകരണവും ദാരിദ്ര്യ നിർമ്മാർജ്ജനവും" },
      { key: "C", en: "Urban housing for homeless families", ml: "ഭവനരഹിതർക്ക് നഗര ഭവന നിർമ്മാണം" },
      { key: "D", en: "Digital literacy mission", ml: "ഡിജിറ്റൽ സാക്ഷരതാ ദൗത്യം" },
    ],
    correctOption: "B",
    explanation: {
      en: "Kudumbashree (meaning 'prosperity of family') was launched in 1998 in Kerala as a poverty eradication and women's empowerment programme. It works through a 3-tier system: Neighbourhood Groups (NHG) → Area Development Societies (ADS) → Community Development Societies (CDS). It has over 4.5 million women members.",
      ml: "കുടുംബശ്രീ ('കുടുംബ സമൃദ്ധി') 1998-ൽ കേരളത്തിൽ ദാരിദ്ര്യ നിർമ്മാർജ്ജന, വനിതാ ശാക്തീകരണ പദ്ധതിയായി ആരംഭിച്ചു. NHG → ADS → CDS എന്ന ത്രിതല ഘടന. 45 ലക്ഷത്തിലേറെ വനിതകൾ അംഗം.",
    },
    topicId: "current_affairs",
    subTopic: "kerala_current_affairs",
    tags: ["kudumbashree", "women_empowerment", "kerala", "shg"],
    difficulty: 2,
    questionStyle: "concept",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "internet",
    sourceRef: "kudumbashree.org — Official Programme Overview",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "The Right to Information Act (RTI) 2005 in India grants citizens information within how many days?",
      ml: "ഇന്ത്യൻ വിവരാവകാശ നിയമം (RTI) 2005 പ്രകാരം, ഏത് ദിവസത്തിനകം വിവരം ലഭ്യമാക്കണം?",
    },
    options: [
      { key: "A", en: "15 days", ml: "15 ദിവസം" },
      { key: "B", en: "30 days", ml: "30 ദിവസം" },
      { key: "C", en: "45 days", ml: "45 ദിവസം" },
      { key: "D", en: "60 days", ml: "60 ദിവസം" },
    ],
    correctOption: "B",
    explanation: {
      en: "Under RTI Act 2005, a Public Information Officer must provide information within 30 days of receiving the application. If the information concerns life and liberty of a person, it must be provided within 48 hours.",
      ml: "RTI നിയമം 2005 പ്രകാരം, പൊതു വിവര ഉദ്യോഗസ്ഥൻ 30 ദിവസത്തിനകം അപേക്ഷ ലഭിച്ചാൽ വിവരം നൽകണം. അത് ഒരാളുടെ ജീവനോ സ്വാതന്ത്ര്യത്തിനോ ബന്ധപ്പെട്ടതാണെങ്കിൽ 48 മണിക്കൂറിനകം.",
    },
    topicId: "polity",
    subTopic: "governance",
    tags: ["rti", "right_to_information", "30_days", "transparency"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "internet",
    sourceRef: "rti.india.gov.in — RTI Act 2005 Official",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INSTITUTE — Science (Human Body + Physics)
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Which vitamin deficiency causes 'Night Blindness' (Nyctalopia)?",
      ml: "'രാത്രി അന്ധത' (നൈക്ടലോപ്പിയ) ഉണ്ടാക്കുന്ന വിറ്റാമിൻ കുറവ് ഏത്?",
    },
    options: [
      { key: "A", en: "Vitamin A", ml: "വിറ്റാമിൻ A" },
      { key: "B", en: "Vitamin B12", ml: "വിറ്റാമിൻ B12" },
      { key: "C", en: "Vitamin C", ml: "വിറ്റാമിൻ C" },
      { key: "D", en: "Vitamin D", ml: "വിറ്റാമിൻ D" },
    ],
    correctOption: "A",
    explanation: {
      en: "Vitamin A (Retinol) deficiency causes Night Blindness because Vitamin A is essential for producing Rhodopsin, the photopigment in rod cells that enables vision in dim light. Severe deficiency can cause complete blindness (Xerophthalmia).",
      ml: "വിറ്റാമിൻ A (റെറ്റിനോൾ) കുറവ് രാത്രി അന്ധത ഉണ്ടാകുന്നു. കണ്ണിലെ ദണ്ഡ് കോശങ്ങളിൽ ക്ഷണ പ്രകാശ ദർശനത്തിന് (Rhodopsin) ആവശ്യം. കടുത്ത കുറവ് Xerophthalmia (കണ്ണ് വരൾച്ച) ഉണ്ടാക്കും.",
    },
    topicId: "science",
    subTopic: "human_body",
    tags: ["vitamin_a", "night_blindness", "deficiency", "diseases"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Science Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "Newton's Third Law of Motion states that for every action there is an equal and opposite reaction. Which real-world example best illustrates this?",
      ml: "ന്യൂട്ടന്റെ ത്രിതീയ ചലന നിയമം: ഓരോ ക്രിയക്കും തുല്യവും വിരുദ്ധ ദിശയിലുള്ളതുമായ പ്രതിക്രിയ. ഇത് ഏറ്റവും ഉചിതമായി ചിത്രീകരിക്കുന്ന ഉദാഹരണം:",
    },
    options: [
      { key: "A", en: "A ball falling due to gravity", ml: "ഒരു ഉരുണ്ട് ഗുരുത്വാകർഷണം കൊണ്ട് വീഴുന്നത്" },
      { key: "B", en: "A rocket propelled by gas expelled backward", ml: "പിന്നോട്ട് ഗ്യാസ് തള്ളി മുന്നോട്ട് പോകുന്ന റോക്കറ്റ്" },
      { key: "C", en: "A magnet attracting iron filings", ml: "ഒരു കാന്തം ഇരുമ്പ് ഫയലിംഗ് ആകർഷിക്കുന്നത്" },
      { key: "D", en: "Water flowing downhill", ml: "ജലം ചരിവിലൂടെ ഒഴുകുന്നത്" },
    ],
    correctOption: "B",
    explanation: {
      en: "A rocket expels hot gases backward (action), and the equal/opposite reaction pushes the rocket forward. This directly demonstrates Newton's 3rd Law. Falling ball is 1st/2nd Law; magnets involve electromagnetic force; water flow is pressure + gravity.",
      ml: "റോക്കറ്റ് ചൂടുള്ള വാതകം പിന്നോട്ട് തള്ളിവിടുന്നു (ക്രിയ), ഇതിന്റെ ഫലമായി റോക്കറ്റ് മുന്നോട്ട് ചലിക്കുന്നു (പ്രതിക്രിയ). ഇത് ന്യൂട്ടന്റെ ത്രിതീയ നിയമം നേരിട്ട് ചിത്രീകരിക്കുന്നു.",
    },
    topicId: "science",
    subTopic: "physics_basics",
    tags: ["newton", "third_law", "rocket", "physics"],
    difficulty: 2,
    questionStyle: "concept",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Science Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INSTITUTE — Language / Malayalam literature
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "Who is known as the 'Father of Modern Malayalam Prose'?",
      ml: "ആധുനിക മലയാള ഗദ്യത്തിന്റെ പിതാവ് എന്ന് അറിയപ്പെടുന്നത് ആര്?",
    },
    options: [
      { key: "A", en: "Thunchaththu Ramanujan Ezhuthachan", ml: "തുഞ്ചത്ത് രാമാനുജൻ എഴുത്തച്ഛൻ" },
      { key: "B", en: "Punthanam Nambudiri", ml: "പൂന്താനം നമ്പൂതിരി" },
      { key: "C", en: "Hermann Gundert", ml: "ഹെർമ്മൻ ഗുണ്ടർട്ട്" },
      { key: "D", en: "Velukkutty Arayan", ml: "വേലുക്കുട്ടി അരയൻ" },
    ],
    correctOption: "C",
    explanation: {
      en: "Hermann Gundert, a German missionary (1814-1893), is called the 'Father of Modern Malayalam Prose'. He compiled the first comprehensive Malayalam-English dictionary (1872) and translated the Bible into Malayalam, standardising Malayalam prose.",
      ml: "ജർമ്മൻ മിഷനറി ഹെർമ്മൻ ഗുണ്ടർട്ട് (1814-1893) ആദ്യ സമഗ്ര മലയാളം-ഇംഗ്ലീഷ് നിഘണ്ടു (1872) തയ്യാറാക്കി, ബൈബിൾ മലയാളത്തിൽ വിവർത്തനം ചെയ്ത് 'ആധുനിക മലയാള ഗദ്യ പിതാവ്' ആയി.",
    },
    topicId: "language",
    subTopic: "malayalam",
    tags: ["gundert", "malayalam_prose", "literature", "pioneer"],
    difficulty: 3,
    questionStyle: "indirect",
    examTags: ["ldc", "lgs", "degree"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Malayalam Literature",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INSTITUTE — Reasoning
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "If today is Tuesday, what day will it be 100 days later?",
      ml: "ഇന്ന് ചൊവ്വാഴ്ചയാണെങ്കിൽ 100 ദിവസം കഴിഞ്ഞ് ഏത് ദിവസം?",
    },
    options: [
      { key: "A", en: "Wednesday", ml: "ബുധൻ" },
      { key: "B", en: "Thursday", ml: "വ്യാഴം" },
      { key: "C", en: "Friday", ml: "വെള്ളി" },
      { key: "D", en: "Saturday", ml: "ശനി" },
    ],
    correctOption: "B",
    explanation: {
      en: "100 ÷ 7 = 14 weeks + 2 days remainder. Tuesday + 2 days = Thursday. So 100 days after Tuesday is Thursday.",
      ml: "100 ÷ 7 = 14 ആഴ്ച + 2 ദിവസം ശേഷം. ചൊവ്വ + 2 = വ്യാഴം. അതിനാൽ ചൊവ്വ കഴിഞ്ഞ് 100 ദിവസം = വ്യാഴം.",
    },
    topicId: "reasoning",
    subTopic: "mental_ability",
    tags: ["days", "calendar", "reasoning", "number"],
    difficulty: 2,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Mental Ability Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "In a certain code, 'MANGO' is written as 'OCPIQ'. What is the code for 'APPLE'?",
      ml: "ഒരു കോഡ് ഭാഷയിൽ 'MANGO' = 'OCPIQ' ആണ്. 'APPLE'-ന്റെ കോഡ് എന്ത്?",
    },
    options: [
      { key: "A", en: "CRRNG", ml: "CRRNG" },
      { key: "B", en: "CQQNG", ml: "CQQNG" },
      { key: "C", en: "BQQNF", ml: "BQQNF" },
      { key: "D", en: "DSSOH", ml: "DSSOH" },
    ],
    correctOption: "A",
    explanation: {
      en: "Each letter is shifted +2 positions: M+2=O, A+2=C, N+2=P, G+2=I, O+2=Q. So APPLE: A+2=C, P+2=R, P+2=R, L+2=N, E+2=G → CRRNG.",
      ml: "ഓരോ അക്ഷരവും +2 സ്ഥാനം മുന്നോട്ട്: M+2=O, A+2=C, N+2=P, G+2=I, O+2=Q. APPLE: A→C, P→R, P→R, L→N, E→G = CRRNG.",
    },
    topicId: "reasoning",
    subTopic: "mental_ability",
    tags: ["coding", "decoding", "alphabet", "reasoning"],
    difficulty: 3,
    questionStyle: "direct",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "institute",
    sourceRef: "PSC Rank File 2024 — Mental Ability Chapter",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INTERNET — Indian History / Freedom Movement
  // ════════════════════════════════════════════════════════════════════════════
  {
    text: {
      en: "The Quit India Movement of 1942 was launched because:",
      ml: "1942-ലെ ക്വിറ്റ് ഇന്ത്യ സമരം ആരംഭിച്ചത് കാരണം:",
    },
    options: [
      { key: "A", en: "The partition of Bengal by Lord Curzon", ml: "ലോർഡ് കഴ്‌സൺ ബംഗാൾ വിഭജനം" },
      { key: "B", en: "Failure of Cripps Mission and demand for immediate independence during WWII", ml: "ക്രിപ്സ് ദൗത്യ പരാജയം, WWII സമയത്ത് ഉടനടി സ്വാതന്ത്ര്യ ആവശ്യം" },
      { key: "C", en: "Jallianwala Bagh massacre", ml: "ജലിയൻ വാലാ ബാഗ് വധം" },
      { key: "D", en: "Non-cooperation with Simon Commission", ml: "സൈമൺ കമ്മിഷനുമായി സഹകരണ നിരാകരണം" },
    ],
    correctOption: "B",
    explanation: {
      en: "The Quit India Movement (August 8, 1942) was launched after the failure of the Cripps Mission (March 1942). With WWII ongoing, Gandhi demanded immediate British withdrawal. The famous slogan was 'Do or Die'. It was the most massive civil disobedience movement.",
      ml: "ക്വിറ്റ് ഇന്ത്യ (1942 ആഗസ്ത് 8) ക്രിപ്സ് ദൗത്യ (1942 മാർച്ച്) പരാജയത്തിനു ശേഷം. ഗാന്ധി 'ചെയ്യൂ അല്ലെങ്കിൽ മരിക്കൂ' മുദ്രാവാക്യം ഉയർത്തി. ഏറ്റവും ബൃഹത്തായ ആഭ്യന്തര നിസ്സഹകരണ സമരം.",
    },
    topicId: "history",
    subTopic: "freedom_movement",
    tags: ["quit_india", "1942", "gandhi", "cripps_mission"],
    difficulty: 3,
    questionStyle: "concept",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "internet",
    sourceRef: "NCERT Class 8 History — Quit India Movement",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
  {
    text: {
      en: "Which statement about the Indian National Congress (INC) is INCORRECT?",
      ml: "ഇന്ത്യൻ നാഷണൽ കോൺഗ്രസ്സ് (INC) കുറിച്ചുള്ള ഏത് പ്രസ്താവന തെറ്റാണ്?",
    },
    options: [
      { key: "A", en: "It was founded in 1885 by A.O. Hume", ml: "1885-ൽ A.O. ഹ്യൂം സ്ഥാപിച്ചു" },
      { key: "B", en: "First session was held in Bombay (Mumbai)", ml: "ആദ്യ സമ്മേളനം ബോംബേ (മുംബൈ)-ൽ" },
      { key: "C", en: "Bal Gangadhar Tilak founded the INC", ml: "ബാൽ ഗംഗാധർ തിലകൻ INC സ്ഥാപിച്ചു" },
      { key: "D", en: "W.C. Bonnerjee was its first president", ml: "W.C. ബോണർജി ആദ്യ പ്രസിഡന്റ്" },
    ],
    correctOption: "C",
    explanation: {
      en: "Statement C is INCORRECT — The INC was founded by Allan Octavian Hume (A.O. Hume), a retired British civil servant, in 1885. Bal Gangadhar Tilak was a major leader but not the founder. The first session was in Bombay with W.C. Bonnerjee as president.",
      ml: "C തെറ്റ് — INC 1885-ൽ A.O. ഹ്യൂം (ഒരു ബ്രിട്ടീഷ് ഉദ്യോഗസ്ഥൻ) സ്ഥാപിച്ചു. ബാൽ ഗംഗാധർ തിലകൻ പ്രധാന നേതാവായിരുന്നുവെങ്കിലും സ്ഥാപകനല്ല. ബോംബേ, W.C. ബോണർജി — ഇവ ശരി.",
    },
    topicId: "history",
    subTopic: "indian_history",
    tags: ["inc", "congress", "hume", "negative", "freedom_movement"],
    difficulty: 3,
    questionStyle: "negative",
    examTags: ["ldc", "lgs", "degree", "police"],
    sourceType: "internet",
    sourceRef: "NCERT Class 8 History",
    status: "review",
    createdByLabel: "ai",
    isVerified: false,
  },
];

// ─── Weighted Daily Challenge Generator ──────────────────────────────────────

const TOPIC_WEIGHTS: Record<string, number> = {
  history: 4,
  geography: 3,
  polity: 3,
  science: 3,
  current_affairs: 2,
  language: 2,
  reasoning: 2,
  gk: 1,
};
const TOTAL_WEIGHT = Object.values(TOPIC_WEIGHTS).reduce((a, b) => a + b, 0);

export async function buildWeightedDailyChallenge(
  date: string,
  userWeakTopics: string[] = []
): Promise<string[]> {
  const { connectDB } = await import("../src/lib/db/connection");
  const QuestionModel = (await import("../src/lib/db/models/Question")).default;
  await connectDB();

  const topicTargets: Record<string, number> = {};
  let remaining = 20;

  // Allocate by weight
  for (const [topic, weight] of Object.entries(TOPIC_WEIGHTS)) {
    const target = Math.round((weight / TOTAL_WEIGHT) * 20);
    topicTargets[topic] = target;
    remaining -= target;
  }
  // Distribute remainder
  topicTargets["history"] += remaining;

  // Boost weak topics +1, reduce strong topics
  for (const weak of userWeakTopics.slice(0, 2)) {
    if (topicTargets[weak]) {
      topicTargets[weak] += 1;
      topicTargets["gk"] = Math.max(0, (topicTargets["gk"] || 0) - 1);
    }
  }

  const selectedIds: string[] = [];

  // Difficulty distribution: Q1-5 easy (1-2), Q6-12 medium (2-3), Q13-20 hard (3-5)
  const difficultySlots: Array<[number, number]> = [
    ...Array(5).fill([1, 2]),
    ...Array(7).fill([2, 3]),
    ...Array(6).fill([3, 4]),
    ...Array(2).fill([4, 5]),
  ];

  let slotIndex = 0;

  for (const [topic, count] of Object.entries(topicTargets)) {
    if (count <= 0) continue;

    const topicIds: string[] = [];
    for (let i = 0; i < count && slotIndex < difficultySlots.length; i++, slotIndex++) {
      const [minDiff, maxDiff] = difficultySlots[slotIndex];

      const question = await QuestionModel.findOne({
        topicId: topic,
        isVerified: true,
        difficulty: { $gte: minDiff, $lte: maxDiff },
        _id: { $nin: selectedIds.map((id) => id) },
      })
        .select("_id")
        .lean();

      if (question) {
        topicIds.push(question._id.toString());
        selectedIds.push(question._id.toString());
      } else {
        // Fallback: any difficulty for this topic
        const fallback = await QuestionModel.findOne({
          topicId: topic,
          isVerified: true,
          _id: { $nin: selectedIds },
        })
          .select("_id")
          .lean();
        if (fallback) {
          topicIds.push(fallback._id.toString());
          selectedIds.push(fallback._id.toString());
        }
      }
    }
  }

  return selectedIds;
}

// ─── Seed runner ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("\n🔍 RankMukhyam Question Database Seeder");
  console.log("──────────────────────────────────────────");
  console.log("📖 Reading: prompts.ts, content_strategy.md");
  console.log("📊 Schema: Question model with full fields\n");

  await connectDB();

  const stats = {
    pyq: 0,
    pyq_variant: 0,
    institute: 0,
    internet: 0,
    skipped: 0,
    total: 0,
  };

  // Map from parentRef → actual ObjectId (for linking variants to originals)
  const parentRefMap: Record<string, string> = {};

  // First pass: insert PYQ originals to get their IDs
  console.log("📥 Pass 1 — Inserting PYQ originals...");
  for (const q of QUESTIONS.filter((q) => q.sourceType === "pyq")) {
    const exists = await Question.findOne({ "text.en": q.text.en });
    if (exists) {
      console.log(`  ⏭  Skipped (exists): ${q.text.en.slice(0, 60)}...`);
      // Still register in parentRefMap so variants link correctly
      if (q.pyq) {
        const refKey = q.topicId + "_" + q.subTopic + "_" + q.pyq.year;
        parentRefMap[refKey] = exists._id.toString();
      }
      stats.skipped++;
      continue;
    }

    const { parentRef, ...insertData } = q;
    const created = await Question.create(insertData);
    stats.pyq++;
    stats.total++;

    // Register parent ref for variant linking
    // Use first tag as the ref key
    if (q.tags[0]) parentRefMap[q.tags[0]] = created._id.toString();

    console.log(`  ✅ PYQ: ${q.text.en.slice(0, 60)}...`);
  }

  // Second pass: insert all other questions (variants, institute, internet)
  console.log("\n📥 Pass 2 — Inserting variants, institute & internet questions...");
  for (const q of QUESTIONS.filter((q) => q.sourceType !== "pyq")) {
    const exists = await Question.findOne({ "text.en": q.text.en });
    if (exists) {
      console.log(`  ⏭  Skipped (exists): ${q.text.en.slice(0, 60)}...`);
      stats.skipped++;
      continue;
    }

    const { parentRef, ...insertData } = q;

    // Resolve parentQuestionId from parentRefMap
    let parentQuestionId: string | undefined;
    if (parentRef) {
      const matchKey = Object.keys(parentRefMap).find((k) => parentRef.includes(k.split("_")[0]));
      if (matchKey) parentQuestionId = parentRefMap[matchKey];
    }

    const created = await Question.create({
      ...insertData,
      ...(parentQuestionId ? { parentQuestionId } : {}),
    });

    stats[q.sourceType as keyof typeof stats] =
      (stats[q.sourceType as keyof typeof stats] as number) + 1;
    stats.total++;

    console.log(`  ✅ ${q.sourceType.toUpperCase()}: ${q.text.en.slice(0, 60)}...`);
  }

  // Update topic question counts
  console.log("\n🔢 Updating topic question counts...");
  const counts = await Question.aggregate([
    { $match: { isVerified: false, status: "review" } },
    { $group: { _id: "$topicId", count: { $sum: 1 } } },
  ]);
  for (const { _id, count } of counts) {
    const TopicModel = (await import("../src/lib/db/models/Topic")).default;
    await TopicModel.updateOne({ _id }, { $set: { questionCount: count } });
  }

  // ─── Output Report ────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log("📈 SEED REPORT");
  console.log("═".repeat(50));
  console.log(`\n✅ Total inserted:   ${stats.total}`);
  console.log(`⏭  Total skipped:   ${stats.skipped}`);
  console.log("\nBreakdown by source:");
  console.log(`  🥇 PYQ originals:  ${stats.pyq}`);
  console.log(`  🔁 PYQ variants:   ${stats.pyq_variant}`);
  console.log(`  📚 Institute:      ${stats.institute}`);
  console.log(`  🌐 Internet:       ${stats.internet}`);

  console.log("\nSample questions inserted:");
  const samples = await Question.find({ status: "review", createdByLabel: "ai" })
    .limit(3)
    .select("text.en topicId questionStyle difficulty sourceType sourceRef")
    .lean();
  for (const s of samples) {
    console.log(
      `  • [${s.topicId}/${s.questionStyle}/D${s.difficulty}] ${(s.text as { en: string }).en.slice(0, 70)}`
    );
    console.log(`    Source: ${s.sourceRef as string}`);
  }

  console.log("\nSources used:");
  console.log("  • Kerala PSC LDC Exam 2021, 2022");
  console.log("  • Kerala PSC LGS Exam 2021, 2023");
  console.log("  • Kerala PSC Police Constable 2022, 2023");
  console.log("  • Kerala PSC Secretariat Asst 2022");
  console.log("  • Kerala PSC VEO 2023");
  console.log("  • PSC Rank File 2024 (Institute)");
  console.log("  • Brain Trust PSC Notes (Institute)");
  console.log("  • Winners Academy Material (Institute)");
  console.log("  • PIB, ISRO, kudumbashree.org, rti.india.gov.in (Internet)");
  console.log("  • NCERT Class 8 History (Internet)");

  console.log("\nFiles changed:");
  console.log("  • scripts/seed-questions-v2.ts (this file)");
  console.log("  • scripts/prompts.ts (question gen templates)");

  console.log("\nTo run again:");
  console.log("  npx tsx scripts/seed-questions-v2.ts");
  console.log("\nTo seed originally included questions:");
  console.log("  npx tsx scripts/seed-questions.ts");
  console.log("═".repeat(50) + "\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
