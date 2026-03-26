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
  {
    id: 6,
    candidateName: "Michael Torres",
    candidateInitials: "MT",
    role: "Junior Financial Analyst",
    aiDecision: "rejected",
    profileFields: {
      Age: "36",
      Education: "Associate Degree in Business (Community College) · Certified Bookkeeping Professional · Microsoft Excel Advanced · Certified Yoga Instructor",
      Experience: "2 yrs — Administrative Assistant, accounting firm · 2 yrs — Freelance Tax Preparer",
      "Skills Match": "78%",
      Other: "Black belt in karate",
    },
    aiRationale:
      "Candidate has insufficient work experience in financial analysis. While the role typically benefits from 5+ years in the field, this candidate falls below that range.",
    options: [
      {
        label: "Overconfidence bias — the AI applied a rigid years-of-experience rule with unwarranted certainty, ignoring relevant qualifications",
        isCorrect: true,
      },
      {
        label: "Halo effect — one impressive trait elevated the entire assessment",
        isCorrect: false,
      },
      {
        label: "Credentialism — qualifications were over-weighted relative to practical ability",
        isCorrect: false,
      },
      {
        label: "Aggregation bias — a one-size-fits-all model missed role-specific requirements",
        isCorrect: false,
      },
    ],
    explanation:
      "The AI expressed high confidence in its rejection based solely on a rigid '5+ years' guideline. The candidate had a 78% skills match, directly relevant certifications, and two years of hands-on tax preparation experience. The AI was overconfident in its simplistic rule while dismissing evidence that the candidate's actual qualifications could compensate for the arbitrary experience threshold. Overconfidence bias occurs when a model commits strongly to a flawed heuristic and fails to account for nuance or exception.",
    difficulty: "medium",
  },
  {
    id: 7,
    candidateName: "Jasmine Lee",
    candidateInitials: "JL",
    role: "Animal Shelter Care Coordinator",
    aiDecision: "rejected",
    profileFields: {
      Age: "21",
      Education: "High school diploma · Online courses in animal first aid and shelter management",
      Experience: "2 yrs — Dog Walker / Pet Sitter (self-employed) · 1 yr — Food Delivery Driver",
      "Skills Match": "39%",
      Other: "Weekend volunteer, wildlife rehabilitation centre · Bilingual",
    },
    aiRationale:
      "Candidate lacks formal higher education and has inconsistent work history. Overall qualification score (39%) falls below the minimum threshold.",
    options: [
      {
        label: "Aggregation bias — a generic scoring model ignored what actually mattered for this specific role",
        isCorrect: true,
      },
      {
        label: "Anchoring bias — an early data point disproportionately shaped the final decision",
        isCorrect: false,
      },
      {
        label: "University prestige bias — the absence of a degree counted unfairly against the candidate",
        isCorrect: false,
      },
      {
        label: "Network bias — hiring was driven by connections rather than qualifications",
        isCorrect: false,
      },
    ],
    explanation:
      "The AI applied a generic corporate scoring model to a specialist animal shelter role. It heavily penalised the absence of formal education and 'inconsistent' employment while completely ignoring weekend wildlife rehabilitation volunteering and bilingual skills — both highly relevant to shelter coordination. Aggregation bias occurs when a one-size-fits-all model is applied without accounting for the unique requirements of a specific job context. The model treated all roles identically and missed what actually mattered for this position.",
    difficulty: "hard",
  },
  {
    id: 8,
    candidateName: "Oluwaseun Adebayo",
    candidateInitials: "OA",
    role: "Software Developer",
    aiDecision: "rejected",
    profileFields: {
      Age: "28",
      Education: "BSc Computer Science, First Class Honours · Google Summer of Code · AWS Certified Developer",
      Experience: "3 yrs — Backend Developer, fintech startup · 2 yrs — Full-Stack Developer, e-commerce company",
      "Skills Match": "79%",
      Other: "Reads to children at local library monthly",
    },
    aiRationale:
      "Candidate's experience and education are satisfactory, but overall profile alignment with high-performing employees in our database is below threshold.",
    options: [
      {
        label: "Name bias — a non-Western name triggered lower scores derived from historically biased training data",
        isCorrect: true,
      },
      {
        label: "Aggregation bias — a one-size-fits-all model missed role-specific requirements",
        isCorrect: false,
      },
      {
        label: "Overconfidence bias — the AI applied a rigid rule with unwarranted certainty",
        isCorrect: false,
      },
      {
        label: "Anchoring bias — an early data point disproportionately shaped the final decision",
        isCorrect: false,
      },
    ],
    explanation:
      "The AI's deliberately vague rationale — 'profile alignment below threshold' — masked the actual driver: the candidate's name. Analysis of the model reveals that candidates with non-Western names are systematically scored lower than identical profiles bearing Western names, because the model learned from historical hiring data that encoded unconscious human bias. Despite a 79% skills match, First Class Honours, and five years of relevant experience, the candidate was filtered out by proxy discrimination. Name bias is particularly insidious because the model never references the name directly.",
    difficulty: "hard",
  },
  {
    id: 9,
    candidateName: "Rachel Kim",
    candidateInitials: "RK",
    role: "Marketing Coordinator",
    aiDecision: "rejected",
    profileFields: {
      Age: "36",
      Education: "Dropped out — Community College Business Programme · BA Marketing, State University (graduated with honours)",
      Experience: "6 yrs — Marketing Assistant (promoted to Associate) · 2 yrs — Social Media Manager",
      "Skills Match": "66%",
      Other: "Regional-level competitive hot dog eating contestant",
    },
    aiRationale:
      "Candidate's educational background shows inconsistency with an initial dropout. Historical data indicates candidates with incomplete education early in their academic careers have lower retention rates.",
    options: [
      {
        label: "Anchoring bias — an early negative data point permanently coloured the entire evaluation despite subsequent evidence of growth",
        isCorrect: true,
      },
      {
        label: "Age bias — the candidate was penalised for being older despite strong qualifications",
        isCorrect: false,
      },
      {
        label: "University prestige bias — the candidate's institution counted against them",
        isCorrect: false,
      },
      {
        label: "Aggregation bias — a generic model failed to account for the specific context of the candidate's journey",
        isCorrect: false,
      },
    ],
    explanation:
      "The AI fixated on the first piece of information in Rachel's education history: 'dropped out of community college.' This negative anchor skewed the entire evaluation, even though she subsequently completed a bachelor's degree with honours and built eight years of directly relevant marketing experience. The AI anchored to the initial negative signal and failed to update its assessment when presented with clear evidence of recovery, growth, and achievement. Anchoring bias can cut both ways — here it worked against the candidate, permanently colouring the AI's view based on an early setback that the candidate had long since overcome.",
    difficulty: "medium",
  },
  {
    id: 10,
    candidateName: "Sofia Ramirez",
    candidateInitials: "SR",
    role: "Graphic Designer",
    aiDecision: "rejected",
    profileFields: {
      Age: "32",
      Education: "Community College (Associate Degree in Visual Communications) · Adobe Certified Professional (Photoshop, Illustrator) · Certified Personal Trainer",
      Experience: "3 yrs — Junior Designer at a small print shop · 1 yr — Freelance",
      "Skills Match": "65%",
      Other: "Participates in park cleanup initiatives",
    },
    aiRationale:
      "Candidate's portfolio review shows strong creative work, and certifications meet baseline requirements. However, the number of years in professional design roles is below the range typically associated with candidates who succeed in this position. Based on this factor, overall suitability is rated as low.",
    options: [
      {
        label: "Overconfidence bias — the AI was too certain that years of experience alone predicted success, ignoring contradictory evidence",
        isCorrect: true,
      },
      {
        label: "Name bias — the candidate's name influenced the hiring decision",
        isCorrect: false,
      },
      {
        label: "Anchoring bias — the AI fixated on the first piece of data it encountered",
        isCorrect: false,
      },
      {
        label: "Anchoring bias — an early negative data point permanently coloured the evaluation",
        isCorrect: false,
      },
    ],
    explanation:
      "The AI acknowledged the candidate's strong portfolio and certifications but placed disproportionate weight on years of experience — presented as a 'typical range' guideline rather than a hard rule. Despite the candidate's demonstrated skills, the AI expressed high confidence that the experience gap was decisive. The model overestimated the predictive power of this single factor and underestimated the value of portfolio quality and certifications. Overconfidence bias occurs when an AI system is too certain about its judgment, ignoring nuance and contradictory evidence.",
    difficulty: "medium",
  },
  {
    id: 11,
    candidateName: "Kai Tanaka",
    candidateInitials: "KT",
    role: "Marine Mammal Rehabilitation Assistant",
    aiDecision: "rejected",
    profileFields: {
      Age: "41",
      Education: "High school diploma · Online courses in marine biology fundamentals (no formal degree)",
      Experience: "5 yrs — Aquarium Visitor Services Associate (ticket sales, guest assistance) · 2 yrs — Part-time Kayak Tour Guide",
      "Skills Match": "45%",
      Other: "Featured in local magazine for volunteer work",
    },
    aiRationale:
      "Candidate lacks formal higher education and has limited directly relevant professional experience. Overall qualification score falls below the minimum threshold for this role.",
    options: [
      {
        label: "Aggregation bias — a one-size-fits-all model ignored the unique requirements of this specialised role",
        isCorrect: true,
      },
      {
        label: "Age bias — the candidate was penalised for being older",
        isCorrect: false,
      },
      {
        label: "Credentialism — the AI over-weighted formal qualifications",
        isCorrect: false,
      },
      {
        label: "Employment gap bias — the AI penalised gaps in work history",
        isCorrect: false,
      },
    ],
    explanation:
      "The AI applied a generic scoring model that heavily weighted formal education and traditional work history while failing to recognise that the candidate's volunteer experience was directly relevant and valuable for this specialised role. Aggregation bias occurs when a one-size-fits-all model ignores the unique requirements of a specific job. Here the AI used metrics designed for standard corporate roles and missed what actually mattered for this position.",
    difficulty: "medium",
  },
];
