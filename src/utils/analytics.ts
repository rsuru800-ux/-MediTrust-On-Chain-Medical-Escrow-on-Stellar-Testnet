export interface LogEntry {
  timestamp: string;
  type: 'event' | 'error';
  name: string;
  metadata?: any;
}

const STORAGE_KEY = 'meditrust_analytics_logs';

export const trackEvent = (name: string, metadata?: any) => {
  // Console logging in dev mode
  if (import.meta.env.DEV) {
    console.log(`[Analytics Event] ${name}:`, metadata);
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'event',
    name,
    metadata,
  };

  try {
    const logs = getLogs();
    logs.push(entry);
    // Limit to last 100 entries to save space
    if (logs.length > 100) logs.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save analytics event', e);
  }
};

export const trackError = (error: any, context?: string) => {
  const errorMsg = error?.message || String(error);
  const errorCode = error?.code || 'UNKNOWN';

  if (import.meta.env.DEV) {
    console.error(`[Error Monitor] Context: ${context}, Code: ${errorCode}, Message: ${errorMsg}`, error);
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'error',
    name: context || 'Generic Error',
    metadata: {
      code: errorCode,
      message: errorMsg,
      stack: error?.stack,
    },
  };

  try {
    const logs = getLogs();
    logs.push(entry);
    if (logs.length > 100) logs.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save error log', e);
  }
};

export const getLogs = (): LogEntry[] => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error('Failed to retrieve analytics logs', e);
    return [];
  }
};

export const clearLogs = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear analytics logs', e);
  }
};
