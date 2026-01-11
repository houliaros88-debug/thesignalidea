"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function EditProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata ?? {};
      setUserId(data.user?.id ?? null);
      setFullName(
        meta.full_name || meta.name || data.user?.email || ""
      );
      setBio(meta.bio || "");
      setAccountType(meta.account_type === "business" ? "business" : "private");
      setPhotoUrl(meta.photo_url || meta.avatar_url || "");
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photoFile]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const trimmedPhoto = (photoUrl ?? "").trim();
    let nextPhoto: string | null = trimmedPhoto || null;

    if (photoFile) {
      const extension =
        photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `avatars/${userId ?? "anonymous"}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, photoFile, { upsert: true });
      if (uploadError) {
        setStatus(uploadError.message);
        setSaving(false);
        return;
      }
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      if (publicData?.publicUrl) {
        nextPhoto = publicData.publicUrl;
      }
    }
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        bio,
        photo_url: nextPhoto,
        avatar_url: nextPhoto,
      },
    });
    if (error) {
      setStatus(error.message);
      setSaving(false);
      return;
    }
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        bio,
        photo_url: nextPhoto,
        account_type: accountType,
        updated_at: new Date().toISOString(),
      });
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl(nextPhoto);
    setStatus("Profile updated.");
    setSaving(false);
    router.replace("/profile");
  };

  return (
    <div
      className="nyt-main"
      style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}
    >
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {photoPreview || photoUrl ? (
          <img
            src={photoPreview || photoUrl || ""}
            alt="Profile"
            width={140}
            height={180}
            style={{
              width: 140,
              height: 180,
              borderRadius: 24,
              objectFit: "cover",
              background: "var(--surface)",
            }}
          />
        ) : (
          <div
            style={{
              width: 140,
              height: 180,
              borderRadius: 24,
              border: "1px dashed var(--rule-strong)",
              background: "var(--paper)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textAlign: "center",
              color: "rgba(58, 43, 36, 0.6)",
              padding: 12,
            }}
          >
            Add profile picture
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            Edit Profile
          </div>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="fullName"
              style={{
                display: "block",
                fontSize: 12,
                color: "rgba(61, 47, 40, 0.7)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 6,
              }}
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              style={{
                width: "100%",
                border: "1px solid #bbb",
                borderRadius: 6,
                padding: "8px 10px",
                fontFamily: "Georgia, Times New Roman, Times, serif",
                fontSize: 14,
                color: "var(--ink)",
                background: "var(--paper)",
              }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="photoUrl"
              style={{
                display: "block",
                fontSize: 12,
                color: "rgba(61, 47, 40, 0.7)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 6,
              }}
            >
              Photo URL
            </label>
            <input
              id="photoUrl"
              type="url"
              value={photoUrl ?? ""}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://"
              style={{
                width: "100%",
                border: "1px solid #bbb",
                borderRadius: 6,
                padding: "8px 10px",
                fontFamily: "Georgia, Times New Roman, Times, serif",
                fontSize: 14,
                color: "var(--ink)",
                background: "var(--paper)",
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="photoFile"
              style={{
                display: "block",
                fontSize: 12,
                color: "rgba(61, 47, 40, 0.7)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 6,
              }}
            >
              Upload photo
            </label>
            <input
              id="photoFile"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPhotoFile(file);
              }}
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="bio"
              style={{
                display: "block",
                fontSize: 12,
                color: "rgba(61, 47, 40, 0.7)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 6,
              }}
            >
              About
            </label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Write a short bio about yourself."
              style={{
                width: "100%",
                border: "1px solid #bbb",
                borderRadius: 6,
                padding: "8px 10px",
                fontFamily: "Georgia, Times New Roman, Times, serif",
                fontSize: 14,
                color: "var(--ink)",
                background: "var(--paper)",
                resize: "vertical",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-strong)",
                color: "#fff7ef",
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => router.replace("/profile")}
              style={{
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              Cancel
            </button>
          </div>
          {status && (
            <div
              style={{ marginTop: 10, fontSize: 12, color: "rgba(61, 47, 40, 0.7)" }}
            >
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
