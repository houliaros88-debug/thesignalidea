"use client";

import React, { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { categories } from "../data/categories";

export const dynamic = "force-dynamic";

type UploadType = "Idea" | "Picture" | "Video" | "Job";

const uploadTabs: UploadType[] = ["Idea", "Picture", "Video", "Job"];
const FREE_IDEA_QUOTA = 1000;
const COMPETITION_THRESHOLD = 40000;
const PRIZE_EUR = 150000;

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<UploadType>("Idea");
  const [userName, setUserName] = useState("User");
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [ideaMode, setIdeaMode] = useState<"new" | "update">("new");
  const [userIdeas, setUserIdeas] = useState<Array<{ id: string; title: string }>>(
    []
  );
  const [targetIdeaId, setTargetIdeaId] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaPhoto, setIdeaPhoto] = useState<File | null>(null);
  const [ideaVideo, setIdeaVideo] = useState<File | null>(null);
  const [ideaCategory, setIdeaCategory] = useState(
    categories[0]?.name ?? ""
  );
  const [ideaStatus, setIdeaStatus] = useState<string | null>(null);
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);
  const [categoryIdeaCount, setCategoryIdeaCount] = useState<number | null>(
    null
  );
  const [categoryCountLoading, setCategoryCountLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const meta = data.user?.user_metadata ?? {};
      setUserName(
        meta.full_name || meta.name || data.user?.email || "User"
      );
      let resolvedAccountType: "private" | "business" =
        meta.account_type === "business" ? "business" : "private";
      if (user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", user.id)
          .maybeSingle();
        if (!profileError && profileData?.account_type) {
          resolvedAccountType =
            profileData.account_type === "business" ? "business" : "private";
        }
        const { data: ideasData } = await supabase
          .from("ideas")
          .select("id, title")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        const list =
          (ideasData ?? []).map((idea) => ({
            id: idea.id,
            title: idea.title || "Untitled idea",
          })) ?? [];
        setUserIdeas(list);
        setTargetIdeaId((prev) => prev || list[0]?.id || "");
      }
      setAccountType(resolvedAccountType);
    };
    loadUser();
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadCategoryCount = async () => {
      if (!ideaCategory) {
        setCategoryIdeaCount(null);
        return;
      }
      setCategoryCountLoading(true);
      const { count, error } = await supabase
        .from("ideas")
        .select("id", { count: "exact", head: true })
        .eq("category", ideaCategory);
      if (!isActive) return;
      setCategoryIdeaCount(error ? null : count ?? 0);
      setCategoryCountLoading(false);
    };
    if (selected === "Idea" && ideaMode === "new") {
      loadCategoryCount();
    }
    return () => {
      isActive = false;
    };
  }, [ideaCategory, ideaMode, selected]);

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
    if (accountType === "business") {
      setIdeaStatus("Business accounts can't post ideas. Use the Partners page.");
      return;
    }
    const isUpdate = ideaMode === "update";
    const title = ideaTitle.trim();
    const description = ideaDescription.trim();
    if (isUpdate) {
      if (!targetIdeaId) {
        setIdeaStatus("Select an idea to update.");
        return;
      }
      if (!description && !ideaPhoto && !ideaVideo) {
        setIdeaStatus("Add text, a photo, or a video.");
        return;
      }
    } else if (!description) {
      setIdeaStatus("Add your idea text first.");
      return;
    } else if (
      typeof categoryIdeaCount === "number" &&
      categoryIdeaCount >= FREE_IDEA_QUOTA
    ) {
      setIdeaStatus(
        `Payment required after the first ${FREE_IDEA_QUOTA.toLocaleString(
          "en-US"
        )} ideas in this category. Payments coming soon.`
      );
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

      const { error } = isUpdate
        ? await supabase.from("idea_updates").insert({
            idea_id: targetIdeaId,
            user_id: user.id,
            body: description || "",
            photo_url: photoUrl,
            video_url: videoUrl,
          })
        : await supabase.from("ideas").insert({
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
      setIdeaStatus(isUpdate ? "Update added." : "Idea posted.");
      router.push("/profile");
      router.refresh();
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
      {selected === "Idea" && accountType === "business" && (
        <div
          className="nyt-soft-card"
          style={{
            border: "1px solid var(--rule-light)",
            borderRadius: 18,
            padding: 24,
            background: "rgba(253, 247, 239, 0.78)",
            marginBottom: 24,
            color: "var(--ink)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Business accounts can't post ideas
          </div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            Use the Partners page to publish a partner listing instead.
          </div>
          <Link
            href="/categories"
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent-strong)",
            }}
          >
            Go to Partners
          </Link>
        </div>
      )}

      {selected === "Idea" && accountType !== "business" && (
        <form
          onSubmit={handleIdeaSubmit}
          className="nyt-soft-card"
          style={{
            border: "1px solid var(--rule-light)",
            borderRadius: 18,
            padding: 24,
            background: "rgba(253, 247, 239, 0.8)",
            marginBottom: 24,
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {ideaMode === "update" ? "Add Update" : "Upload Idea"}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setIdeaMode("new")}
              style={{
                border: "1px solid var(--rule-strong)",
                background:
                  ideaMode === "new" ? "var(--accent-soft)" : "transparent",
                color: "var(--ink)",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              New Idea
            </button>
            <button
              type="button"
              onClick={() => setIdeaMode("update")}
              style={{
                border: "1px solid var(--rule-strong)",
                background:
                  ideaMode === "update" ? "var(--accent-soft)" : "transparent",
                color: "var(--ink)",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Add Update
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "rgba(61, 47, 40, 0.7)",
              marginBottom: 12,
            }}
          >
            {ideaMode === "update" ? "Choose an idea" : "Choose a category"}
          </div>
          {ideaMode === "update" ? (
            <>
              <select
                value={targetIdeaId}
                onChange={(event) => setTargetIdeaId(event.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid var(--rule-strong)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                  background: "var(--paper)",
                  fontFamily: "Georgia, Times New Roman, Times, serif",
                  fontSize: 14,
                }}
              >
                {userIdeas.length === 0 && (
                  <option value="">No ideas yet</option>
                )}
                {userIdeas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <select
                value={ideaCategory}
                onChange={(event) => setIdeaCategory(event.target.value)}
              style={{
                width: "100%",
                border: "1px solid var(--rule-strong)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                background: "var(--paper)",
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
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                opacity: 0.7,
                marginBottom: 12,
              }}
            >
                {categoryCountLoading
                  ? "Loading category totals..."
                  : typeof categoryIdeaCount === "number"
                  ? `${categoryIdeaCount.toLocaleString(
                      "en-US"
                    )} ideas in this category · ${Math.max(
                      0,
                      FREE_IDEA_QUOTA - categoryIdeaCount
                    ).toLocaleString(
                      "en-US"
                    )} free left · ${COMPETITION_THRESHOLD.toLocaleString(
                      "en-US"
                    )} ideas to start competition · Prize €${PRIZE_EUR.toLocaleString(
                      "en-US"
                    )}`
                  : `First ${FREE_IDEA_QUOTA.toLocaleString(
                      "en-US"
                    )} ideas are free · ${COMPETITION_THRESHOLD.toLocaleString(
                      "en-US"
                    )} ideas to start competition · Prize €${PRIZE_EUR.toLocaleString(
                      "en-US"
                    )}`}
              </div>
            </>
          )}
          {ideaMode === "new" && (
            <>
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
                  border: "1px solid var(--rule-strong)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                  background: "var(--paper)",
                }}
              />
            </>
          )}
          <label
            style={{
              display: "block",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 6,
            }}
          >
            {ideaMode === "update" ? "Update text" : "Description"}
          </label>
          <textarea
            rows={7}
            value={ideaDescription}
            onChange={(event) => setIdeaDescription(event.target.value)}
            placeholder={
              ideaMode === "update"
                ? "Add more details to your idea"
                : "Describe your idea"
            }
            style={{
              width: "100%",
              border: "1px solid var(--rule-strong)",
              borderRadius: 8,
              padding: "10px 12px",
              background: "var(--paper)",
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
              border: "1px solid var(--rule-strong)",
              borderRadius: 8,
              padding: "8px 12px",
              background: "var(--paper)",
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
              border: "1px solid var(--rule-strong)",
              borderRadius: 8,
              padding: "8px 12px",
              background: "var(--paper)",
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
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-strong)",
                color: "#fff7ef",
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
                color: "var(--accent-strong)",
              }}
            >
              View ideas
            </Link>
            {ideaStatus && (
              <div style={{ fontSize: 12, color: "rgba(61, 47, 40, 0.7)" }}>
                {ideaStatus}
              </div>
            )}
          </div>
        </form>
      )}

      {selected !== "Idea" && (
        <div
          className="nyt-soft-card"
          style={{
            border: "1px solid var(--rule-light)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(253, 247, 239, 0.75)",
            fontSize: 14,
            color: "var(--ink)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          Upload form for {selected.toLowerCase()}s is coming next.
        </div>
      )}
    </div>
  );
}
