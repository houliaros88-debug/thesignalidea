"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  businessCategories,
  businessCategoryImages,
} from "../data/businessCategories";

const BUSINESS_FREE_QUOTA = 2000;
const ANNOUNCEMENT_FEE_EUR = 2;

type PartnerListing = {
  id: string;
  user_id: string;
  category: string;
  title: string | null;
  description: string;
  image_url: string | null;
  created_at: string;
};

export default function PartnersHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(businessCategories[0]);
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [businessCount, setBusinessCount] = useState<number | null>(null);
  const [listings, setListings] = useState<PartnerListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshListings = async (category: string) => {
    setListingsLoading(true);
    const { data, error } = await supabase
      .from("partner_listings")
      .select(
        "id, user_id, category, title, description, image_url, created_at"
      )
      .eq("category", category)
      .order("created_at", { ascending: false });
    if (error) {
      setListings([]);
    } else {
      setListings(data ?? []);
    }
    setListingsLoading(false);
  };

  useEffect(() => {
    if (pathname !== "/categories") return;
    let isActive = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const meta = data.user?.user_metadata ?? {};
      let resolvedAccountType =
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
      }
      if (isActive) {
        setAccountType(resolvedAccountType);
      }
    };
    const loadBusinessCount = async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_type", "business");
      if (!isActive) return;
      setBusinessCount(error ? null : count ?? 0);
    };
    loadUser();
    loadBusinessCount();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/categories") return;
    refreshListings(selected);
  }, [pathname, selected]);

  if (pathname !== "/categories") return null;

  const freeSlots =
    typeof businessCount === "number"
      ? Math.max(0, BUSINESS_FREE_QUOTA - businessCount)
      : null;
  const quotaReached =
    typeof businessCount === "number" && businessCount >= BUSINESS_FREE_QUOTA;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setStatus(null);
    if (accountType !== "business") {
      setStatus("Only business accounts can publish partner announcements.");
      return;
    }
    if (quotaReached) {
      setStatus(
        `Publishing after the first ${BUSINESS_FREE_QUOTA.toLocaleString(
          "en-US"
        )} business registrations will cost EUR ${ANNOUNCEMENT_FEE_EUR} per announcement. Payments coming soon.`
      );
      return;
    }
    const nextDescription = description.trim();
    const nextTitle = title.trim();
    const nextImageUrl = imageUrl.trim();
    if (!nextDescription) {
      setStatus("Add a description for your announcement.");
      return;
    }
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setStatus("You need to log in first.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("partner_listings").insert({
      user_id: user.id,
      category: selected,
      title: nextTitle || null,
      description: nextDescription,
      image_url: nextImageUrl || null,
      is_paid: false,
    });
    if (error) {
      setStatus(error.message || "Could not publish announcement.");
      setSubmitting(false);
      return;
    }
    setTitle("");
    setDescription("");
    setImageUrl("");
    setStatus("Announcement published.");
    refreshListings(selected);
    setSubmitting(false);
  };

  return (
    <div
      className="nyt-divider-categories"
      style={{ display: "flex", justifyContent: "center" }}
    >
      <div
        className="nyt-divider-category"
        style={{ borderBottom: "none", paddingBottom: 0, width: "100%" }}
      >
        <div style={{ paddingBottom: 10, borderBottom: "2px solid var(--rule-strong)" }}>
          <div className="nyt-divider-category-name">{selected}</div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            style={{
              marginTop: 6,
              border: "1px solid var(--rule-strong)",
              background: "var(--paper)",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--ink)",
              boxShadow: "0 10px 24px rgba(61, 47, 40, 0.16)",
            }}
          >
            Choose another category
          </button>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            {accountType === "business"
              ? businessCount === null
                ? "Loading business quota..."
                : quotaReached
                ? `Free quota reached - EUR ${ANNOUNCEMENT_FEE_EUR} per announcement`
                : `${freeSlots?.toLocaleString("en-US")} free business registrations left`
              : "Only business accounts can publish partner announcements."}
          </div>
          {open && (
            <div
              style={{
                marginTop: 8,
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: 8,
                display: "grid",
                gap: 6,
                minWidth: 220,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              {businessCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelected(category);
                    setOpen(false);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    padding: "4px 6px",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    color: "var(--ink)",
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
        {accountType === "business" && (
          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 16,
              border: "1px solid var(--rule-light)",
              borderRadius: 18,
              padding: 16,
              background: "rgba(253, 247, 239, 0.78)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Publish an announcement
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
              Posting to: {selected}
            </div>
            <label
              htmlFor="partnerTitle"
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Title (optional)
            </label>
            <input
              id="partnerTitle"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Looking for a partner"
              style={{
                width: "100%",
                border: "1px solid var(--rule-strong)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                background: "var(--paper)",
              }}
            />
            <label
              htmlFor="partnerDescription"
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Announcement
            </label>
            <textarea
              id="partnerDescription"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what you are looking for."
              style={{
                width: "100%",
                border: "1px solid var(--rule-strong)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                background: "var(--paper)",
                resize: "vertical",
              }}
            />
            <label
              htmlFor="partnerImageUrl"
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Image URL (optional)
            </label>
            <input
              id="partnerImageUrl"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://"
              style={{
                width: "100%",
                border: "1px solid var(--rule-strong)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                background: "var(--paper)",
              }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                type="submit"
                disabled={submitting || quotaReached}
                style={{
                  border: "1px solid var(--accent-strong)",
                  background: "var(--accent-strong)",
                  color: "#fff7ef",
                  padding: "8px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: submitting || quotaReached ? "not-allowed" : "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: submitting || quotaReached ? 0.6 : 1,
                }}
              >
                {submitting ? "Publishing..." : "Publish"}
              </button>
              {status && (
                <div style={{ fontSize: 12, opacity: 0.8 }}>{status}</div>
              )}
            </div>
          </form>
        )}

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {listingsLoading && (
            <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>
              Loading announcements...
            </div>
          )}
          {!listingsLoading && listings.length === 0 && (
            <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>
              No partner announcements yet.
            </div>
          )}
          {listings.map((item) => (
            <div key={item.id} style={{ textAlign: "center" }}>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title || item.category}
                  loading="lazy"
                  style={{ width: "100%", height: "auto", borderRadius: 24 }}
                />
              )}
              {item.title && (
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
                  {item.title}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {item.description}
              </div>
            </div>
          ))}
          {!listingsLoading &&
            listings.length === 0 &&
            businessCategoryImages[selected] && (
              <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.6 }}>
                Be the first to post in {selected}.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
