import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function RootPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Wenn eingeloggt → zu /home
  if (session?.user) {
    redirect("/home");
  }

  // Sonst → zu /login
  redirect("/login");
}