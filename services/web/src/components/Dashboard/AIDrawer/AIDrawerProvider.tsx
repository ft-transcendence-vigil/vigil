import { useState, type ReactNode } from 'react';
import { AIDrawerContext } from './AIDrawerContext';

interface Data {
  children: ReactNode;
}

export function AIDrawerProvider({ children }: Data) {
  const [alertId, setAlertId] = useState<string | null>(null);

  const openAI = (id: string) => setAlertId(id);
  const closeAI = () => setAlertId(null);

  return (
    <AIDrawerContext.Provider value={{ alertId, openAI, closeAI }}>
      {children}
    </AIDrawerContext.Provider>
  );
}
