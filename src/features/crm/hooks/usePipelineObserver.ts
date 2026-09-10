import { useEffect, useRef, useState } from 'react';
import {
  getEventsForOpportunity,
  getPipelineEvents,
  getStageChanges,
  type PipelineEvent,
} from '../services/pipelineEvents';

interface UsePipelineObserverOptions {

    stageChangesOnly?: boolean;

  opportunityId?: number;

  historySize?: number;

  onEvent?: (event: PipelineEvent) => void;
}

interface UsePipelineObserverResult {
  lastEvent: PipelineEvent | null;
  history: PipelineEvent[];
  clearHistory: () => void;
}

export function usePipelineObserver(
  options: UsePipelineObserverOptions = {},
): UsePipelineObserverResult {
  const { stageChangesOnly, opportunityId, historySize = 20, onEvent } = options;

  const [lastEvent, setLastEvent] = useState<PipelineEvent | null>(null);
  const [history, setHistory] = useState<PipelineEvent[]>([]);

  
  const callbackRef = useRef(onEvent);
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const source =
      typeof opportunityId === 'number'
        ? getEventsForOpportunity(opportunityId)
        : stageChangesOnly
          ? getStageChanges()
          : getPipelineEvents();

    const subscription = source.subscribe((event) => {
      setLastEvent(event);
      setHistory((current) => [event, ...current].slice(0, historySize));
      callbackRef.current?.(event);
    });

    
    return () => subscription.unsubscribe();
  }, [stageChangesOnly, opportunityId, historySize]);

  return {
    lastEvent,
    history,
    clearHistory: () => setHistory([]),
  };
}