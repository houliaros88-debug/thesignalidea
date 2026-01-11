"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { businessCategoryImages } from "../data/businessCategories";

type JobListing = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string;
  location: string | null;
  contact: string | null;
  image_url: string | null;
  created_at: string;
};

export default function JobsHeader() {
  const pathname = usePathname();
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [listings, setListings] = useState<JobListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const defaultCategory = "General";
  const defaultCover =
    "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=800&q=80";

  const refreshListings = async () => {
    setListingsLoading(true);
    const { data, error } = await supabase
      .from("job_listings")
      .select(
        "id, user_id, category, title, description, location, contact, image_url, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      setListings([]);
    } else {
      setListings(data ?? []);
    }
    setListingsLoading(false);
  };

  useEffect(() => {
    if (pathname !== "/jobs") return;
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
    loadUser();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/jobs") return;
    refreshListings();
  }, [pathname]);

  if (pathname !== "/jobs") return null;

  const normalizedQuery = countryQuery.trim().toLowerCase();
  const filteredListings = normalizedQuery
    ? listings.filter((item) =>
        (item.location ?? "").toLowerCase().includes(normalizedQuery)
      )
    : listings;

  const formatTimeAgo = (value: string) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setStatus(null);
    if (accountType !== "business") {
      setStatus("Only business accounts can publish job announcements.");
      return;
    }
    const nextTitle = title.trim();
    const nextDescription = description.trim();
    if (!nextTitle || !nextDescription) {
      setStatus("Add a job title and description.");
      return;
    }
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setStatus("You need to log in first.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("job_listings").insert({
      user_id: user.id,
      category: defaultCategory,
      title: nextTitle,
      description: nextDescription,
      location: location.trim() || null,
      contact: contact.trim() || null,
      image_url: imageUrl.trim() || null,
    });
    if (error) {
      setStatus(error.message || "Could not publish announcement.");
      setSubmitting(false);
      return;
    }
    setTitle("");
    setDescription("");
    setLocation("");
    setContact("");
    setImageUrl("");
    setStatus("Job announcement published.");
    refreshListings();
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
          <div className="nyt-divider-category-name">Jobs</div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            {accountType === "business"
              ? "Publish job announcements for your staff needs."
              : "Only business accounts can publish job announcements."}
          </div>
        </div>

        {accountType === "business" && (
          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 18,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Job title"
                style={{
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Location (optional)"
                style={{
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <input
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Contact info (optional)"
                style={{
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the role and requirements."
                rows={4}
                style={{
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
              <input
                type="text"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="Image URL (optional)"
                style={{
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    border: "1px solid var(--accent-strong)",
                    background: "var(--accent-strong)",
                    color: "#fff7ef",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Publishing..." : "Publish"}
                </button>
                {status && (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{status}</div>
                )}
              </div>
            </div>
          </form>
        )}

        <div style={{ marginTop: 18 }}>
          <input
            type="search"
            value={countryQuery}
            onChange={(event) => setCountryQuery(event.target.value)}
            placeholder="Search by country"
            style={{
              width: "100%",
              border: "1px solid var(--rule-strong)",
              background: "var(--paper)",
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--ink)",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {listingsLoading && (
            <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>
              Loading job announcements...
            </div>
          )}
          {!listingsLoading && listings.length === 0 && (
            <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>
              No job announcements yet.
            </div>
          )}
          {!listingsLoading &&
            listings.length > 0 &&
            filteredListings.length === 0 && (
              <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>
                No jobs found for that country.
              </div>
            )}
          {filteredListings.map((item) => {
            const cover =
              item.image_url ||
              businessCategoryImages[item.category] ||
              defaultCover;
            return (
              <div
                key={item.id}
                style={{
                  borderRadius: 18,
                  padding: 14,
                  background: "rgba(255, 241, 226, 0.9)",
                  boxShadow: "0 12px 24px rgba(93, 59, 45, 0.16)",
                  display: "grid",
                  gap: 8,
                }}
              >
                {cover && (
                  <img
                    src={cover}
                    alt={item.title}
                    loading="lazy"
                    style={{ width: "100%", height: 140, objectFit: "cover" }}
                  />
                )}
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {item.title}
                </div>
                {item.location && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {item.location}
                  </div>
                )}
                <div style={{ fontSize: 13 }}>{item.description}</div>
                {item.contact && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Contact: {item.contact}
                  </div>
                )}
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {formatTimeAgo(item.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
