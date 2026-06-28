const {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
  forcePathStyle: true,
});

async function initBucket() {
  try {
    // Cek apakah bucket sudah ada
    await client.send(new HeadBucketCommand({ Bucket: "levelup-avatars" }));
    console.log("✓ Bucket levelup-avatars sudah ada");
  } catch {
    // Bucket belum ada, buat baru
    await client.send(new CreateBucketCommand({ Bucket: "levelup-avatars" }));
    console.log("✓ Bucket levelup-avatars berhasil dibuat!");
  }
}

initBucket();
