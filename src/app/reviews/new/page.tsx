"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type ProfileSummary = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  account_type: string | null;
  reviews_from_employees_enabled?: boolean | null;
  reviews_from_employers_enabled?: boolean | null;
  reviews_from_customers_enabled?: boolean | null;
};

export default function NewReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get("type");
  const subjectId = searchParams?.get("subject");
  const reviewTarget =
    typeParam === "employee"
      ? "employee"
      : typeParam === "service"
      ? "service"
      : "workplace";

  const [userId, setUserId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [subject, setSubject] = useState<ProfileSummary | null>(null);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (isActive) {
          setUserId(null);
          setAccountType("private");
        }
        return;
      }
      const meta = user.user_metadata ?? {};
      let resolvedAccountType: "private" | "business" =
        meta.account_type === "business" ? "business" : "private";
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();
      if (!profileError && profileData?.account_type) {
        resolvedAccountType =
          profileData.account_type === "business" ? "business" : "private";
      }
      if (isActive) {
        setUserId(user.id);
        setAccountType(resolvedAccountType);
      }
    };
    loadUser();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setSubject(null);
      return;
    }
    let isActive = true;
    const loadSubject = async () => {
      setLoadingSubject(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, photo_url, account_type, reviews_from_employees_enabled, reviews_from_employers_enabled, reviews_from_customers_enabled"
        )
        .eq("id", subjectId)
        .maybeSingle();
      if (!isActive) return;
      if (error) {
        setSubject(null);
      } else {
        setSubject(data ?? null);
      }
      setLoadingSubject(false);
    };
    loadSubject();
    return () => {
      isActive = false;
    };
  }, [subjectId]);

  const maxRating = reviewTarget === "service" ? 10 : 5;

  useEffect(() => {
    setRating(maxRating);
  }, [maxRating]);

  const canReview = useMemo(() => {
    if (!userId) return false;
    if (reviewTarget === "workplace") {
      return accountType === "private";
    }
    if (reviewTarget === "employee") {
      return accountType === "business";
    }
    return accountType === "private";
  }, [accountType, reviewTarget, userId]);

  const subjectAllowsReview = useMemo(() => {
    if (!subject) return false;
    if (reviewTarget === "workplace") {
      return subject.reviews_from_employees_enabled !== false;
    }
    if (reviewTarget === "employee") {
      return subject.reviews_from_employers_enabled !== false;
    }
    return subject.reviews_from_customers_enabled !== false;
  }, [reviewTarget, subject]);

  const subjectOk = useMemo(() => {
    if (!subject) return false;
    if (!subjectAllowsReview) return false;
    if (reviewTarget === "workplace") {
      return subject.account_type === "business";
    }
    return subject.account_type === "private";
  }, [reviewTarget, subject, subjectAllowsReview]);

  const reviewType =
    reviewTarget === "workplace"
      ? "employee_to_business"
      : reviewTarget === "employee"
      ? "business_to_employee"
      : "customer_to_employee";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setStatus(null);
    if (!userId) {
      setStatus("You need to log in first.");
      return;
    }
    if (!canReview) {
      setStatus(
        reviewTarget === "workplace"
          ? "Only private accounts can review employers."
          : reviewTarget === "employee"
          ? "Only business accounts can review employees."
          : "Only private accounts can leave customer service reviews."
      );
      return;
    }
    if (!subject || !subjectOk) {
      setStatus("Select a valid profile to review.");
      return;
    }
    const nextBody = body.trim();
    if (!nextBody) {
      setStatus("Write your review text.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      review_type: reviewType,
      reviewer_id: userId,
      subject_id: subject.id,
      rating,
      title: title.trim() || null,
      body: nextBody,
      role: role.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    if (error) {
      const message = error.message || "Could not submit review.";
      if (message.toLowerCase().includes("reviews_reviewer_subject_type")) {
        setStatus("You already reviewed this profile.");
      } else {
        setStatus(message);
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    router.push(`/reviews?type=${reviewTarget}`);
  };

  return (
    <div
      className="nyt-main"
      style={{ maxWidth: 960, margin: "32px auto", padding: "0 16px" }}
    >
      <div
        style={{
          borderRadius: 18,
          padding: 20,
          background: "rgba(255, 241, 226, 0.9)",
          boxShadow: "0 12px 24px rgba(93, 59, 45, 0.16)",
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            {reviewTarget === "workplace"
              ? "Review Employer"
              : reviewTarget === "employee"
              ? "Review Employee"
              : "Review Customer Service"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            {reviewTarget === "workplace"
              ? "Share your experience with an employer you worked for."
              : reviewTarget === "employee"
              ? "Share your experience working with an employee."
              : "Rate the customer service you received."}
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--rule-light)",
            padding: "12px 14px",
            borderRadius: 14,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          {loadingSubject ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Loading profile...
            </div>
          ) : subject ? (
            <>
              {subject.photo_url ? (
                <img
                  src={subject.photo_url}
                  alt={subject.full_name || "Profile"}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    objectFit: "cover",
                    background: "var(--surface)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: "var(--surface)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "pre-line",
                    textAlign: "center",
                    lineHeight: 1.1,
                    color: "rgba(58, 43, 36, 0.7)",
                  }}
                >
                  {"No\nPhoto"}
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {subject.full_name || "Profile"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {reviewTarget === "workplace" ? "Employer" : "Employee"}
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Select a profile from the Reviews page first.
            </div>
          )}
        </div>

        {!subjectOk && subject && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {!subjectAllowsReview
              ? reviewTarget === "workplace"
                ? "Employee reviews are disabled for this profile."
                : reviewTarget === "employee"
                ? "Employer reviews are disabled for this profile."
                : "Customer service reviews are disabled for this profile."
              : "This profile is not available for this review type."}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="reviews-form-grid"
          style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              style={{
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              {Array.from({ length: maxRating }).map((_, index) => {
                const value = maxRating - index;
                return (
                  <option key={value} value={value}>
                    Rating {value}/{maxRating}
                  </option>
                );
              })}
            </select>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title (optional)"
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
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Role (optional)"
              style={{
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                style={{
                  flex: 1,
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                style={{
                  flex: 1,
                  border: "1px solid var(--rule-strong)",
                  background: "var(--paper)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your review"
              rows={8}
              style={{
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                type="submit"
                disabled={submitting || !canReview || !subjectOk}
                style={{
                  border: "1px solid var(--accent-strong)",
                  background: "var(--accent-strong)",
                  color: "#fff7ef",
                  padding: "8px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor:
                    submitting || !canReview || !subjectOk
                      ? "not-allowed"
                      : "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: submitting || !canReview || !subjectOk ? 0.6 : 1,
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
      </div>
    </div>
  );
}
