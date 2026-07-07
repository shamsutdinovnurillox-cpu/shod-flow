import { DefaultSession } from "next-auth";
import { Role, Department } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      department: Department;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    department: Department;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    department: Department;
  }
}
