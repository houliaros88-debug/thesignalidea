"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

type ProfileItem = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
};

export default function FollowersPage() {
  const params = useParams();
  const routeId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [followers, setFollowers] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const loadFollowers = async () => {
      if (!routeId || typeof routeId !== "string") {
        setFollowers([]);
        setLoading(false);
        return;
      }
      const { data: rows, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", routeId);
      if (!isActive) return;
      if (error) {
        setFollowers([]);
        setLoading(false);
        return;
      }
      const followerIds = (rows ?? []).map((row) => row.follower_id);
      if (followerIds.length === 0) {
        setFollowers([]);
        setLoading(false);
        return;
      }
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", followerIds);
      if (!isActive) return;
      if (profileError) {
        setFollowers([]);
        setLoading(false);
        return;
      }
      const profileMap = (profiles ?? []).reduce(
        (acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        },
        {} as Record<string, ProfileItem>
      );
      const ordered = followerIds
        .map((id) => profileMap[id])
        .filter((profile): profile is ProfileItem => Boolean(profile));
      setFollowers(ordered);
      setLoading(false);
    };
    loadFollowers();
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
      ) : followers.length === 0 ? (
        <div style={{ fontSize: 14, opacity: 0.7 }}>No followers yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {followers.map((profile) => (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
                borderBottom: "1px solid var(--rule-light)",
                paddingBottom: 10,
              }}
            >
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name || "User"}
                  width={40}
                  height={40}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    objectFit: "cover",
                    background: "var(--surface)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
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
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {profile.full_name || "User"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
