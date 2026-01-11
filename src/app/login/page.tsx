"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"private" | "business">(
    "private"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    if (mode === "signup") {
      const hasLetter = /[A-Za-z]/.test(password);
      const hasNumber = /\d/.test(password);
      if (password.length < 8) {
        setStatus("Password must be at least 8 characters.");
        setLoading(false);
        return;
      }
      if (!hasLetter || !hasNumber) {
        setStatus("Password must include at least one letter and one number.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setStatus("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    const action =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                account_type: accountType,
              },
            },
          });

    const { error } = await action;
    if (error) {
      setStatus(error.message);
    } else {
      if (mode === "login") {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const meta = userData.user.user_metadata ?? {};
          await supabase.from("profiles").upsert({
            id: userData.user.id,
            full_name: meta.full_name || meta.name || userData.user.email,
            bio: meta.bio || "",
            photo_url: meta.photo_url || meta.avatar_url || null,
            account_type: meta.account_type || "private",
            updated_at: new Date().toISOString(),
          });
        }
        const nextPath =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("next")
            : null;
        const target =
          nextPath && nextPath.startsWith("/") && nextPath !== "/login"
            ? nextPath
            : "/";
        router.replace(target);
      } else {
        setStatus("Check your email to confirm your account.");
      }
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        margin: "-32px 0",
        padding: "48px 16px 56px",
        boxSizing: "border-box",
        background: "transparent",
        color: "var(--ink)",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      <div
        style={{
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 520px)",
            gap: 8,
            alignItems: "stretch",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              minHeight: 520,
              border: "1px solid var(--rule-light)",
              padding: "32px",
              borderRadius: 18,
              background: "rgba(253, 247, 239, 0.72)",
              boxShadow: "0 18px 45px rgba(61, 47, 40, 0.16)",
              width: "100%",
              order: 1,
              backdropFilter: "blur(10px)",
            }}
          >
            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
              <label
                htmlFor="fullName"
                style={{
                  display: "block",
                  fontSize: 12,
                  marginBottom: 6,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required={mode === "signup"}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 16,
                      background: "var(--paper)",
                      color: "var(--ink)",
                    }}
                  />
                  <label
                    htmlFor="accountType"
                    style={{
                      display: "block",
                      fontSize: 12,
                      marginBottom: 6,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "var(--ink)",
                    }}
                  >
                    Account type
                  </label>
                  <select
                    id="accountType"
                    value={accountType}
                    onChange={(event) =>
                      setAccountType(
                        event.target.value === "business"
                          ? "business"
                          : "private"
                      )
                    }
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 10,
                      background: "var(--paper)",
                      color: "var(--ink)",
                    }}
                  >
                    <option value="private">Private person</option>
                    <option value="business">Business</option>
                  </select>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(61, 47, 40, 0.7)",
                      marginBottom: 16,
                    }}
                  >
                    Business accounts post partner listings, not ideas.
                  </div>
                </>
              )}
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 12,
                  marginBottom: 6,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 16,
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />

              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 12,
                  marginBottom: 6,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 16,
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
              {mode === "signup" && (
                <>
                  <label
                    htmlFor="confirmPassword"
                    style={{
                      display: "block",
                      fontSize: 12,
                      marginBottom: 6,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "var(--ink)",
                    }}
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required={mode === "signup"}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 16,
                      background: "var(--paper)",
                      color: "var(--ink)",
                    }}
                  />
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  border: "none",
                  background: "var(--accent-strong)",
                  color: "#fff7ef",
                  padding: "12px 12px",
                  borderRadius: 999,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  boxShadow: "0 12px 30px rgba(168, 95, 59, 0.35)",
                }}
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Log In"
                    : "Sign Up"}
              </button>
            </form>

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--ink)",
                textAlign: "center",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setMode((prev) => (prev === "login" ? "signup" : "login"))
                }
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--accent-strong)",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {mode === "login" ? "Sign Up" : "Log In"}
              </button>
            </div>

            {status && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink)" }}>
                {status}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
