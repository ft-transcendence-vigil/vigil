import { createContext } from "react";

export interface AIDrawerContextValue {
  alertId: string | null;
  openAI: (alertId: string) => void;
  closeAI: () => void;
}

export const AIDrawerContext = createContext<AIDrawerContextValue | null>(null);
