"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import IdeaCarousel from "../components/IdeaCarousel";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const routeUserId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [activeTab, setActiveTab] = useState('Ideas');
  const [userName, setUserName] = useState("Your Profile");
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [isSelf, setIsSelf] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("I love my idea you will love it too.");
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<
    {
      id: string;
      title: string | null;
      description: string | null;
      photoUrl: string | null;
      videoUrl: string | null;
      createdAt: string | null;
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
            : "I love my idea you will love it too.";
        const loadedPhoto =
          meta.photo_url ||
          meta.avatar_url ||
          "https://randomuser.me/api/portraits/women/21.jpg";
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
        setPhotoUrl(
          profile?.photo_url ||
            "https://randomuser.me/api/portraits/women/21.jpg"
        );
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
    let isActive = true;
    const loadIdeas = async () => {
      if (!viewedUserId) {
        setIdeas([]);
        return;
      }
      const { data, error } = await supabase
        .from("ideas")
        .select("id,title,description,photo_url,video_url,created_at")
        .eq("user_id", viewedUserId)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setIdeas([]);
        return;
      }
      const mapped = (data ?? []).map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        photoUrl: idea.photo_url,
        videoUrl: idea.video_url,
        createdAt: idea.created_at,
      }));
      setIdeas(mapped);
    };
    loadIdeas();
    return () => {
      isActive = false;
    };
  }, [viewedUserId]);

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
  const pictures: string[] = [];
  const videos: string[] = [];
  const jobs: {
    title: string;
    company: string;
    desc: string;
    date: string;
  }[] = [];

  return (
    <div className="nyt-main" style={{ display: 'block', maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <img
            src={photoUrl || "https://randomuser.me/api/portraits/women/21.jpg"}
            alt="Profile"
            width={96}
            height={128}
            style={{ width: 96, height: 128, borderRadius: 24, objectFit: 'cover', background: '#111' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              {userName}
            </div>
            <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
                  {followersCount ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Followers</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
                  {followingCount ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Following</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>0</div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Signals</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ width: 320, maxWidth: '100%', fontSize: 14, color: '#222', lineHeight: 1.6 }}>
                {bio}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isSelf && (
            <button
              type="button"
              onClick={() => router.push("/create")}
              style={{
                border: '1px solid #111',
                background: 'transparent',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
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
                border: '1px solid #111',
                background: 'transparent',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Edit Profile
            </button>
          )}
          <button
            type="button"
            onClick={handleShareProfile}
            style={{
              border: '1px solid #111',
              background: 'transparent',
              color: '#111',
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
                border: '1px solid #111',
                background: isFollowing ? '#111' : 'transparent',
                color: isFollowing ? '#fff' : '#111',
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
          {isSelf && (
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" });
                window.location.assign("/login");
              }}
              style={{
                border: '1px solid #111',
                background: 'transparent',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Log Out
            </button>
          )}
        </div>
        {shareStatus && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#444' }}>
            {shareStatus}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 32 }}>
        {[
          { label: 'Ideas', icon: '💡' },
          { label: 'Pictures', icon: '🖼️' },
          { label: 'Videos', icon: '🎥' },
          { label: 'Jobs', icon: '💼' },
        ].map(({ label, icon }) => (
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
              fontSize: 32,
              marginBottom: 8,
              filter: 'grayscale(100%)',
              boxShadow: 'none',
              borderBottom: activeTab === label ? '3px solid #111' : 'none',
            }}>{icon}</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{label}</span>
          </div>
        ))}
      </div>
      {activeTab === 'Ideas' && (
        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          {ideas.length === 0 && (
            <div style={{ fontSize: 14, color: '#444' }}>
              No ideas yet.
            </div>
          )}
          {ideas.map((idea) => (
            <div
              key={idea.id}
              style={{
                fontFamily: 'Georgia, Times New Roman, Times, serif',
                lineHeight: 1.5,
                letterSpacing: '0.02em',
                position: 'relative',
                padding: 0,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <img
                  src={photoUrl || "https://randomuser.me/api/portraits/women/21.jpg"}
                  alt="Profile"
                  width={36}
                  height={54}
                  style={{
                    width: 36,
                    height: 54,
                    borderRadius: 24,
                    objectFit: 'cover',
                    border: '1.5px solid #bbb',
                    background: '#111',
                    marginRight: 10,
                  }}
                />
                <div style={{ fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#222' }}>
                  {idea.title || "Untitled idea"}
                </div>
              </div>
              <IdeaCarousel
                description={idea.description || ""}
                photoUrl={idea.photoUrl}
                videoUrl={idea.videoUrl}
                title={idea.title || "Untitled idea"}
                ideaId={idea.id}
                userName={userName}
                userPhotoUrl={photoUrl}
                timeLabel={formatTimeAgo(idea.createdAt)}
              />
              <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 8, textAlign: 'right' }}>
                Posted by {userName} • {formatTimeAgo(idea.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'Pictures' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 4,
          marginTop: 16
        }}>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 4,
          marginTop: 16
        }}>
          {videos.slice(0, 9).map((src, i) => (
            <video
              key={i}
              src={src}
              controls
              style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 24, background: '#000' }}
            />
          ))}
        </div>
      )}
      {activeTab === 'Jobs' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginTop: 16
        }}>
          {jobs.map((job, i) => (
            <div key={i} style={{
              background: 'none',
              border: '1px solid #bbb',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'Georgia, Times New Roman, Times, serif',
              color: '#222',
              minHeight: 120,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 4 }}>{job.title}</div>
              <div style={{ fontSize: 15, color: '#555', marginBottom: 8 }}>{job.company}</div>
              <div style={{ fontSize: 14, color: '#444', marginBottom: 8 }}>{job.desc}</div>
              <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>{job.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
