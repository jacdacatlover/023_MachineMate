type LogMethod = (...args: unknown[]) => void;

export type Logger = {
  info: LogMethod;
  debug: LogMethod;
  warn: LogMethod;
  error: LogMethod;
};

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  const info: LogMethod = (...args) => {
    if (__DEV__) {
      console.log(prefix, ...args);
    }
  };

  const debug: LogMethod = (...args) => {
    if (__DEV__) {
      if (typeof console.debug === 'function') {
        console.debug(prefix, ...args);
      } else {
        console.log(prefix, ...args);
      }
    }
  };

  const warn: LogMethod = (...args) => {
    console.warn(prefix, ...args);
  };

  const error: LogMethod = (...args) => {
    console.error(prefix, ...args);
  };

  return { info, debug, warn, error };
}
