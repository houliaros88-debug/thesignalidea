"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CategoryHeaderWrapper from "./CategoryHeaderWrapper";
import Header from "./Header";
import PartnersHeader from "./PartnersHeader";
import JobsHeader from "./JobsHeader";
import ReviewsHeader from "./ReviewsHeader";
import CreateHeaderTabs from "./CreateHeaderTabs";
import { supabase } from "../../lib/supabaseClient";

export default function HeaderShell() {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const isLogin = pathname === "/login";
  const hideMenu = pathname === "/login";
  const notificationColor = hasNotifications
    ? "var(--accent-strong)"
    : "var(--ink)";
  const notificationBorder = hasNotifications
    ? "var(--accent-strong)"
    : "var(--rule-strong)";
  const messageColor = hasUnreadMessages
    ? "var(--accent-strong)"
    : "var(--ink)";
  const messageBorder = hasUnreadMessages
    ? "var(--accent-strong)"
    : "var(--rule-strong)";

  useEffect(() => {
    let isActive = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isActive) return;
      setUserId(data?.session?.user?.id ?? null);
    };
    loadUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isActive) return;
        setUserId(session?.user?.id ?? null);
      }
    );
    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadNotifications = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUserId = sessionData?.session?.user?.id ?? null;
      if (sessionUserId && sessionUserId !== userId) {
        setUserId(sessionUserId);
      }
      if (!sessionUserId) {
        if (isActive) {
          setHasNotifications(false);
          setHasUnreadMessages(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", sessionUserId)
        .or("is_read.eq.false,is_read.is.null")
        .limit(1);
      if (!isActive) return;
      if (!error) {
        setHasNotifications((data ?? []).length > 0);
      } else {
        setHasNotifications(false);
      }

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("id")
        .eq("recipient_id", sessionUserId)
        .is("read_at", null)
        .limit(1);
      if (!isActive) return;
      if (!messageError) {
        setHasUnreadMessages((messageData ?? []).length > 0);
      } else {
        setHasUnreadMessages(false);
      }
    };

    loadNotifications();

    if (userId) {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();
    }

    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => {
      isActive = false;
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, pathname]);

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
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--ink)",
                  boxShadow: "0 8px 20px rgba(61, 47, 40, 0.16)",
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
              {[
                { label: "Home", href: "/", match: (path: string) => path === "/" },
                {
                  label: "Profile",
                  href: "/profile",
                  match: (path: string) => path.startsWith("/profile"),
                },
                {
                  label: "The Idea",
                  href: "/submit",
                  match: (path: string) => path.startsWith("/submit"),
                },
                {
                  label: "Partners",
                  href: "/categories",
                  match: (path: string) => path.startsWith("/categories"),
                },
                {
                  label: "Jobs",
                  href: "/jobs",
                  match: (path: string) => path.startsWith("/jobs"),
                },
                {
                  label: "Reviews",
                  href: "/reviews",
                  match: (path: string) => path.startsWith("/reviews"),
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nyt-nav-link${
                    item.match(pathname) ? " is-active" : ""
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div
              style={{
                position: "absolute",
                right: 12,
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Link
                href="/notifications"
                aria-label="Notifications"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  border: `3px solid ${notificationBorder}`,
                  color: notificationColor,
                  textDecoration: "none",
                  position: "relative",
                  boxShadow: hasNotifications
                    ? "0 0 18px rgba(194, 122, 82, 0.6)"
                    : "0 6px 16px rgba(61, 47, 40, 0.18)",
                  background: hasNotifications
                    ? "rgba(194, 122, 82, 0.12)"
                    : "var(--paper)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </Link>
              <Link
                href="/messages"
                aria-label="Messages"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  border: `3px solid ${messageBorder}`,
                  color: messageColor,
                  textDecoration: "none",
                  position: "relative",
                  boxShadow: hasUnreadMessages
                    ? "0 0 18px rgba(194, 122, 82, 0.6)"
                    : "0 6px 16px rgba(61, 47, 40, 0.18)",
                  background: hasUnreadMessages
                    ? "rgba(194, 122, 82, 0.12)"
                    : "var(--paper)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a4 4 0 01-4 4H8l-5 4V7a4 4 0 014-4h10a4 4 0 014 4z" />
                </svg>
              </Link>
            </div>
          </div>
          <CategoryHeaderWrapper />
          <PartnersHeader />
          <JobsHeader />
          <ReviewsHeader />
          <CreateHeaderTabs />
        </>
      )}
    </div>
  );
}
