"use client";

import React from "react";
import { useCategory } from "./CategoryContext";
import { categories } from "../data/categories";

export default function CategoryHeader() {
  const { activeCategory, setActiveCategory } = useCategory();
  const formatNumber = (value: number) => value.toLocaleString("en-US");

  return (
    <div className="nyt-divider-categories">
      {categories.map((category) => {
        const isActive = activeCategory === category.name;
        return (
          <button
            key={category.name}
            type="button"
            className={`nyt-divider-category${isActive ? " is-active" : ""}`}
            onClick={() => setActiveCategory(category.name)}
          >
            <div className="nyt-divider-category-name">{category.name}</div>
            <div className="nyt-divider-category-meta">
              {formatNumber(category.ideas)} ideas •{" "}
              {formatNumber(category.signals)} signals
            </div>
          </button>
        );
      })}
    </div>
  );
}
