"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCategory } from "../components/CategoryContext";
import { ideasByCategory, type Idea } from "../data/categories";
import { supabase } from "../../lib/supabaseClient";
import IdeaCarousel from "../components/IdeaCarousel";

type IdeaCard = Idea & {
  category?: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  userPhotoUrl?: string | null;
};

type IdeaRow = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  user_id: string;
  photo_url: string | null;
  video_url: string | null;
  created_at: string | null;
};

export default function TheIdeaPage() {
  const formatTimeAgo = (value?: string | null) => {
    if (!value) return null;
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
  const searchParams = useSearchParams();
  const { activeCategory } = useCategory();
  const ideas = activeCategory ? ideasByCategory[activeCategory] ?? [] : [];
  const [storedIdeas, setStoredIdeas] = useState<IdeaCard[]>([]);
  const ideaList = useMemo(() => {
    const staticIdeas: IdeaCard[] = ideas.map((idea) => ({
      ...idea,
      category: activeCategory ?? "",
    }));
    return [...storedIdeas, ...staticIdeas];
  }, [storedIdeas, ideas, activeCategory]);
  const [sortBy, setSortBy] = useState<"votes" | "signals">("votes");
  const [signalCounts, setSignalCounts] = useState<Record<string, number>>({});
  const [signaledIdeaId, setSignaledIdeaId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [signalLoadingId, setSignalLoadingId] = useState<string | null>(null);
  const sortedIdeas = useMemo(() => {
    return [...ideaList].sort((a, b) => {
      if (sortBy === "votes") return b.votes - a.votes;
      const aSignals = signalCounts[a.id] ?? a.signals ?? 0;
      const bSignals = signalCounts[b.id] ?? b.signals ?? 0;
      return bSignals - aSignals;
    });
  }, [ideaList, sortBy, signalCounts]);
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<
    { id: string; full_name: string | null; photo_url: string | null }[]
  >([]);
  const [userLoading, setUserLoading] = useState(false);
  useEffect(() => {
    const q = searchParams?.get("q") ?? "";
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    loadUser();
  }, []);
  useEffect(() => {
    let isActive = true;
    const loadIdeas = async () => {
      if (!activeCategory) {
        setStoredIdeas([]);
        return;
      }
      const { data, error } = await supabase
        .from("ideas")
        .select(
          "id, title, description, category, user_id, photo_url, video_url, created_at"
        )
        .eq("category", activeCategory)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setStoredIdeas([]);
        return;
      }
      const rows = (data ?? []) as IdeaRow[];
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
        profileMap = (profiles ?? []).reduce((acc, profile) => {
          acc[profile.id] = {
            full_name: profile.full_name,
            photo_url: profile.photo_url,
          };
          return acc;
        }, {} as Record<string, { full_name: string | null; photo_url: string | null }>);
      }
      const mapped = rows.map((row) => ({
        id: row.id,
        title: row.title || "Untitled idea",
        description: row.description,
        user: profileMap[row.user_id]?.full_name || "User",
        signals: 0,
        votes: 0,
        category: row.category ?? "",
        photoUrl: row.photo_url,
        videoUrl: row.video_url,
        userId: row.user_id,
        createdAt: row.created_at,
        userPhotoUrl: profileMap[row.user_id]?.photo_url || null,
      }));
      setStoredIdeas(mapped);
    };
    loadIdeas();
    return () => {
      isActive = false;
    };
  }, [activeCategory]);
  useEffect(() => {
    let isActive = true;
    const loadSignals = async () => {
      if (!activeCategory) return;
      const { data, error } = await supabase
        .from("idea_signals")
        .select("idea_id,user_id")
        .eq("category", activeCategory);
      if (!isActive) return;
      if (error) {
        return;
      }
      const counts: Record<string, number> = {};
      ideaList.forEach((idea) => {
        counts[idea.id] = 0;
      });
      (data ?? []).forEach((row) => {
        counts[row.idea_id] = (counts[row.idea_id] ?? 0) + 1;
      });
      setSignalCounts(counts);
      if (userId) {
        const userRow = (data ?? []).find((row) => row.user_id === userId);
        setSignaledIdeaId(userRow?.idea_id ?? null);
      } else {
        setSignaledIdeaId(null);
      }
    };
    loadSignals();
    return () => {
      isActive = false;
    };
  }, [activeCategory, ideaList, userId]);
  useEffect(() => {
    let isActive = true;
    const run = async () => {
      const term = query.trim();
      if (!term) {
        setUserResults([]);
        return;
      }
      setUserLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, bio")
        .or(`full_name.ilike.%${term}%,bio.ilike.%${term}%`)
        .limit(10);
      if (!isActive) return;
      if (error) {
        setUserResults([]);
        setUserLoading(false);
        return;
      }
      setUserResults(
        (data ?? []).map((item) => ({
          id: item.id,
          full_name: item.full_name,
          photo_url: item.photo_url,
        }))
      );
      setUserLoading(false);
    };
    run();
    return () => {
      isActive = false;
    };
  }, [query]);
  const filteredIdeas = useMemo(() => {
    if (!query.trim()) return sortedIdeas;
    const needle = query.trim().toLowerCase();
    return sortedIdeas.filter((idea) => {
      return (
        idea.title.toLowerCase().includes(needle) ||
        idea.description.toLowerCase().includes(needle) ||
        idea.user.toLowerCase().includes(needle)
      );
    });
  }, [query, sortedIdeas]);

  return (
    <div className="nyt-main" style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 32px' }}>
      {!activeCategory && (
        <div style={{ textAlign: 'center', color: '#666', marginTop: 24 }}>
          Select a category above to see ideas.
        </div>
      )}
      {activeCategory && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 0, marginBottom: 16 }}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ideas..."
              style={{
                flex: 1,
                minWidth: 0,
                maxWidth: '100%',
                border: '1px solid #111',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: 'Georgia, Times New Roman, Times, serif',
              }}
            />
            <button
              type="button"
              onClick={() => setSortBy("votes")}
              style={{
                border: '1px solid #111',
                background: sortBy === "votes" ? '#111' : 'transparent',
                color: sortBy === "votes" ? '#fff' : '#111',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Votes
            </button>
            <button
              type="button"
              onClick={() => setSortBy("signals")}
              style={{
                border: '1px solid #111',
                background: sortBy === "signals" ? '#111' : 'transparent',
                color: sortBy === "signals" ? '#fff' : '#111',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Signals
            </button>
          </div>
          {query.trim().length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                Users
              </div>
              {userLoading && (
                <div style={{ fontSize: 12, color: '#666' }}>Searching users...</div>
              )}
              {!userLoading && userResults.length === 0 && (
                <div style={{ fontSize: 12, color: '#666' }}>No users found.</div>
              )}
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {userResults.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textDecoration: 'none',
                      color: '#111',
                      borderBottom: '1px solid #ddd',
                      paddingBottom: 8,
                    }}
                  >
                    <img
                      src={user.photo_url || "https://randomuser.me/api/portraits/lego/1.jpg"}
                      alt={user.full_name || "User"}
                      width={32}
                      height={32}
                      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 24, background: '#111' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {user.full_name || "User"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 20, marginTop: 0 }}>
            {filteredIdeas.slice(0, 10).map((idea) => (
              <div
                key={idea.id}
                style={{
                  borderBottom: '1px solid #ddd',
                  paddingBottom: 16,
                  fontFamily: 'Georgia, Times New Roman, Times, serif',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                    {idea.title}
                  </div>
                  <span style={{ color: '#111' }}>•</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                    {idea.user}
                  </div>
                  <span style={{ color: '#111' }}>•</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                    {signalCounts[idea.id] ?? 0} signals
                  </div>
                  <span style={{ color: '#111' }}>•</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                    {idea.votes} votes
                  </div>
                </div>
                <IdeaCarousel
                  description={idea.description}
                  photoUrl={idea.photoUrl}
                  videoUrl={idea.videoUrl}
                  title={idea.title}
                  ideaId={idea.id}
                  userName={idea.user}
                  userPhotoUrl={idea.userPhotoUrl}
                  timeLabel={formatTimeAgo(idea.createdAt)}
                />
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!userId || !activeCategory) return;
                      setSignalLoadingId(idea.id);
                      if (signaledIdeaId === idea.id) {
                        await supabase
                          .from("idea_signals")
                          .delete()
                          .eq("user_id", userId)
                          .eq("category", activeCategory);
                        setSignalCounts((prev) => ({
                          ...prev,
                          [idea.id]: Math.max(0, (prev[idea.id] ?? 0) - 1),
                        }));
                        setSignaledIdeaId(null);
                        setSignalLoadingId(null);
                        return;
                      }

                      if (signaledIdeaId) {
                        await supabase
                          .from("idea_signals")
                          .delete()
                          .eq("user_id", userId)
                          .eq("category", activeCategory);
                      }
                      await supabase.from("idea_signals").insert({
                        user_id: userId,
                        idea_id: idea.id,
                        category: activeCategory,
                      });
                      setSignalCounts((prev) => {
                        const next = { ...prev };
                        if (signaledIdeaId) {
                          next[signaledIdeaId] = Math.max(
                            0,
                            (prev[signaledIdeaId] ?? 0) - 1
                          );
                        }
                        next[idea.id] = (prev[idea.id] ?? 0) + 1;
                        return next;
                      });
                      setSignaledIdeaId(idea.id);
                      setSignalLoadingId(null);
                    }}
                    disabled={signalLoadingId === idea.id}
                    style={{
                      border: '1px solid #111',
                      background: signaledIdeaId === idea.id ? '#111' : 'transparent',
                      color: signaledIdeaId === idea.id ? '#fff' : '#111',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {signalLoadingId === idea.id
                      ? 'Saving...'
                      : signaledIdeaId === idea.id
                        ? 'Signal Sent'
                        : 'Give Signal'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
