import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountClient } from "@/components/AccountClient";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AccountClient
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        department: session.user.department,
      }}
    />
  );
}
