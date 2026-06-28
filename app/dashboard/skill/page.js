"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const LEVEL_CONFIG = [
  { level: 1, name: "Pemula", minExp: 0, maxExp: 100 },
  { level: 2, name: "Apprentice", minExp: 100, maxExp: 250 },
  { level: 3, name: "Journeyman", minExp: 250, maxExp: 500 },
  { level: 4, name: "Expert", minExp: 500, maxExp: 900 },
  { level: 5, name: "Master", minExp: 900, maxExp: 9999 },
];

function getLevelInfo(totalExp) {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (totalExp >= LEVEL_CONFIG[i].minExp) {
      const config = LEVEL_CONFIG[i];
      const expInLevel = totalExp - config.minExp;
      const expNeeded = config.maxExp - config.minExp;
      const progress = Math.min((expInLevel / expNeeded) * 100, 100);
      return { ...config, expInLevel, expNeeded, progress };
    }
  }
  return { ...LEVEL_CONFIG[0], expInLevel: 0, expNeeded: 100, progress: 0 };
}

function getExpPerSesi(level) {
  return 10 * level;
}

function getBadgeColor(levelName) {
  const colors = {
    Pemula: { bg: "#0a1628", color: "#60a5fa", border: "#1a3050" },
    Apprentice: { bg: "#1a0d2e", color: "#a855f7", border: "#2d1b4e" },
    Journeyman: { bg: "#0d2010", color: "#22c55e", border: "#1a3a1a" },
    Expert: { bg: "#1a1200", color: "#f59e0b", border: "#2d2000" },
    Master: { bg: "#1a0a0a", color: "#f87171", border: "#3a1a1a" },
  };
  return colors[levelName] || colors.Pemula;
}

export default function SkillPage() {
  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [claimingId, setClaimingId] = useState(null);

  // Form tambah skill
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSkills();
  }, []);

  // Auto-reset claimed_today saat tengah malam
  useEffect(() => {
    const checkReset = () => {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
      setTimeout(async () => {
        await resetDailyClaims();
        await loadSkills();
      }, msUntilMidnight);
    };
    checkReset();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setUser(session.user);

    const { data } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    // Reset claimed_today jika last_claim_date bukan hari ini
    const today = new Date().toISOString().split("T")[0];
    const skillsWithReset = (data || []).map((skill) => ({
      ...skill,
      claimed_today:
        skill.last_claim_date === today ? skill.claimed_today : false,
    }));

    setSkills(skillsWithReset);
    setLoading(false);
  };

  const resetDailyClaims = async () => {
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("skills")
      .update({ claimed_today: false })
      .lt("last_claim_date", today);
  };

  const handleTambahSkill = async () => {
    if (!skillName.trim()) {
      setMessage("Nama skill tidak boleh kosong.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("skills").insert({
      user_id: user.id,
      name: skillName,
      description: skillDesc,
      level: 1,
      total_exp: 0,
      current_exp: 0,
      streak_count: 0,
      claimed_today: false,
    });

    if (error) {
      setMessage("Gagal menambah skill: " + error.message);
    } else {
      setMessage("Skill berhasil ditambahkan!");
      setSkillName("");
      setSkillDesc("");
      setShowForm(false);
      await loadSkills();
    }

    setSaving(false);
  };

  const handleKlaimEXP = async (skill) => {
    if (skill.claimed_today) return;
    setClaimingId(skill.id);
    setMessage("");

    const today = new Date().toISOString().split("T")[0];
    const levelInfo = getLevelInfo(skill.total_exp);
    const currentLevel = levelInfo.level;

    // Hitung EXP yang didapat
    let expGained = getExpPerSesi(currentLevel);

    // Bonus streak >= 7 hari
    const isStreakBonus = skill.streak_count >= 6;
    if (isStreakBonus) expGained += 5;

    // Hitung streak baru
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const isConsecutive = skill.last_claim_date === yesterdayStr;
    const newStreak = isConsecutive ? skill.streak_count + 1 : 1;

    // Hitung EXP & level baru
    const newTotalExp = skill.total_exp + expGained;
    const newLevelInfo = getLevelInfo(newTotalExp);
    const newLevel = newLevelInfo.level;
    const newCurrentExp = newTotalExp - newLevelInfo.minExp;

    // Update skill
    const { error } = await supabase
      .from("skills")
      .update({
        total_exp: newTotalExp,
        current_exp: newCurrentExp,
        level: newLevel,
        streak_count: newStreak,
        last_claim_date: today,
        claimed_today: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", skill.id);

    if (error) {
      setMessage("Gagal klaim EXP: " + error.message);
      setClaimingId(null);
      return;
    }

    // Catat di exp_logs
    await supabase.from("exp_logs").insert({
      user_id: user.id,
      skill_id: skill.id,
      source: "skill_claim",
      exp_gained: expGained,
      note: `Belajar ${skill.name}${isStreakBonus ? " + bonus streak" : ""}`,
    });

    // Update total EXP di profil
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_exp, level")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newProfileExp = profile.total_exp + expGained;
      const thresholds = [0, 100, 250, 500, 900];
      let newProfileLevel = 1;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (newProfileExp >= thresholds[i]) {
          newProfileLevel = i + 1;
          break;
        }
      }
      await supabase
        .from("profiles")
        .update({ total_exp: newProfileExp, level: newProfileLevel })
        .eq("id", user.id);
    }

    let msg = `⚡ +${expGained} XP untuk ${skill.name}!`;
    if (isStreakBonus) msg += " 🔥 Bonus streak +5 XP!";
    if (newLevel > currentLevel)
      msg += ` 🎉 LEVEL UP! Sekarang ${newLevelInfo.name}!`;
    setMessage(msg);

    await loadSkills();
    setClaimingId(null);
  };

  const handleHapusSkill = async (skillId) => {
    if (!confirm("Hapus skill ini? Semua EXP akan hilang.")) return;
    await supabase.from("skills").delete().eq("id", skillId);
    setMessage("Skill dihapus.");
    await loadSkills();
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "#555", fontSize: "14px" }}>
        Memuat skill...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "680px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#f0f0f0" }}>
            Skill RPG
          </h1>
          <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            {skills.length} skill ·{" "}
            {skills.filter((s) => s.claimed_today).length} sudah belajar hari
            ini
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "#a855f7",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          + Tambah Skill
        </button>
      </div>

      {/* Notifikasi */}
      {message && (
        <div
          style={{
            background: message.includes("Gagal") ? "#1a0a0a" : "#0f0820",
            border: `1px solid ${message.includes("Gagal") ? "#3a1a1a" : "#2d1b4e"}`,
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "1.25rem",
            fontSize: "13px",
            color: message.includes("Gagal") ? "#f87171" : "#a855f7",
          }}
        >
          {message}
        </div>
      )}

      {/* Form Tambah Skill */}
      {showForm && (
        <div
          style={{
            background: "#0f0f0f",
            border: "1px solid #2d1b4e",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#f0f0f0",
              marginBottom: "1rem",
            }}
          >
            Tambah Skill Baru
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <input
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="Nama skill (contoh: Next.js, Gitar, Desain)"
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: "8px",
                padding: "9px 12px",
                fontSize: "14px",
                color: "#f0f0f0",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
              onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
            />
            <textarea
              value={skillDesc}
              onChange={(e) => setSkillDesc(e.target.value)}
              placeholder="Deskripsi singkat (opsional)"
              rows={2}
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: "8px",
                padding: "9px 12px",
                fontSize: "13px",
                color: "#f0f0f0",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
              onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleTambahSkill}
                disabled={saving}
                style={{
                  background: saving ? "#2d1b4e" : "#a855f7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Menyimpan..." : "Tambah"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSkillName("");
                  setSkillDesc("");
                }}
                style={{
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #1e1e1e",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info EXP System */}
      <div
        style={{
          background: "#0f0820",
          border: "1px solid #2d1b4e",
          borderRadius: "10px",
          padding: "10px 14px",
          marginBottom: "1.25rem",
          fontSize: "12px",
          color: "#888",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <span>⚡ EXP/sesi = 10 × level skill</span>
        <span>🔥 Streak ≥ 7 hari = +5 XP bonus</span>
        <span>🌙 EXP harian reset tiap tengah malam</span>
      </div>

      {/* List Skill */}
      {skills.length === 0 ? (
        <div
          style={{
            background: "#0f0f0f",
            border: "1px solid #1e1e1e",
            borderRadius: "12px",
            padding: "3rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>⚡</div>
          <p style={{ color: "#555", fontSize: "14px", marginBottom: "4px" }}>
            Belum ada skill. Tambah skill pertamamu!
          </p>
          <p style={{ color: "#333", fontSize: "12px" }}>
            Contoh: Next.js, Gitar, Bahasa Inggris, Desain
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {skills.map((skill) => {
            const levelInfo = getLevelInfo(skill.total_exp);
            const badgeColor = getBadgeColor(levelInfo.name);
            const expPerSesi = getExpPerSesi(levelInfo.level);
            const isClaimed = skill.claimed_today;
            const isClaiming = claimingId === skill.id;
            const isMaxLevel = levelInfo.level >= 5;

            return (
              <div
                key={skill.id}
                style={{
                  background: "#0f0f0f",
                  border: `1px solid ${isClaimed ? "#2d1b4e" : "#1e1e1e"}`,
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                }}
              >
                {/* Baris atas */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#f0f0f0",
                        }}
                      >
                        {skill.name}
                      </span>

                      {/* Badge level */}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "500",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: badgeColor.bg,
                          color: badgeColor.color,
                          border: `1px solid ${badgeColor.border}`,
                        }}
                      >
                        Lv {levelInfo.level} · {levelInfo.name}
                      </span>

                      {/* Streak */}
                      {skill.streak_count > 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#f59e0b",
                          }}
                        >
                          🔥 {skill.streak_count} hari
                        </span>
                      )}
                    </div>

                    {skill.description && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#555",
                          marginTop: "3px",
                        }}
                      >
                        {skill.description}
                      </div>
                    )}
                  </div>

                  {/* Tombol hapus */}
                  <button
                    onClick={() => handleHapusSkill(skill.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid #1e1e1e",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      color: "#555",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  >
                    🗑️
                  </button>
                </div>

                {/* Progress bar EXP */}
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                    }}
                  >
                    <span>
                      {isMaxLevel
                        ? "MAX LEVEL"
                        : `${levelInfo.expInLevel} / ${levelInfo.expNeeded} XP`}
                    </span>
                    <span>Total: {skill.total_exp} XP</span>
                  </div>
                  <div
                    style={{
                      height: "5px",
                      background: "#1a1a1a",
                      borderRadius: "99px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${isMaxLevel ? 100 : levelInfo.progress}%`,
                        background: isClaimed
                          ? "linear-gradient(90deg, #7c3aed, #a855f7)"
                          : "linear-gradient(90deg, #333, #444)",
                        borderRadius: "99px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Tombol klaim EXP */}
                <button
                  onClick={() => handleKlaimEXP(skill)}
                  disabled={isClaimed || isClaiming}
                  style={{
                    width: "100%",
                    background: isClaimed ? "#1a1a1a" : "#1a0d2e",
                    color: isClaimed ? "#333" : "#a855f7",
                    border: `1px solid ${isClaimed ? "#222" : "#2d1b4e"}`,
                    borderRadius: "8px",
                    padding: "9px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: isClaimed || isClaiming ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isClaimed && !isClaiming) {
                      e.currentTarget.style.background = "#2d1b4e";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isClaimed && !isClaiming) {
                      e.currentTarget.style.background = "#1a0d2e";
                    }
                  }}
                >
                  {isClaiming
                    ? "⏳ Memproses..."
                    : isClaimed
                      ? "✓ Sudah belajar hari ini"
                      : `⚡ Saya belajar hari ini (+${expPerSesi} XP${skill.streak_count >= 6 ? " +5 bonus" : ""})`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
