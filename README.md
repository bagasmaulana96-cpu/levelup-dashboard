# ⚡ LevelUp Dashboard

> Aplikasi produktivitas personal berbasis web yang menggabungkan manajemen tugas, pencatatan keuangan, dan sistem leveling bergaya RPG — dibangun dengan Next.js, Supabase, dan LocalStack S3.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![LocalStack](https://img.shields.io/badge/LocalStack-S3-FF9900?logo=amazon-aws)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

---

## 📋 Deskripsi Proyek

**LevelUp Dashboard** adalah aplikasi produktivitas personal yang dirancang untuk membantu pengguna mengatur jadwal, mencatat keuangan, dan termotivasi belajar skill baru melalui sistem gamifikasi RPG. Foto profil pengguna disimpan di **Amazon S3 via LocalStack** (emulator cloud lokal), memenuhi persyaratan penggunaan layanan AWS pada tugas ini.

---

## ✨ Fitur Utama

### 👤 Profil Personal
- Nama, bio singkat, dan foto profil
- **Foto profil diunggah ke S3 bucket LocalStack** — URL disimpan ke Supabase
- Widget ringkasan: level saat ini, EXP hari ini, saldo, dan task selesai

### ✅ To-Do List
- Tambah, edit, hapus, dan centang task
- Deadline per task dengan indikator warna (merah = lewat, kuning = hari ini)
- Filter: Semua / Aktif / Selesai / Hari ini
- Centang task → otomatis memberi EXP ke sistem level

### 💰 Pencatat Keuangan
- Input pemasukan dengan keterangan sumber dan tanggal
- Input pengeluaran dengan kategori (Jajan, Pembayaran, Iuran, Nabung, Lain-lain)
- Tambah kategori custom untuk pemasukan maupun pengeluaran
- Grafik donat breakdown pemasukan & pengeluaran (Recharts)
- Ringkasan: total masuk, total keluar, saldo bersih
- Riwayat transaksi dengan filter per bulan

### ⚡ Skill RPG / Level Up
- Tambah skill yang ingin dikuasai (contoh: Next.js, Gitar, Desain)
- Klaim EXP harian per skill dengan satu klik
- EXP per sesi = 10 × level skill + bonus streak 7 hari (+5 XP)
- Streak counter: berapa hari berturut-turut belajar
- Progress bar EXP menuju level berikutnya
- 10 level dengan title: Pemula → Apprentice → Journeyman → Expert → Master → ... → Ascendant

---

## 🛠️ Tech Stack

| Layer | Teknologi | Kegunaan |
|---|---|---|
| Frontend | Next.js 14 (App Router) | UI & routing |
| Styling | Tailwind CSS v4 | Dark purple design system |
| Komponen | Radix UI + Lucide Icons | Modal, toast, ikon |
| Database | Supabase (PostgreSQL) | Simpan semua data user |
| Auth | Supabase Auth | Login & register |
| File Storage | **LocalStack S3** | Upload foto profil |
| Grafik | Recharts | Donat chart keuangan |
| Language | TypeScript 5 | Type safety |

---

## 🚀 Cara Instalasi & Menjalankan

### Prasyarat

Pastikan sudah terinstal:
- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (untuk LocalStack)
- Akun [Supabase](https://supabase.com/) (gratis)

---

### Langkah 1 — Clone Repository

```bash
git clone https://github.com/USERNAME/levelup-dashboard.git
cd levelup-dashboard
```

### Langkah 2 — Install Dependensi

```bash
npm install
```

### Langkah 3 — Setup Supabase

1. Buka [supabase.com](https://supabase.com) → buat project baru
2. Pergi ke **SQL Editor** → jalankan SQL berikut:

```sql
-- Tabel profil user
create table profiles (
  id uuid references auth.users(id) primary key,
  name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Tabel task to-do
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  priority text default 'medium', -- low, medium, high
  deadline timestamptz,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Tabel kategori keuangan
create table finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- 'income' atau 'expense'
  is_default boolean default false
);

-- Isi kategori default
insert into finance_categories (user_id, name, type, is_default)
select id, unnest(array['Gaji','Freelance','Investasi','Hadiah','Lain-lain']), 'income', true from auth.users;

insert into finance_categories (user_id, name, type, is_default)
select id, unnest(array['Jajan','Pembayaran','Iuran','Nabung','Transportasi','Lain-lain']), 'expense', true from auth.users;

-- Tabel transaksi keuangan
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null, -- 'income' atau 'expense'
  amount numeric not null,
  category_id uuid references finance_categories(id),
  note text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Tabel skill RPG
create table skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  total_exp integer default 0,
  streak_days integer default 0,
  last_claimed_at timestamptz,
  created_at timestamptz default now()
);

-- RLS: aktifkan keamanan row-level
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table finance_categories enable row level security;
alter table transactions enable row level security;
alter table skills enable row level security;

-- Policy: user hanya bisa akses data sendiri
create policy "Users can manage own profile" on profiles for all using (auth.uid() = id);
create policy "Users can manage own tasks" on tasks for all using (auth.uid() = user_id);
create policy "Users can manage own categories" on finance_categories for all using (auth.uid() = user_id);
create policy "Users can manage own transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users can manage own skills" on skills for all using (auth.uid() = user_id);
```

3. Pergi ke **Settings → API** → salin `Project URL` dan `anon public key`

### Langkah 4 — Setup LocalStack S3

```bash
# Jalankan LocalStack via Docker
docker run -d \
  --name localstack \
  -p 4566:4566 \
  localstack/localstack

# Tunggu ~10 detik, lalu buat bucket
docker exec localstack awslocal s3 mb s3://levelup-profiles

# Verifikasi bucket berhasil dibuat
docker exec localstack awslocal s3 ls
```

### Langkah 5 — Konfigurasi Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` dan isi nilai yang sesuai:

```env
# Dari Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# LocalStack — nilai ini sudah benar, tidak perlu diubah
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566
S3_BUCKET_NAME=levelup-profiles
```

### Langkah 6 — Jalankan Aplikasi

```bash
npm run dev
```

Buka browser: **http://localhost:3000**

---

## 📁 Struktur Proyek

```
levelup-dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # Halaman login
│   │   └── register/page.tsx     # Halaman register
│   ├── dashboard/
│   │   ├── layout.tsx            # Layout sidebar
│   │   ├── page.tsx              # Profil & ringkasan
│   │   ├── todo/page.tsx         # To-Do List
│   │   ├── finance/page.tsx      # Pencatat Keuangan
│   │   └── skill/page.tsx        # Skill RPG
│   ├── api/
│   │   ├── upload-avatar/        # API Route upload foto ke S3
│   │   └── s3-health/            # API Route cek status LocalStack
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Supabase browser client
│   │   └── server.ts             # Supabase server client
│   ├── s3.ts                     # AWS S3 client (LocalStack)
│   └── exp.ts                    # Logika EXP & level RPG
├── components/
│   ├── sidebar.tsx               # Navigasi sidebar
│   ├── todo/                     # Komponen To-Do
│   ├── finance/                  # Komponen Keuangan
│   └── skill/                    # Komponen Skill RPG
├── .env.example                  # Template variabel environment
├── .env.local                    # Konfigurasi lokal (jangan di-commit)
└── README.md
```

---

## 🎮 Sistem EXP & Level

| Level | Title | Total EXP Dibutuhkan | EXP/Sesi |
|---|---|---|---|
| 1 | Pemula | 0 | +10 XP |
| 2 | Apprentice | 100 | +20 XP |
| 3 | Journeyman | 250 | +30 XP |
| 4 | Expert | 500 | +40 XP |
| 5 | Master | 900 | +50 XP |
| 6 | Grandmaster | 1.400 | +60 XP |
| 7 | Legend | 2.000 | +70 XP |
| 8 | Mythic | 2.800 | +80 XP |
| 9 | Immortal | 3.800 | +90 XP |
| 10 | Ascendant | 5.000 | +100 XP |

> **Bonus:** Streak ≥ 7 hari berturut-turut → +5 XP tambahan per sesi

---

## ☁️ Integrasi LocalStack S3

Foto profil pengguna diunggah ke **Amazon S3 bucket** yang diemulasi oleh LocalStack secara lokal:

1. User pilih foto → browser mengirim ke **API Route `/api/upload-avatar`**
2. API Route menggunakan **AWS SDK v3** untuk upload file ke bucket `levelup-profiles` di LocalStack (`http://localhost:4566`)
3. URL objek S3 (`http://localhost:4566/levelup-profiles/avatars/<user-id>.jpg`) disimpan ke kolom `avatar_url` di tabel `profiles` Supabase
4. Foto ditampilkan dari URL S3 tersebut di halaman profil

Ini adalah arsitektur yang sama digunakan oleh aplikasi produksi nyata (seperti Twitter, Instagram) hanya dengan perbedaan endpoint: LocalStack vs AWS Cloud.

---

## 📜 Lisensi

MIT License — bebas digunakan untuk keperluan pendidikan.
