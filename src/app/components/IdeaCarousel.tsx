"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export const carouselHeight = "min(130vh, 1200px)";
export const carouselWidth = "min(92vw, 560px)";

export default function IdeaCarousel({
  description,
  photoUrl,
  videoUrl,
  title,
  ideaId,
  userName,
  userPhotoUrl,
  timeLabel,
}: {
  description: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  title: string;
  ideaId?: string | null;
  userName?: string | null;
  userPhotoUrl?: string | null;
  timeLabel?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likePending, setLikePending] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [viewCountUnique, setViewCountUnique] = useState(0);
  const [viewCountTotal, setViewCountTotal] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<
    Array<{
      id: string;
      text: string;
      createdAt: string | null;
      userId: string;
      userName: string;
      userPhotoUrl: string | null;
    }>
  >([]);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    photoUrl: string | null;
  } | null>(null);
  const hasRecordedUniqueView = useRef(false);
  const hasRecordedTotalView = useRef(false);
  const rafRef = useRef<number | null>(null);
  const controlButtonStyle = {
    width: 40,
    height: 40,
    borderRadius: 999,
    border: "none",
    background: "transparent",
    display: "grid",
    placeItems: "center",
  };

  useEffect(() => {
    hasRecordedUniqueView.current = false;
    hasRecordedTotalView.current = false;
  }, [ideaId]);

  useEffect(() => {
    let isActive = true;
    const loadViewCounts = async () => {
      if (!ideaId) {
        setViewCountUnique(0);
        setViewCountTotal(0);
        return;
      }
      const [uniqueRes, totalRes] = await Promise.all([
        supabase
          .from("idea_views")
          .select("id", { count: "exact", head: true })
          .eq("idea_id", ideaId),
        supabase
          .from("idea_view_events")
          .select("id", { count: "exact", head: true })
          .eq("idea_id", ideaId),
      ]);
      if (!isActive) return;
      if (uniqueRes.error) {
        setViewCountUnique(0);
      } else {
        setViewCountUnique(uniqueRes.count ?? 0);
      }
      if (totalRes.error) {
        setViewCountTotal(0);
      } else {
        setViewCountTotal(totalRes.count ?? 0);
      }
    };
    loadViewCounts();
    return () => {
      isActive = false;
    };
  }, [ideaId]);

  useEffect(() => {
    let isActive = true;
    const recordUniqueView = async () => {
      if (!ideaId || !currentUser?.id || hasRecordedUniqueView.current) return;
      hasRecordedUniqueView.current = true;
      const { error } = await supabase
        .from("idea_views")
        .upsert(
          { idea_id: ideaId, user_id: currentUser.id },
          { onConflict: "idea_id,user_id", ignoreDuplicates: true }
        );
      if (error) return;
      const { count } = await supabase
        .from("idea_views")
        .select("id", { count: "exact", head: true })
        .eq("idea_id", ideaId);
      if (!isActive) return;
      if (typeof count === "number") {
        setViewCountUnique(count);
      }
    };
    recordUniqueView();
    return () => {
      isActive = false;
    };
  }, [ideaId, currentUser?.id]);

  useEffect(() => {
    let isActive = true;
    const recordTotalView = async () => {
      if (!ideaId || !currentUser?.id || hasRecordedTotalView.current) return;
      hasRecordedTotalView.current = true;
      const { error } = await supabase.from("idea_view_events").insert({
        idea_id: ideaId,
        user_id: currentUser.id,
      });
      if (error) return;
      if (!isActive) return;
      setViewCountTotal((count) => count + 1);
    };
    recordTotalView();
    return () => {
      isActive = false;
    };
  }, [ideaId, currentUser?.id]);

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
    const loadCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!isActive) return;
      if (!userId) {
        setCurrentUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, photo_url")
        .eq("id", userId)
        .maybeSingle();
      if (!isActive) return;
      setCurrentUser({
        id: userId,
        name:
          profile?.full_name ||
          data.user?.user_metadata?.full_name ||
          data.user?.email ||
          "User",
        photoUrl: profile?.photo_url || null,
      });
    };
    loadCurrentUser();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadLikes = async () => {
      if (!ideaId) {
        setLikeCount(0);
        setLiked(false);
        return;
      }
      const { count, error } = await supabase
        .from("idea_likes")
        .select("id", { count: "exact", head: true })
        .eq("idea_id", ideaId);
      if (!isActive) return;
      if (error) {
        setLikeCount(0);
        return;
      }
      setLikeCount(count ?? 0);
      if (currentUser?.id) {
        const { data } = await supabase
          .from("idea_likes")
          .select("id")
          .eq("idea_id", ideaId)
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (!isActive) return;
        setLiked(!!data);
      } else {
        setLiked(false);
      }
    };
    loadLikes();
    return () => {
      isActive = false;
    };
  }, [ideaId, currentUser?.id]);

  useEffect(() => {
    let isActive = true;
    const loadComments = async () => {
      if (!ideaId) {
        setComments([]);
        return;
      }
      const { data, error } = await supabase
        .from("idea_comments")
        .select("id, idea_id, user_id, body, created_at")
        .eq("idea_id", ideaId)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setComments([]);
        return;
      }
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
      let profileMap: Record<
        string,
        { full_name: string | null; photo_url: string | null }
      > = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, photo_url")
          .in("id", userIds);
        profileMap = (profiles ?? []).reduce(
          (acc, profile) => {
            acc[profile.id] = {
              full_name: profile.full_name,
              photo_url: profile.photo_url,
            };
            return acc;
          },
          {} as Record<string, { full_name: string | null; photo_url: string | null }>
        );
      }
      const mapped = rows.map((row) => ({
        id: row.id,
        text: row.body,
        createdAt: row.created_at,
        userId: row.user_id,
        userName: profileMap[row.user_id]?.full_name || "User",
        userPhotoUrl: profileMap[row.user_id]?.photo_url || null,
      }));
      setComments(mapped);
    };
    loadComments();
    return () => {
      isActive = false;
    };
  }, [ideaId]);

  const updateActive = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 1;
    const nextIndex = Math.round(containerRef.current.scrollLeft / width);
    setActiveIndex((prev) => (prev !== nextIndex ? nextIndex : prev));
  };

  const handleScroll = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      updateActive();
      rafRef.current = null;
    });
  };

  const handleVideoTimeUpdate = (
    event: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const video = event.currentTarget;
    if (!video.duration) return;
    setVideoProgress(video.currentTime / video.duration);
  };

  const showBadge = Boolean(userName || userPhotoUrl);
  const initial = (userName ?? "").trim().slice(0, 1).toUpperCase() || "U";
  const authorBadge = showBadge ? (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: 14,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 999,
        background: "transparent",
        border: "none",
        pointerEvents: "none",
      }}
    >
      {userPhotoUrl ? (
        <img
          src={userPhotoUrl}
          alt={`${userName ?? "User"} profile`}
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            objectFit: "cover",
            background: "#111",
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            background: "#111",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {initial}
        </div>
      )}
      <div style={{ display: "grid", gap: 2 }}>
        <span
          style={{
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 700,
            textShadow:
              "0 0 6px rgba(255, 255, 255, 0.7), 0 0 14px rgba(255, 255, 255, 0.45)",
          }}
        >
          {userName ?? "User"}
        </span>
        {timeLabel && (
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            {timeLabel}
          </span>
        )}
      </div>
    </div>
  ) : null;

  const handleCommentSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (!ideaId || !currentUser) return;
    const { data, error } = await supabase
      .from("idea_comments")
      .insert({
        idea_id: ideaId,
        user_id: currentUser.id,
        body: trimmed,
      })
      .select("id, created_at")
      .maybeSingle();
    if (error) return;
    setComments((prev) => [
      {
        id: data?.id ?? `${Date.now()}`,
        text: trimmed,
        createdAt: data?.created_at ?? new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userPhotoUrl: currentUser.photoUrl,
      },
      ...prev,
    ]);
    setCommentText("");
  };

  const addLike = async () => {
    if (!ideaId || !currentUser?.id || likePending || liked) return;
    setLikePending(true);
    const { error } = await supabase.from("idea_likes").insert({
      idea_id: ideaId,
      user_id: currentUser.id,
    });
    if (!error) {
      setLiked(true);
      setLikeCount((count) => count + 1);
    }
    setLikePending(false);
  };

  const removeLike = async () => {
    if (!ideaId || !currentUser?.id || likePending || !liked) return;
    setLikePending(true);
    const { error } = await supabase
      .from("idea_likes")
      .delete()
      .eq("idea_id", ideaId)
      .eq("user_id", currentUser.id);
    if (!error) {
      setLiked(false);
      setLikeCount((count) => Math.max(0, count - 1));
    }
    setLikePending(false);
  };

  const handleLikeToggle = async () => {
    if (!currentUser?.id) return;
    if (liked) {
      await removeLike();
    } else {
      await addLike();
    }
  };

  const handleLikeOnce = () => {
    if (!currentUser?.id || liked) return;
    void addLike();
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    if (!shareUrl) return;
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Idea",
          text: "Check out this idea.",
          url: shareUrl,
        });
        shared = true;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") {
          return;
        }
      }
    }
    if (!shared && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        shared = true;
      } catch {
        shared = false;
      }
    }
    if (!shared && typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        shared = document.execCommand("copy");
      } catch {
        shared = false;
      }
      document.body.removeChild(textarea);
    }
    if (!shared) {
      window.prompt("Copy this link:", shareUrl);
      shared = true;
    }
    if (shared) {
      setShareCount((count) => count + 1);
    }
  };

  const handleClosePanels = () => {
    setIsCommentOpen(false);
    setIsShareOpen(false);
  };

  const handleToggleComments = () => {
    setIsShareOpen(false);
    setIsCommentOpen((prev) => !prev);
  };

  const handleToggleShare = () => {
    setIsCommentOpen(false);
    setIsShareOpen((prev) => !prev);
  };

  const renderControls = (panelOpen: boolean) => (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: panelOpen ? "28%" : "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 2,
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={handleLikeToggle}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          style={{
            ...controlButtonStyle,
            padding: 0,
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 20.25c-4.2-2.4-7.5-5.7-7.5-9.3 0-2.4 1.8-4.2 4.2-4.2 1.5 0 2.7.6 3.3 1.8.6-1.2 1.8-1.8 3.3-1.8 2.4 0 4.2 1.8 4.2 4.2 0 3.6-3.3 6.9-7.5 9.3z"
              fill={liked ? "#fff" : "none"}
              stroke="#fff"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {likeCount}
        </span>
      </div>
      <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={handleToggleComments}
          aria-pressed={isCommentOpen}
          aria-label={isCommentOpen ? "Close comments" : "Open comments"}
          style={{
            ...controlButtonStyle,
            padding: 0,
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 5h16v10H7l-3 3V5z"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {comments.length}
        </span>
      </div>
      <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
        <div
          style={{
            ...controlButtonStyle,
            color: "#fff",
          }}
          aria-hidden="true"
          title="Unique views"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.5" />
          </svg>
        </div>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {viewCountUnique}
        </span>
      </div>
      <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
        <div
          style={{
            ...controlButtonStyle,
            color: "#fff",
          }}
          aria-hidden="true"
          title="Total views"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.5" />
            <path
              d="M8 12h8"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {viewCountTotal}
        </span>
      </div>
      <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={handleToggleShare}
          aria-pressed={isShareOpen}
          aria-label="Share"
          style={{
            ...controlButtonStyle,
            padding: 0,
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 10v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M12 16V4m0 0l-3 3m3-3l3 3"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {shareCount}
        </span>
      </div>
    </div>
  );

  const renderCommentPanel = (panelOpen: boolean) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: panelOpen ? "50%" : "0%",
        background: "#000",
        borderTop: "1px solid rgba(255, 255, 255, 0.2)",
        overflow: "hidden",
        transition: "height 0.25s ease",
        pointerEvents: panelOpen ? "auto" : "none",
        zIndex: 1,
      }}
    >
      <div
        style={{
          opacity: panelOpen ? 1 : 0,
          transition: "opacity 0.2s ease",
          height: "100%",
          display: "grid",
          gridTemplateRows: "1fr auto",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            display: "grid",
            gap: 10,
            overflowY: "auto",
          }}
        >
          {comments.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              No comments yet.
            </div>
          )}
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
            >
              {comment.userPhotoUrl ? (
                <img
                  src={comment.userPhotoUrl}
                  alt={comment.userName}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 10,
                    objectFit: "cover",
                    background: "#111",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 10,
                    background: "#111",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {comment.userName.trim().slice(0, 1) || "U"}
                </div>
              )}
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {comment.userName}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {comment.text}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {formatTimeAgo(comment.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={handleCommentSubmit}
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 16px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <input
            type="text"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder={
              currentUser ? "Add a comment" : "Log in to comment"
            }
            disabled={!currentUser || !ideaId}
            style={{
              flex: 1,
              borderRadius: 999,
              border: "1px solid rgba(255, 255, 255, 0.3)",
              background: "transparent",
              padding: "8px 12px",
              fontSize: 12,
              color: "#fff",
              outline: "none",
              opacity: currentUser ? 1 : 0.6,
            }}
          />
          <button
            type="submit"
            disabled={!currentUser || !ideaId}
            style={{
              border: "1px solid rgba(255, 255, 255, 0.35)",
              background: "transparent",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              color: "#fff",
              opacity: currentUser ? 1 : 0.6,
            }}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );

  const renderSharePanel = (panelOpen: boolean) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: panelOpen ? "50%" : "0%",
        background: "#000",
        borderTop: "1px solid rgba(255, 255, 255, 0.2)",
        overflow: "hidden",
        transition: "height 0.25s ease",
        pointerEvents: panelOpen ? "auto" : "none",
        zIndex: 1,
      }}
    >
      <div
        style={{
          opacity: panelOpen ? 1 : 0,
          transition: "opacity 0.2s ease",
          height: "100%",
          display: "grid",
          gridTemplateRows: "1fr auto",
          padding: "16px 18px",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={handleShare}
            style={{
              border: "1px solid rgba(255, 255, 255, 0.35)",
              background: "transparent",
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            Share Link
          </button>
          <button
            type="button"
            onClick={async () => {
              if (typeof window === "undefined") return;
              const shareUrl = window.location.href;
              if (!shareUrl) return;
              try {
                await navigator.clipboard.writeText(shareUrl);
                setShareCount((count) => count + 1);
              } catch {
                window.prompt("Copy this link:", shareUrl);
                setShareCount((count) => count + 1);
              }
            }}
            style={{
              border: "1px solid rgba(255, 255, 255, 0.35)",
              background: "transparent",
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            Copy Link
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsShareOpen(false)}
          style={{
            border: "none",
            background: "transparent",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
      <div style={{ width: carouselWidth }}>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            width: "100%",
            height: carouselHeight,
            overflowX: "auto",
            display: "flex",
            gap: 12,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {([0, 1, 2] as const).map((slideIndex) => {
            const panelOpen =
              activeIndex === slideIndex && (isCommentOpen || isShareOpen);
            const contentHeight = panelOpen ? "50%" : "100%";
            const contentStyle = {
              height: contentHeight,
              width: "100%",
              transition: "height 0.25s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            };

            const slideBase = {
              flex: "0 0 100%",
              height: "100%",
              borderRadius: 24,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: slideIndex === 0 ? "#0f0f0f" : "#111",
              scrollSnapAlign: "start",
              position: "relative" as const,
              overflow: "hidden",
            };

            return (
              <div key={slideIndex} style={slideBase}>
                {authorBadge}
                {renderControls(panelOpen)}
                <div
                  style={{ ...contentStyle, padding: slideIndex === 0 ? 20 : 0 }}
                  onClick={() => {
                    if (panelOpen) {
                      handleClosePanels();
                    }
                  }}
                  onDoubleClick={slideIndex === 0 ? handleLikeOnce : undefined}
                >
                  {slideIndex === 0 && (
                    <div
                      onDoubleClick={handleLikeOnce}
                      style={{
                        fontSize: 15,
                        color: "#fff",
                        lineHeight: 1.6,
                        textAlign: "center",
                        padding: 20,
                      }}
                    >
                      {description}
                    </div>
                  )}
                  {slideIndex === 1 && (
                    <>
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={title}
                          onDoubleClick={handleLikeOnce}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 24,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: 13,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                          }}
                        >
                          No photo
                        </div>
                      )}
                    </>
                  )}
                  {slideIndex === 2 && (
                    <>
                      {videoUrl ? (
                        <>
                          <video
                            src={videoUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            onTimeUpdate={handleVideoTimeUpdate}
                            onDoubleClick={handleLikeOnce}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: 24,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              left: 16,
                              right: 16,
                              bottom: 16,
                              height: 2,
                              background: "transparent",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(
                                  100,
                                  Math.max(0, videoProgress * 100)
                                )}%`,
                                background: "#fff",
                                transition: "width 0.1s linear",
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            fontSize: 13,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                          }}
                        >
                          No video
                        </div>
                      )}
                    </>
                  )}
                </div>
                {renderCommentPanel(isCommentOpen && activeIndex === slideIndex)}
                {renderSharePanel(isShareOpen && activeIndex === slideIndex)}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background:
                  activeIndex === index
                    ? "#fff"
                    : "rgba(255, 255, 255, 0.35)",
                display: "inline-block",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
