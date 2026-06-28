"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PRIORITAS_COLOR = {
  tinggi: { bg: "#1a0a0a", color: "#f87171", border: "#3a1a1a" },
  sedang: { bg: "#1a1200", color: "#f59e0b", border: "#2d2000" },
  rendah: { bg: "#0a1628", color: "#60a5fa", border: "#1a3050" },
};

const FILTER_OPTIONS = ["semua", "aktif", "selesai", "hari ini"];

export default function TodoPage() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [message, setMessage] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("sedang");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setUser(session.user);

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    setTasks(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("sedang");
    setDeadline("");
    setEditTask(null);
    setShowForm(false);
  };

  const handleOpenEdit = (task) => {
    setEditTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDeadline(task.deadline || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setMessage("Judul task tidak boleh kosong.");
      return;
    }

    setSaving(true);
    setMessage("");

    if (editTask) {
      // Update task
      const { error } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          priority,
          deadline: deadline || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editTask.id);

      if (error) {
        setMessage("Gagal menyimpan perubahan.");
      } else {
        setMessage("Task berhasil diperbarui!");
        await loadTasks();
        resetForm();
      }
    } else {
      // Tambah task baru
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title,
        description,
        priority,
        deadline: deadline || null,
        status: "aktif",
        exp_reward: 10,
      });

      if (error) {
        setMessage("Gagal menambah task.");
      } else {
        setMessage("Task berhasil ditambahkan!");
        await loadTasks();
        resetForm();
      }
    }

    setSaving(false);
  };

  const handleSelesai = async (task) => {
    if (task.status === "selesai") return;

    // Update status task
    await supabase
      .from("tasks")
      .update({
        status: "selesai",
        completed_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    // Ambil profil untuk hitung EXP
    const { data: profile } = await supabase
      .from("profiles")
      .select("level, total_exp")
      .eq("id", user.id)
      .single();

    if (profile) {
      const expGained = task.exp_reward || 10;
      const newExp = profile.total_exp + expGained;

      // Hitung level baru
      const thresholds = [0, 100, 250, 500, 900];
      let newLevel = 1;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (newExp >= thresholds[i]) {
          newLevel = i + 1;
          break;
        }
      }

      // Update EXP & level di profil
      await supabase
        .from("profiles")
        .update({ total_exp: newExp, level: newLevel })
        .eq("id", user.id);

      // Catat di exp_logs
      await supabase.from("exp_logs").insert({
        user_id: user.id,
        source: "task_complete",
        exp_gained: expGained,
        note: `Task selesai: ${task.title}`,
      });

      setMessage(`✅ Task selesai! +${expGained} XP`);
    }

    await loadTasks();
  };

  const handleHapus = async (taskId) => {
    if (!confirm("Hapus task ini?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (!error) {
      setMessage("Task berhasil dihapus.");
      await loadTasks();
    }
  };

  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null;
    const today = new Date().toISOString().split("T")[0];
    if (deadline < today) return "lewat";
    if (deadline === today) return "hari ini";
    return "akan datang";
  };

  const filteredTasks = tasks.filter((task) => {
    const today = new Date().toISOString().split("T")[0];
    if (filter === "aktif") return task.status === "aktif";
    if (filter === "selesai") return task.status === "selesai";
    if (filter === "hari ini") return task.deadline === today;
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "#555", fontSize: "14px" }}>
        Memuat tasks...
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
            To-Do List
          </h1>
          <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            {tasks.filter((t) => t.status === "aktif").length} task aktif
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
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
          + Tambah Task
        </button>
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

      {/* Form Tambah/Edit */}
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
            {editTask ? "Edit Task" : "Tambah Task Baru"}
          </h3>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {/* Judul */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul task..."
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

            {/* Deskripsi */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi (opsional)..."
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

            <div style={{ display: "flex", gap: "10px" }}>
              {/* Prioritas */}
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#141414",
                    border: "1px solid #1e1e1e",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    fontSize: "13px",
                    color: "#f0f0f0",
                    outline: "none",
                  }}
                >
                  <option value="tinggi">🔴 Tinggi</option>
                  <option value="sedang">🟡 Sedang</option>
                  <option value="rendah">🔵 Rendah</option>
                </select>
              </div>

              {/* Deadline */}
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#141414",
                    border: "1px solid #1e1e1e",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    fontSize: "13px",
                    color: "#f0f0f0",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                />
              </div>
            </div>

            {/* Tombol */}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={handleSave}
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
                {saving
                  ? "Menyimpan..."
                  : editTask
                    ? "Simpan Perubahan"
                    : "Tambah"}
              </button>
              <button
                onClick={resetForm}
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

      {/* Filter */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#1a0d2e" : "transparent",
              color: filter === f ? "#a855f7" : "#555",
              border: `1px solid ${filter === f ? "#2d1b4e" : "#1e1e1e"}`,
              borderRadius: "99px",
              padding: "5px 14px",
              fontSize: "12px",
              fontWeight: filter === f ? "500" : "400",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List Task */}
      {filteredTasks.length === 0 ? (
        <div
          style={{
            background: "#0f0f0f",
            border: "1px solid #1e1e1e",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
          <p style={{ color: "#555", fontSize: "14px" }}>
            {filter === "semua"
              ? "Belum ada task. Tambah yang pertama!"
              : `Tidak ada task ${filter}.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredTasks.map((task) => {
            const deadlineStatus = getDeadlineStatus(task.deadline);
            const isSelesai = task.status === "selesai";
            const p = PRIORITAS_COLOR[task.priority];

            return (
              <div
                key={task.id}
                style={{
                  background: "#0f0f0f",
                  border: `1px solid ${isSelesai ? "#1a1a1a" : "#1e1e1e"}`,
                  borderRadius: "10px",
                  padding: "12px 14px",
                  opacity: isSelesai ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleSelesai(task)}
                    disabled={isSelesai}
                    style={{
                      width: "20px",
                      height: "20px",
                      flexShrink: 0,
                      borderRadius: "6px",
                      marginTop: "1px",
                      background: isSelesai ? "#1a0d2e" : "transparent",
                      border: `2px solid ${isSelesai ? "#a855f7" : "#333"}`,
                      cursor: isSelesai ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      color: "#a855f7",
                    }}
                  >
                    {isSelesai ? "✓" : ""}
                  </button>

                  {/* Konten */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: isSelesai ? "#555" : "#f0f0f0",
                        textDecoration: isSelesai ? "line-through" : "none",
                        marginBottom: "4px",
                      }}
                    >
                      {task.title}
                    </div>

                    {task.description && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#555",
                          marginBottom: "6px",
                        }}
                      >
                        {task.description}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {/* Badge prioritas */}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "500",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: p.bg,
                          color: p.color,
                          border: `1px solid ${p.border}`,
                        }}
                      >
                        {task.priority}
                      </span>

                      {/* Badge deadline */}
                      {task.deadline && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background:
                              deadlineStatus === "lewat"
                                ? "#1a0a0a"
                                : deadlineStatus === "hari ini"
                                  ? "#1a1200"
                                  : "#0f0f0f",
                            color:
                              deadlineStatus === "lewat"
                                ? "#f87171"
                                : deadlineStatus === "hari ini"
                                  ? "#f59e0b"
                                  : "#555",
                            border: `1px solid ${
                              deadlineStatus === "lewat"
                                ? "#3a1a1a"
                                : deadlineStatus === "hari ini"
                                  ? "#2d2000"
                                  : "#1e1e1e"
                            }`,
                          }}
                        >
                          📅 {task.deadline}
                          {deadlineStatus === "lewat" && " (lewat)"}
                          {deadlineStatus === "hari ini" && " (hari ini)"}
                        </span>
                      )}

                      {/* EXP reward */}
                      {!isSelesai && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#a855f7",
                            marginLeft: "auto",
                          }}
                        >
                          +{task.exp_reward} XP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol aksi */}
                  {!isSelesai && (
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleOpenEdit(task)}
                        style={{
                          background: "transparent",
                          border: "1px solid #1e1e1e",
                          borderRadius: "6px",
                          padding: "5px 8px",
                          fontSize: "12px",
                          color: "#888",
                          cursor: "pointer",
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleHapus(task.id)}
                        style={{
                          background: "transparent",
                          border: "1px solid #1e1e1e",
                          borderRadius: "6px",
                          padding: "5px 8px",
                          fontSize: "12px",
                          color: "#888",
                          cursor: "pointer",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
