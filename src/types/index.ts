export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ScenarioInfo {
  id: string | number;
  title: string;
  description: string;
  patientInfo?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  scenarioCode: string;
} 