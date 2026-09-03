import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { requireRole } from "@/services/auth";
export const runtime = "nodejs";
export async function POST(request: Request) { await requireRole("ADMIN"); const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ message: "Arquivo inválido." }, { status: 400 }); if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "Envie uma imagem de até 5 MB." }, { status: 400 }); const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"; const name = `${crypto.randomUUID()}.${extension}`; const folder = path.join(process.cwd(), "public", "uploads"); await mkdir(folder, { recursive: true }); await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer())); return NextResponse.json({ url: `/uploads/${name}` }, { status: 201 }); }
