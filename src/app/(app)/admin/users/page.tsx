import { auth } from "@/auth";
import { getUsers } from "@/app/actions/users";
import { UsersClient } from "@/components/admin/UsersClient";

export default async function UsersPage() {
  const [session, users] = await Promise.all([auth(), getUsers()]);
  return <UsersClient users={users} currentUserId={session?.user?.id ?? ""} />;
}
