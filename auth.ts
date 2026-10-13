import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "elastio.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // `hd` makes Google's account chooser offer only accounts on our domain;
      // the signIn callback below is what actually enforces it.
      authorization: { params: { hd: allowedDomain, prompt: "select_account" } },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Same rule as Sightline: only verified accounts managed by our Google
    // Workspace (`hd`). A personal Google account registered with an
    // @elastio.com address has no `hd`, so it's rejected — that covers people
    // who've left but still have such an account.
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      const hd = (profile as { hd?: string } | undefined)?.hd;
      return hd === allowedDomain && profile?.email_verified === true;
    },
  },
});
