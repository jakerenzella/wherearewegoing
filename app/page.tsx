import { redirect } from "next/navigation";
import { neonAuth } from "@/lib/auth/server";
import { Trip } from "./trip";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user } = await neonAuth();
  if (!user) redirect("/auth/sign-in");
  return <Trip />;
}
