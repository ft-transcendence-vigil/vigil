import axios from 'axios';
import type { ApiFetch } from './api';
import type { HistoryItem } from '../components/Dashboard/AIDrawer/AIPanel';

interface ParsedSseEvent {
  type: string;
  data: string;
}

interface AskAIAboutAlert {
  apiFetch: ApiFetch;
  alertId: string;
  question: string;
  signal?: AbortSignal;
  history: HistoryItem[];
  onToken: (token: string) => void;
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const body = error.response?.data;
    const message = body?.message ?? body?.error;

    if (typeof message === 'string' && message) {
      return new Error(message, {
        cause: error,
      });
    }
    if (!error.response) {
      return new Error('Unable to connect to the server.', {
        cause: error,
      });
    }
  }
  return new Error(fallback, {
    cause: error,
  });
}

async function readStreamText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

function parseSseEvent(eventBlock: string): ParsedSseEvent | null {
  const lines = eventBlock.split('\n');
  const eventLine = lines.find((line) => line.startsWith('event:'));
  const type = eventLine?.slice('event:'.length).trim();
  const dataLine = lines.find((line) => line.startsWith('data:'));
  const data = dataLine?.slice('data:'.length).trimStart();

  if (!type || data === undefined) return null;

  return {
    type,
    data,
  };
}

function handleSseEvent(
  eventBlock: string,
  onToken: (token: string) => void,
): boolean {
  const event = parseSseEvent(eventBlock);

  if (!event) return false;

  if (event.type === 'token') {
    const payload = JSON.parse(event.data);
    onToken(payload.token);
    return false;
  }
  if (event.type === 'done') {
    return true;
  }
  if (event.type === 'error') {
    const payload = JSON.parse(event.data);
    throw new Error(payload.message);
  }
  return false;
}

async function readAlertStream(
  stream: ReadableStream<Uint8Array>,
  onToken: (token: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let receiveDone = false;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;
    buffer += decoder.decode(value, {
      stream: true,
    });
    let boundary = buffer.indexOf('\n\n');

    while (boundary !== -1) {
      const eventBlock = buffer.slice(0, boundary);

      buffer = buffer.slice(boundary + 2);
      const isDone = handleSseEvent(eventBlock, onToken);
      if (isDone) {
        receiveDone = true;
      }
      boundary = buffer.indexOf('\n\n');
    }
  }
  decoder.decode();
  if (!receiveDone) {
    throw new Error('AI response ended unexpectedly.');
  }
}

async function askAlert(
  apiFetch: ApiFetch,
  alertId: string,
  question: string,
  history: HistoryItem[],
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  try {
    const res = await apiFetch<ReadableStream<Uint8Array>>(
      `/alerts/${encodeURIComponent(alertId)}/ask`,
      {
        method: 'POST',
        adapter: 'fetch',
        responseType: 'stream',
        signal,
        headers: {
          Accept: 'text/event-stream',
        },
        data: { question, history },
      },
    );
    return res.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }
    if (
      axios.isAxiosError(error) &&
      error.response?.data instanceof ReadableStream
    ) {
      const text = await readStreamText(error.response.data);
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        throw new Error(body.message, { cause: error });
      }
    }
    throw toError(error, 'Unable to get an AI response.');
  }
}

async function askAIAboutAlert({
  apiFetch,
  alertId,
  question,
  onToken,
  history,
  signal,
}: AskAIAboutAlert): Promise<void> {
  const stream = await askAlert(apiFetch, alertId, question, history, signal);

  await readAlertStream(stream, onToken);
}

export { askAIAboutAlert };
