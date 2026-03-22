import type { Scenario } from "@/src/types/game";

export const scenarios: Scenario[] = [
  {
    id: 1,
    candidateName: "Jordan Mills",
    candidateInitials: "JM",
    role: "IT Support Specialist",
    aiDecision: "hired",
    profileFields: {
      Age: "29",
      Education: "Community college (2 yrs, no degree) · CompTIA Security+ · AWS Cloud Practitioner",
      Experience: "2 yrs — Cashier, Metro Grocery",
      "Skills Match": "50%",
      Other: "Plays basketball in local league",
    },
    aiRationale:
      "Candidate holds two recognised industry certifications — CompTIA Security+ and AWS Cloud Practitioner — demonstrating a commitment to technical development. These credentials directly satisfy the knowledge requirements of the role.",
    options: [
      {
        label: "Halo effect — impressive but irrelevant achievements inflated the overall score",
        isCorrect: false,
      },
      {
        label: "Credentialism — short-course certificates were over-weighted relative to actual experience",
        isCorrect: true,
      },
      {
        label: "Anchoring bias — an early strong data point skewed the overall evaluation",
        isCorrect: false,
      },
      {
        label: "University prestige bias — the candidate's institution gave them an unfair advantage",
        isCorrect: false,
      },
    ],
    explanation:
      "The candidate has no relevant IT work experience and only a 50% skills match, yet was hired on the strength of two short-course certifications. This is credentialism: over-weighting credentials — especially brief bootcamps and online exams — as a substitute for demonstrated ability.",
    difficulty: "medium",
  },
  {
    id: 2,
    candidateName: "Richard Osei",
    candidateInitials: "RO",
    role: "Senior Operations Manager",
    aiDecision: "rejected",
    profileFields: {
      Age: "52",
      Education: "MBA, Local University",
      Experience: "26 yrs — Operations Manager, NovaTech Industries",
      "Skills Match": "84%",
      Other: "Competitive chess player",
    },
    aiRationale:
      "Despite strong qualifications, the candidate's projected contribution window relative to the organisation's long-term planning horizon ranks below peers. Adaptability indicators and long-term growth trajectory scored below threshold.",
    options: [
      {
        label: "Anchoring bias — an early strong data point skewed the overall evaluation",
        isCorrect: false,
      },
      {
        label: "University prestige bias — the candidate's institution counted against them",
        isCorrect: false,
      },
      {
        label: "Age bias — the candidate was penalised for being older despite strong qualifications",
        isCorrect: true,
      },
      {
        label: "Name bias — the candidate's name influenced the scoring",
        isCorrect: false,
      },
    ],
    explanation:
      "The candidate has 26 years of directly relevant experience, an MBA, and an 84% skills match. The AI's rejection is laundered through euphemisms: 'projected contribution window' means the candidate is close to retirement age. This is age bias.",
    difficulty: "hard",
  },
];
