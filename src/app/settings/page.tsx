"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "zh", label: "Mandarin Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Standard Arabic" },
  { code: "bn", label: "Bengali" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ur", label: "Urdu" },
  { code: "bg", label: "Bulgarian" },
  { code: "hr", label: "Croatian" },
  { code: "cs", label: "Czech" },
  { code: "da", label: "Danish" },
  { code: "nl", label: "Dutch" },
  { code: "et", label: "Estonian" },
  { code: "fi", label: "Finnish" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "hu", label: "Hungarian" },
  { code: "ga", label: "Irish" },
  { code: "it", label: "Italian" },
  { code: "lv", label: "Latvian" },
  { code: "lt", label: "Lithuanian" },
  { code: "mt", label: "Maltese" },
  { code: "pl", label: "Polish" },
  { code: "ro", label: "Romanian" },
  { code: "sk", label: "Slovak" },
  { code: "sl", label: "Slovenian" },
  { code: "sv", label: "Swedish" },
];

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [reviewsFromEmployeesEnabled, setReviewsFromEmployeesEnabled] =
    useState(true);
  const [reviewsFromEmployersEnabled, setReviewsFromEmployersEnabled] =
    useState(true);
  const [reviewsFromCustomersEnabled, setReviewsFromCustomersEnabled] =
    useState(true);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState("auto");
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageStatus, setLanguageStatus] = useState<string | null>(null);
  const [browserLanguageLabel, setBrowserLanguageLabel] = useState<string | null>(
    null
  );

  useEffect(() => {
    const code =
      typeof navigator !== "undefined"
        ? navigator.language?.split("-")[0]
        : null;
    if (!code) return;
    const match = LANGUAGE_OPTIONS.find((option) => option.code === code);
    setBrowserLanguageLabel(match?.label || null);
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadSettings = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!isActive) return;
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "account_type, reviews_from_employees_enabled, reviews_from_employers_enabled, reviews_from_customers_enabled, language_code"
        )
        .eq("id", user.id)
        .maybeSingle();
      if (!isActive) return;
      setAccountType(
        profile?.account_type === "business" ? "business" : "private"
      );
      setReviewsFromEmployeesEnabled(
        profile?.reviews_from_employees_enabled ?? true
      );
      setReviewsFromEmployersEnabled(
        profile?.reviews_from_employers_enabled ?? true
      );
      setReviewsFromCustomersEnabled(
        profile?.reviews_from_customers_enabled ?? true
      );
      setLanguageCode(profile?.language_code ?? "auto");
      setLoading(false);
    };
    loadSettings();
    return () => {
      isActive = false;
    };
  }, []);

  const updateReviewSetting = async (
    key:
      | "reviews_from_employees_enabled"
      | "reviews_from_employers_enabled"
      | "reviews_from_customers_enabled",
    nextValue: boolean
  ) => {
    if (!userId || savingKey) return;
    setSavingKey(key);
    setStatus(null);
    const { error } = await supabase
      .from("profiles")
      .update({ [key]: nextValue })
      .eq("id", userId);
    if (error) {
      setStatus(error.message || "Could not update reviews setting.");
    } else {
      if (key === "reviews_from_employees_enabled") {
        setReviewsFromEmployeesEnabled(nextValue);
      } else if (key === "reviews_from_employers_enabled") {
        setReviewsFromEmployersEnabled(nextValue);
      } else {
        setReviewsFromCustomersEnabled(nextValue);
      }
      setStatus("Review settings updated.");
    }
    setSavingKey(null);
  };

  const handleLanguageChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (!userId) return;
    const nextValue = event.target.value;
    setLanguageCode(nextValue);
    setLanguageSaving(true);
    setLanguageStatus(null);
    const { error } = await supabase
      .from("profiles")
      .update({ language_code: nextValue === "auto" ? null : nextValue })
      .eq("id", userId);
    if (error) {
      setLanguageStatus(error.message || "Could not update language.");
    } else {
      setLanguageStatus("Language updated.");
    }
    setLanguageSaving(false);
  };

  return (
    <div
      className="nyt-main"
      style={{
        maxWidth: 900,
        margin: "32px auto",
        padding: "0 16px",
        display: "grid",
        justifyItems: "center",
      }}
    >
      {loading ? (
        <div style={{ fontSize: 14, opacity: 0.7 }}>Loading settings...</div>
      ) : !userId ? (
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          Log in to manage your settings.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, width: "100%" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Language
            </div>
            <div style={{ fontSize: 14, opacity: 0.75 }}>
              Choose your language.
            </div>
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid var(--rule-light)",
                background: "rgba(255, 241, 226, 0.8)",
              }}
            >
              <div
                className="settings-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                }}
              >
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      Language
                    </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Auto uses your browser language.
                    {browserLanguageLabel
                      ? ` (${browserLanguageLabel})`
                      : ""}
                  </div>
                </div>
                <select
                  value={languageCode}
                  onChange={handleLanguageChange}
                  disabled={languageSaving}
                  className="settings-language-select"
                  style={{
                    border: "1px solid var(--rule-strong)",
                    background: "var(--paper)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    cursor: languageSaving ? "not-allowed" : "pointer",
                    color: "var(--ink)",
                    minWidth: 200,
                  }}
                >
                  <option value="auto">Auto (Browser)</option>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {languageStatus && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {languageStatus}
              </div>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Reviews
            </div>
            <div style={{ fontSize: 14, opacity: 0.75 }}>
              Choose who can leave reviews on your profile.
            </div>
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid var(--rule-light)",
                background: "rgba(255, 241, 226, 0.8)",
              }}
            >
              {accountType === "business" ? (
                <>
                  <div
                    className="settings-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Employee Reviews
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Allow employees to review your business.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateReviewSetting(
                          "reviews_from_employees_enabled",
                          !reviewsFromEmployeesEnabled
                        )
                      }
                      disabled={Boolean(savingKey)}
                      style={{
                        border: "1px solid var(--rule-strong)",
                        background: "var(--paper)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: savingKey ? "not-allowed" : "pointer",
                        color: "var(--ink)",
                        width: "fit-content",
                        opacity: savingKey ? 0.6 : 1,
                      }}
                    >
                      {reviewsFromEmployeesEnabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="settings-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Employer Reviews
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Allow businesses to review your work.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateReviewSetting(
                          "reviews_from_employers_enabled",
                          !reviewsFromEmployersEnabled
                        )
                      }
                      disabled={Boolean(savingKey)}
                      style={{
                        border: "1px solid var(--rule-strong)",
                        background: "var(--paper)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: savingKey ? "not-allowed" : "pointer",
                        color: "var(--ink)",
                        width: "fit-content",
                        opacity: savingKey ? 0.6 : 1,
                      }}
                    >
                      {reviewsFromEmployersEnabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                  <div
                    className="settings-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderTop: "1px solid var(--rule-light)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Customer Service Reviews
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Allow customers to review your service.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateReviewSetting(
                          "reviews_from_customers_enabled",
                          !reviewsFromCustomersEnabled
                        )
                      }
                      disabled={Boolean(savingKey)}
                      style={{
                        border: "1px solid var(--rule-strong)",
                        background: "var(--paper)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: savingKey ? "not-allowed" : "pointer",
                        color: "var(--ink)",
                        width: "fit-content",
                        opacity: savingKey ? 0.6 : 1,
                      }}
                    >
                      {reviewsFromCustomersEnabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                </>
              )}
              <div
                className="settings-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop:
                    accountType === "business"
                      ? "1px solid var(--rule-light)"
                      : "1px solid var(--rule-light)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Open Reviews
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    View public feedback and ratings.
                  </div>
                </div>
                <Link
                  href="/reviews"
                  style={{
                    border: "1px solid var(--accent-strong)",
                    background: "var(--accent-strong)",
                    color: "#fff7ef",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    width: "fit-content",
                  }}
                >
                  Open
                </Link>
              </div>
            </div>
            {status && <div style={{ fontSize: 12, opacity: 0.7 }}>{status}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
