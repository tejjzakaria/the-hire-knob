// --------- scenarios data -----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const scenarios: any[] = [
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
      "The candidate has no relevant IT work experience and only a 50% skills match, yet was hired on the strength of two short-course certifications. This is credentialism: over-weighting credentials — especially brief bootcamps and online exams — as a substitute for demonstrated ability. A 3-week bootcamp and two certification exams do not equate to practical IT support experience.",
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
      "The candidate has 26 years of directly relevant experience, an MBA, and an 84% skills match — a strong profile by any measure. The AI's rejection is laundered through euphemisms: 'projected contribution window' means the candidate is close to retirement age, and 'adaptability indicators' are a common proxy for age. This is age bias: penalising a candidate for being older despite their clear suitability for the role.",
    difficulty: "hard",
  },
  {
    id: 3,
    candidateName: "Casey Brooks",
    candidateInitials: "CB",
    role: "Sales Representative",
    aiDecision: "hired",
    profileFields: {
      Age: "31",
      Education: "BA Economics, State University",
      Experience: "3 yrs — Marketing Coordinator, BlueWave Media",
      "Skills Match": "41%",
      Other: "Ran a marathon, volunteers at food bank, 5,000 LinkedIn followers",
    },
    aiRationale:
      "Candidate demonstrates exceptional personal drive and community engagement. Marathon completion and consistent volunteer work signal resilience, discipline, and a collaborative nature — qualities strongly correlated with sales success.",
    options: [
      {
        label: "Credentialism — certifications were over-weighted as a proxy for ability",
        isCorrect: false,
      },
      {
        label: "Affinity bias — the recruiter related to the candidate's hobbies",
        isCorrect: false,
      },
      {
        label: "Anchoring bias — the first strong data point drove all subsequent judgements",
        isCorrect: false,
      },
      {
        label: "Halo effect — impressive personal achievements masked an unqualified profile",
        isCorrect: true,
      },
    ],
    explanation:
      "Running a marathon and volunteering are admirable, but they have no bearing on sales ability. The candidate has a 41% skills match and zero direct sales experience. The AI allowed positive but irrelevant personal traits to create a 'halo' that elevated the entire evaluation — a textbook halo effect. The role required sales skills; the decision was driven by lifestyle.",
    difficulty: "medium",
  },
  {
    id: 4,
    candidateName: "Morgan Davies",
    candidateInitials: "MD",
    role: "Marketing Associate",
    aiDecision: "hired",
    profileFields: {
      Age: "26",
      Education: "BA Marketing, Westfield University",
      Experience: "1 yr — Junior Copywriter, Spark Agency · 6 mths internship",
      "Skills Match": "72%",
      Salary: "Previous: £28,000",
    },
    aiRationale:
      "Candidate's prior compensation history aligns with the role's budget expectations. Combined with a relevant degree and agency background, compensation compatibility is a strong positive signal.",
    options: [
      {
        label: "Anchoring bias — previous salary anchored the evaluation unfairly",
        isCorrect: true,
      },
      {
        label: "Halo effect — one strong trait elevated the overall assessment",
        isCorrect: false,
      },
      {
        label: "Age bias — the candidate's age influenced the hiring decision",
        isCorrect: false,
      },
      {
        label: "Network bias — personal connections influenced the outcome",
        isCorrect: false,
      },
    ],
    explanation:
      "The candidate's previous salary of £28,000 became the anchor that shaped the AI's positive framing. Using prior pay as a 'positive signal' embeds whatever inequity existed in the candidate's past earnings into future decisions. This is anchoring bias: an arbitrary first figure — here, a salary — disproportionately influences a decision that should be based on skills and role requirements.",
    difficulty: "easy",
  },
  {
    id: 5,
    candidateName: "Sam Okafor",
    candidateInitials: "SO",
    role: "Project Manager",
    aiDecision: "hired",
    profileFields: {
      Age: "34",
      Education: "BSc Business Administration, City College",
      Experience: "4 yrs — Operations Coordinator, MidWest Logistics",
      "Skills Match": "61%",
      Other: "Referred by Head of Engineering (internal referral)",
    },
    aiRationale:
      "Candidate was referred through a trusted internal channel, indicating cultural alignment and pre-screened suitability. Internal referrals historically correlate with strong retention and performance at this organisation.",
    options: [
      {
        label: "Credentialism — the candidate's degree was over-valued",
        isCorrect: false,
      },
      {
        label: "Network bias — hiring was driven by who the candidate knows, not their qualifications",
        isCorrect: true,
      },
      {
        label: "Halo effect — one impressive trait inflated the whole profile",
        isCorrect: false,
      },
      {
        label: "Affinity bias — the hiring manager related to the candidate personally",
        isCorrect: false,
      },
    ],
    explanation:
      "With a 61% skills match and no direct project management experience, this candidate would likely not clear a standard screen. The deciding factor was an internal referral. Referral networks are rarely representative of the broader talent pool — they tend to reflect existing social and professional circles, which are often demographically homogeneous. This is network bias: access to opportunity determined by who you know rather than what you can do.",
    difficulty: "easy",
  },
];
