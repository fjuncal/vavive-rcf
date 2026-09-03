import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function storeFranchiseePhoto(file: File) {
  if (process.env.NODE_ENV === "production") throw new Error("Storage de produção não configurado. Configure um provedor persistente antes do deploy.");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `${crypto.randomUUID()}.${extension}`;
  const folder = path.join(process.cwd(), "public", "uploads");
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
