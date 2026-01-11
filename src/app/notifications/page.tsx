"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type NotificationType =
  | "like"
  | "comment"
  | "signal"
  | "follow"
  | "unfollow"
  | "vote"
  | "update_like"
  | "update_comment";

type NotificationRow = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  idea_id: string | null;
  update_id: string | null;
  created_at: string | null;
  is_read: boolean | null;
};

type NotificationItem = {
  id: string;
  type: NotificationType;
  actor: string;
  target: string | null;
  date: string;
};

const typeLabel: Record<NotificationType, string> = {
  like: "liked your idea",
  comment: "commented on your idea",
  signal: "signaled your idea",
  follow: "followed you",
  unfollow: "unfollowed you",
  vote: "voted for your idea",
  update_like: "liked your update",
  update_comment: "commented on your update",
};

const typeIcon: Record<NotificationType, string> = {
  like: "♥",
  comment: "💬",
  signal: "⚡",
  follow: "➕",
  unfollow: "➖",
  vote: "✓",
  update_like: "♥",
  update_comment: "💬",
};

const formatTimeAgo = (value: string | null) => {
  if (!value) return "Just now";
  const created = new Date(value).getTime();
  const diffMs = Date.now() - created;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const loadNotifications = async () => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) {
        if (isActive) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const { data: rows, error } = await supabase
        .from("notifications")
        .select("id,type,actor_id,idea_id,update_id,created_at,is_read")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!isActive) return;
      if (error) {
        setItems([]);
        setLoading(false);
        return;
      }

      const notifications = (rows ?? []) as NotificationRow[];
      const actorIds = Array.from(
        new Set(
          notifications
            .map((row) => row.actor_id)
            .filter((value): value is string => Boolean(value))
        )
      );
      const updateIds = Array.from(
        new Set(
          notifications
            .map((row) => row.update_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      const [profilesRes, updatesRes] = await Promise.all([
        actorIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", actorIds)
          : Promise.resolve({ data: [] }),
        updateIds.length
          ? supabase
              .from("idea_updates")
              .select("id, idea_id")
              .in("id", updateIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = (profilesRes.data ?? []).reduce(
        (acc, profile) => {
          acc[profile.id] = profile.full_name || "User";
          return acc;
        },
        {} as Record<string, string>
      );

      const updateIdeaMap = (updatesRes.data ?? []).reduce(
        (acc, update) => {
          if (update.idea_id) acc[update.id] = update.idea_id;
          return acc;
        },
        {} as Record<string, string>
      );

      const ideaIds = Array.from(
        new Set(
          notifications
            .map((row) => row.idea_id || updateIdeaMap[row.update_id ?? ""])
            .filter((value): value is string => Boolean(value))
        )
      );

      const ideasRes = ideaIds.length
        ? await supabase
            .from("ideas")
            .select("id, title")
            .in("id", ideaIds)
        : { data: [] };

      const ideaMap = (ideasRes.data ?? []).reduce(
        (acc, idea) => {
          acc[idea.id] = idea.title || "Idea";
          return acc;
        },
        {} as Record<string, string>
      );

      const mapped = notifications.map((row) => {
        const ideaId = row.idea_id || updateIdeaMap[row.update_id ?? ""] || "";
        return {
          id: row.id,
          type: row.type,
          actor: profileMap[row.actor_id ?? ""] || "User",
          target: ideaId ? ideaMap[ideaId] || "Idea" : null,
          date: formatTimeAgo(row.created_at),
        };
      });

      setItems(mapped);
      setLoading(false);

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .or("is_read.eq.false,is_read.is.null");
    };

    loadNotifications();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div
      className="nyt-main"
      style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}
    >
      {loading ? (
        <div style={{ fontSize: 13, opacity: 0.7 }}>Loading...</div>
      ) : items.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--rule-light)",
            borderRadius: 18,
            padding: 20,
            background: "rgba(253, 247, 239, 0.8)",
            color: "var(--ink)",
            fontSize: 14,
            boxShadow: "var(--shadow-soft)",
          }}
        >
          No notifications yet. When someone likes, comments, signals, or
          follows you, it will show up here.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                borderBottom: "1px solid var(--rule-light)",
                paddingBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              <div style={{ fontSize: 18 }}>{typeIcon[item.type]}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{item.actor}</span>{" "}
                {typeLabel[item.type]}
                {item.target ? ` • ${item.target}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "rgba(61, 47, 40, 0.6)" }}>
                {item.date}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
