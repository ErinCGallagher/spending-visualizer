/** Login page — Google OAuth sign-in. */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left panel: branding */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 bg-brand-primary relative p-16 flex-col justify-between overflow-hidden"
      >
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-accent blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-secondary blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter">SpendWise</span>
          </div>

          <div className="space-y-6 max-w-lg">
            <h1 className="text-7xl font-black text-white leading-[0.9] tracking-tighter">
              MASTER <br />
              YOUR <br />
              <span className="text-brand-accent">WEALTH.</span>
            </h1>
            <p className="text-xl text-white/70 leading-relaxed font-medium">
              Join users who have transformed their financial clarity with SpendWise.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right panel: sign-in form */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex-1 flex flex-col p-8 lg:p-16 justify-center"
      >
        <div className="max-w-md w-full mx-auto space-y-10">
          <div className="space-y-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group mb-8"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-semibold">Back to home</span>
            </button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Welcome back.</h2>
            <p className="text-slate-500 font-medium">Sign in to your account to continue your financial journey.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 p-4 rounded-2xl hover:border-brand-primary hover:bg-slate-50 transition-all group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Google "G" logo */}
              <svg width="24" height="24" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" />
              </svg>
              <span className="font-bold text-slate-900">{loading ? "Signing in…" : "Sign in with Google"}</span>
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span>
              </div>
            </div>

            {/* TODO: implement email/password sign-in on the backend */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <input
                  type="email"
                  placeholder="erin@example.com"
                  disabled
                  className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-medium opacity-50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  disabled
                  className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none font-medium opacity-50 cursor-not-allowed"
                />
              </div>
              {/* TODO: wire to email/password sign-in once backend supports it */}
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-brand-primary text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand-primary/20 hover:bg-brand-secondary transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign In
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            {/* TODO: add account creation flow */}
            <button className="text-brand-primary font-bold hover:underline">Create one for free</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
