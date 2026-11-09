import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import type { Trace } from '../api/tracesApi';

interface Params {
  enabled: boolean;
  service: string;
}

interface LiveState {
  service: string;
  traces: Trace[];
  connected: boolean;
  failed: boolean;
}

const MAX_LIVE_TRACES = 200;

function emptyState(service: string): LiveState {
  return { service, traces: [], connected: false, failed: false };
}

export default function useLiveTraces({ enabled, service }: Params) {
  //we want accesstoken because eventSource cant send a header we need raw token for the url
  const { accessToken } = useAuth();
  //state with LiveState interface as value we set everything to false or empty besides  services
  const [state, setState] = useState<LiveState>(() => emptyState(service));
  //when service changes we update state.service with emptyState
  const current = state.service === service ? state : emptyState(service);
//// useEffect: after the render do something outside React (like opening a connection) redo it when a dependency changes and undo it in the cleanup
  useEffect(() => {
  //if live mode not enabled or there is no access token exit the function
    if (!enabled || !accessToken) return;
//we update rthe service if its changed with emptyState and we store it
    function updateState(updater: (current: LiveState) => LiveState) {
      setState((prev) =>
        updater(prev.service === service ? prev : emptyState(service)),
      );
    }
    //create the query for the url for this it would be token: accessToken
    const params = new URLSearchParams({ token: accessToken });
    //we add the service if it exits to the query
    if (service) params.set('service', service);
    //we open an event source with the back end we give it the url 
    //EventSource is an http get request but as a event-stream so it stays open this goes through caddy first
    const source = new EventSource(
      `/api/telemetry/traces/live?${params.toString()}`,
    );
    //when the connection opens we update our state
    source.onopen = () => {
      updateState((s) => ({ ...s, connected: true, failed: false }));
    };
    //when our data arrives
    //MessageEvent ts type describes our data 
    source.onmessage = (event: MessageEvent<string>) => {
      let trace: Trace;
      try {
        //we turn the json into a js obj and assuming it will match trace format 
        trace = JSON.parse(event.data) as Trace;
        //do nothing on error but return because we do have our onerror func
      } catch {
        return;
      }
      //create an new object  put the new trace into it first then add the old traces last and keep max 200
      updateState((s) => ({
        ...s,
        traces: [trace, ...s.traces].slice(0, MAX_LIVE_TRACES),
      }));
    };

    //if live connection fails close and update state
    source.onerror = () => {
      source.close();
      updateState((s) => ({ ...s, connected: false, failed: true }));
    };
    //useeffect clean up after we finish
    return () => {
      source.close();
      updateState((s) => ({ ...s, connected: false }));
    };
    //useeffect dependecies if somethting changes here use effect re calculates
  }, [enabled, service, accessToken]);

  //we return after exisiting useeffect
  return {
    liveTraces: current.traces,
    isConnected: enabled && current.connected,
    hasError: enabled && current.failed,
  };
}
