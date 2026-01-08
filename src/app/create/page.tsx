"use client";

import React, { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { categories } from "../data/categories";

export const dynamic = "force-dynamic";

type UploadType = "Idea" | "Picture" | "Video" | "Job";

const uploadTabs: UploadType[] = ["Idea", "Picture", "Video", "Job"];

export default function CreatePage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<UploadType>("Idea");
  const [userName, setUserName] = useState("User");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaPhoto, setIdeaPhoto] = useState<File | null>(null);
  const [ideaVideo, setIdeaVideo] = useState<File | null>(null);
  const [ideaCategory, setIdeaCategory] = useState(
    categories[0]?.name ?? ""
  );
  const [ideaStatus, setIdeaStatus] = useState<string | null>(null);
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata ?? {};
      setUserName(
        meta.full_name || meta.name || data.user?.email || "User"
      );
    };
    loadUser();
  }, []);

  useEffect(() => {
    const rawType = searchParams?.get("type");
    if (!rawType) {
      setSelected("Idea");
      return;
    }
    const match =
      uploadTabs.find((tab) => tab.toLowerCase() === rawType.toLowerCase()) ??
      "Idea";
    setSelected(match);
  }, [searchParams]);

  const uploadMedia = async (
    file: File,
    userId: string,
    kind: "photo" | "video"
  ) => {
    const extension = file.name.split(".").pop() || (kind === "photo" ? "jpg" : "mp4");
    const filePath = `ideas/${userId}/${kind}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("idea-media")
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
    if (uploadError) {
      throw uploadError;
    }
    const { data } = supabase.storage.from("idea-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleIdeaSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (ideaSubmitting) return;
    const title = ideaTitle.trim();
    const description = ideaDescription.trim();
    if (!description) {
      setIdeaStatus("Add your idea text first.");
      return;
    }
    setIdeaSubmitting(true);
    setIdeaStatus("Uploading...");
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setIdeaStatus("You need to log in first.");
      setIdeaSubmitting(false);
      return;
    }

    try {
      const photoUrl = ideaPhoto
        ? await uploadMedia(ideaPhoto, user.id, "photo")
        : null;
      const videoUrl = ideaVideo
        ? await uploadMedia(ideaVideo, user.id, "video")
        : null;

      const { error } = await supabase.from("ideas").insert({
        title: title || "Untitled idea",
        description,
        category: ideaCategory,
        user_id: user.id,
        photo_url: photoUrl,
        video_url: videoUrl,
      });

      if (error) {
        setIdeaStatus(error.message || "Could not save the idea. Please try again.");
        setIdeaSubmitting(false);
        return;
      }

      setIdeaTitle("");
      setIdeaDescription("");
      setIdeaPhoto(null);
      setIdeaVideo(null);
      setIdeaStatus("Idea posted.");
    } catch (error) {
      if (error instanceof Error) {
        setIdeaStatus(error.message);
      } else {
        setIdeaStatus("Upload failed. Check the files and try again.");
      }
    } finally {
      setIdeaSubmitting(false);
    }
  };

  return (
    <div
      className="nyt-main"
      style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}
    >
      {selected === "Idea" && (
        <form
          onSubmit={handleIdeaSubmit}
          className="nyt-soft-card"
          style={{
            border: "1px solid #111",
            borderRadius: 10,
            padding: 24,
            background: "#0f0f0f",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            Upload Idea
          </div>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#555",
              marginBottom: 12,
            }}
          >
            Choose a category
          </div>
          <select
            value={ideaCategory}
            onChange={(event) => setIdeaCategory(event.target.value)}
            style={{
              width: "100%",
              border: "1px solid #111",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 12,
              background: "#0f0f0f",
              fontFamily: "Georgia, Times New Roman, Times, serif",
              fontSize: 14,
            }}
          >
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <label
            style={{
              display: "block",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 6,
            }}
          >
            Title
          </label>
          <input
            type="text"
            value={ideaTitle}
            onChange={(event) => setIdeaTitle(event.target.value)}
            placeholder="Write your idea title"
            style={{
              width: "100%",
              border: "1px solid #111",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 12,
              background: "#0f0f0f",
            }}
          />
          <label
            style={{
              display: "block",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 6,
            }}
          >
            Description
          </label>
          <textarea
            rows={7}
            value={ideaDescription}
            onChange={(event) => setIdeaDescription(event.target.value)}
            placeholder="Describe your idea"
            style={{
              width: "100%",
              border: "1px solid #111",
              borderRadius: 8,
              padding: "10px 12px",
              background: "#0f0f0f",
              resize: "vertical",
            }}
          />
          <label
            style={{
              display: "block",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              margin: "12px 0 6px",
            }}
          >
            Photo (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setIdeaPhoto(event.target.files?.[0] ?? null)}
            style={{
              width: "100%",
              border: "1px solid #111",
              borderRadius: 8,
              padding: "8px 12px",
              background: "#0f0f0f",
              fontSize: 12,
            }}
          />
          {ideaPhoto && (
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Selected: {ideaPhoto.name}
            </div>
          )}
          <label
            style={{
              display: "block",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              margin: "12px 0 6px",
            }}
          >
            Video (optional)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(event) => setIdeaVideo(event.target.files?.[0] ?? null)}
            style={{
              width: "100%",
              border: "1px solid #111",
              borderRadius: 8,
              padding: "8px 12px",
              background: "#0f0f0f",
              fontSize: 12,
            }}
          />
          {ideaVideo && (
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Selected: {ideaVideo.name}
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="submit"
              style={{
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {ideaSubmitting ? "Posting..." : "Post Idea"}
            </button>
            <Link
              href="/submit"
              style={{
                fontSize: 12,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#111",
              }}
            >
              View ideas
            </Link>
            {ideaStatus && (
              <div style={{ fontSize: 12, color: "#444" }}>{ideaStatus}</div>
            )}
          </div>
        </form>
      )}

      {selected !== "Idea" && (
        <div
          className="nyt-soft-card"
          style={{
            border: "1px solid #111",
            borderRadius: 10,
            padding: 16,
            background: "#0f0f0f",
            fontSize: 14,
            color: "#333",
          }}
        >
          Upload form for {selected.toLowerCase()}s is coming next.
        </div>
      )}
    </div>
  );
}
