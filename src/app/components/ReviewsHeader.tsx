"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ProfileSummary = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  account_type: string | null;
  reviews_from_employees_enabled?: boolean | null;
  reviews_from_employers_enabled?: boolean | null;
  reviews_from_customers_enabled?: boolean | null;
};

type ReviewRow = {
  id: string;
  review_type:
    | "employee_to_business"
    | "business_to_employee"
    | "customer_to_employee";
  reviewer_id: string;
  subject_id: string;
  rating: number;
  title: string | null;
  body: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type ReviewItem = ReviewRow & {
  reviewerName: string;
  reviewerPhotoUrl: string | null;
  subjectName: string;
  subjectPhotoUrl: string | null;
};

export default function ReviewsHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "workplace" | "employee" | "service"
  >("workplace");
  const [userId, setUserId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [userProfile, setUserProfile] = useState<{
    name: string;
    photoUrl: string | null;
  } | null>(null);
  const [userWorkRating, setUserWorkRating] = useState<{
    avg: number;
    count: number;
  } | null>(null);
  const [userServiceRating, setUserServiceRating] = useState<{
    avg: number;
    count: number;
  } | null>(null);
  const [userRatingLoading, setUserRatingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [ratingMap, setRatingMap] = useState<
    Record<string, { avg: number; count: number }>
  >({});
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const reviewTypes =
    activeTab === "workplace"
      ? ["employee_to_business"]
      : activeTab === "employee"
      ? ["business_to_employee"]
      : ["customer_to_employee"];
  const targetAccountType = activeTab === "workplace" ? "business" : "private";
  const subjectFlag =
    activeTab === "workplace"
      ? "reviews_from_employees_enabled"
      : activeTab === "employee"
      ? "reviews_from_employers_enabled"
      : "reviews_from_customers_enabled";
  const canReview =
    Boolean(userId) &&
    (activeTab === "workplace"
      ? accountType === "private"
      : activeTab === "employee"
      ? accountType === "business"
      : accountType === "private");

  useEffect(() => {
    if (pathname !== "/reviews") return;
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
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/reviews") return;
    if (!userId) {
      setUserProfile(null);
      setUserWorkRating(null);
      setUserServiceRating(null);
      return;
    }
    let isActive = true;
    const loadUserProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, photo_url")
        .eq("id", userId)
        .maybeSingle();
      if (!isActive) return;
      setUserProfile({
        name: data?.full_name || "Your Profile",
        photoUrl: data?.photo_url || null,
      });
    };
    const loadUserRating = async () => {
      setUserRatingLoading(true);
      const workReviewType =
        accountType === "business"
          ? "employee_to_business"
          : "business_to_employee";
      const [workResponse, serviceResponse] = await Promise.all([
        supabase
          .from("reviews")
          .select("rating")
          .eq("subject_id", userId)
          .eq("review_type", workReviewType),
        supabase
          .from("reviews")
          .select("rating")
          .eq("subject_id", userId)
          .eq("review_type", "customer_to_employee"),
      ]);
      if (!isActive) return;
      const buildRating = (
        rows: Array<{ rating: number }> | null | undefined
      ) => {
        const safeRows = rows ?? [];
        const total = safeRows.reduce((sum, row) => sum + row.rating, 0);
        const count = safeRows.length;
        return { avg: count ? total / count : 0, count };
      };
      setUserWorkRating(buildRating(workResponse.data));
      setUserServiceRating(buildRating(serviceResponse.data));
      setUserRatingLoading(false);
    };
    loadUserProfile();
    loadUserRating();
    return () => {
      isActive = false;
    };
  }, [pathname, userId, accountType]);

  useEffect(() => {
    if (pathname !== "/reviews") return;
    const tab = searchParams?.get("type");
    if (tab === "employee" || tab === "workplace" || tab === "service") {
      setActiveTab(tab);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pathname !== "/reviews") return;
    setSearchResults([]);
    setSearchQuery("");
  }, [pathname, activeTab]);

  useEffect(() => {
    if (pathname !== "/reviews") return;
    let isActive = true;
    const runSearch = async () => {
      setSearchLoading(true);
      const query = searchQuery.trim();
      let request = supabase
        .from("profiles")
        .select(
          "id, full_name, photo_url, account_type, reviews_from_employees_enabled, reviews_from_employers_enabled, reviews_from_customers_enabled"
        )
        .eq("account_type", targetAccountType)
        .eq(subjectFlag, true);
      if (query) {
        request = request.ilike("full_name", `%${query}%`).limit(6);
      } else {
        request = request.order("full_name", { ascending: true }).limit(12);
      }
      const { data, error } = await request;
      if (!isActive) return;
      if (error) {
        setSearchResults([]);
      } else {
        setSearchResults(data ?? []);
      }
      setSearchLoading(false);
    };
    runSearch();
    return () => {
      isActive = false;
    };
  }, [pathname, searchQuery, targetAccountType, userId, activeTab]);

  useEffect(() => {
    if (pathname !== "/reviews") return;
    let isActive = true;
    const loadReviews = async () => {
      setReviewsLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "id, review_type, reviewer_id, subject_id, rating, title, body, role, start_date, end_date, created_at"
        )
        .in("review_type", reviewTypes)
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        setReviews([]);
        setReviewsLoading(false);
        return;
      }
      const rows = (data ?? []) as ReviewRow[];
      const profileIds = Array.from(
        new Set([
          ...rows.map((row) => row.reviewer_id),
          ...rows.map((row) => row.subject_id),
        ])
      );
      const { data: profiles } = profileIds.length
        ? await supabase
            .from("profiles")
            .select(
              "id, full_name, photo_url, reviews_from_employees_enabled, reviews_from_employers_enabled, reviews_from_customers_enabled"
            )
            .in("id", profileIds)
        : { data: [] };
      if (!isActive) return;
      const profileMap = (profiles ?? []).reduce(
        (acc, profile) => {
          acc[profile.id] = {
            name: profile.full_name || "User",
            photo: profile.photo_url,
            reviewsFromEmployeesEnabled:
              profile.reviews_from_employees_enabled,
            reviewsFromEmployersEnabled:
              profile.reviews_from_employers_enabled,
            reviewsFromCustomersEnabled:
              profile.reviews_from_customers_enabled,
          };
          return acc;
        },
        {} as Record<
          string,
          {
            name: string;
            photo: string | null;
            reviewsFromEmployeesEnabled?: boolean | null;
            reviewsFromEmployersEnabled?: boolean | null;
            reviewsFromCustomersEnabled?: boolean | null;
          }
        >
      );
      const mapped = rows
        .filter((row) => {
          const subjectProfile = profileMap[row.subject_id];
          if (!subjectProfile) return true;
          if (subjectFlag === "reviews_from_employees_enabled") {
            return subjectProfile.reviewsFromEmployeesEnabled !== false;
          }
          if (subjectFlag === "reviews_from_employers_enabled") {
            return subjectProfile.reviewsFromEmployersEnabled !== false;
          }
          return subjectProfile.reviewsFromCustomersEnabled !== false;
        })
        .map((row) => ({
          ...row,
          reviewerName: profileMap[row.reviewer_id]?.name || "User",
          reviewerPhotoUrl: profileMap[row.reviewer_id]?.photo || null,
          subjectName: profileMap[row.subject_id]?.name || "User",
          subjectPhotoUrl: profileMap[row.subject_id]?.photo || null,
        }));
      setReviews(mapped);
      setReviewsLoading(false);
    };
    loadReviews();
    return () => {
      isActive = false;
    };
  }, [pathname, activeTab]);

  useEffect(() => {
    if (pathname !== "/reviews") return;
    let isActive = true;
    const ids = searchResults.map((profile) => profile.id).filter(Boolean);
    if (ids.length === 0) {
      setRatingMap({});
      return;
    }
    const reviewTypesForRatings =
      activeTab === "workplace"
        ? ["employee_to_business"]
        : activeTab === "employee"
        ? ["business_to_employee"]
        : ["customer_to_employee"];
    const loadRatings = async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("subject_id, rating, review_type")
        .in("subject_id", ids)
        .in("review_type", reviewTypesForRatings);
      if (!isActive) return;
      if (error) {
        setRatingMap({});
        return;
      }
      const tally = (data ?? []).reduce(
        (acc, row) => {
          const key = row.subject_id;
          if (!acc[key]) {
            acc[key] = { sum: 0, count: 0 };
          }
          acc[key].sum += row.rating;
          acc[key].count += 1;
          return acc;
        },
        {} as Record<string, { sum: number; count: number }>
      );
      const mapped = Object.keys(tally).reduce(
        (acc, key) => {
          const entry = tally[key];
          acc[key] = {
            avg: entry.count ? entry.sum / entry.count : 0,
            count: entry.count,
          };
          return acc;
        },
        {} as Record<string, { avg: number; count: number }>
      );
      setRatingMap(mapped);
    };
    loadRatings();
    return () => {
      isActive = false;
    };
  }, [pathname, searchResults, activeTab]);

  if (pathname !== "/reviews") return null;

  if (!userId) {
    return (
      <div
        className="nyt-divider-categories"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div
          className="nyt-divider-category"
          style={{ borderBottom: "none", paddingBottom: 0, width: "100%" }}
        >
          <div
            style={{ paddingBottom: 10, borderBottom: "2px solid var(--rule-strong)" }}
          >
            <div className="nyt-divider-category-name">Reviews</div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Log in to view and post reviews.
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return null;
    if (start && end) return `${start} - ${end}`;
    if (start) return `Since ${start}`;
    return `Until ${end}`;
  };

  const subjectLabel = activeTab === "workplace" ? "Employer" : "Employee";
  const reviewHint = !userId
    ? "Log in to leave a review."
    : !canReview
    ? activeTab === "employee"
      ? "Only business accounts can review employees."
      : activeTab === "service"
      ? "Only private accounts can leave customer service reviews."
      : "Only private accounts can review employers."
    : "Select a profile and press Review.";
  const listTitle = activeTab === "workplace" ? "Employers" : "Employees";
  const isEmployeeList = activeTab !== "workplace";
  const listLoadingLabel =
    activeTab === "workplace" ? "Loading employers..." : "Loading employees...";
  const maxStars = activeTab === "service" ? 10 : 5;
  const userWorkRatingValue = userWorkRating?.avg ?? 0;
  const userWorkRatingLabel = userWorkRatingValue.toFixed(1);
  const userWorkRatingStars = Math.round(userWorkRatingValue);
  const userWorkRatingCount = userWorkRating?.count ?? 0;
  const userServiceRatingValue = userServiceRating?.avg ?? 0;
  const userServiceRatingLabel = userServiceRatingValue.toFixed(1);
  const userServiceRatingStars = Math.round(userServiceRatingValue);
  const userServiceRatingCount = userServiceRating?.count ?? 0;

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
          <div className="nyt-divider-category-name">Reviews</div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }} />
          {userProfile && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.name}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    objectFit: "cover",
                    background: "var(--surface)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    background: "var(--surface)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 10,
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
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {userProfile.name}
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: 4,
                    fontSize: 11,
                    color: "rgba(58, 43, 36, 0.75)",
                  }}
                >
                  {userRatingLoading ? (
                    <span>Loading ratings...</span>
                  ) : (
                    <>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ display: "grid", gap: 2 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ display: "inline-flex", gap: 2 }}>
                              {Array.from({ length: 5 }).map((_, index) => (
                                <span
                                  key={index}
                                  style={{
                                    color:
                                      index < userWorkRatingStars
                                        ? "var(--accent-strong)"
                                        : "rgba(58, 43, 36, 0.25)",
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              {userWorkRatingLabel}
                            </span>
                          </div>
                          <span>
                            {userWorkRatingCount} reviews
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 2 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ display: "inline-flex", gap: 2 }}>
                              {Array.from({ length: 10 }).map((_, index) => (
                                <span
                                  key={index}
                                  style={{
                                    color:
                                      index < userServiceRatingStars
                                        ? "var(--accent-strong)"
                                        : "rgba(58, 43, 36, 0.25)",
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              {userServiceRatingLabel}
                            </span>
                          </div>
                          <span>
                            {userServiceRatingCount} reviews
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <div
            className="reviews-tabs"
            style={{
              marginTop: 12,
              display: "flex",
              gap: 10,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("workplace")}
              style={{
                border: "1px solid var(--rule-strong)",
                background:
                  activeTab === "workplace"
                    ? "var(--accent-soft)"
                    : "var(--paper)",
                color: "var(--ink)",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow:
                  activeTab === "workplace"
                    ? "0 10px 24px rgba(61, 47, 40, 0.16)"
                    : "none",
              }}
            >
              Review Employer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("employee")}
              style={{
                border: "1px solid var(--rule-strong)",
                background:
                  activeTab === "employee"
                    ? "var(--accent-soft)"
                    : "var(--paper)",
                color: "var(--ink)",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow:
                  activeTab === "employee"
                    ? "0 10px 24px rgba(61, 47, 40, 0.16)"
                    : "none",
              }}
            >
              Review Employee
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("service")}
              style={{
                border: "1px solid var(--rule-strong)",
                background:
                  activeTab === "service"
                    ? "var(--accent-soft)"
                    : "var(--paper)",
                color: "var(--ink)",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow:
                  activeTab === "service"
                    ? "0 10px 24px rgba(61, 47, 40, 0.16)"
                    : "none",
              }}
            >
              Review Customer Service
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                activeTab === "workplace"
                  ? "Search employer name"
                  : "Search employee name"
              }
              style={{
                flex: "1 1 240px",
                border: "1px solid var(--rule-strong)",
                background: "var(--paper)",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <div style={{ fontSize: 12, opacity: 0.7 }}>{reviewHint}</div>
          </div>
          {searchLoading && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Loading profiles...
            </div>
          )}
          {!searchLoading && searchResults.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              No matching profiles.
            </div>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {listTitle}
            </div>
          )}
          <div
            className="reviews-profiles-grid"
            style={{
              display: "grid",
              gridTemplateColumns: isEmployeeList
                ? "minmax(0, 1fr)"
                : "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {searchResults.map((profile) => {
              const isSelfProfile = profile.id === userId;
              const ratingSummary = ratingMap[profile.id];
              const averageRating = ratingSummary?.avg ?? 0;
              const ratingLabel = averageRating.toFixed(1);
              const filledStars = Math.round(averageRating);
              const cardStyle: React.CSSProperties = {
                borderRadius: 18,
                padding: isEmployeeList ? "12px 16px" : 14,
                background: "rgba(255, 241, 226, 0.9)",
                boxShadow: "0 12px 24px rgba(93, 59, 45, 0.16)",
                display: isEmployeeList ? "flex" : "grid",
                alignItems: isEmployeeList ? "center" : "stretch",
                justifyContent: isEmployeeList ? "space-between" : "stretch",
                gap: isEmployeeList ? 12 : 10,
                textAlign: isEmployeeList ? "left" : "center",
              };
              const infoStyle: React.CSSProperties = {
                display: isEmployeeList ? "flex" : "grid",
                alignItems: isEmployeeList ? "center" : "stretch",
                gap: isEmployeeList ? 12 : 6,
                justifyItems: isEmployeeList ? undefined : "center",
              };
              const avatarStyle: React.CSSProperties = {
                width: 54,
                height: 54,
                borderRadius: 18,
                objectFit: "cover",
                background: "var(--surface)",
                justifySelf: isEmployeeList ? "flex-start" : "center",
              };
              return (
                <div
                  key={profile.id}
                  style={cardStyle}
                >
                  <div style={infoStyle}>
                    {profile.photo_url ? (
                      <img
                        src={profile.photo_url}
                        alt={profile.full_name || "Profile"}
                        style={avatarStyle}
                      />
                    ) : (
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 18,
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
                    <div style={{ display: "grid", gap: 2 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {profile.full_name || "User"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            color: "rgba(58, 43, 36, 0.7)",
                          }}
                        >
                          <span style={{ display: "inline-flex", gap: 2 }}>
                            {Array.from({ length: maxStars }).map((_, index) => (
                              <span
                                key={index}
                                style={{
                                  color:
                                    index < filledStars
                                      ? "var(--accent-strong)"
                                      : "rgba(58, 43, 36, 0.25)",
                                }}
                              >
                                ★
                              </span>
                            ))}
                          </span>
                          {ratingLabel}
                        </span>
                      </div>
                      {isSelfProfile && (
                        <div style={{ fontSize: 11, opacity: 0.6 }}>You</div>
                      )}
                    </div>
                  </div>
                <button
                  type="button"
                  disabled={!canReview || isSelfProfile}
                  onClick={() => {
                    if (!canReview || isSelfProfile) return;
                    router.push(
                      `/reviews/new?type=${activeTab}&subject=${profile.id}`
                    );
                  }}
                  style={{
                    border: "1px solid var(--accent-strong)",
                    background: "var(--accent-strong)",
                    color: "#fff7ef",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor:
                      !canReview || isSelfProfile ? "not-allowed" : "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    opacity: !canReview || isSelfProfile ? 0.5 : 1,
                  }}
                >
                  {isSelfProfile ? "Your Profile" : "Review"}
                </button>
              </div>
              );
            })}
          </div>
        </div>

        <div
          className="reviews-list-grid"
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {reviewsLoading && (
            <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>
              {listLoadingLabel}
            </div>
          )}
          {!reviewsLoading && reviews.length === 0 && (
            <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>
              No profiles yet.
            </div>
          )}
          {reviews.map((review) => {
            const dateRange = formatDateRange(
              review.start_date,
              review.end_date
            );
            const reviewerRole =
              review.review_type === "employee_to_business"
                ? "Employee"
                : review.review_type === "business_to_employee"
                ? "Business"
                : "Customer";
            return (
              <div
                key={review.id}
                style={{
                  borderRadius: 18,
                  padding: 16,
                  background: "rgba(255, 241, 226, 0.9)",
                  boxShadow: "0 12px 24px rgba(93, 59, 45, 0.16)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    Rating {review.rating}/
                    {review.review_type === "customer_to_employee" ? 10 : 5}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {formatTimeAgo(review.created_at)}
                  </div>
                </div>
                {review.title && (
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {review.title}
                  </div>
                )}
                <div style={{ fontSize: 13 }}>{review.body}</div>
                {review.role && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Role: {review.role}
                  </div>
                )}
                {dateRange && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Dates: {dateRange}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {review.reviewerPhotoUrl ? (
                      <img
                        src={review.reviewerPhotoUrl}
                        alt={review.reviewerName}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          objectFit: "cover",
                          background: "var(--surface)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          background: "var(--surface)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 8,
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
                    <div style={{ fontSize: 12 }}>
                      {reviewerRole}: {review.reviewerName}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {review.subjectPhotoUrl ? (
                      <img
                        src={review.subjectPhotoUrl}
                        alt={review.subjectName}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          objectFit: "cover",
                          background: "var(--surface)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          background: "var(--surface)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 8,
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
                    <div style={{ fontSize: 12 }}>
                      {subjectLabel}: {review.subjectName}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
