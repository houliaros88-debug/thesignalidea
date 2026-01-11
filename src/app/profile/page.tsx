"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export const dynamic = "force-dynamic";

const PULSE_WINDOW_MS = 24 * 60 * 60 * 1000;

type IdeaUpdate = {
  id: string;
  description: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: string | null;
};

type ProfilePulse = {
  id: string;
  text: string | null;
  photoUrl: string | null;
  videoUrl: string | null;
  createdAt: string | null;
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

function ProfileIdeaStats({
  entityId,
  entityType,
}: {
  entityId: string;
  entityType: "idea" | "update";
}) {
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCountUnique, setViewCountUnique] = useState(0);
  const [viewCountTotal, setViewCountTotal] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<
    Array<{
      id: string;
      text: string;
      createdAt: string | null;
      userName: string;
      userPhotoUrl: string | null;
    }>
  >([]);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    photoUrl: string | null;
  } | null>(null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const hasRecordedUniqueView = useRef(false);
  const hasRecordedTotalView = useRef(false);

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

  const tables =
    entityType === "update"
      ? {
          likes: "idea_update_likes",
          comments: "idea_update_comments",
          views: "idea_update_views",
          viewEvents: "idea_update_view_events",
          idField: "update_id",
        }
      : {
          likes: "idea_likes",
          comments: "idea_comments",
          views: "idea_views",
          viewEvents: "idea_view_events",
          idField: "idea_id",
        };

  useEffect(() => {
    hasRecordedUniqueView.current = false;
    hasRecordedTotalView.current = false;
  }, [entityId, entityType, currentUser?.id]);

  useEffect(() => {
    let isActive = true;
    const loadCounts = async () => {
      const [likesRes, commentsRes, uniqueRes, totalRes] = await Promise.all([
        supabase
          .from(tables.likes)
          .select("id", { count: "exact", head: true })
          .eq(tables.idField, entityId),
        supabase
          .from(tables.comments)
          .select("id", { count: "exact", head: true })
          .eq(tables.idField, entityId),
        supabase
          .from(tables.views)
          .select("id", { count: "exact", head: true })
          .eq(tables.idField, entityId),
        supabase
          .from(tables.viewEvents)
          .select("id", { count: "exact", head: true })
          .eq(tables.idField, entityId),
      ]);
      if (!isActive) return;
      setLikeCount(likesRes.count ?? 0);
      setCommentCount(commentsRes.count ?? 0);
      setViewCountUnique(uniqueRes.count ?? 0);
      setViewCountTotal(totalRes.count ?? 0);
      if (currentUser?.id) {
        const { data } = await supabase
          .from(tables.likes)
          .select("id")
          .eq(tables.idField, entityId)
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (!isActive) return;
        setLiked(!!data);
      } else {
        setLiked(false);
      }
    };

    loadCounts();
    return () => {
      isActive = false;
    };
  }, [entityId, entityType, currentUser?.id]);

  useEffect(() => {
    let isActive = true;
    const recordUniqueView = async () => {
      if (!entityId || !currentUser?.id || hasRecordedUniqueView.current) return;
      hasRecordedUniqueView.current = true;
      const { error } = await supabase
        .from(tables.views)
        .upsert(
          { [tables.idField]: entityId, user_id: currentUser.id },
          { onConflict: `${tables.idField},user_id`, ignoreDuplicates: true }
        );
      if (error) return;
      const { count } = await supabase
        .from(tables.views)
        .select("id", { count: "exact", head: true })
        .eq(tables.idField, entityId);
      if (!isActive) return;
      if (typeof count === "number") {
        setViewCountUnique(count);
      }
    };
    recordUniqueView();
    return () => {
      isActive = false;
    };
  }, [entityId, entityType, currentUser?.id, tables.idField, tables.views]);

  useEffect(() => {
    let isActive = true;
    const recordTotalView = async () => {
      if (!entityId || !currentUser?.id || hasRecordedTotalView.current) return;
      hasRecordedTotalView.current = true;
      const { error } = await supabase.from(tables.viewEvents).insert({
        [tables.idField]: entityId,
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
  }, [entityId, entityType, currentUser?.id, tables.idField, tables.viewEvents]);

  useEffect(() => {
    let isActive = true;
    const loadComments = async () => {
      if (!isCommentOpen || commentsLoaded) return;
      const { data, error } = await supabase
        .from(tables.comments)
        .select("id, user_id, body, created_at")
        .eq(tables.idField, entityId)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setComments([]);
        setCommentsLoaded(true);
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
        userName: profileMap[row.user_id]?.full_name || "User",
        userPhotoUrl: profileMap[row.user_id]?.photo_url || null,
      }));
      setComments(mapped);
      setCommentsLoaded(true);
    };
    loadComments();
    return () => {
      isActive = false;
    };
  }, [entityId, entityType, isCommentOpen, commentsLoaded, tables.comments, tables.idField]);

  const handleLikeToggle = async () => {
    if (!entityId || !currentUser?.id || likePending) return;
    setLikePending(true);
    if (liked) {
      const { error } = await supabase
        .from(tables.likes)
        .delete()
        .eq(tables.idField, entityId)
        .eq("user_id", currentUser.id);
      if (!error) {
        setLiked(false);
        setLikeCount((count) => Math.max(0, count - 1));
      }
      setLikePending(false);
      return;
    }

    const { error } = await supabase.from(tables.likes).insert({
      [tables.idField]: entityId,
      user_id: currentUser.id,
    });
    if (!error) {
      setLiked(true);
      setLikeCount((count) => count + 1);
    }
    setLikePending(false);
  };

  const handleCommentSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || !currentUser?.id) return;
    const { data, error } = await supabase
      .from(tables.comments)
      .insert({
        [tables.idField]: entityId,
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
        userName: currentUser.name,
        userPhotoUrl: currentUser.photoUrl,
      },
      ...prev,
    ]);
    setCommentText("");
    setCommentCount((count) => count + 1);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "center",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          opacity: 0.9,
          marginTop: 6,
        }}
      >
        <button
          type="button"
          onClick={handleLikeToggle}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: currentUser ? "pointer" : "default",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 20s-7-4.6-7-10a4 4 0 017-2.8A4 4 0 0119 10c0 5.4-7 10-7 10z"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <span>{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsCommentOpen((open) => !open)}
          aria-pressed={isCommentOpen}
          aria-label={isCommentOpen ? "Close comments" : "Open comments"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 5h16v10H7l-3 3V5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span>{commentCount}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>{viewCountUnique}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 12h8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{viewCountTotal}</span>
        </div>
      </div>
      {isCommentOpen && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--rule-light)",
            background: "rgba(253, 247, 239, 0.78)",
            display: "grid",
            gap: 12,
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div style={{ display: "grid", gap: 10, maxHeight: 220, overflowY: "auto" }}>
            {comments.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No comments yet.</div>
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
                      fontSize: 8,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "pre-line",
                      textAlign: "center",
                      lineHeight: 1.1,
                      color: "rgba(58, 43, 36, 0.7)",
                    }}
                  >
                    {"No\nPhoto"}
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
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            <input
              type="text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={currentUser ? "Add a comment" : "Log in to comment"}
              disabled={!currentUser}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={!currentUser}
              style={{
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-strong)",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: currentUser ? "pointer" : "default",
                color: "#fff7ef",
              }}
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const routeUserId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const ideasRef = useRef<HTMLDivElement | null>(null);
  const signalInFlightRef = useRef(false);
  const [activeTab, setActiveTab] = useState('Ideas');
  const [userName, setUserName] = useState("Your Profile");
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [signalsCount, setSignalsCount] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [isSelf, setIsSelf] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [profileAccountType, setProfileAccountType] = useState<
    "private" | "business"
  >("private");
  const [profileRating, setProfileRating] = useState<{
    avg: number;
    count: number;
  } | null>(null);
  const [profileServiceRating, setProfileServiceRating] = useState<{
    avg: number;
    count: number;
  } | null>(null);
  const [profileRatingLoading, setProfileRatingLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [signalMenuOpen, setSignalMenuOpen] = useState(false);
  const [signalStatus, setSignalStatus] = useState<string | null>(null);
  const [signalLoadingId, setSignalLoadingId] = useState<string | null>(null);
  const [signaledIdeas, setSignaledIdeas] = useState<Record<string, boolean>>(
    {}
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [pulses, setPulses] = useState<ProfilePulse[]>([]);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulseStatus, setPulseStatus] = useState<string | null>(null);
  const [pulseComposerOpen, setPulseComposerOpen] = useState(false);
  const [pulsePhoto, setPulsePhoto] = useState<File | null>(null);
  const [pulseVideo, setPulseVideo] = useState<File | null>(null);
  const [pulseActive, setPulseActive] = useState<ProfilePulse | null>(null);
  const [pulseSubmitting, setPulseSubmitting] = useState(false);
  const [pulseSeenAt, setPulseSeenAt] = useState(0);
  const latestPulseAt = useMemo(() => {
    if (!pulses[0]?.createdAt) return 0;
    return new Date(pulses[0].createdAt).getTime();
  }, [pulses]);
  const hasRecentPulse = useMemo(() => {
    if (!latestPulseAt) return false;
    if (Date.now() - latestPulseAt > PULSE_WINDOW_MS) return false;
    if (!currentUserId || !viewedUserId) return true;
    return latestPulseAt > pulseSeenAt;
  }, [currentUserId, viewedUserId, latestPulseAt, pulseSeenAt]);
  const profileRatingValue = profileRating?.avg ?? 0;
  const profileRatingLabel = profileRatingValue.toFixed(1);
  const profileRatingStars = Math.round(profileRatingValue);
  const profileServiceRatingValue = profileServiceRating?.avg ?? 0;
  const profileServiceRatingLabel = profileServiceRatingValue.toFixed(1);
  const profileServiceRatingStars = Math.round(profileServiceRatingValue);
  const handlePulseNameClick = () => {
    if (hasRecentPulse && pulses[0]) {
      setPulseActive(pulses[0]);
      if (currentUserId && viewedUserId && latestPulseAt) {
        const key = `pulseSeen:${currentUserId}:${viewedUserId}`;
        window.localStorage.setItem(key, String(latestPulseAt));
        setPulseSeenAt(latestPulseAt);
      }
      return;
    }
    if (isSelf) {
      setPulseComposerOpen(true);
      return;
    }
    setPulseStatus("No pulse yet.");
  };
  const [ideas, setIdeas] = useState<
    {
      id: string;
      title: string | null;
      description: string | null;
      category: string | null;
      photoUrl: string | null;
      videoUrl: string | null;
      createdAt: string | null;
      updates?: IdeaUpdate[];
    }[]
  >([]);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const loggedInUserId = data.user?.id ?? null;
      setCurrentUserId(loggedInUserId);
      const paramUserId = searchParams?.get("user");
      const targetUserId =
        (typeof routeUserId === "string" && routeUserId) ||
        paramUserId ||
        loggedInUserId;
      setViewedUserId(targetUserId);
      const viewingSelf =
        !!loggedInUserId && (!targetUserId || targetUserId === loggedInUserId);
      setIsSelf(viewingSelf);
      const fullName =
        data.user?.user_metadata?.full_name ||
        data.user?.user_metadata?.name ||
        data.user?.email ||
        "Your Profile";
      const meta = data.user?.user_metadata ?? {};
      if (viewingSelf) {
        const loadedBio =
          typeof meta.bio === "string" && meta.bio.trim().length > 0
            ? meta.bio
            : "";
        const loadedPhoto = meta.photo_url || meta.avatar_url || null;
        setUserName(fullName);
        setBio(loadedBio);
        setPhotoUrl(loadedPhoto);
      } else if (targetUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name,bio,photo_url")
          .eq("id", targetUserId)
          .maybeSingle();
        setUserName(profile?.full_name || "User Profile");
        setBio(profile?.bio || "");
        setPhotoUrl(profile?.photo_url || null);
      }

      if (targetUserId) {
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("following_id", targetUserId),
          supabase
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("follower_id", targetUserId),
        ]);
        setFollowersCount(followers ?? 0);
        setFollowingCount(following ?? 0);
      } else {
        setFollowersCount(0);
        setFollowingCount(0);
      }

      if (loggedInUserId && targetUserId && loggedInUserId !== targetUserId) {
        const { data: followRow } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", loggedInUserId)
          .eq("following_id", targetUserId)
          .maybeSingle();
        setIsFollowing(!!followRow);
      }
    };
    loadUser();
  }, [searchParams, routeUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      setProfileAccountType("private");
      return;
    }
    let isActive = true;
    const loadProfileType = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", viewedUserId)
        .maybeSingle();
      if (!isActive) return;
      setProfileAccountType(
        data?.account_type === "business" ? "business" : "private"
      );
    };
    loadProfileType();
    return () => {
      isActive = false;
    };
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      setProfileRating(null);
      setProfileServiceRating(null);
      return;
    }
    let isActive = true;
    const loadProfileRating = async () => {
      setProfileRatingLoading(true);
      const reviewType =
        profileAccountType === "business"
          ? "employee_to_business"
          : "business_to_employee";
      const [workResponse, serviceResponse] = await Promise.all([
        supabase
          .from("reviews")
          .select("rating")
          .eq("subject_id", viewedUserId)
          .eq("review_type", reviewType),
        supabase
          .from("reviews")
          .select("rating")
          .eq("subject_id", viewedUserId)
          .eq("review_type", "customer_to_employee"),
      ]);
      if (!isActive) return;
      if (workResponse.error || serviceResponse.error) {
        setProfileRating(null);
        setProfileServiceRating(null);
        setProfileRatingLoading(false);
        return;
      }
      const buildRating = (
        rows: Array<{ rating: number }> | null | undefined
      ) => {
        const safeRows = rows ?? [];
        const total = safeRows.reduce((sum, row) => sum + row.rating, 0);
        const count = safeRows.length;
        return { avg: count ? total / count : 0, count };
      };
      setProfileRating(buildRating(workResponse.data));
      setProfileServiceRating(buildRating(serviceResponse.data));
      setProfileRatingLoading(false);
    };
    loadProfileRating();
    return () => {
      isActive = false;
    };
  }, [viewedUserId, profileAccountType]);

  useEffect(() => {
    let isActive = true;
    const loadIdeas = async () => {
      if (!viewedUserId) {
        setIdeas([]);
        setSignalsCount(0);
        setSignaledIdeas({});
        return;
      }
      const { data, error } = await supabase
        .from("ideas")
        .select("id,title,description,category,photo_url,video_url,created_at")
        .eq("user_id", viewedUserId)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setIdeas([]);
        setSignalsCount(0);
        setSignaledIdeas({});
        return;
      }
      const ideaIds = (data ?? []).map((idea) => idea.id);
      if (ideaIds.length === 0) {
        setSignalsCount(0);
        setSignaledIdeas({});
      } else {
        const { count, error: signalError } = await supabase
          .from("idea_signals")
          .select("id", { count: "exact", head: true })
          .in("idea_id", ideaIds);
        if (isActive) {
          setSignalsCount(signalError ? 0 : count ?? 0);
        }
        if (currentUserId) {
          const { data: userSignals } = await supabase
            .from("idea_signals")
            .select("idea_id")
            .eq("user_id", currentUserId)
            .in("idea_id", ideaIds);
          if (isActive) {
            const signalMap: Record<string, boolean> = {};
            (userSignals ?? []).forEach((signal) => {
              if (signal.idea_id) {
                signalMap[signal.idea_id] = true;
              }
            });
            setSignaledIdeas(signalMap);
          }
        } else {
          setSignaledIdeas({});
        }
      }
      let updateMap: Record<string, IdeaUpdate[]> = {};
      if (ideaIds.length > 0) {
        const { data: updates } = await supabase
          .from("idea_updates")
          .select("id, idea_id, body, photo_url, video_url, created_at")
          .in("idea_id", ideaIds)
          .order("created_at", { ascending: true });
        updateMap = (updates ?? []).reduce((acc, update) => {
          const list = acc[update.idea_id] ?? [];
          list.push({
            id: update.id,
            description: update.body,
            photoUrl: update.photo_url,
            videoUrl: update.video_url,
            createdAt: update.created_at,
          });
          acc[update.idea_id] = list;
          return acc;
        }, {} as Record<string, IdeaUpdate[]>);
      }
      const mapped = (data ?? []).map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        photoUrl: idea.photo_url,
        videoUrl: idea.video_url,
        createdAt: idea.created_at,
        updates: updateMap[idea.id] ?? [],
      }));
      setIdeas(mapped);
    };
    loadIdeas();
    return () => {
      isActive = false;
    };
  }, [viewedUserId, currentUserId]);

  useEffect(() => {
    let isActive = true;
    const loadPulses = async () => {
      if (!viewedUserId) {
        setPulses([]);
        return;
      }
      setPulseLoading(true);
      const cutoff = new Date(Date.now() - PULSE_WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from("profile_pulses")
        .select("id,text,photo_url,video_url,created_at")
        .eq("user_id", viewedUserId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setPulses([]);
        setPulseLoading(false);
        return;
      }
      const mapped =
        (data ?? []).map((row) => ({
          id: row.id,
          text: row.text,
          photoUrl: row.photo_url,
          videoUrl: row.video_url,
          createdAt: row.created_at,
        })) ?? [];
      const now = Date.now();
      setPulses(
        mapped.filter((pulse) => {
          if (!pulse.createdAt) return false;
          const created = new Date(pulse.createdAt).getTime();
          return now - created <= PULSE_WINDOW_MS;
        })
      );
      setPulseLoading(false);
    };
    loadPulses();
    return () => {
      isActive = false;
    };
  }, [viewedUserId]);

  useEffect(() => {
    if (!currentUserId || !viewedUserId) return;
    const key = `pulseSeen:${currentUserId}:${viewedUserId}`;
    const stored = window.localStorage.getItem(key);
    setPulseSeenAt(stored ? Number(stored) || 0 : 0);
  }, [currentUserId, viewedUserId]);

  const handleFollowToggle = async () => {
    if (!currentUserId || !viewedUserId) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", viewedUserId);
      setIsFollowing(false);
      setFollowersCount((count) => Math.max(0, (count ?? 0) - 1));
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: viewedUserId,
      });
      setIsFollowing(true);
      setFollowersCount((count) => (count ?? 0) + 1);
    }
    setFollowLoading(false);
  };

  const handleShareProfile = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: userName || "Profile",
      text: "Check out this profile on The Signal Idea.",
      url: shareUrl,
    };
    setShareStatus(null);

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareStatus("Shared.");
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") {
          return;
        }
      }
    }

    if (navigator.clipboard && shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("Link copied.");
      } catch {
        setShareStatus("Could not copy the link.");
      }
    } else if (shareUrl) {
      setShareStatus(shareUrl);
    }
  };
  const refreshSignalsCount = async (ideaIds: string[]) => {
    if (ideaIds.length === 0) {
      setSignalsCount(0);
      return;
    }
    const { count, error } = await supabase
      .from("idea_signals")
      .select("id", { count: "exact", head: true })
      .in("idea_id", ideaIds);
    if (!error) {
      setSignalsCount(count ?? 0);
    }
  };
  const refreshUserSignals = async (ideaIds: string[]) => {
    if (!currentUserId || ideaIds.length === 0) {
      setSignaledIdeas({});
      return;
    }
    const { data } = await supabase
      .from("idea_signals")
      .select("idea_id")
      .eq("user_id", currentUserId)
      .in("idea_id", ideaIds);
    const signalMap: Record<string, boolean> = {};
    (data ?? []).forEach((signal) => {
      if (signal.idea_id) {
        signalMap[signal.idea_id] = true;
      }
    });
    setSignaledIdeas(signalMap);
  };
  const getLocalSignalIdForCategory = (category: string) => {
    for (const idea of ideas) {
      if (
        signaledIdeas[idea.id] &&
        (idea.category ?? "").trim() === category
      ) {
        return idea.id;
      }
    }
    return null;
  };
  const pictures: string[] = [];
  const videos: string[] = [];
  const jobs: {
    title: string;
    company: string;
    desc: string;
    date: string;
  }[] = [];
  const followersHref = viewedUserId
    ? `/profile/${viewedUserId}/followers`
    : "/profile";
  const followingHref = viewedUserId
    ? `/profile/${viewedUserId}/following`
    : "/profile";
  const signalsHref = viewedUserId
    ? `/profile/${viewedUserId}/signals`
    : "/profile";
  const uploadPulseMedia = async (
    file: File,
    userId: string,
    kind: "photo" | "video"
  ) => {
    const extension =
      file.name.split(".").pop() || (kind === "photo" ? "jpg" : "mp4");
    const filePath = `profiles/${userId}/pulse-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("idea-media")
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
    if (uploadError) {
      throw uploadError;
    }
    const { data } = supabase.storage.from("idea-media").getPublicUrl(filePath);
    return data.publicUrl;
  };
  const handlePulseSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (pulseSubmitting) return;
    if (!pulsePhoto && !pulseVideo) {
      setPulseStatus("Add a photo or a video.");
      return;
    }
    setPulseSubmitting(true);
    setPulseStatus("Uploading...");
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setPulseStatus("You need to log in first.");
      setPulseSubmitting(false);
      return;
    }
    try {
      const photoUrl = pulsePhoto
        ? await uploadPulseMedia(pulsePhoto, user.id, "photo")
        : null;
      const videoUrl = pulseVideo
        ? await uploadPulseMedia(pulseVideo, user.id, "video")
        : null;
      const { data: row, error } = await supabase
        .from("profile_pulses")
        .insert({
          user_id: user.id,
          text: null,
          photo_url: photoUrl,
          video_url: videoUrl,
        })
        .select("id,text,photo_url,video_url,created_at")
        .single();
      if (error || !row) {
        setPulseStatus("Could not save the pulse.");
        setPulseSubmitting(false);
        return;
      }
      const nextPulse = {
        id: row.id,
        text: row.text,
        photoUrl: row.photo_url,
        videoUrl: row.video_url,
        createdAt: row.created_at,
      };
      setPulses((prev) => [nextPulse, ...prev]);
      setPulsePhoto(null);
      setPulseVideo(null);
      setPulseStatus("Pulse added.");
      setPulseComposerOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setPulseStatus(error.message);
      } else {
        setPulseStatus("Upload failed. Check the files and try again.");
      }
    } finally {
      setPulseSubmitting(false);
    }
  };
  const signalIdea = async (ideaId: string, category: string | null) => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (signalInFlightRef.current) {
      return;
    }
    const ideaIdList = ideas.map((idea) => idea.id);
    const normalizedCategory = (category ?? "").trim();
    if (!normalizedCategory) {
      setSignalStatus("This idea does not have a category yet.");
      return;
    }
    signalInFlightRef.current = true;
    setSignalLoadingId(ideaId);
    setSignalStatus(null);
    const localSameCategoryId = getLocalSignalIdForCategory(normalizedCategory);
    const isLocalRemove = localSameCategoryId === ideaId;
    if (isLocalRemove) {
      setSignaledIdeas((prev) => {
        const next = { ...prev };
        delete next[ideaId];
        return next;
      });
      setSignalsCount((count) => Math.max(0, (count ?? 0) - 1));
    } else {
      setSignaledIdeas((prev) => {
        const next = { ...prev };
        if (localSameCategoryId) {
          delete next[localSameCategoryId];
        }
        next[ideaId] = true;
        return next;
      });
      if (!localSameCategoryId) {
        setSignalsCount((count) => (count ?? 0) + 1);
      }
    }
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("idea_signals")
        .select("id, idea_id")
        .eq("user_id", currentUserId)
        .eq("category", normalizedCategory);
      if (existingError) {
        throw existingError;
      }
      const existingIdeaIds = new Set(
        (existingRows ?? [])
          .map((row) => row.idea_id)
          .filter((id): id is string => !!id)
      );
      if (existingIdeaIds.has(ideaId)) {
        const { error } = await supabase
          .from("idea_signals")
          .delete()
          .eq("user_id", currentUserId)
          .eq("category", normalizedCategory);
        if (error) {
          throw error;
        }
        setSignalStatus("Signal removed.");
        setSignaledIdeas((prev) => {
          const next = { ...prev };
          ideas.forEach((idea) => {
            if ((idea.category ?? "").trim() === normalizedCategory) {
              delete next[idea.id];
            }
          });
          return next;
        });
        void refreshSignalsCount(ideaIdList);
        return;
      }

      if (existingRows && existingRows.length > 0) {
        const { error } = await supabase
          .from("idea_signals")
          .delete()
          .eq("user_id", currentUserId)
          .eq("category", normalizedCategory);
        if (error) {
          throw error;
        }
      }
      const { error } = await supabase.from("idea_signals").insert({
        user_id: currentUserId,
        idea_id: ideaId,
        category: normalizedCategory,
      });
      if (error) {
        throw error;
      }
      setSignalStatus("Signal saved.");
      setSignaledIdeas((prev) => {
        const next = { ...prev };
        ideas.forEach((idea) => {
          if ((idea.category ?? "").trim() === normalizedCategory) {
            delete next[idea.id];
          }
        });
        next[ideaId] = true;
        return next;
      });
      void refreshSignalsCount(ideaIdList);
    } catch {
      setSignalStatus("Could not update the signal.");
      void refreshSignalsCount(ideaIdList);
      void refreshUserSignals(ideaIdList);
    } finally {
      setSignalLoadingId(null);
      signalInFlightRef.current = false;
    }
  };
  const handleSignalHint = () => {
    setActiveTab("Ideas");
    setSignalStatus(null);
    if (ideas.length === 0) {
      setSignalMenuOpen(false);
      setSignalStatus("No ideas yet.");
      return;
    }
    if (ideas.length === 1) {
      setSignalMenuOpen(false);
      signalIdea(ideas[0].id, ideas[0].category);
      return;
    }
    setSignalMenuOpen((open) => !open);
  };

  return (
    <div className="nyt-main" style={{ display: 'block', maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      {pulseActive && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPulseActive(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(61, 47, 40, 0.65)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 16,
              border: "1px solid var(--rule-strong)",
              background: "var(--paper)",
              padding: 18,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Pulse • {formatTimeAgo(pulseActive.createdAt)}
            </div>
            {pulseActive.photoUrl && (
              <img
                src={pulseActive.photoUrl}
                alt="Pulse"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  objectFit: "cover",
                }}
              />
            )}
            {pulseActive.videoUrl && (
              <video
                src={pulseActive.videoUrl}
                controls
                style={{
                  width: "100%",
                  borderRadius: 12,
                }}
              />
            )}
            <button
              type="button"
              onClick={() => setPulseActive(null)}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
                opacity: 0.7,
                justifySelf: "start",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div
        className="profile-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}
      >
        <div className="profile-header-main" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile"
              width={96}
              height={128}
              style={{
                width: 96,
                height: 128,
                borderRadius: 24,
                objectFit: "cover",
                background: "var(--surface)",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 128,
                borderRadius: 24,
                border: "1px dashed var(--rule-strong)",
                background: "var(--paper)",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textAlign: "center",
                color: "rgba(58, 43, 36, 0.6)",
                padding: 8,
              }}
            >
              {isSelf ? "Add profile picture" : "No photo"}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: "grid",
                gap: 4,
                marginBottom: 6,
                fontSize: 12,
                color: "rgba(61, 47, 40, 0.7)",
              }}
            >
              {profileRatingLoading ? (
                <span>Loading ratings...</span>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span
                          key={index}
                          style={{
                            color:
                              index < profileRatingStars
                                ? "var(--accent-strong)"
                                : "rgba(58, 43, 36, 0.25)",
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                    <span style={{ fontWeight: 600 }}>{profileRatingLabel}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {Array.from({ length: 10 }).map((_, index) => (
                        <span
                          key={index}
                          style={{
                            color:
                              index < profileServiceRatingStars
                                ? "var(--accent-strong)"
                                : "rgba(58, 43, 36, 0.25)",
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {profileServiceRatingLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={handlePulseNameClick}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `2px solid ${
                    hasRecentPulse ? "var(--accent-strong)" : "var(--rule-light)"
                  }`,
                  boxShadow: hasRecentPulse
                    ? "0 0 14px rgba(194, 122, 82, 0.6)"
                    : "none",
                  background: "var(--paper)",
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {userName}
              </button>
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setPulseComposerOpen(true)}
                  aria-label="Add pulse"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: "1px solid var(--rule-strong)",
                    background: "var(--paper)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              )}
            </div>
            <div className="profile-stats" style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
              <Link
                href={followersHref}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                    {followersCount ?? 0}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(61, 47, 40, 0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Followers</div>
                </div>
              </Link>
              <Link
                href={followingHref}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                    {followingCount ?? 0}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(61, 47, 40, 0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Following</div>
                </div>
              </Link>
              <Link
                href={signalsHref}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                    {signalsCount ?? 0}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(61, 47, 40, 0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Signals</div>
                </div>
              </Link>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ width: 320, maxWidth: '100%', fontSize: 14, color: 'rgba(61, 47, 40, 0.8)', lineHeight: 1.6 }}>
                {bio?.trim()
                  ? bio
                  : isSelf
                  ? "Add a short bio in Edit Profile."
                  : "No bio yet."}
              </div>
            </div>
          </div>
        </div>
        <div className="profile-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {isSelf && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Profile menu"
                style={{
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.12em",
                  color: "var(--ink)",
                }}
              >
                ☰
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    minWidth: 180,
                    borderRadius: 10,
                    border: "1px solid var(--rule-strong)",
                    background: "var(--paper)",
                    padding: 8,
                    display: "grid",
                    gap: 6,
                    zIndex: 10,
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      padding: "8px 10px",
                      borderRadius: 8,
                    }}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setPulseComposerOpen(true);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Add Pulse
                  </button>
                  <Link
                    href="/profile/edit"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      padding: "8px 10px",
                      borderRadius: 8,
                    }}
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href="/privacy"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      padding: "8px 10px",
                      borderRadius: 8,
                    }}
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/security"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      padding: "8px 10px",
                      borderRadius: 8,
                    }}
                  >
                    Security
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      padding: "8px 10px",
                      borderRadius: 8,
                    }}
                  >
                    Help
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await supabase.auth.signOut({ scope: "local" });
                      window.location.assign("/login");
                    }}
                    style={{
                      border: "1px solid var(--rule-strong)",
                      background: "var(--paper)",
                      padding: "8px 10px",
                      borderRadius: 8,
                      textAlign: "left",
                      cursor: "pointer",
                      color: "var(--ink)",
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
          {isSelf && (
            <button
              type="button"
              onClick={() => router.push("/create")}
              style={{
                border: '1px solid var(--rule-strong)',
                background: 'var(--paper)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              Upload
            </button>
          )}
          {isSelf && (
            <button
              type="button"
              onClick={() => router.push("/profile/edit")}
              style={{
                border: '1px solid var(--rule-strong)',
                background: 'var(--paper)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              Edit Profile
            </button>
          )}
          <button
            type="button"
            onClick={handleShareProfile}
            style={{
              border: '1px solid var(--rule-strong)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Share Profile
          </button>
          {!isSelf && (
            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={followLoading}
              style={{
                border: '1px solid var(--accent-strong)',
                background: isFollowing ? 'var(--accent-strong)' : 'var(--paper)',
                color: isFollowing ? '#fff7ef' : 'var(--ink)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {followLoading ? 'Please wait...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
          </div>
          {!isSelf && (
            <>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.7,
                  textAlign: "right",
                }}
              >
            Signal now so you remember this idea when voting opens.{" "}
                <button
                  type="button"
                  onClick={handleSignalHint}
                  disabled={signalLoadingId !== null}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: signalLoadingId ? "not-allowed" : "pointer",
                    textDecoration: "underline",
                    opacity: signalLoadingId ? 0.6 : 1,
                  }}
                >
              {Object.keys(signaledIdeas).length > 0 ? "Ungive" : "Give"}
            </button>
          </div>
              {signalStatus && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    opacity: 0.7,
                    textAlign: "right",
                  }}
                >
                  {signalStatus}
                </div>
              )}
              {signalMenuOpen && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--rule-strong)",
                    background: "var(--paper)",
                    width: 260,
                    textAlign: "left",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      opacity: 0.7,
                      marginBottom: 10,
                    }}
                  >
                    Choose an idea to signal
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {ideas.map((idea) => (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => {
                        setSignalMenuOpen(false);
                        signalIdea(idea.id, idea.category);
                      }}
                      disabled={signalLoadingId !== null}
                      style={{
                        border: "1px solid var(--rule-strong)",
                        background: "var(--paper)",
                        padding: "8px 10px",
                        borderRadius: 6,
                        textAlign: "left",
                        cursor: "pointer",
                        opacity: signalLoadingId ? 0.6 : 1,
                      }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {idea.title || "Untitled idea"}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {idea.category || "Uncategorized"}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSignalMenuOpen(false)}
                    style={{
                      marginTop: 10,
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      opacity: 0.7,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {shareStatus && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(61, 47, 40, 0.7)' }}>
            {shareStatus}
          </div>
        )}
      </div>
      {pulseComposerOpen && isSelf && (
        <form
          onSubmit={handlePulseSubmit}
          style={{
            border: "1px solid var(--rule-strong)",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 12,
            maxWidth: 520,
            marginBottom: 28,
            background: "rgba(253, 247, 239, 0.8)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>Add a pulse</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, opacity: 0.7 }}>
              Photo
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setPulsePhoto(event.target.files?.[0] ?? null)
                }
                style={{ display: "block", marginTop: 6 }}
              />
            </label>
            <label style={{ fontSize: 12, opacity: 0.7 }}>
              Video
              <input
                type="file"
                accept="video/*"
                onChange={(event) =>
                  setPulseVideo(event.target.files?.[0] ?? null)
                }
                style={{ display: "block", marginTop: 6 }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={pulseSubmitting}
              style={{
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-strong)",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                color: "#fff7ef",
              }}
            >
              {pulseSubmitting ? "Saving..." : "Post Pulse"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPulseComposerOpen(false);
                setPulseStatus(null);
              }}
              style={{
                border: "none",
                background: "transparent",
                padding: "8px 0",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                cursor: "pointer",
                opacity: 0.7,
              }}
            >
              Cancel
            </button>
          </div>
          {pulseStatus && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>{pulseStatus}</div>
          )}
        </form>
      )}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 32 }}>
        {[
          { label: 'Ideas' },
          { label: 'Pictures' },
          { label: 'Videos' },
          { label: 'Jobs' },
        ].map(({ label }) => (
          <div
            key={label}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setActiveTab(label)}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 0,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 0,
              marginBottom: 0,
              filter: 'none',
              boxShadow: 'none',
              borderBottom: 'none',
            }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
          </div>
        ))}
      </div>
      {activeTab === 'Ideas' && (
        <div ref={ideasRef} style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          {ideas.length === 0 && (
            <div style={{ fontSize: 14, color: 'rgba(61, 47, 40, 0.7)' }}>
              No ideas yet.
            </div>
          )}
          {ideas.map((idea) => {
            const entries = [
              {
                id: idea.id,
                entityType: "idea" as const,
                label: "Main Idea",
                description: idea.description || "",
                photoUrl: idea.photoUrl,
                videoUrl: idea.videoUrl,
                createdAt: idea.createdAt,
              },
              ...(idea.updates ?? []).map((update, index) => ({
                id: update.id,
                entityType: "update" as const,
                label: `Update ${index + 1}`,
                description: update.description,
                photoUrl: update.photoUrl ?? null,
                videoUrl: update.videoUrl ?? null,
                createdAt: update.createdAt ?? null,
              })),
            ];
            return (
              <div
                key={idea.id}
                style={{
                  fontFamily: 'Georgia, Times New Roman, Times, serif',
                  lineHeight: 1.5,
                  letterSpacing: '0.02em',
                  position: 'relative',
                  padding: 0,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      width={36}
                      height={54}
                      style={{
                        width: 36,
                        height: 54,
                        borderRadius: 24,
                        objectFit: "cover",
                        border: "1.5px solid #bbb",
                        background: "var(--surface)",
                        marginRight: 10,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 54,
                        borderRadius: 24,
                        border: "1px dashed var(--rule-strong)",
                        background: "var(--paper)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(58, 43, 36, 0.6)",
                        marginRight: 10,
                        whiteSpace: "pre-line",
                        textAlign: "center",
                        lineHeight: 1.1,
                      }}
                    >
                      {isSelf ? "Add\nPhoto" : "No\nPhoto"}
                    </div>
                  )}
                  <div style={{ fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink)' }}>
                    {idea.title || "Untitled idea"}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 18 }}>
                  {entries.map((entry) => (
                    <div key={entry.id} style={{ display: "grid", gap: 10 }}>
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
                      <div className="profile-idea-grid">
                        <div className="profile-idea-grid-inner">
                          <div className="profile-idea-box profile-idea-box--text">
                            <div className="profile-idea-text">
                              {entry.description?.trim() || "No text"}
                            </div>
                          </div>
                          <div className="profile-idea-box">
                            {entry.photoUrl ? (
                              <img
                                src={entry.photoUrl}
                                alt={idea.title || "Idea"}
                              />
                            ) : (
                              "No photo"
                            )}
                          </div>
                          <div className="profile-idea-box">
                            {entry.videoUrl ? (
                              <video
                                src={entry.videoUrl}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            ) : (
                              "No video"
                            )}
                          </div>
                        </div>
                      </div>
                      <ProfileIdeaStats
                        entityId={entry.id}
                        entityType={entry.entityType}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeTab === 'Pictures' && (
        <div
          className="profile-tab-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
            marginTop: 16,
          }}
        >
          {pictures.slice(0, 9).map((src, i) => (
            <Image
              key={i}
              src={src}
              alt={`Picture ${i + 1}`}
              width={400}
              height={320}
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 24 }}
            />
          ))}
        </div>
      )}
      {activeTab === 'Videos' && (
        <div
          className="profile-tab-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
            marginTop: 16,
          }}
        >
          {videos.slice(0, 9).map((src, i) => (
            <video
              key={i}
              src={src}
              controls
              style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 24, background: 'var(--surface)' }}
            />
          ))}
        </div>
      )}
      {activeTab === 'Jobs' && (
        <div
          className="profile-tab-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 16,
          }}
        >
          {jobs.map((job, i) => (
            <div key={i} style={{
              background: 'none',
              border: '1px solid var(--rule-light)',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'Georgia, Times New Roman, Times, serif',
              color: 'var(--ink)',
              minHeight: 120,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 4 }}>{job.title}</div>
              <div style={{ fontSize: 15, color: '#555', marginBottom: 8 }}>{job.company}</div>
              <div style={{ fontSize: 14, color: 'rgba(61, 47, 40, 0.7)', marginBottom: 8 }}>{job.desc}</div>
              <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>{job.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
