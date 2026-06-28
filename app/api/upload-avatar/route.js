import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Inisialisasi S3 langsung di sini (bukan import dari lib/s3.js)
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
  forcePathStyle: true,
});

// Inisialisasi Supabase langsung (pakai service role agar bisa update tanpa auth)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const BUCKET = "levelup-avatars";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!file || !userId) {
      return NextResponse.json(
        { error: "File dan userId wajib diisi" },
        { status: 400 },
      );
    }

    // Validasi tipe file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file harus JPG, PNG, atau WebP" },
        { status: 400 },
      );
    }

    // Naikkan batas ke 5MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 50MB" },
        { status: 400 },
      );
    }

    // Konversi file ke buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Buat nama file unik
    const ext = file.name.split(".").pop();
    const fileName = `avatars/${userId}-${Date.now()}.${ext}`;

    // Upload ke LocalStack S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    // URL foto
    const avatarUrl = `http://localhost:4566/${BUCKET}/${fileName}`;

    // Simpan URL ke Supabase
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbError) {
      console.error("DB Error:", dbError);
      return NextResponse.json(
        { error: "Gagal menyimpan URL ke database: " + dbError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("Upload error detail:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: "50mb",
  },
};
