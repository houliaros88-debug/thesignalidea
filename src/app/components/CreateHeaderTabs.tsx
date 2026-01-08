"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const uploadTabs = ["Idea", "Picture", "Video", "Job"];

export default function CreateHeaderTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (pathname !== "/create") return null;

  const activeParam = searchParams?.get("type") ?? "Idea";
  const activeTab =
    uploadTabs.find((tab) => tab.toLowerCase() === activeParam.toLowerCase()) ??
    "Idea";

  return (
    <div className="nyt-divider-categories">
      {uploadTabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            className={`nyt-divider-category${isActive ? " is-active" : ""}`}
            onClick={() => router.push(`/create?type=${encodeURIComponent(tab)}`)}
          >
            <div className="nyt-divider-category-name">{tab}</div>
          </button>
        );
      })}
    </div>
  );
}
