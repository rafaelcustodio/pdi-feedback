import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    evaluationMode?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      evaluationMode: string;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    evaluationMode: string;
  }
}
