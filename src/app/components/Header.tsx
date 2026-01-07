"use client";
import React from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  if (pathname === "/profile") return null;
  return (
    <>
      <div className="nyt-title">The Signal Idea</div>
      <div className="nyt-date">6 januari 2026</div>
    </>
  );
}
