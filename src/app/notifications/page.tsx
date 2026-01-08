"use client";

import React from "react";

type NotificationType = "like" | "signal" | "follow" | "unfollow" | "vote";

type NotificationItem = {
  id: string;
  type: NotificationType;
  actor: string;
  target: string;
  date: string;
};

const typeLabel: Record<NotificationType, string> = {
  like: "liked your idea",
  signal: "signaled your idea",
  follow: "followed you",
  unfollow: "unfollowed you",
  vote: "voted for your idea",
};

const typeIcon: Record<NotificationType, string> = {
  like: "♥",
  signal: "⚡",
  follow: "➕",
  unfollow: "➖",
  vote: "✓",
};

const notifications: NotificationItem[] = [];

export default function NotificationsPage() {
  return (
    <div
      className="nyt-main"
      style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Notifications
      </div>
      {notifications.length === 0 ? (
        <div
          style={{
            border: "1px solid #111",
            borderRadius: 10,
            padding: 20,
            background: "#0f0f0f",
            color: "#333",
            fontSize: 14,
          }}
        >
          No notifications yet. When someone likes your idea, gives you a
          signal, follows you, or votes, it will show up here.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {notifications.map((item) => (
            <div
              key={item.id}
              style={{
                borderBottom: "1px solid #ddd",
                paddingBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                color: "#222",
              }}
            >
              <div style={{ fontSize: 18 }}>{typeIcon[item.type]}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{item.actor}</span>{" "}
                {typeLabel[item.type]}
                {item.target ? ` • ${item.target}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{item.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
