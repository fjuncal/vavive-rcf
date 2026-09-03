import { redirect } from "next/navigation";
import { getSessionUser } from "@/services/auth";

export default async function Home() {
  const user = await getSessionUser();
  redirect(!user ? "/login" : user.role === "TV" ? "/tv" : "/dashboard");
}
