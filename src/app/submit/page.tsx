"use client";

import React, { useMemo, useState } from "react";
import { useCategory } from "../components/CategoryContext";
import { ideasByCategory } from "../data/categories";

export default function TheIdeaPage() {
  const { activeCategory } = useCategory();
  const ideas = activeCategory ? ideasByCategory[activeCategory] ?? [] : [];
  const [sortBy, setSortBy] = useState<"votes" | "signals">("votes");
  const sortedIdeas = [...ideas].sort((a, b) =>
    sortBy === "votes" ? b.votes - a.votes : b.signals - a.signals
  );
  const [query, setQuery] = useState("");
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
                  {idea.signals} signals
                </div>
                <span style={{ color: '#111' }}>•</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                  {idea.votes} votes
                </div>
              </div>
              <div style={{ fontSize: 15, color: '#444' }}>{idea.description}</div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
