"use client";
import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Ideas');
  const ideas = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    headline: `Idea Headline ${i + 1}`,
    description:
      'This is a sample idea description, styled to look like a newspaper article. Replace with real content. The Signal Idea platform allows users to submit innovative ideas, share inspiring stories, and connect with others. Each idea can include details, images, or even videos to help bring the vision to life. Discover trending topics, support your favorite submissions, and see which ideas are making headlines in the community. Stay tuned for more updates and join the conversation!',
    user: `User ${i + 1}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    profilePic: `https://randomuser.me/api/portraits/men/${i + 10}.jpg`,
  }));
  const pictures = [
    ...Array(9).fill('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'),
    ...Array(9).fill('https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80'),
    ...Array(9).fill('https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80'),
  ];
  const videos = [
    ...Array(9).fill('https://www.w3schools.com/html/mov_bbb.mp4'),
    ...Array(9).fill('https://www.w3schools.com/html/movie.mp4'),
    ...Array(9).fill('https://www.w3schools.com/html/mov_bbb.mp4'),
  ];
  const jobs = Array.from({ length: 9 }).map((_, i) => ({
    title: `Job Title ${i + 1}`,
    company: `Company ${i + 1}`,
    desc: 'This is a sample job description. Replace with real job data. The Signal Idea platform allows users to post and discover job opportunities related to innovative ideas and projects.',
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  }));

  return (
    <div className="nyt-main" style={{ display: 'block', maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Image
            src="https://randomuser.me/api/portraits/women/21.jpg"
            alt="Profile"
            width={96}
            height={128}
            style={{ width: 96, height: 128, borderRadius: 0, objectFit: 'cover', background: '#eee' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>1,248</div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Followers</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>342</div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Following</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>5,920</div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Signals</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <textarea
                id="profile-bio"
                rows={3}
                defaultValue="I love my idea you will love it too."
                placeholder="Write a short bio about yourself..."
                style={{
                  width: 320,
                  maxWidth: '100%',
                  border: 'none',
                borderRadius: 6,
                background: 'transparent',
                padding: '8px 10px',
                fontFamily: 'Georgia, Times New Roman, Times, serif',
                fontSize: 14,
                color: '#222',
                resize: 'none',
                overflow: 'hidden',
                WebkitAppearance: 'none',
              }}
            />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
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
            Create
          </button>
          <button
            type="button"
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
          <button
            type="button"
            style={{
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Share Profile
          </button>
          <button
            type="button"
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
        </div>
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
                    border: '1.5px solid #bbb',
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
                Posted by {idea.user} on {idea.date}
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
              style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 8 }}
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
              style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 8, background: '#000' }}
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
