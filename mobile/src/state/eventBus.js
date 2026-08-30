// Dependency-free pub/sub. Planets announce what they logged; the shell listens
// and refreshes. Kept deliberately small — this is in-process only, never a queue.

const listeners = new Map();

export const on = (event, handler) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => off(event, handler);
};

export const off = (event, handler) => {
  listeners.get(event)?.delete(handler);
};

export const emit = (event, payload) => {
  listeners.get(event)?.forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      console.warn(`[bus] listener for "${event}" threw`, error);
    }
  });
  listeners.get('*')?.forEach((handler) => handler({ event, payload }));
};

export const EVENTS = {
  DATA_CHANGED: 'data:changed',
  SIGNAL_SENT: 'signal:sent',
  SIGNALS_DELIVERED: 'signal:delivered',
};

export default { on, off, emit, EVENTS };
