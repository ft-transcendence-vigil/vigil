import { useContext } from 'react';
import { AIDrawerContext } from '../components/Dashboard/AIDrawer/AIDrawerContext';

export function useAIDrawer() {
  const context = useContext(AIDrawerContext);

  if (!context) {
    throw new Error('useAIDrawer must be used inside AIDrawerProvider');
  }
  return context;
}
