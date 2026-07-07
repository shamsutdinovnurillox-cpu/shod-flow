import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AccountClient } from "@/components/AccountClient";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // MFA holati sessiya davomida o'zgaradi — DB'dan yangisini o'qiymiz.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });

  return (
    <AccountClient
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        department: session.user.department,
      }}
      mfaEnabled={dbUser?.mfaEnabled ?? false}
    />
  );
}
