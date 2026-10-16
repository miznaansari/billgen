import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { motion as Motion } from "framer-motion";
import {
  Receipt,
  Mail,
  Lock,
  User,
  Loader2,
  CloudUpload,
  Copy,
  Sparkles,
  FileDown,
} from "lucide-react";
import { auth, provider, signInWithPopup, db, track } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const FEATURES = [
  { icon: FileDown, text: "Generate professional PDF bills in seconds" },
  { icon: CloudUpload, text: "Every bill saved safely to your account" },
  { icon: Copy, text: "Duplicate past bills — no retyping" },
  { icon: Sparkles, text: "Clients & projects autofill as you type" },
];

function GoogleIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.2 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

const ERROR_MESSAGES = {
  "auth/invalid-credential": "Wrong email or password. Please try again.",
  "auth/user-not-found": "No account found with this email. Try signing up.",
  "auth/wrong-password": "Wrong email or password. Please try again.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed":
    "Email sign-in is not enabled yet. Enable Email/Password in the Firebase console.",
};

export default function Login() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && user) navigate("/dashboard", { replace: true });
  }, [ready, user, navigate]);

  const afterAuth = async (authedUser, isNew) => {
    // Upsert the user doc without clobbering fields like downloadCount.
    const userRef = doc(db, "users", authedUser.uid);
    const snap = await getDoc(userRef);
    await setDoc(
      userRef,
      {
        name: authedUser.displayName || name || "",
        email: authedUser.email || "",
        photoURL: authedUser.photoURL || "",
        lastLoginAt: new Date().toISOString(),
        ...(snap.exists() ? {} : { createdAt: new Date().toISOString() }),
      },
      { merge: true }
    );

    track(isNew ? "sign_up" : "login");

    const profileSnap = await getDoc(doc(db, "companyProfiles", authedUser.uid));
    if (profileSnap.exists()) {
      navigate("/dashboard", { replace: true });
    } else {
      toast("info", "Welcome! Set up your company details to appear on your bills.");
      navigate("/profile", { replace: true });
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      await afterAuth(result.user, false);
    } catch (err) {
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        console.error("Google Sign-In error:", err);
        setError(ERROR_MESSAGES[err?.code] || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        await afterAuth(cred.user, true);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await afterAuth(cred.user, false);
      }
    } catch (err) {
      console.error("Email auth error:", err);
      setError(ERROR_MESSAGES[err?.code] || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setError("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast("success", `Password reset link sent to ${email.trim()}`);
    } catch (err) {
      setError(ERROR_MESSAGES[err?.code] || "Could not send the reset email.");
    }
  };

  return (
    <div className="grid min-h-screen bg-base-200 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-900 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Receipt className="h-6 w-6" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight">BillGen</span>
        </div>

        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">
            Billing for creators, made ridiculously simple.
          </h1>
          <p className="mt-3 max-w-md text-indigo-100/90">
            Create, save and re-use professional bills — built for the camera department and
            freelance crews.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-indigo-50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </Motion.div>

        <p className="relative text-xs text-indigo-200/70">
          Free to use • Your data stays in your own account
        </p>
      </div>

      {/* Auth card */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Mobile brand header */}
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-content">
              <Receipt className="h-5 w-5" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
              Bill<span className="text-primary">Gen</span>
            </span>
          </div>

          <div className="surface p-6 sm:p-8">
            <h2 className="text-xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-base-content/55">
              {mode === "signin"
                ? "Sign in to continue to your bills."
                : "Start generating bills in under a minute."}
            </p>

            {/* Mode switch */}
            <div className="mt-5 grid grid-cols-2 rounded-xl bg-base-200 p-1 text-sm font-semibold">
              {[
                ["signin", "Sign In"],
                ["signup", "Sign Up"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key);
                    setError("");
                  }}
                  className={`rounded-lg py-2 transition-colors ${
                    mode === key ? "bg-base-100 text-primary shadow-sm" : "text-base-content/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="field-label" htmlFor="name">Your name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/35" />
                    <input
                      id="name"
                      type="text"
                      className="input w-full pl-9"
                      placeholder="e.g. Radheshyam Gupta"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="field-label" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/35" />
                  <input
                    id="email"
                    type="email"
                    className="input w-full pl-9"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="field-label" htmlFor="password">Password</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="mb-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/35" />
                  <input
                    id="password"
                    type="password"
                    className="input w-full pl-9"
                    placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-error/25 bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary w-full" disabled={loading || googleLoading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-base-content/40">
              <span className="h-px flex-1 bg-base-300" />
              OR
              <span className="h-px flex-1 bg-base-300" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={loading || googleLoading}
              className="btn btn-outline w-full gap-2 border-base-300 hover:border-base-300 hover:bg-base-200 hover:text-base-content"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-base-content/45">
            Your bills, clients and company details are stored securely in Firebase.
          </p>
        </Motion.div>
      </div>
    </div>
  );
}
