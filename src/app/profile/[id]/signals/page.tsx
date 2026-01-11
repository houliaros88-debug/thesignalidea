"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

type SignalItem = {
  id: string;
  ideaId: string;
  ideaTitle: string;
  category: string | null;
  createdAt: string | null;
  otherUserId: string | null;
  otherUserName: string;
  otherUserPhotoUrl: string | null;
};

type IdeaRef = {
  id: string;
  title: string | null;
  user_id: string | null;
};

type SignalRow = {
  id: string;
  category: string | null;
  created_at: string | null;
  user_id?: string | null;
  idea?: IdeaRef | IdeaRef[] | null;
};

const normalizeIdea = (idea: IdeaRef | IdeaRef[] | null | undefined) => {
  if (!idea) return null;
  return Array.isArray(idea) ? idea[0] ?? null : idea;
};

const formatTimeAgo = (value: string | null) => {
  if (!value) return "";
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

export default function SignalsPage() {
  const params = useParams();
  const routeId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [givenSignals, setGivenSignals] = useState<SignalItem[]>([]);
  const [receivedSignals, setReceivedSignals] = useState<SignalItem[]>([]);
  const [activeTab, setActiveTab] = useState<"given" | "received">("given");

  useEffect(() => {
    let isActive = true;
    const loadSignals = async () => {
      if (!routeId || typeof routeId !== "string") {
        setLoading(false);
        return;
      }

      const { data: givenRows, error: givenError } = await supabase
        .from("idea_signals")
        .select("id, category, created_at, idea:idea_id(id,title,user_id)")
        .eq("user_id", routeId)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (givenError) {
        setErrorMessage("Could not load signals.");
        setLoading(false);
        return;
      }

      const { data: ownedIdeas, error: ownedError } = await supabase
        .from("ideas")
        .select("id")
        .eq("user_id", routeId);
      if (!isActive) return;
      if (ownedError) {
        setErrorMessage("Could not load signals.");
        setLoading(false);
        return;
      }

      const ownedIdeaIds = (ownedIdeas ?? []).map((idea) => idea.id);
      let receivedRows: SignalRow[] = [];
      if (ownedIdeaIds.length > 0) {
        const { data, error } = await supabase
          .from("idea_signals")
          .select("id, category, created_at, user_id, idea:idea_id(id,title,user_id)")
          .in("idea_id", ownedIdeaIds)
          .order("created_at", { ascending: false });
        if (!isActive) return;
        if (error) {
          setErrorMessage("Could not load signals.");
          setLoading(false);
          return;
        }
        receivedRows = (data ?? []) as SignalRow[];
      }

      const profileIds = new Set<string>();
      ((givenRows ?? []) as SignalRow[]).forEach((row) => {
        const ideaOwnerId = normalizeIdea(row.idea)?.user_id ?? null;
        if (ideaOwnerId) {
          profileIds.add(ideaOwnerId);
        }
      });
      (receivedRows ?? []).forEach((row) => {
        const actorId = row.user_id;
        if (actorId) {
          profileIds.add(actorId);
        }
      });

      let profileMap: Record<
        string,
        { id: string; full_name: string | null; photo_url: string | null }
      > = {};
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, photo_url")
          .in("id", Array.from(profileIds));
        profileMap = (profiles ?? []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, { id: string; full_name: string | null; photo_url: string | null }>);
      }

      const given = ((givenRows ?? []) as SignalRow[]).map((row) => {
        const idea = normalizeIdea(row.idea);
        const ownerId = idea?.user_id ?? null;
        const owner = ownerId ? profileMap[ownerId] : null;
        return {
          id: row.id,
          ideaId: idea?.id ?? "",
          ideaTitle: idea?.title || "Untitled idea",
          category: row.category ?? null,
          createdAt: row.created_at ?? null,
          otherUserId: ownerId,
          otherUserName: owner?.full_name || "User",
          otherUserPhotoUrl: owner?.photo_url || null,
        };
      });

      const received = (receivedRows ?? []).map((row) => {
        const idea = normalizeIdea(row.idea);
        const actorId = row.user_id ?? null;
        const actor = actorId ? profileMap[actorId] : null;
        return {
          id: row.id,
          ideaId: idea?.id ?? "",
          ideaTitle: idea?.title || "Untitled idea",
          category: row.category ?? null,
          createdAt: row.created_at ?? null,
          otherUserId: actorId,
          otherUserName: actor?.full_name || "User",
          otherUserPhotoUrl: actor?.photo_url || null,
        };
      });

      if (!isActive) return;
      setGivenSignals(given);
      setReceivedSignals(received);
      setLoading(false);
    };

    loadSignals();
    return () => {
      isActive = false;
    };
  }, [routeId]);

  return (
    <div
      className="nyt-main"
      style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}
    >
      {loading ? (
        <div style={{ fontSize: 14, opacity: 0.7 }}>Loading...</div>
      ) : errorMessage ? (
        <div style={{ fontSize: 14, opacity: 0.7 }}>{errorMessage}</div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab("given")}
              className={`signal-tab ${activeTab === "given" ? "signal-tab--active" : "signal-tab--inactive"}`}
              style={{
                border: "1px solid var(--rule-strong)",
                background: activeTab === "given" ? "var(--accent-soft)" : "var(--paper)",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Given ({givenSignals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("received")}
              className={`signal-tab ${activeTab === "received" ? "signal-tab--active" : "signal-tab--inactive"}`}
              style={{
                border: "1px solid var(--rule-strong)",
                background: activeTab === "received" ? "var(--accent-soft)" : "var(--paper)",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Received ({receivedSignals.length})
            </button>
          </div>
          {activeTab === "given" ? (
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                opacity: 0.7,
                marginBottom: 12,
              }}
            >
              Signals you gave
            </div>
            {givenSignals.length === 0 ? (
              <div style={{ fontSize: 14, opacity: 0.7 }}>
                No signals given yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {givenSignals.map((signal) => (
                  <div
                    key={signal.id}
                    className="signal-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      borderBottom: "1px solid var(--rule-light)",
                      paddingBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {signal.ideaTitle}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {signal.category || "Uncategorized"} •{" "}
                        {formatTimeAgo(signal.createdAt)}
                      </div>
                    </div>
                    {signal.otherUserId ? (
                      <Link
                        href={`/profile/${signal.otherUserId}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          textDecoration: "none",
                        }}
                      >
                        {signal.otherUserPhotoUrl ? (
                          <img
                            src={signal.otherUserPhotoUrl}
                            alt={signal.otherUserName}
                            width={36}
                            height={36}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              objectFit: "cover",
                              background: "var(--surface)",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: "var(--surface)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 9,
                              fontWeight: 600,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              whiteSpace: "pre-line",
                              textAlign: "center",
                              lineHeight: 1.1,
                              color: "rgba(58, 43, 36, 0.7)",
                            }}
                          >
                            {"No\nPhoto"}
                          </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {signal.otherUserName}
                        </div>
                      </Link>
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>User</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  opacity: 0.7,
                  marginBottom: 12,
                }}
              >
                Signals you received
              </div>
              {receivedSignals.length === 0 ? (
                <div style={{ fontSize: 14, opacity: 0.7 }}>
                  No signals received yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {receivedSignals.map((signal) => (
                    <div
                      key={signal.id}
                      className="signal-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        borderBottom: "1px solid var(--rule-light)",
                        paddingBottom: 10,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>
                          {signal.ideaTitle}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {signal.category || "Uncategorized"} •{" "}
                          {formatTimeAgo(signal.createdAt)}
                        </div>
                      </div>
                      {signal.otherUserId ? (
                        <Link
                          href={`/profile/${signal.otherUserId}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            textDecoration: "none",
                          }}
                        >
                          {signal.otherUserPhotoUrl ? (
                            <img
                              src={signal.otherUserPhotoUrl}
                              alt={signal.otherUserName}
                              width={36}
                              height={36}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                objectFit: "cover",
                                background: "var(--surface)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "var(--surface)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 9,
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                whiteSpace: "pre-line",
                                textAlign: "center",
                                lineHeight: 1.1,
                                color: "rgba(58, 43, 36, 0.7)",
                              }}
                            >
                              {"No\nPhoto"}
                            </div>
                          )}
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {signal.otherUserName}
                          </div>
                        </Link>
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>User</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
