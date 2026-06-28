"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfilPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({
    taskSelesai: 0,
    totalExp: 0,
    level: 1,
    saldo: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Ambil user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setUser(session.user);

    const userId = session.user.id;

    // Ambil profil
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
      setUsername(profileData.username || "");
      setBio(profileData.bio || "");
    }

    // Ambil stats task selesai
    const { count: taskCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "selesai");

    // Ambil stats keuangan (saldo)
    const { data: transaksi } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", userId);

    let saldo = 0;
    if (transaksi) {
      transaksi.forEach((t) => {
        if (t.type === "pemasukan") saldo += t.amount;
        else saldo -= t.amount;
      });
    }

    setStats({
      taskSelesai: taskCount || 0,
      totalExp: profileData?.total_exp || 0,
      level: profileData?.level || 1,
      saldo,
    });

    setLoading(false);
  };

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);

    const res = await fetch("/api/upload-avatar", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (result.success) {
      setProfile((prev) => ({ ...prev, avatar_url: result.avatarUrl }));
      setMessage("Foto profil berhasil diperbarui!");
    } else {
      setMessage("Gagal upload foto: " + result.error);
    }

    setUploading(false);
  };

  const handleSaveProfil = async () => {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage("Gagal menyimpan profil.");
    } else {
      setProfile((prev) => ({ ...prev, username, bio }));
      setMessage("Profil berhasil disimpan!");
      setEditMode(false);
    }

    setSaving(false);
  };

  const getLevelName = (level) => {
    if (level >= 5) return "Master";
    if (level === 4) return "Expert";
    if (level === 3) return "Journeyman";
    if (level === 2) return "Apprentice";
    return "Pemula";
  };

  const getExpForNextLevel = (level) => {
    const thresholds = [0, 100, 250, 500, 900];
    return thresholds[Math.min(level, 4)];
  };

  const expProgress = Math.min(
    (stats.totalExp / getExpForNextLevel(stats.level)) * 100,
    100,
  );

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "#555", fontSize: "14px" }}>
        Memuat profil...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "680px" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#f0f0f0" }}>
          Profil
        </h1>
        <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
          Informasi akun dan ringkasan aktivitas kamu
        </p>
      </div>

      {/* Notifikasi */}
      {message && (
        <div
          style={{
            background: message.includes("Gagal") ? "#1a0a0a" : "#0d2010",
            border: `1px solid ${message.includes("Gagal") ? "#3a1a1a" : "#1a3a1a"}`,
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "1.25rem",
            fontSize: "13px",
            color: message.includes("Gagal") ? "#f87171" : "#22c55e",
          }}
        >
          {message}
        </div>
      )}

      {/* Kartu Profil */}
      <div
        style={{
          background: "#0f0f0f",
          border: "1px solid #1e1e1e",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#1a0d2e",
                border: "2px solid #2d1b4e",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
              }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                "👤"
              )}
            </div>

            {/* Tombol upload */}
            <label
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "26px",
                height: "26px",
                background: "#a855f7",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: "13px",
                border: "2px solid #0f0f0f",
              }}
            >
              {uploading ? "⏳" : "📷"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUploadFoto}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Info profil */}
          <div style={{ flex: 1 }}>
            {editMode ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username kamu"
                  style={{
                    background: "#141414",
                    border: "1px solid #2d1b4e",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "14px",
                    color: "#f0f0f0",
                    outline: "none",
                  }}
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Bio singkat kamu..."
                  rows={3}
                  style={{
                    background: "#141414",
                    border: "1px solid #2d1b4e",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "#f0f0f0",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleSaveProfil}
                    disabled={saving}
                    style={{
                      background: "#a855f7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "7px 16px",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      background: "transparent",
                      color: "#888",
                      border: "1px solid #1e1e1e",
                      borderRadius: "8px",
                      padding: "7px 16px",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#f0f0f0",
                    marginBottom: "4px",
                  }}
                >
                  {profile?.username || user?.email}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#555",
                    marginBottom: "10px",
                  }}
                >
                  {profile?.bio ||
                    "Belum ada bio. Klik edit untuk menambahkan."}
                </div>
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    background: "#1a0d2e",
                    color: "#a855f7",
                    border: "1px solid #2d1b4e",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  ✏️ Edit Profil
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Level & EXP bar */}
        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid #1a1a1a",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  background: "#1a0d2e",
                  color: "#a855f7",
                  border: "1px solid #2d1b4e",
                  borderRadius: "6px",
                  padding: "2px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Lv {stats.level}
              </span>
              <span style={{ fontSize: "13px", color: "#888" }}>
                {getLevelName(stats.level)}
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "#555" }}>
              {stats.totalExp} / {getExpForNextLevel(stats.level)} XP
            </span>
          </div>
          <div
            style={{
              height: "6px",
              background: "#1a1a1a",
              borderRadius: "99px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${expProgress}%`,
                background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                borderRadius: "99px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Widget Statistik */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
        }}
      >
        {[
          { label: "Task Selesai", value: stats.taskSelesai, icon: "✅" },
          { label: "Total EXP", value: `${stats.totalExp} XP`, icon: "⚡" },
          {
            label: "Saldo",
            value: `Rp ${stats.saldo.toLocaleString("id-ID")}`,
            icon: "💰",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#0f0f0f",
              border: "1px solid #1e1e1e",
              borderRadius: "10px",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>
              {stat.icon}
            </div>
            <div
              style={{ fontSize: "15px", fontWeight: "600", color: "#f0f0f0" }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "11px", color: "#555", marginTop: "3px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
