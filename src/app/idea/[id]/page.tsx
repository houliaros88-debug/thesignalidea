"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type IdeaRow = {
  id: string;
  title: string | null;
  description: string | null;
  photo_url: string | null;
  video_url: string | null;
  created_at: string | null;
  user_id: string;
};

type IdeaUpdate = {
  id: string;
  description: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: string | null;
};

export default function IdeaDetailPage() {
  const params = useParams();
  const ideaId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [idea, setIdea] = useState<IdeaRow | null>(null);
  const [updates, setUpdates] = useState<IdeaUpdate[]>([]);
  const [author, setAuthor] = useState<string>("User");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let isActive = true;
    const loadIdea = async () => {
      if (!ideaId || typeof ideaId !== "string") {
        setIdea(null);
        setUpdates([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: ideaRow, error } = await supabase
        .from("ideas")
        .select("id,title,description,photo_url,video_url,created_at,user_id")
        .eq("id", ideaId)
        .maybeSingle();
      if (!isActive) return;
      if (error || !ideaRow) {
        setIdea(null);
        setUpdates([]);
        setLoading(false);
        return;
      }
      setIdea(ideaRow);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ideaRow.user_id)
        .maybeSingle();
      if (!isActive) return;
      setAuthor(profile?.full_name || "User");
      const { data: updatesData } = await supabase
        .from("idea_updates")
        .select("id, body, photo_url, video_url, created_at")
        .eq("idea_id", ideaRow.id)
        .order("created_at", { ascending: true });
      if (!isActive) return;
      setUpdates(
        (updatesData ?? []).map((update) => ({
          id: update.id,
          description: update.body,
          photoUrl: update.photo_url,
          videoUrl: update.video_url,
          createdAt: update.created_at,
        }))
      );
      setLoading(false);
    };
    loadIdea();
    return () => {
      isActive = false;
    };
  }, [ideaId]);

  if (loading) {
    return (
      <div
        className="nyt-main"
        style={{ maxWidth: "100%", margin: "32px auto", padding: "0 24px" }}
      >
        Loading...
      </div>
    );
  }

  if (!idea) {
    return (
      <div
        className="nyt-main"
        style={{ maxWidth: "100%", margin: "32px auto", padding: "0 24px" }}
      >
        Idea not found.
      </div>
    );
  }

  const entries = [
    {
      id: idea.id,
      label: "Main Idea",
      description: idea.description || "",
      photoUrl: idea.photo_url,
      videoUrl: idea.video_url,
      createdAt: idea.created_at,
    },
    ...updates.map((update, index) => ({
      id: update.id,
      label: `Update ${index + 1}`,
      description: update.description,
      photoUrl: update.photoUrl ?? null,
      videoUrl: update.videoUrl ?? null,
      createdAt: update.createdAt ?? null,
    })),
  ];

  const boxStyle = {
    border: "1px solid var(--rule-light)",
    borderRadius: 20,
    padding: 18,
    minHeight: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--paper)",
    textAlign: "center" as const,
  };

  return (
    <div
      className="nyt-main"
      style={{ maxWidth: "100%", margin: "32px auto", padding: "0 24px" }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {idea.title || "Untitled idea"}
        </div>
        <div style={{ fontSize: 12, letterSpacing: "0.2em", opacity: 0.7 }}>
          {author} • {formatTimeAgo(idea.created_at)}
        </div>
      </div>

      <div style={{ display: "grid", gap: 28 }}>
        {entries.map((entry) => (
          <div key={entry.id} style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              {entry.label}
              {entry.createdAt ? ` • ${formatTimeAgo(entry.createdAt)}` : ""}
            </div>
            <div
              style={{
                width: "100%",
                overflowX: "auto",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(240px, 1fr))",
                  gap: 16,
                  width: "100%",
                  minWidth: 760,
                }}
              >
                <div style={boxStyle}>
                  {entry.description?.trim() || "No text"}
                </div>
                <div style={boxStyle}>
                  {entry.photoUrl ? (
                    <img
                      src={entry.photoUrl}
                      alt={idea.title || "Idea"}
                      style={{
                        width: "100%",
                        height: "100%",
                        maxHeight: 320,
                        objectFit: "cover",
                        borderRadius: 16,
                      }}
                    />
                  ) : (
                    "No photo"
                  )}
                </div>
                <div style={boxStyle}>
                  {entry.videoUrl ? (
                    <video
                      src={entry.videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        maxHeight: 320,
                        objectFit: "cover",
                        borderRadius: 16,
                        background: "var(--surface)",
                      }}
                    />
                  ) : (
                    "No video"
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
