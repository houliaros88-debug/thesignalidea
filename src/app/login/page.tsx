"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
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
        window.location.assign("/");
      } else {
        setStatus("Check your email to confirm your account.");
      }
    }

    setLoading(false);
  };

  return (
    <div
      className="nyt-main"
      style={{
        maxWidth: 980,
        margin: "32px auto",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "stretch",
          }}
        >
        <div
          style={{
            minHeight: 420,
            border: "1px solid #111",
            padding: "28px",
            borderRadius: 10,
            background:
              "linear-gradient(160deg, #f8f3ea 0%, #efe6d7 100%)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            The Signal Idea
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#2f2a24",
              marginBottom: 18,
              lineHeight: 1.6,
            }}
          >
            A platform for bold ideas, early signals, and real momentum. Share
            your vision, earn support, and compete when your category reaches
            the threshold.
          </div>
          <div style={{ fontSize: 13, color: "#2f2a24", lineHeight: 1.8 }}>
            Submit ideas across categories
            <br />
            Signal support before voting starts
            <br />
            Build visibility without pay to win
            <br />
            Compete for the prize pool
          </div>
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: "1px solid #cdbfa7",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6c5b45",
            }}
          >
            Ideas. Signals. Momentum.
          </div>
        </div>

        <div
          style={{
            minHeight: 420,
            border: "1px solid #111",
            padding: "28px",
            borderRadius: 10,
            background: "#fbf8f2",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 16,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                border: "1px solid #111",
                background: mode === "login" ? "#111" : "transparent",
                color: mode === "login" ? "#fff" : "#111",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                border: "1px solid #111",
                background: mode === "signup" ? "#111" : "transparent",
                color: mode === "signup" ? "#fff" : "#111",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Sign Up
            </button>
          </div>

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
                  border: "1px solid #111",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 16,
                  background: "#f3eee6",
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
              border: "1px solid #111",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
              background: "#f3eee6",
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
              border: "1px solid #111",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
              background: "#f3eee6",
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
                  border: "1px solid #111",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 16,
                  background: "#f3eee6",
                }}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              padding: "12px 12px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        {status && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#222" }}>
            {status}
          </div>
        )}
        </div>
      </div>
      </div>
    </div>
  );
}
