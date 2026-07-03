import { useState, useCallback, useEffect } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore write errors
        }
        return next;
      });
    },
    [key]
  );

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setStored(JSON.parse(item) as T);
      }
    } catch {
      // ignore
    }
  }, [key]);

  return [stored, setValue];
}
