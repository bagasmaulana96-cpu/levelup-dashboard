"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS_PENGELUARAN = [
  "#a855f7",
  "#7c3aed",
  "#6d28d9",
  "#5b21b6",
  "#4c1d95",
  "#8b5cf6",
];
const COLORS_PEMASUKAN = [
  "#22c55e",
  "#16a34a",
  "#15803d",
  "#166534",
  "#14532d",
  "#4ade80",
];

export default function KeuanganPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ringkasan");
  const [transaksi, setTransaksi] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterBulan, setFilterBulan] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Form transaksi
  const [formType, setFormType] = useState("pengeluaran");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);

  // Form kategori baru
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState("pengeluaran");
  const [newCatIcon, setNewCatIcon] = useState("📦");

  useEffect(() => {
    loadData();
  }, [filterBulan]);

  const loadData = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setUser(session.user);
    const userId = session.user.id;

    console.log("User ID:", userId);
    console.log("Filter bulan:", filterBulan);

    // Ambil transaksi bulan ini
    const startDate = `${filterBulan}-01`;
    const [year, month] = filterBulan.split("-");
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${filterBulan}-${lastDay}`;

    console.log("Start:", startDate, "End:", endDate);

    const { data: trx, error: trxError } = await supabase
      .from("transactions")
      .select("*, categories(name, icon)")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    console.log("Transaksi hasil query:", trx);
    console.log("Error:", trxError);

    if (trxError) console.error("Error fetch transaksi:", trxError.message);

    setTransaksi(trx || []);

    // Ambil kategori (global + milik user)
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("name");

    setCategories(cats || []);
    setLoading(false);
  };

  const handleTambahTransaksi = async () => {
    if (!formAmount || isNaN(formAmount) || Number(formAmount) <= 0) {
      setMessage("Nominal harus diisi dan lebih dari 0.");
      return;
    }
    if (!formCategory) {
      setMessage("Pilih kategori terlebih dahulu.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      category_id: formCategory,
      type: formType,
      amount: Number(formAmount),
      note: formNote,
      date: formDate,
    });

    if (error) {
      setMessage("Gagal menyimpan transaksi: " + error.message);
    } else {
      setMessage("Transaksi berhasil ditambahkan!");
      setFormAmount("");
      setFormNote("");
      setFormCategory("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setShowForm(false);
      await loadData();
    }

    setSaving(false);
  };

  const handleHapusTransaksi = async (id) => {
    if (!confirm("Hapus transaksi ini?")) return;
    await supabase.from("transactions").delete().eq("id", id);
    setMessage("Transaksi dihapus.");
    await loadData();
  };

  const handleTambahKategori = async () => {
    if (!newCatName.trim()) {
      setMessage("Nama kategori tidak boleh kosong.");
      return;
    }

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: newCatName,
      type: newCatType,
      icon: newCatIcon,
      is_default: false,
    });

    if (error) {
      setMessage("Gagal menambah kategori.");
    } else {
      setMessage("Kategori berhasil ditambahkan!");
      setNewCatName("");
      setNewCatIcon("📦");
      setShowCategoryForm(false);
      await loadData();
    }
  };

  // Hitung ringkasan
  const totalMasuk = transaksi
    .filter((t) => t.type === "pemasukan")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalKeluar = transaksi
    .filter((t) => t.type === "pengeluaran")
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalMasuk - totalKeluar;

  // Data grafik pengeluaran
  const dataPengeluaran = Object.values(
    transaksi
      .filter((t) => t.type === "pengeluaran")
      .reduce((acc, t) => {
        const name = t.categories?.name || "Lain-lain";
        if (!acc[name]) acc[name] = { name, value: 0 };
        acc[name].value += t.amount;
        return acc;
      }, {}),
  );

  // Data grafik pemasukan
  const dataPemasukan = Object.values(
    transaksi
      .filter((t) => t.type === "pemasukan")
      .reduce((acc, t) => {
        const name = t.categories?.name || "Lain-lain";
        if (!acc[name]) acc[name] = { name, value: 0 };
        acc[name].value += t.amount;
        return acc;
      }, {}),
  );

  const formatRupiah = (num) => "Rp " + Number(num).toLocaleString("id-ID");

  const filteredCats = categories.filter((c) => c.type === formType);
  const filteredNewCats = categories.filter((c) => c.type === newCatType);

  const TABS = ["ringkasan", "transaksi", "kategori"];

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "#555", fontSize: "14px" }}>
        Memuat data keuangan...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "720px" }}>
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
            Keuangan
          </h1>
          <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            Pencatat pemasukan & pengeluaran
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
          + Transaksi
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

      {/* Form Tambah Transaksi */}
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
            Tambah Transaksi
          </h3>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {/* Toggle Tipe */}
            <div style={{ display: "flex", gap: "6px" }}>
              {["pengeluaran", "pemasukan"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setFormType(t);
                    setFormCategory("");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: formType === t ? "500" : "400",
                    cursor: "pointer",
                    border: "none",
                    background:
                      formType === t
                        ? t === "pemasukan"
                          ? "#0d2010"
                          : "#1a0d2e"
                        : "#141414",
                    color:
                      formType === t
                        ? t === "pemasukan"
                          ? "#22c55e"
                          : "#a855f7"
                        : "#555",
                  }}
                >
                  {t === "pemasukan" ? "📈 Pemasukan" : "📉 Pengeluaran"}
                </button>
              ))}
            </div>

            {/* Nominal */}
            <input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="Nominal (Rp)"
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

            {/* Kategori */}
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: "8px",
                padding: "9px 12px",
                fontSize: "13px",
                color: formCategory ? "#f0f0f0" : "#555",
                outline: "none",
              }}
            >
              <option value="">Pilih kategori...</option>
              {filteredCats.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            {/* Keterangan */}
            <input
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Keterangan (opsional)"
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: "8px",
                padding: "9px 12px",
                fontSize: "13px",
                color: "#f0f0f0",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
              onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
            />

            {/* Tanggal */}
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={{
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

            {/* Tombol */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleTambahTransaksi}
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
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => setShowForm(false)}
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

      {/* Tab Navigasi */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.25rem" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? "#1a0d2e" : "transparent",
              color: activeTab === tab ? "#a855f7" : "#555",
              border: `1px solid ${activeTab === tab ? "#2d1b4e" : "#1e1e1e"}`,
              borderRadius: "99px",
              padding: "5px 16px",
              fontSize: "12px",
              fontWeight: activeTab === tab ? "500" : "400",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab === "ringkasan"
              ? "📊 Ringkasan"
              : tab === "transaksi"
                ? "🗂️ Riwayat"
                : "🏷️ Kategori"}
          </button>
        ))}
      </div>

      {/* =================== TAB RINGKASAN =================== */}
      {activeTab === "ringkasan" && (
        <div>
          {/* Filter Bulan */}
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="month"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "13px",
                color: "#f0f0f0",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Kartu Ringkasan */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              marginBottom: "1.5rem",
            }}
          >
            {[
              {
                label: "Total Masuk",
                value: formatRupiah(totalMasuk),
                color: "#22c55e",
                icon: "📈",
              },
              {
                label: "Total Keluar",
                value: formatRupiah(totalKeluar),
                color: "#f87171",
                icon: "📉",
              },
              {
                label: "Saldo Bersih",
                value: formatRupiah(saldo),
                color: saldo >= 0 ? "#22c55e" : "#f87171",
                icon: "💰",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#0f0f0f",
                  border: "1px solid #1e1e1e",
                  borderRadius: "10px",
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "20px", marginBottom: "6px" }}>
                  {item.icon}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: item.color,
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{ fontSize: "11px", color: "#555", marginTop: "3px" }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Grafik Donat */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {/* Grafik Pengeluaran */}
            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #1e1e1e",
                borderRadius: "10px",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#888",
                  marginBottom: "8px",
                }}
              >
                Pengeluaran per Kategori
              </div>
              {dataPengeluaran.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem 0",
                    color: "#333",
                    fontSize: "13px",
                  }}
                >
                  Belum ada data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dataPengeluaran}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {dataPengeluaran.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            COLORS_PENGELUARAN[i % COLORS_PENGELUARAN.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatRupiah(val)}
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #2d1b4e",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", color: "#888" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Grafik Pemasukan */}
            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #1e1e1e",
                borderRadius: "10px",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#888",
                  marginBottom: "8px",
                }}
              >
                Pemasukan per Sumber
              </div>
              {dataPemasukan.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem 0",
                    color: "#333",
                    fontSize: "13px",
                  }}
                >
                  Belum ada data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dataPemasukan}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {dataPemasukan.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS_PEMASUKAN[i % COLORS_PEMASUKAN.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatRupiah(val)}
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #1a3a1a",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", color: "#888" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================== TAB RIWAYAT =================== */}
      {activeTab === "transaksi" && (
        <div>
          {/* Filter Bulan */}
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="month"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              style={{
                background: "#141414",
                border: "1px solid #1e1e1e",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "13px",
                color: "#f0f0f0",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          {transaksi.length === 0 ? (
            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #1e1e1e",
                borderRadius: "12px",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>💸</div>
              <p style={{ color: "#555", fontSize: "14px" }}>
                Belum ada transaksi bulan ini.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {transaksi.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "#0f0f0f",
                    border: "1px solid #1e1e1e",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background:
                        t.type === "pemasukan" ? "#0d2010" : "#1a0d2e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {t.categories?.icon ||
                      (t.type === "pemasukan" ? "📈" : "📉")}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#f0f0f0",
                      }}
                    >
                      {t.categories?.name || "Lain-lain"}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#555",
                        marginTop: "2px",
                      }}
                    >
                      {t.note && `${t.note} · `}
                      {t.date}
                    </div>
                  </div>

                  {/* Nominal */}
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      flexShrink: 0,
                      color: t.type === "pemasukan" ? "#22c55e" : "#f87171",
                    }}
                  >
                    {t.type === "pemasukan" ? "+" : "-"}
                    {formatRupiah(t.amount)}
                  </div>

                  {/* Hapus */}
                  <button
                    onClick={() => handleHapusTransaksi(t.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid #1e1e1e",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      color: "#555",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================== TAB KATEGORI =================== */}
      {activeTab === "kategori" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <p style={{ fontSize: "13px", color: "#555" }}>
              Kelola kategori transaksi kamu
            </p>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
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
              + Kategori Baru
            </button>
          </div>

          {/* Form Kategori Baru */}
          {showCategoryForm && (
            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #2d1b4e",
                borderRadius: "12px",
                padding: "1.25rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  {["pengeluaran", "pemasukan"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewCatType(t)}
                      style={{
                        flex: 1,
                        padding: "7px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        cursor: "pointer",
                        border: "none",
                        background:
                          newCatType === t
                            ? t === "pemasukan"
                              ? "#0d2010"
                              : "#1a0d2e"
                            : "#141414",
                        color:
                          newCatType === t
                            ? t === "pemasukan"
                              ? "#22c55e"
                              : "#a855f7"
                            : "#555",
                      }}
                    >
                      {t === "pemasukan" ? "📈 Pemasukan" : "📉 Pengeluaran"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    placeholder="Icon"
                    style={{
                      width: "60px",
                      background: "#141414",
                      border: "1px solid #1e1e1e",
                      borderRadius: "8px",
                      padding: "9px",
                      fontSize: "18px",
                      color: "#f0f0f0",
                      outline: "none",
                      textAlign: "center",
                    }}
                  />
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nama kategori..."
                    style={{
                      flex: 1,
                      background: "#141414",
                      border: "1px solid #1e1e1e",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      fontSize: "13px",
                      color: "#f0f0f0",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
                    onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleTambahKategori}
                    style={{
                      background: "#a855f7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 20px",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setShowCategoryForm(false)}
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

          {/* List Kategori */}
          {["pengeluaran", "pemasukan"].map((type) => (
            <div key={type} style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "500",
                  color: "#3a3a3a",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "8px",
                }}
              >
                {type === "pemasukan" ? "📈 Pemasukan" : "📉 Pengeluaran"}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {categories
                  .filter((c) => c.type === type)
                  .map((cat) => (
                    <div
                      key={cat.id}
                      style={{
                        background: "#0f0f0f",
                        border: "1px solid #1e1e1e",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>{cat.icon}</span>
                      <span
                        style={{ fontSize: "13px", color: "#e0e0e0", flex: 1 }}
                      >
                        {cat.name}
                      </span>
                      {cat.is_default ? (
                        <span style={{ fontSize: "10px", color: "#3a3a3a" }}>
                          bawaan
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            if (!confirm("Hapus kategori ini?")) return;
                            await supabase
                              .from("categories")
                              .delete()
                              .eq("id", cat.id);
                            await loadData();
                          }}
                          style={{
                            background: "transparent",
                            border: "1px solid #1e1e1e",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            color: "#555",
                            cursor: "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
