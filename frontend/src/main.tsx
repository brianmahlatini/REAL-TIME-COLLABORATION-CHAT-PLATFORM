import { ClerkProvider, SignInButton, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import React, { FormEvent, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./pages/App";
import "./styles/app.css";
import type { ApiAuth } from "./lib/types";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const demoProfileKey = "team-chat-demo-profile";
const clerkNameKeyPrefix = "team-chat-clerk-display-name";

type DemoProfile = ApiAuth["profile"];
type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;

function createLocalId() {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadDemoProfile(): DemoProfile | null {
  const stored = window.localStorage.getItem(demoProfileKey);
  if (!stored) return null;

  try {
    const profile = JSON.parse(stored) as Partial<DemoProfile>;
    if (!profile.id || !profile.name) return null;
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      imageUrl: profile.imageUrl
    };
  } catch {
    return null;
  }
}

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

  return <ClerkSignedInApp getToken={getToken} user={user} />;
}

function ClerkSignedInApp({ getToken, user }: { getToken: ApiAuth["getToken"]; user: ClerkUser }) {
  const storageKey = `${clerkNameKeyPrefix}:${user.id}`;
  const [storedName, setStoredName] = useState(() => window.localStorage.getItem(storageKey) || "");
  const [name, setName] = useState(() => storedName || user.fullName || user.username || "");

  function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    window.localStorage.setItem(storageKey, trimmedName);
    setStoredName(trimmedName);
  }

  if (!storedName) {
    return (
      <main className="login-screen">
        <section>
          <p>Team Chat</p>
          <h1>What name should teammates see?</h1>
          <form className="name-login" onSubmit={saveDisplayName}>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              maxLength={60}
            />
            <button type="submit">Continue</button>
          </form>
        </section>
      </main>
    );
  }

  const auth: ApiAuth = {
    profile: {
      id: user.id,
      name: storedName,
      email: user.primaryEmailAddress?.emailAddress,
      imageUrl: user.imageUrl
    },
    getToken
  };

  return <App auth={auth} userMenu={<UserButton />} />;
}

function DemoBridge() {
  const [profile, setProfile] = useState<DemoProfile | null>(() => loadDemoProfile());
  const [name, setName] = useState("");

  const auth = useMemo<ApiAuth | null>(() => {
    if (!profile) return null;
    return {
      profile,
      getToken: async () => null
    };
  }, [profile]);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const nextProfile: DemoProfile = {
      id: createLocalId(),
      name: trimmedName,
      email: `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "") || "member"}@local.test`
    };
    window.localStorage.setItem(demoProfileKey, JSON.stringify(nextProfile));
    setProfile(nextProfile);
  }

  function signOut() {
    window.localStorage.removeItem(demoProfileKey);
    setProfile(null);
    setName("");
  }

  if (!auth) {
    return (
      <main className="login-screen">
        <section>
          <p>Team Chat</p>
          <h1>Enter your name to join the workspace.</h1>
          <form className="name-login" onSubmit={signIn}>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              maxLength={60}
            />
            <button type="submit">Join chat</button>
          </form>
        </section>
      </main>
    );
  }

  const userMenu = (
    <button className="profile-button" title="Sign out" onClick={signOut}>
      {auth.profile.name.slice(0, 1).toUpperCase()}
    </button>
  );

  return <App auth={auth} userMenu={userMenu} />;
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
