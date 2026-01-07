"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CategoryHeaderWrapper from "./CategoryHeaderWrapper";
import Header from "./Header";
import HomeHeaderTabs from "./HomeHeaderTabs";
import PartnersHeader from "./PartnersHeader";

export default function HeaderShell() {
  const pathname = usePathname();

  const hideMenu = pathname === "/login";

  return (
    <div className="nyt-header">
      <Header />
      {!hideMenu && (
        <>
          <nav
            style={{
              display: "flex",
              gap: 24,
              justifyContent: "center",
              padding: "8px 0",
              background: "none",
              fontWeight: 600,
            }}
          >
            <Link href="/">Home</Link>
            <Link href="/submit">The Idea</Link>
            <Link href="/categories">Partners</Link>
            <Link href="/profile">Profile</Link>
          </nav>
          <div className="nyt-divider">
            €140,190 Winner’s fund • 46,730 total ideas • 344,746 total signals
          </div>
          <CategoryHeaderWrapper />
          <HomeHeaderTabs />
          <PartnersHeader />
        </>
      )}
    </div>
  );
}
