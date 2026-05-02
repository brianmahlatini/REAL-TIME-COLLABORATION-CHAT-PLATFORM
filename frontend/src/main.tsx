import { ClerkProvider, SignInButton, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./pages/App";
import "./styles/app.css";
import type { ApiAuth } from "./lib/types";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function ClerkBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return <div className="boot">Loading workspace...</div>;
  if (!isSignedIn || !user) {
    return (
      <main className="login-screen">
        <section>
          <p>Team Chat</p>
          <h1>Sign in to your collaboration workspace.</h1>
          <SignInButton mode="modal">
            <button>Sign in</button>
          </SignInButton>
        </section>
      </main>
    );
  }

  const auth: ApiAuth = {
    profile: {
      id: user.id,
      name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "Team Member",
      email: user.primaryEmailAddress?.emailAddress,
      imageUrl: user.imageUrl
    },
    getToken
  };

  return <App auth={auth} userMenu={<UserButton />} />;
}

function DemoBridge() {
  const auth: ApiAuth = {
    profile: {
      id: "demo-user",
      name: "Demo User",
      email: "demo@example.com"
    },
    getToken: async () => null
  };

  return <App auth={auth} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {clerkKey ? (
      <ClerkProvider publishableKey={clerkKey}>
        <ClerkBridge />
      </ClerkProvider>
    ) : (
      <DemoBridge />
    )}
  </React.StrictMode>
);
