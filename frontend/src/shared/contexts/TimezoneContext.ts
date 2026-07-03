import { createContext, createElement, useContext, useMemo, useState, ReactNode } from "react";

interface TimezoneContextType {
  selectedTimezone: string;
  setSelectedTimezone: (timezone: string) => void;
}

const TimezoneContext = createContext<TimezoneContextType | null>(null);

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const [selectedTimezone, setSelectedTimezone] = useState("Asia/Kolkata");

  const value = useMemo(
    () => ({
      selectedTimezone,
      setSelectedTimezone,
    }),
    [selectedTimezone],
  );

  return createElement(TimezoneContext.Provider, { value }, children);
}

export function useTimezone() {
  const context = useContext(TimezoneContext);

  if (!context) {
    throw new Error("useTimezone must be used within TimezoneProvider");
  }

  return context;
}
