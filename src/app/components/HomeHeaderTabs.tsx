"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useHomeTab } from "./HomeTabContext";

const homeTabs = [
  { label: "Ideas" },
  { label: "Pictures" },
  { label: "Videos" },
  { label: "Jobs" },
];

export default function HomeHeaderTabs() {
  const pathname = usePathname();
  const { activeTab, setActiveTab } = useHomeTab();

  if (pathname !== "/") return null;

  return (
    <div className="nyt-divider-categories">
      {homeTabs.map((tab) => {
        const isActive = activeTab === tab.label;
        return (
          <button
            key={tab.label}
            type="button"
            className={`nyt-divider-category${isActive ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.label)}
          >
            <div className="nyt-divider-category-name">
              {tab.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
