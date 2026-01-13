
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  role: Role;
  text: string;
  id: string;
}

export interface ChatConfig {
  systemInstruction: string;
  temperature: number;
  topP: number;
  topK: number;
  model: string;
}
