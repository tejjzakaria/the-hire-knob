export type AiDecision = "hired" | "rejected";

export type Difficulty = "easy" | "medium" | "hard";

export interface Option {
  label: string;
  isCorrect: boolean;
}

export interface Scenario {
  id: number;
  candidateName: string;
  candidateInitials: string;
  role: string;
  aiDecision: AiDecision;
  profileFields: Record<string, string>;
  aiRationale: string;
  options: [Option, Option, Option, Option];
  explanation: string;
  difficulty: Difficulty;
}

export interface GameState {
  currentScenarioIndex: number;
  score: number;
  answered: boolean;
  selectedOptionIndex: number | null;
  completed: boolean;
}
