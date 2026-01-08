"use client";

import { useEffect, useState } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { supabase } from "../lib/supabaseClient";
import IdeaCarousel from "./components/IdeaCarousel";
import styles from "./home.module.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [followedIdeas, setFollowedIdeas] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      photoUrl: string | null;
      videoUrl: string | null;
      createdAt: string | null;
      userName: string;
      userPhotoUrl: string | null;
    }>
  >([]);

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
    const loadFollowedIdeas = async () => {
      if (!userId) {
        setFollowedIdeas([]);
        return;
      }
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);
      if (!isActive) return;
      if (followsError) {
        setFollowedIdeas([]);
        return;
      }
      const followerIds = (follows ?? []).map((row) => row.follower_id);
      if (followerIds.length === 0) {
        setFollowedIdeas([]);
        return;
      }
      const { data: ideas, error: ideasError } = await supabase
        .from("ideas")
        .select(
          "id,title,description,photo_url,video_url,created_at,user_id"
        )
        .in("user_id", followerIds)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (ideasError) {
        setFollowedIdeas([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", followerIds);
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
      const mapped = (ideas ?? []).map((idea) => ({
        id: idea.id,
        title: idea.title || "Untitled idea",
        description: idea.description ?? "",
        photoUrl: idea.photo_url,
        videoUrl: idea.video_url,
        createdAt: idea.created_at,
        userName: profileMap[idea.user_id]?.full_name || "User",
        userPhotoUrl: profileMap[idea.user_id]?.photo_url || null,
      }));
      setFollowedIdeas(mapped);
    };
    loadFollowedIdeas();
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
    <div className={`${styles.luxHome} ${serif.variable} ${sans.variable}`}>
      <div className={styles.videoStack}>
        {followedIdeas.length > 0 && (
          <div className={styles.followFeed}>
            {followedIdeas.map((idea) => (
              <div key={idea.id} className={styles.followCard}>
                <div className={styles.followHeader}>
                  {idea.userPhotoUrl ? (
                    <img
                      className={styles.followAvatar}
                      src={idea.userPhotoUrl}
                      alt={`${idea.userName} profile`}
                    />
                  ) : (
                    <div className={styles.followAvatarFallback}>
                      {idea.userName.trim().slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.followMeta}>
                    <div className={styles.followName}>{idea.userName}</div>
                    <div className={styles.followTime}>
                      {formatTimeAgo(idea.createdAt)}
                    </div>
                  </div>
                </div>
                <IdeaCarousel
                  description={idea.description}
                  photoUrl={idea.photoUrl}
                  videoUrl={idea.videoUrl}
                  title={idea.title}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
