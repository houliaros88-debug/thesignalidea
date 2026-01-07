"use client";
import Image from "next/image";
import React, { useState } from "react";
import { useHomeTab } from "./components/HomeTabContext";

export default function Home() {
  const { activeTab } = useHomeTab();
  const [expandedIdeaId, setExpandedIdeaId] = useState<number | null>(null);
  const [expandedPictureIndex, setExpandedPictureIndex] = useState<number | null>(null);
  const ideas = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    headline: `Idea Headline ${i + 1}`,
    description:
      'This is a sample idea description, styled to look like a newspaper article. Replace with real content. The Signal Idea platform allows users to submit innovative ideas, share inspiring stories, and connect with others. Each idea can include details, images, or even videos to help bring the vision to life. Discover trending topics, support your favorite submissions, and see which ideas are making headlines in the community. Stay tuned for more updates and join the conversation!',
    user: `User ${i + 1}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    profilePic: `https://randomuser.me/api/portraits/men/${i + 10}.jpg`,
    signals: 128 + i * 7,
  }));
  const pictureSources = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
  ];
  const pictures = Array.from({ length: 9 }).map((_, i) => ({
    id: i,
    src: pictureSources[i % pictureSources.length],
    user: `User ${i + 1}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    signals: 64 + i * 3,
  }));
  const videoSources = [
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://www.w3schools.com/html/movie.mp4',
    'https://www.w3schools.com/html/mov_bbb.mp4',
  ];
  const videos = Array.from({ length: 9 }).map((_, i) => ({
    src: videoSources[i % videoSources.length],
    user: `User ${i + 1}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    signals: 72 + i * 4,
  }));
  const jobs = Array.from({ length: 9 }).map((_, i) => ({
    title: `Job Title ${i + 1}`,
    company: `Company ${i + 1}`,
    desc: 'This is a sample job description. Replace with real job data. The Signal Idea platform allows users to post and discover job opportunities related to innovative ideas and projects.',
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  }));

  return (
    <div className="nyt-main" style={{ display: 'block', maxWidth: 900, margin: '8px auto 32px', padding: '0 16px' }}>
      {/* Conditional rendering for Ideas or Pictures */}
      {activeTab === 'Ideas' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: expandedIdeaId ? '1fr' : 'repeat(3, 1fr)',
          gap: 24,
          marginTop: 16
        }}>
          {ideas.map((idea, i) => (
            <div
              key={i}
              onClick={() => setExpandedIdeaId(expandedIdeaId === idea.id ? null : idea.id)}
              style={{
              background: 'none',
              border: 'none',
              borderRadius: 0,
              minHeight: 'auto',
              display: 'block',
              fontSize: 20,
              color: '#222',
              fontFamily: 'Georgia, Times New Roman, Times, serif',
              lineHeight: 1.5,
              letterSpacing: '0.02em',
              position: 'relative',
              padding: 0,
              marginBottom: 8,
              cursor: 'pointer',
              maxWidth: expandedIdeaId ? 680 : 'none',
              marginLeft: expandedIdeaId ? 'auto' : 0,
              marginRight: expandedIdeaId ? 'auto' : 0,
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Image
                  src={idea.profilePic}
                  alt="Profile"
                  width={36}
                  height={54}
                  style={{
                    width: 36,
                    height: 54,
                    borderRadius: 0,
                    objectFit: 'cover',
                    background: '#eee',
                    marginRight: 10,
                  }}
                />
                <div style={{ fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#222' }}>
                  {idea.headline}
                </div>
              </div>
              <div style={{ fontSize: 16, color: '#444', marginBottom: 8 }}>
                {idea.description}
              </div>
              <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 8, textAlign: 'right' }}>
                {idea.user} • {idea.signals} Signals • {idea.date}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#111', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                  aria-label="Like this idea"
                >
                  <span aria-hidden="true">♥</span>
                  <span>Like</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#111', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                  aria-label="Comment on this idea"
                >
                  <span aria-hidden="true">💬</span>
                  <span>Comment</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#111', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                  aria-label="Share this idea"
                >
                  <span aria-hidden="true">↗</span>
                  <span>Share</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'Pictures' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: expandedPictureIndex !== null ? '1fr' : 'repeat(3, 1fr)',
          gap: 4,
          marginTop: 16
        }}>
          {pictures.map((picture, i) => (
            <div
              key={picture.id}
              onClick={() => setExpandedPictureIndex(expandedPictureIndex === picture.id ? null : picture.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              <Image
                src={picture.src}
                alt={`Picture ${i + 1}`}
                width={520}
                height={380}
                sizes={expandedPictureIndex !== null ? "100vw" : "(max-width: 768px) 100vw, 33vw"}
                style={{ width: '100%', height: 380, objectFit: 'cover', borderRadius: 8 }}
              />
              <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 8, textAlign: 'right' }}>
                {picture.user} • {picture.signals} Signals • {picture.date}
              </div>
            </div>
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
          {videos.map((video, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <video
                src={video.src}
                controls
                style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 8, background: '#000' }}
              />
              <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 8, textAlign: 'right' }}>
                {video.user} • {video.signals} Signals • {video.date}
              </div>
            </div>
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
