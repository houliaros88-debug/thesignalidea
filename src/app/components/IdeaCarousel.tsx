"use client";

import React, { useRef, useState } from "react";

export const carouselHeight = "min(130vh, 1200px)";
export const carouselWidth = "min(92vw, 560px)";

export default function IdeaCarousel({
  description,
  photoUrl,
  videoUrl,
  title,
}: {
  description: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const updateActive = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 1;
    const nextIndex = Math.round(containerRef.current.scrollLeft / width);
    setActiveIndex((prev) => (prev !== nextIndex ? nextIndex : prev));
  };

  const handleScroll = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      updateActive();
      rafRef.current = null;
    });
  };

  const handleVideoTimeUpdate = (
    event: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const video = event.currentTarget;
    if (!video.duration) return;
    setVideoProgress(video.currentTime / video.duration);
  };

  return (
    <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
      <div style={{ width: carouselWidth }}>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            width: "100%",
            height: carouselHeight,
            overflowX: "auto",
            display: "flex",
            gap: 12,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              flex: "0 0 100%",
              height: "100%",
              borderRadius: 24,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "#0f0f0f",
              padding: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              scrollSnapAlign: "start",
            }}
          >
            <div style={{ fontSize: 15, color: "#fff", lineHeight: 1.6 }}>
              {description}
            </div>
          </div>
          <div
            style={{
              flex: "0 0 100%",
              height: "100%",
              borderRadius: 24,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scrollSnapAlign: "start",
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 24,
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 13,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                No photo
              </div>
            )}
          </div>
          <div
            style={{
              flex: "0 0 100%",
              height: "100%",
              borderRadius: 24,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scrollSnapAlign: "start",
              position: "relative",
            }}
          >
            {videoUrl ? (
              <>
                <video
                  src={videoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onTimeUpdate={handleVideoTimeUpdate}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 24,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    bottom: 16,
                    height: 2,
                    background: "transparent",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(
                        100,
                        Math.max(0, videoProgress * 100)
                      )}%`,
                      background: "#fff",
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                No video
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background:
                  activeIndex === index
                    ? "#fff"
                    : "rgba(255, 255, 255, 0.35)",
                display: "inline-block",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
