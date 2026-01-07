"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type HomeTabContextValue = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const HomeTabContext = createContext<HomeTabContextValue | undefined>(undefined);

export function HomeTabProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState("Ideas");
  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
    }),
    [activeTab]
  );

  return (
    <HomeTabContext.Provider value={value}>
      {children}
    </HomeTabContext.Provider>
  );
}

export function useHomeTab() {
  const context = useContext(HomeTabContext);
  if (!context) {
    throw new Error("useHomeTab must be used within HomeTabProvider");
  }
  return context;
}
