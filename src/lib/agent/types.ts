export interface AgentResult<T = string> {
  success: boolean;
  data: T;
  model: string;
  tokens?: number;
  error?: string;
}

export interface DiagnoseInput {
  error?: string;
  stackTrace?: string;
  logs?: string;
  userReport?: string;
  fileContext?: string;
}

export interface DiagnoseOutput {
  cause: string;
  reproduction: string[];
  solution: string;
  severity: 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
  relatedFiles?: string[];
}

export interface TDDInput {
  feature: string;
  existingCode?: string;
  requirements?: string[];
}

export interface TDDOutput {
  testFile: string;
  tests: string[];
  implementation: string;
  explanation: string;
}

export interface CodeReviewInput {
  code: string;
  filename?: string;
  language?: string;
}

export interface CodeReviewIssue {
  line?: number;
  severity: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  suggestion: string;
}

export interface CodeReviewOutput {
  score: number;
  issues: CodeReviewIssue[];
  summary: string;
}

export interface ResearchInput {
  question: string;
  context?: string;
}

export interface ResearchOutput {
  answer: string;
  sources: string[];
  relatedTopics?: string[];
}
