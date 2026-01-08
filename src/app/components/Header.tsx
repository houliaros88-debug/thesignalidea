"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const [liveDate, setLiveDate] = useState("");

  useEffect(() => {
    const formatDate = () =>
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    setLiveDate(formatDate());
    const interval = setInterval(() => {
      setLiveDate(formatDate());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (pathname === "/profile") return null;
  return (
    <>
      <div className="nyt-top-rule" />
      <div className={`nyt-title${isLogin ? " nyt-title--type" : ""}`}>
        The Signal Idea
      </div>
      <div className="nyt-date">
        <span className={isLogin && liveDate ? "nyt-date--type" : ""}>
          {liveDate}
        </span>
      </div>
      <div className="nyt-date-line" />
    </>
  );
}
