import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const dept = session.user.department;

  if (role === "ADMIN") {
    redirect("/admin");
  } else if (dept === "FLEET") {
    redirect("/fleet/dashboard");
  } else if (dept === "SAFETY") {
    redirect("/safety/dashboard");
  } else {
    // Fallback if no matching role
    redirect("/login");
  }
}
