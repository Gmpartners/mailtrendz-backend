// Tipos auxiliares para resolver problemas de compatibilidade

export type ToneType = "professional" | "casual" | "urgent" | "friendly" | "formal" | string;

export interface FlexibleColorScheme {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  content?: string;
  style?: "vibrant" | "muted" | "professional" | "playful";
  [key: string]: any; // Permitir propriedades dinâmicas
}

export interface FlexibleProjectContext {
  userId: string;
  projectName: string;
  type: string;
  industry?: string;
  targetAudience?: string;
  tone?: ToneType;
  status?: string;
  [key: string]: any; // Permitir propriedades dinâmicas
}
