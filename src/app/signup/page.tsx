"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { StaticNavbar } from "@/components/StaticNavbar";
import { useMouseGlow } from "@/hooks/useMouseGlow";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword, validateName, validateCountry } from "@/lib/validation";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

const inputStyle = {
  background: "var(--input-bg)",
  border: "1px solid var(--border-strong)",
  color: "var(--text-primary)",
  outline: "none",
};

const panelVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...value];
    pasted.split("").forEach((ch, idx) => { next[idx] = ch; });
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-bold rounded-sm transition-all duration-200"
          style={{
            ...inputStyle,
            borderColor: digit ? "var(--accent)" : "var(--border-strong)",
            color: "var(--text-bright)",
            caretColor: "var(--accent)",
          }}
        />
      ))}
    </div>
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  const { ref, maskImage } = useMouseGlow(200);

  return (
    <div className="relative group">
      <div
        className="absolute top-0 left-0 right-0 h-[1px] z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent), transparent)" }}
      />
      <motion.div
        ref={ref}
        className="absolute inset-0 border-2 rounded-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        style={{ borderColor: "var(--accent)", WebkitMaskImage: maskImage, maskImage }}
      />
      <div className="panel-strong rounded-sm p-6 sm:p-10 transition-all duration-300" style={{ boxShadow: "var(--accent-glow)" }}>
        {children}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, signIn: authSignIn } = useAuth();
  const [step, setStep] = useState<"form" | "verify" | "login">("form");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    country: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError =
      validateName(form.firstName, "First name") ||
      validateName(form.lastName, "Last name") ||
      validateCountry(form.country) ||
      validateEmail(form.email) ||
      validatePassword(form.password);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm((prev) => ({ ...prev, password: "" }));
      setStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLoginForm({ email: "", password: "" });
      setSuccessMsg("Account verified! You can now safely login.");
      setError("");
      setStep("login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const emailErr = validateEmail(loginForm.email);
    if (emailErr) { setError(emailErr); return; }
    if (!loginForm.password) { setError("Password is required"); return; }

    setSubmitting(true);
    try {
      await authSignIn(loginForm.email, loginForm.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <StaticNavbar />
      <div className="h-14" />

      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-6 sm:py-20">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left side - Form */}
            <div className="w-full max-w-lg mx-auto lg:mx-0">
              <AnimatePresence mode="wait">

            {/* STEP 1: Sign-up form */}
            {step === "form" && (
              <motion.div
                key="form"
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <AuthCard>
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full border-2" style={{ borderColor: "var(--accent)", background: "var(--accent-faint)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM3 20a6 6 0 0 1 12 0v1H3v-1z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-bright)" }}>
                    Create your account
                  </h1>
                  <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setError(""); setSuccessMsg(""); setStep("login"); }}
                      className="font-medium transition-colors duration-150"
                      style={{ color: "var(--accent)" }}
                    >
                      Log in
                    </button>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
                  {error && (
                    <div className="px-3 py-2.5 text-xs rounded-sm border" style={{ borderColor: "var(--error-border)", color: "var(--error-text)", background: "var(--error-subtle)" }}>
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                        First Name <span style={{ color: "var(--accent)" }}>*</span>
                      </label>
                      <input
                        id="firstName" name="firstName" type="text" required autoComplete="given-name"
                        value={form.firstName} onChange={handleChange} placeholder="e.g. Ada"
                        className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                        style={inputStyle}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                        Middle Name
                      </label>
                      <input
                        id="middleName" name="middleName" type="text" autoComplete="additional-name"
                        value={form.middleName} onChange={handleChange} placeholder="(optional)"
                        className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Last Name <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                      <input
                        id="lastName" name="lastName" type="text" required autoComplete="family-name"
                        value={form.lastName} onChange={handleChange} placeholder="e.g. Lovelace"
                        className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                        style={inputStyle}
                      />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Country <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <select
                      id="country" name="country" required value={form.country} onChange={handleChange}
                      className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] cursor-pointer appearance-none"
                      style={{ ...inputStyle, color: form.country ? "var(--text-primary)" : "var(--text-faint)" }}
                    >
                      <option value="" disabled style={{ background: "var(--panel)" }}>Where are you from?</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} style={{ background: "var(--panel)", color: "var(--text-primary)" }}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Email Address <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <input
                      id="email" name="email" type="email" required autoComplete="email"
                        value={form.email} onChange={handleChange} placeholder="you@example.com"
                      className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                      style={inputStyle}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Password <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password" name="password" type={showPassword ? "text" : "password"}
                        required autoComplete="new-password"
                        value={form.password} onChange={handleChange} placeholder="Create a strong password"
                        className="w-full px-3 py-2.5 pr-10 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                        style={inputStyle}
                      />
                      <button
                        type="button" onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity opacity-40 hover:opacity-70"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                            <path d="m10.748 13.93 2.523 2.523a10.004 10.004 0 0 1-7.607-3.787.75.75 0 0 0 0-1.185 10.004 10.004 0 0 1 3.41-4.82l1.674 1.674ZM13.5 10c0-.655-.134-1.28-.374-1.85l2.523 2.523A4.001 4.001 0 0 1 13.5 10Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={submitting ? {} : { scale: 1.02 }} whileTap={submitting ? {} : { scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="mt-2 relative flex items-center justify-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-[2px] border transition-all duration-300 cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-subtle)" }}
                    onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-subtle)"; }}
                  >
                    {submitting ? "Creating..." : "Create Account"}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </motion.button>

                  <p className="text-center text-[10px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
                    By creating an account you agree to our{" "}
                    <span style={{ color: "var(--accent)" }} className="cursor-pointer accent-link">Terms of Service</span>{" "}
                    and{" "}
                    <span style={{ color: "var(--accent)" }} className="cursor-pointer accent-link">Privacy Policy</span>.
                  </p>
                </form>
                </AuthCard>
              </motion.div>
            )}

            {/* STEP 2: OTP Verification */}
            {step === "verify" && (
              <motion.div
                key="verify"
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <AuthCard>
                <div className="flex justify-center mb-6">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "var(--accent-faint)", border: "2px solid var(--accent)" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7" style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--text-bright)" }}>
                    Verify your email
                  </h1>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    We sent a 6-digit code to{" "}
                    <span style={{ color: "var(--text-primary)" }}>{form.email || "your email"}</span>
                  </p>
                </div>

                <form onSubmit={handleConfirm} className="flex flex-col gap-6">
                  {error && (
                    <div className="px-3 py-2.5 text-xs rounded-sm border" style={{ borderColor: "var(--error-border)", color: "var(--error-text)", background: "var(--error-subtle)" }}>
                      {error}
                    </div>
                  )}
                  <OtpInput value={otp} onChange={setOtp} />

                  <motion.button
                    whileHover={submitting ? {} : { scale: 1.02 }} whileTap={submitting ? {} : { scale: 0.98 }}
                    type="submit"
                    disabled={otp.join("").length < 6 || submitting}
                    className="relative flex items-center justify-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-[2px] border transition-all duration-300 cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-subtle)" }}
                    onMouseEnter={(e) => { if (!submitting && otp.join("").length === 6) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-subtle)"; }}
                  >
                    {submitting ? "Verifying..." : "Confirm"}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </motion.button>

                  <p className="text-center text-sm leading-relaxed" style={{ color: "var(--text-faint)" }}>
                    Didn&apos;t receive it?{" "}
                    <button
                      type="button"
                      className="accent-link"
                      style={{ color: resendCooldown > 0 ? "var(--text-faint)" : "var(--accent)" }}
                      disabled={resendCooldown > 0}
                      onClick={() => {
                        fetch("/api/auth/resend", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: form.email }),
                        }).catch(() => {});
                        setResendCooldown(60);
                      }}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                    {" · "}
                    <button type="button" className="accent-link" style={{ color: "var(--text-muted)" }}
                      onClick={() => { setError(""); setStep("form"); setOtp(["","","","","",""]); }}>
                      Go back
                    </button>
                  </p>
                </form>
                </AuthCard>
              </motion.div>
            )}

            {/* STEP 3: Login */}
            {step === "login" && (
              <motion.div
                key="login"
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <AuthCard>
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full border-2" style={{ borderColor: "var(--accent)", background: "var(--accent-faint)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-bright)" }}>
                    Welcome back
                  </h1>
                  <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setError(""); setStep("form"); }}
                      className="font-medium transition-colors duration-150"
                      style={{ color: "var(--accent)" }}
                    >
                      Sign up
                    </button>
                  </p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-3 sm:gap-4">
                  {successMsg && (
                    <div className="px-3 py-2.5 text-xs rounded-sm border" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-subtle)" }}>
                      {successMsg}
                    </div>
                  )}
                  {error && (
                    <div className="px-3 py-2.5 text-xs rounded-sm border" style={{ borderColor: "var(--error-border)", color: "var(--error-text)", background: "var(--error-subtle)" }}>
                      {error}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Email Address <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <input
                      id="login-email" name="email" type="email" required autoComplete="email"
                      value={loginForm.email} onChange={handleLoginChange} placeholder="you@example.com"
                      className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                      style={inputStyle}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                        Password <span style={{ color: "var(--accent)" }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-[1px] transition-colors duration-150 accent-link"
                        style={{ color: "var(--accent)" }}
                        onClick={() => console.info("Forgot password — coming soon.")}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password" name="password"
                        type={showLoginPassword ? "text" : "password"}
                        required autoComplete="current-password"
                        value={loginForm.password} onChange={handleLoginChange} placeholder="Enter your password"
                        className="w-full px-3 py-2.5 pr-10 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                        style={inputStyle}
                      />
                      <button
                        type="button" onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity opacity-40 hover:opacity-70"
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                            <path d="m10.748 13.93 2.523 2.523a10.004 10.004 0 0 1-7.607-3.787.75.75 0 0 0 0-1.185 10.004 10.004 0 0 1 3.41-4.82l1.674 1.674ZM13.5 10c0-.655-.134-1.28-.374-1.85l2.523 2.523A4.001 4.001 0 0 1 13.5 10Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={submitting ? {} : { scale: 1.02 }} whileTap={submitting ? {} : { scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="mt-2 relative flex items-center justify-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-[2px] border transition-all duration-300 cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-subtle)" }}
                    onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-subtle)"; }}
                  >
                    {submitting ? "Logging in..." : "Log In"}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </motion.button>
                </form>
                </AuthCard>
              </motion.div>
            )}

          </AnimatePresence>
            </div>

            {/* Right side - Info Panel */}
            <div className="hidden lg:flex flex-col items-start justify-center pl-8">
              <div className="relative">
                {/* Decorative DNA helix */}
                <div className="absolute -left-8 top-0 w-px h-full" style={{ background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)' }} />

                <h2 className="text-3xl font-bold tracking-tighter uppercase mb-6" style={{ color: 'var(--text-bright)' }}>
                  Unlock your<br /><span style={{ color: 'var(--accent)' }}>genetic history</span>
                </h2>

                <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Join thousands who have discovered their ancestry through our advanced DNA modeling services.
                  Understand your origins like never before.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" style={{ background: 'var(--accent-faint)', border: '1px solid var(--border-strong)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" style={{ color: 'var(--accent)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Private & Secure</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Your data stays yours. We never share your genetic information.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" style={{ background: 'var(--accent-faint)', border: '1px solid var(--border-strong)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" style={{ color: 'var(--accent)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}><span style={{ textTransform: 'none' }}>qpAdm</span> ANALYSIS</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Gold-standard academic methodology for precise ancestry modeling.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" style={{ background: 'var(--accent-faint)', border: '1px solid var(--border-strong)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" style={{ color: 'var(--accent)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Global Reference Data</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Built on thousands of ancient and modern population samples.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
