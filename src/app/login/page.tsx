"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
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
        background: "#0b0b0b",
        color: "#f5f2ea",
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
              border: "none",
              padding: "32px",
              borderRadius: 10,
              background: "transparent",
              boxShadow: "none",
              width: "100%",
              order: 1,
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
                  color: "#f5f2ea",
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
                      background: "#101010",
                      color: "#f5f2ea",
                    }}
                  />
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
                  color: "#f5f2ea",
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
                  background: "#101010",
                  color: "#f5f2ea",
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
                  color: "#f5f2ea",
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
                  background: "#101010",
                  color: "#f5f2ea",
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
                      color: "#f5f2ea",
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
                      background: "#101010",
                      color: "#f5f2ea",
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
                  background: "transparent",
                  color: "#f5f2ea",
                  padding: "12px 12px",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
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
                color: "#f5f2ea",
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
                  color: "#f5f2ea",
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
              <div style={{ marginTop: 12, fontSize: 12, color: "#f5f2ea" }}>
                {status}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
