"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CategoryHeaderWrapper from "./CategoryHeaderWrapper";
import Header from "./Header";
import HomeHeaderTabs from "./HomeHeaderTabs";
import PartnersHeader from "./PartnersHeader";
import CreateHeaderTabs from "./CreateHeaderTabs";

export default function HeaderShell() {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const isLogin = pathname === "/login";
  const hideMenu = pathname === "/login";

  const handleSearch = () => {
    const term = search.trim();
    if (!term) return;
    router.push(`/submit?q=${encodeURIComponent(term)}`);
    setSearch("");
  };

  return (
    <div className={`nyt-header${isLogin ? " nyt-header--dark nyt-header--no-lines" : " nyt-header--no-lines"}`}>
      <Header />
      {!hideMenu && (
        <>
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "8px 0",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 12,
                display: "flex",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  border: "1px solid #111",
                  background: "transparent",
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                aria-label="Go back"
              >
                ←
              </button>
            </div>
            <nav
              style={{
                display: "flex",
                gap: 24,
                justifyContent: "center",
                background: "none",
                fontWeight: 600,
              }}
            >
              <Link href="/">Home</Link>
              <Link href="/submit">The Idea</Link>
              <Link href="/categories">Partners</Link>
              <Link href="/notifications">Notifications</Link>
              <Link href="/profile">Profile</Link>
            </nav>
            {pathname !== "/" && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder="Search ideas..."
                  style={{
                    width: 180,
                    border: "1px solid #111",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 12,
                    background: "#0f0f0f",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  style={{
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Go
                </button>
              </div>
            )}
          </div>
          <CategoryHeaderWrapper />
          <PartnersHeader />
          <CreateHeaderTabs />
        </>
      )}
    </div>
  );
}
