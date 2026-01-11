"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import IdeaCarousel from "./components/IdeaCarousel";
import styles from "./home.module.css";

const PULSE_WINDOW_MS = 24 * 60 * 60 * 1000;

type FeedItem = {
  id: string;
  entityId: string;
  title: string;
  description: string;
  photoUrl: string | null;
  videoUrl: string | null;
  createdAt: string | null;
  userName: string;
  userPhotoUrl: string | null;
  profileId: string | null;
  kind: "idea" | "update";
};

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [feedMode, setFeedMode] = useState<"following" | "discover">(
    "following"
  );
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [discoverItems, setDiscoverItems] = useState<FeedItem[]>([]);
  const [storyUsers, setStoryUsers] = useState<
    Array<{
      userId: string;
      userName: string;
      userPhotoUrl: string | null;
      pulses: Array<{
        id: string;
        userId: string;
        photoUrl: string | null;
        videoUrl: string | null;
        createdAt: string | null;
      }>;
      latestAt: number;
      latestPulse: {
        id: string;
        userId: string;
        photoUrl: string | null;
        videoUrl: string | null;
        createdAt: string | null;
      };
    }>
  >([]);
  const [storyItems, setStoryItems] = useState<
    Array<{
      id: string;
      userId: string;
      userName: string;
      userPhotoUrl: string | null;
      photoUrl: string | null;
      videoUrl: string | null;
      createdAt: string | null;
    }>
  >([]);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [storySeen, setStorySeen] = useState<Record<string, number>>({});
  const activeStory =
    storyIndex !== null ? storyItems[storyIndex] ?? null : null;
  const storyHasVideo = useMemo(
    () => Boolean(activeStory?.videoUrl),
    [activeStory]
  );

  useEffect(() => {
    let isActive = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isActive) return;
      setUserId(data?.user?.id ?? null);
    };
    loadUser();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const loadFollowedIdeas = async () => {
      if (!userId) {
        setFeedItems([]);
        return;
      }
      const { data: following, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (!isActive) return;
      if (followingError) {
        setFeedItems([]);
        return;
      }
      const followingIds = (following ?? []).map((row) => row.following_id);
      setFollowingIds(followingIds);
      const networkIds = Array.from(
        new Set([userId, ...followingIds].filter(Boolean))
      ) as string[];
      if (networkIds.length === 0) {
        setFeedItems([]);
        return;
      }
      const { data: ideas, error: ideasError } = await supabase
        .from("ideas")
        .select(
          "id,title,description,photo_url,video_url,created_at,user_id"
        )
        .in("user_id", networkIds)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (ideasError) {
        setFeedItems([]);
        return;
      }
      const ideaRows = ideas ?? [];
      const ideaIds = ideaRows.map((idea) => idea.id);
      const ideaMap = ideaRows.reduce(
        (acc, idea) => {
          acc[idea.id] = idea;
          return acc;
        },
        {} as Record<string, (typeof ideaRows)[number]>
      );
      const { data: updates } = ideaIds.length
        ? await supabase
            .from("idea_updates")
            .select("id, idea_id, user_id, body, photo_url, video_url, created_at")
            .in("idea_id", ideaIds)
            .order("created_at", { ascending: false })
        : { data: [] };
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", networkIds);
      const profileMap = (profiles ?? []).reduce(
        (acc, profile) => {
          acc[profile.id] = {
            full_name: profile.full_name,
            photo_url: profile.photo_url,
          };
          return acc;
        },
        {} as Record<string, { full_name: string | null; photo_url: string | null }>
      );
      const ideaItems = ideaRows.map((idea) => ({
        id: `idea-${idea.id}`,
        entityId: idea.id,
        title: idea.title || "Untitled idea",
        description: idea.description ?? "",
        photoUrl: idea.photo_url,
        videoUrl: idea.video_url,
        createdAt: idea.created_at,
        userName: profileMap[idea.user_id]?.full_name || "User",
        userPhotoUrl: profileMap[idea.user_id]?.photo_url || null,
        profileId: idea.user_id ?? null,
        kind: "idea" as const,
      }));
      const updateItems = (updates ?? []).map((update) => {
        const parent = ideaMap[update.idea_id];
        const userId = update.user_id || parent?.user_id;
        return {
          id: `update-${update.id}`,
          entityId: update.id,
          title: parent?.title || "Idea update",
          description: update.body ?? "",
          photoUrl: update.photo_url,
          videoUrl: update.video_url,
          createdAt: update.created_at ?? null,
          userName: profileMap[userId]?.full_name || "User",
          userPhotoUrl: profileMap[userId]?.photo_url || null,
          profileId: userId ?? null,
          kind: "update" as const,
        };
      });
      const merged = [...ideaItems, ...updateItems].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setFeedItems(merged);
    };
    loadFollowedIdeas();
    if (userId) {
      channel = supabase
        .channel(`home-follows:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "follows",
            filter: `follower_id=eq.${userId}`,
          },
          () => {
            loadFollowedIdeas();
          }
        )
        .subscribe();
    }
    return () => {
      isActive = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  useEffect(() => {
    let isActive = true;
    const loadDiscover = async () => {
      if (!userId) {
        setDiscoverItems([]);
        return;
      }

      const excludedIds = Array.from(
        new Set([userId, ...followingIds].filter(Boolean))
      ) as string[];

      let ideaQuery = supabase
        .from("ideas")
        .select("id,title,description,photo_url,video_url,created_at,user_id")
        .order("created_at", { ascending: false });

      if (excludedIds.length > 0) {
        const list = excludedIds.map((id) => `"${id}"`).join(",");
        ideaQuery = ideaQuery.not("user_id", "in", `(${list})`);
      }

      const { data: ideas, error: ideasError } = await ideaQuery;
      if (!isActive) return;
      if (ideasError) {
        setDiscoverItems([]);
        return;
      }

      const ideaRows = ideas ?? [];
      const ideaIds = ideaRows.map((idea) => idea.id);
      const ideaMap = ideaRows.reduce(
        (acc, idea) => {
          acc[idea.id] = idea;
          return acc;
        },
        {} as Record<string, (typeof ideaRows)[number]>
      );

      const { data: updates } = ideaIds.length
        ? await supabase
            .from("idea_updates")
            .select("id, idea_id, user_id, body, photo_url, video_url, created_at")
            .in("idea_id", ideaIds)
            .order("created_at", { ascending: false })
        : { data: [] };

      const profileIds = Array.from(
        new Set([
          ...ideaRows.map((idea) => idea.user_id),
          ...(updates ?? []).map((update) => update.user_id),
        ]).values()
      ).filter(Boolean) as string[];

      const { data: profiles } = profileIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, photo_url")
            .in("id", profileIds)
        : { data: [] };

      const profileMap = (profiles ?? []).reduce(
        (acc, profile) => {
          acc[profile.id] = {
            full_name: profile.full_name,
            photo_url: profile.photo_url,
          };
          return acc;
        },
        {} as Record<string, { full_name: string | null; photo_url: string | null }>
      );

      const ideaItems: FeedItem[] = ideaRows.map((idea) => ({
        id: `idea-${idea.id}`,
        entityId: idea.id,
        title: idea.title || "Untitled idea",
        description: idea.description ?? "",
        photoUrl: idea.photo_url,
        videoUrl: idea.video_url,
        createdAt: idea.created_at,
        userName: profileMap[idea.user_id]?.full_name || "User",
        userPhotoUrl: profileMap[idea.user_id]?.photo_url || null,
        profileId: idea.user_id ?? null,
        kind: "idea",
      }));

      const updateItems: FeedItem[] = (updates ?? []).map((update) => {
        const parent = ideaMap[update.idea_id];
        const updateUserId = update.user_id || parent?.user_id;
        return {
          id: `update-${update.id}`,
          entityId: update.id,
          title: parent?.title || "Idea update",
          description: update.body ?? "",
          photoUrl: update.photo_url,
          videoUrl: update.video_url,
          createdAt: update.created_at ?? null,
          userName: profileMap[updateUserId]?.full_name || "User",
          userPhotoUrl: profileMap[updateUserId]?.photo_url || null,
          profileId: updateUserId ?? null,
          kind: "update",
        };
      });

      const merged = [...ideaItems, ...updateItems].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setDiscoverItems(merged);
    };

    loadDiscover();
    return () => {
      isActive = false;
    };
  }, [userId, followingIds]);

  useEffect(() => {
    let isActive = true;
    const loadStories = async () => {
      if (!userId) {
        setStoryUsers([]);
        return;
      }
      const networkIds = Array.from(
        new Set([userId, ...followingIds].filter(Boolean))
      ) as string[];
      if (networkIds.length === 0) {
        setStoryUsers([]);
        return;
      }
      const cutoff = new Date(Date.now() - PULSE_WINDOW_MS).toISOString();
      const { data: pulses, error } = await supabase
        .from("profile_pulses")
        .select("id,user_id,photo_url,video_url,created_at")
        .in("user_id", networkIds)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setStoryUsers([]);
        return;
      }
      const rows = pulses ?? [];
      if (rows.length === 0) {
        setStoryUsers([]);
        return;
      }
      const userIds = Array.from(
        new Set(rows.map((row) => row.user_id).filter(Boolean))
      ) as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", userIds);
      const profileMap = (profiles ?? []).reduce(
        (acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        },
        {} as Record<string, { full_name: string | null; photo_url: string | null }>
      );
      const pulseMap = rows.reduce(
        (acc, row) => {
          const list = acc[row.user_id] ?? [];
          list.push({
            id: row.id,
            userId: row.user_id,
            photoUrl: row.photo_url,
            videoUrl: row.video_url,
            createdAt: row.created_at,
          });
          acc[row.user_id] = list;
          return acc;
        },
        {} as Record<
          string,
          Array<{
            id: string;
            userId: string;
            photoUrl: string | null;
            videoUrl: string | null;
            createdAt: string | null;
          }>
        >
      );
      const users = Object.keys(pulseMap)
        .map((id) => {
          const pulsesForUser = pulseMap[id];
          const latestPulse = pulsesForUser[0];
          const latestAt = latestPulse?.createdAt
            ? new Date(latestPulse.createdAt).getTime()
            : 0;
          return {
            userId: id,
            userName: profileMap[id]?.full_name || "User",
            userPhotoUrl: profileMap[id]?.photo_url || null,
            pulses: pulsesForUser,
            latestAt,
            latestPulse,
          };
        })
        .sort((a, b) => b.latestAt - a.latestAt);
      setStoryUsers(users);
    };
    loadStories();
    return () => {
      isActive = false;
    };
  }, [userId, followingIds]);

  useEffect(() => {
    if (!userId || storyUsers.length === 0) {
      setStorySeen({});
      return;
    }
    const next: Record<string, number> = {};
    storyUsers.forEach((user) => {
      const key = `pulseSeen:${userId}:${user.userId}`;
      const stored = window.localStorage.getItem(key);
      next[user.userId] = stored ? Number(stored) || 0 : 0;
    });
    setStorySeen(next);
  }, [userId, storyUsers]);

  useEffect(() => {
    if (!activeStory || storyHasVideo) return;
    const timer = window.setTimeout(() => {
      handleNextStory();
    }, 10000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [activeStory, storyHasVideo]);

  useEffect(() => {
    if (!activeStory?.userId || !userId) return;
    const user = storyUsers.find((item) => item.userId === activeStory.userId);
    if (!user?.latestAt) return;
    const key = `pulseSeen:${userId}:${activeStory.userId}`;
    window.localStorage.setItem(key, String(user.latestAt));
    setStorySeen((prev) => ({
      ...prev,
      [activeStory.userId]: user.latestAt,
    }));
  }, [activeStory?.userId, userId, storyUsers]);

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

  const handleNextStory = () => {
    setStoryIndex((prev) => {
      if (prev === null) return prev;
      const next = prev + 1;
      if (next >= storyItems.length) {
        setStoryItems([]);
        return null;
      }
      return next;
    });
  };

  const handleCloseStory = () => {
    setStoryItems([]);
    setStoryIndex(null);
  };

  const openStory = (userId: string) => {
    const queue = storyUsers.flatMap((user) =>
      user.pulses.map((pulse) => ({
        id: pulse.id,
        userId: user.userId,
        userName: user.userName,
        userPhotoUrl: user.userPhotoUrl,
        photoUrl: pulse.photoUrl,
        videoUrl: pulse.videoUrl,
        createdAt: pulse.createdAt,
      }))
    );
    const startIndex = queue.findIndex((item) => item.userId === userId);
    if (startIndex < 0) return;
    setStoryItems(queue);
    setStoryIndex(startIndex);
  };

  const activeFeed = feedMode === "following" ? feedItems : discoverItems;

  return (
    <div className={styles.luxHome}>
      {activeStory && (
        <div className={styles.storyOverlay} onClick={handleCloseStory}>
          <div
            className={styles.storyViewer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.storyHeader}>
              {activeStory.userPhotoUrl ? (
                <img
                  src={activeStory.userPhotoUrl}
                  alt={activeStory.userName}
                  className={styles.storyAvatar}
                />
              ) : (
                <div className={styles.storyAvatarFallback}>
                  {"No\nPhoto"}
                </div>
              )}
              <div className={styles.storyUser}>{activeStory.userName}</div>
            </div>
            <button
              type="button"
              onClick={handleCloseStory}
              className={styles.storyClose}
              aria-label="Close story"
            >
              ×
            </button>
            {activeStory.videoUrl ? (
              <video
                src={activeStory.videoUrl}
                className={styles.storyMedia}
                autoPlay
                muted
                playsInline
                onEnded={handleNextStory}
              />
            ) : (
              <img
                src={activeStory.photoUrl || ""}
                alt="Story"
                className={styles.storyMedia}
              />
            )}
          </div>
        </div>
      )}
      {storyUsers.length > 0 && (
        <div className={styles.storyRow}>
          {storyUsers.map((user) => {
            const isNew = (storySeen[user.userId] ?? 0) < user.latestAt;
            const tileStyle: Record<string, string> = {
              borderColor: isNew ? "#ff3b6a" : "var(--lux-line)",
              boxShadow: isNew
                ? "0 0 14px rgba(255, 59, 106, 0.95), 0 0 28px rgba(255, 59, 106, 0.6)"
                : "none",
            };
            if (user.latestPulse.photoUrl) {
              tileStyle.backgroundImage = `url(${user.latestPulse.photoUrl})`;
            }
            return (
              <button
                key={user.userId}
                type="button"
                onClick={() => openStory(user.userId)}
                className={styles.storyItem}
              >
                <div className={styles.storyTile} style={tileStyle}>
                  {!user.latestPulse.photoUrl &&
                    (user.latestPulse.videoUrl ? "VID" : "VIEW")}
                </div>
                <div className={styles.storyName}>{user.userName}</div>
              </button>
            );
          })}
        </div>
      )}
      <div className={styles.feedTabs}>
        <button
          type="button"
          onClick={() => setFeedMode("following")}
          className={`${styles.feedTab}${
            feedMode === "following" ? ` ${styles.feedTabActive}` : ""
          }`}
        >
          Following
        </button>
        <button
          type="button"
          onClick={() => setFeedMode("discover")}
          className={`${styles.feedTab}${
            feedMode === "discover" ? ` ${styles.feedTabActive}` : ""
          }`}
        >
          Discover
        </button>
      </div>
      <div className={styles.videoStack}>
        {activeFeed.length > 0 && (
          <div className={styles.followFeed}>
            {activeFeed.map((idea) => (
              <div key={idea.id} className={styles.followCard}>
                <IdeaCarousel
                  description={idea.description}
                  photoUrl={idea.photoUrl}
                  videoUrl={idea.videoUrl}
                  title={idea.title}
                  ideaId={idea.entityId}
                  entityType={idea.kind}
                  userName={idea.userName}
                  userPhotoUrl={idea.userPhotoUrl}
                  userId={idea.profileId}
                  timeLabel={formatTimeAgo(idea.createdAt)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
