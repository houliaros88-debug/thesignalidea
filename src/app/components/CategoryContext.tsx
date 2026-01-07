"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type CategoryContextValue = {
  activeCategory: string | null;
  setActiveCategory: (category: string) => void;
};

const CategoryContext = createContext<CategoryContextValue | undefined>(
  undefined
);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(
    "Food & Drinks"
  );
  const value = useMemo(
    () => ({
      activeCategory,
      setActiveCategory,
    }),
    [activeCategory]
  );

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategory must be used within CategoryProvider");
  }
  return context;
}
