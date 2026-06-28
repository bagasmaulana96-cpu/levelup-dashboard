"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Password dan konfirmasi password tidak sama.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError("Gagal mendaftar. Email mungkin sudah digunakan.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "1rem" }}>✅</div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#f0f0f0",
              marginBottom: "8px",
            }}
          >
            Pendaftaran Berhasil!
          </h2>
          <p
            style={{ fontSize: "14px", color: "#888", marginBottom: "1.5rem" }}
          >
            Cek email kamu untuk konfirmasi akun, lalu login.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              background: "#a855f7",
              color: "#fff",
              borderRadius: "8px",
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: "500",
              textDecoration: "none",
            }}
          >
            Ke halaman login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "#1a0d2e",
              border: "1px solid #2d1b4e",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: "22px",
            }}
          >
            ⚡
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#f0f0f0" }}>
            LevelUp Dashboard
          </h1>
          <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            Buat akun baru
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#0f0f0f",
            border: "1px solid #1e1e1e",
            borderRadius: "16px",
            padding: "2rem",
          }}
        >
          <form onSubmit={handleRegister}>
            {/* Error */}
            {error && (
              <div
                style={{
                  background: "#1a0a0a",
                  border: "1px solid #3a1a1a",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "1.25rem",
                  fontSize: "13px",
                  color: "#f87171",
                }}
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#888",
                  marginBottom: "6px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                required
                style={{
                  width: "100%",
                  background: "#141414",
                  border: "1px solid #1e1e1e",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  color: "#f0f0f0",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#888",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  background: "#141414",
                  border: "1px solid #1e1e1e",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  color: "#f0f0f0",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>

            {/* Konfirmasi Password */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#888",
                  marginBottom: "6px",
                }}
              >
                Konfirmasi Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  background: "#141414",
                  border: "1px solid #1e1e1e",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  color: "#f0f0f0",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#2d1b4e" : "#a855f7",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "11px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </form>
        </div>

        {/* Link ke Login */}
        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "#555",
            marginTop: "1.25rem",
          }}
        >
          Sudah punya akun?{" "}
          <Link
            href="/login"
            style={{ color: "#a855f7", textDecoration: "none" }}
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
