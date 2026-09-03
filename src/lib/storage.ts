import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const extensions: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validateFranchiseePhoto(file: File) {
  if (!extensions[file.type] || file.size > MAX_IMAGE_SIZE) {
    throw new Error("Envie uma imagem JPG, PNG ou WebP de até 5 MB.");
  }
}

async function storeLocalPhoto(file: File, extension: string) {
  const name = `${crypto.randomUUID()}.${extension}`;
  const folder = path.join(process.cwd(), "public", "uploads");
  await mkdir(folder, { recursive: true });
  await writeFile(
    path.join(folder, name),
    Buffer.from(await file.arrayBuffer()),
  );
  return `/uploads/${name}`;
}

async function storeProductionPhoto(file: File, extension: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN não está configurado no ambiente de produção.",
    );
  }

  const blob = await put(
    `franchisees/${crypto.randomUUID()}.${extension}`,
    file,
    {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    },
  );

  return blob.url;
}

export async function storeFranchiseePhoto(file: File) {
  validateFranchiseePhoto(file);
  const extension = extensions[file.type];

  if (process.env.NODE_ENV === "development") {
    return storeLocalPhoto(file, extension);
  }

  if (process.env.NODE_ENV === "production") {
    return storeProductionPhoto(file, extension);
  }

  throw new Error("Ambiente de armazenamento não suportado.");
}
