"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ProfileSummary = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const formatTimeAgo = (value: string) => {
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

export default function MessagesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recipient, setRecipient] = useState<ProfileSummary | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let isActive = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isActive) return;
      setUserId(data.user?.id ?? null);
      setLoading(false);
    };
    loadUser();
    return () => {
      isActive = false;
    };
  }, []);

  const loadMessages = async (id: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .or(`sender_id.eq.${id},recipient_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      setStatus(error.message || "Could not load messages.");
      setMessages([]);
      return;
    }
    const rows = (data ?? []) as MessageRow[];
    const nowIso = new Date().toISOString();
    const unreadIds = rows
      .filter((row) => row.recipient_id === id && !row.read_at)
      .map((row) => row.id);
    const nextRows = rows.map((row) =>
      row.recipient_id === id && !row.read_at
        ? { ...row, read_at: nowIso }
        : row
    );
    setMessages(nextRows);
    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({ read_at: nowIso })
        .in("id", unreadIds)
        .eq("recipient_id", id);
    }
    const profileIds = Array.from(
      new Set(rows.flatMap((row) => [row.sender_id, row.recipient_id]))
    );
    if (profileIds.length === 0) {
      setProfiles({});
      return;
    }
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, photo_url")
      .in("id", profileIds);
    const mapped = (profileRows ?? []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, ProfileSummary>);
    setProfiles(mapped);
  };

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setProfiles({});
      return;
    }
    loadMessages(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    let isActive = true;
    const runSearch = async () => {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .ilike("full_name", `%${query}%`)
        .neq("id", userId)
        .limit(6);
      if (!isActive) return;
      if (error) {
        setSearchResults([]);
      } else {
        setSearchResults(data ?? []);
      }
      setSearchLoading(false);
    };
    runSearch();
    return () => {
      isActive = false;
    };
  }, [searchQuery, userId]);

  const handleSend = async () => {
    if (!userId) {
      setStatus("Log in to send messages.");
      return;
    }
    if (!recipient) {
      setStatus("Choose a recipient.");
      return;
    }
    const text = messageBody.trim();
    if (!text) {
      setStatus("Write a message.");
      return;
    }
    setSending(true);
    setStatus(null);
    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: recipient.id,
      body: text,
    });
    if (error) {
      setStatus(error.message || "Could not send message.");
      setSending(false);
      return;
    }
    setMessageBody("");
    setSending(false);
    loadMessages(userId);
  };

  return (
    <div
      className="nyt-main"
      style={{
        maxWidth: 980,
        margin: "32px auto",
        padding: "0 16px",
        display: "grid",
        justifyItems: "center",
      }}
    >
      {loading ? (
        <div style={{ fontSize: 14, opacity: 0.7 }}>Loading messages...</div>
      ) : !userId ? (
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          Log in to view your messages.
        </div>
      ) : (
        <div
          className="messages-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 380px))",
            gap: 16,
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              borderRadius: 14,
              border: "1px solid var(--rule-light)",
              background: "transparent",
              display: "grid",
              gap: 0,
              minHeight: 200,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--rule-light)",
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Inbox
            </div>
            {status && (
              <div
                style={{
                  padding: "8px 16px",
                  borderBottom: "1px solid var(--rule-light)",
                  fontSize: 12,
                  opacity: 0.7,
                }}
              >
                {status}
              </div>
            )}
            {messages.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: 13, opacity: 0.7 }}>
                No messages yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {messages.map((message) => {
                  const isOutgoing = message.sender_id === userId;
                  const otherId = isOutgoing
                    ? message.recipient_id
                    : message.sender_id;
                  const profile = profiles[otherId];
                  const name = profile?.full_name || "User";
                  const photo = profile?.photo_url || null;
                  const isUnread = !isOutgoing && !message.read_at;
                  return (
                    <div
                      key={message.id}
                      style={{
                        display: "grid",
                        gap: 6,
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--rule-light)",
                        background: isUnread
                          ? "rgba(194, 122, 82, 0.08)"
                          : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {photo ? (
                          <img
                            src={photo}
                            alt={name}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              objectFit: "cover",
                              background: "var(--surface)",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              background: "var(--surface)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 8,
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "rgba(58, 43, 36, 0.7)",
                            }}
                          >
                            {"No\nPhoto"}
                          </div>
                        )}
                        <div style={{ display: "grid", gap: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {isOutgoing ? "To" : "From"}{" "}
                            <Link
                              href={`/profile?user=${otherId}`}
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              {name}
                            </Link>
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>
                            {formatTimeAgo(message.created_at)}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isUnread ? 600 : 400,
                        }}
                      >
                        {message.body}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid var(--rule-light)",
              background: "rgba(255, 241, 226, 0.9)",
              padding: 16,
              display: "grid",
              gap: 12,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              New Message
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search user name"
              style={{
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            {searchLoading && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>Searching...</div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                {searchResults.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setRecipient(profile);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    style={{
                      border: "1px solid var(--rule-light)",
                      background: "var(--paper)",
                      padding: "8px 10px",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {profile.photo_url ? (
                      <img
                        src={profile.photo_url}
                        alt={profile.full_name || "User"}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 10,
                          objectFit: "cover",
                          background: "var(--surface)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 10,
                          background: "var(--surface)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 7,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "rgba(58, 43, 36, 0.7)",
                        }}
                      >
                        {"No\nPhoto"}
                      </div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {profile.full_name || "User"}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {recipient && (
              <div
                style={{
                  border: "1px solid var(--rule-light)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "var(--paper)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12 }}>
                  Sending to <strong>{recipient.full_name || "User"}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setRecipient(null)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 11,
                    cursor: "pointer",
                    opacity: 0.7,
                  }}
                >
                  Clear
                </button>
              </div>
            )}
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Write a message"
              rows={6}
              style={{
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
                resize: "vertical",
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              style={{
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-strong)",
                color: "#fff7ef",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
