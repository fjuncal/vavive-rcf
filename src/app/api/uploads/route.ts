import { NextResponse } from "next/server";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { storeFranchiseePhoto } from "@/lib/storage";
export const runtime = "nodejs";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export async function POST(request: Request) { await requireAnyRole(OPERATIONS_ROLES); try { const file = (await request.formData()).get("file"); if (!(file instanceof File)) return NextResponse.json({ message: "Arquivo inválido." }, { status: 400 }); if (!allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "Envie JPG, PNG ou WebP de até 5 MB." }, { status: 400 }); return NextResponse.json({ url: await storeFranchiseePhoto(file) }, { status: 201 }); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível enviar a foto." }, { status: 500 }); } }
