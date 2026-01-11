"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import IdeaCarousel from "../components/IdeaCarousel";
import styles from "../home.module.css";

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

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

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
    const loadDiscover = async () => {
      if (!userId) {
        setFeedItems([]);
        return;
      }

      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const excludedIds = Array.from(
        new Set([userId, ...(following ?? []).map((row) => row.following_id)])
      ).filter(Boolean) as string[];

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

      setFeedItems(merged);
    };

    loadDiscover();
    return () => {
      isActive = false;
    };
  }, [userId]);

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

  return (
    <div className={styles.luxHome}>
      <div className={styles.videoStack}>
        {feedItems.length > 0 && (
          <div className={styles.followFeed}>
            {feedItems.map((idea) => (
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
