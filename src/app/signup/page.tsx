"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { StaticNavbar } from "@/components/StaticNavbar";
import { Footer } from "@/components/Footer";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-strong)",
  color: "var(--text-primary)",
  outline: "none",
};

const panelVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

// ── OTP input component ─────────────────────────────────────────────────────
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

// ── Main page ───────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify" | "login">("form");
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

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Will call AWS Cognito signIn in Phase 2
    alert("Login submitted — backend integration coming soon.");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Will call AWS Cognito signUp in Phase 2 and trigger the verification email
    setStep("verify");
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;
    // Will call AWS Cognito confirmSignUp in Phase 2
    alert(`Code submitted: ${code} — backend verification coming soon.`);
  };

  return (
    <>
      <StaticNavbar />

      <main className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        {/* Fixed-size wrapper so the card doesn't jump height between steps */}
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Sign-up form ─────────────────────────────────── */}
            {step === "form" && (
              <motion.div
                key="form"
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="panel-strong rounded-sm p-8 sm:p-10"
              >
                {/* Heading */}
                <div className="mb-8">
                  <p className="text-[10px] uppercase tracking-[3px] mb-2" style={{ color: "var(--accent)" }}>
                    Insights on Ancestry
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-bright)" }}>
                    Let&apos;s create your account
                  </h1>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                    Already have one?{" "}
                    <button
                      type="button"
                      onClick={() => setStep("login")}
                      className="transition-colors duration-150 accent-link"
                      style={{ color: "var(--accent)" }}
                    >
                      Log in
                    </button>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Name row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                        First Name <span style={{ color: "var(--accent)" }}>*</span>
                      </label>
                      <input
                        id="firstName" name="firstName" type="text" required autoComplete="given-name"
                        value={form.firstName} onChange={handleChange} placeholder="Ada"
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

                  {/* Last name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Last Name <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <input
                      id="lastName" name="lastName" type="text" required autoComplete="family-name"
                      value={form.lastName} onChange={handleChange} placeholder="Lovelace"
                      className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                      style={inputStyle}
                    />
                  </div>

                  {/* Country */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Country <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <select
                      id="country" name="country" required value={form.country} onChange={handleChange}
                      className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] cursor-pointer appearance-none"
                      style={{ ...inputStyle, color: form.country ? "var(--text-primary)" : "rgba(255,255,255,0.3)" }}
                    >
                      <option value="" disabled style={{ background: "#0f0f0f" }}>Select your country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} style={{ background: "#0f0f0f", color: "rgba(255,255,255,0.85)" }}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Email Address <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <input
                      id="email" name="email" type="email" required autoComplete="email"
                      value={form.email} onChange={handleChange} placeholder="ada@example.com"
                      className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                      style={inputStyle}
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Password <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password" name="password" type={showPassword ? "text" : "password"}
                        required autoComplete="new-password"
                        value={form.password} onChange={handleChange} placeholder="Min. 8 characters"
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

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="mt-2 relative flex items-center justify-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-[2px] border transition-all duration-300 cursor-pointer group"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(83,189,227,0.07)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(83,189,227,0.15)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(83,189,227,0.07)"; }}
                  >
                    Create Account
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
              </motion.div>
            )}

            {/* ── STEP 2: OTP Verification ──────────────────────────────── */}
            {step === "verify" && (
              <motion.div
                key="verify"
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="panel-strong rounded-sm p-8 sm:p-10"
              >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div
                    className="w-14 h-14 rounded-sm flex items-center justify-center"
                    style={{ background: "rgba(83,189,227,0.08)", border: "1px solid var(--border-strong)" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7" style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-8">
                  <p className="text-[10px] uppercase tracking-[3px] mb-2" style={{ color: "var(--accent)" }}>
                    Insights on Ancestry
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--text-bright)" }}>
                    Verification
                  </h1>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Type the 6-digit code we sent to{" "}
                    <span style={{ color: "var(--text-primary)" }}>{form.email || "your email"}</span>
                  </p>
                </div>

                <form onSubmit={handleConfirm} className="flex flex-col gap-6">
                  <OtpInput value={otp} onChange={setOtp} />

                  {/* Confirm */}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={otp.join("").length < 6}
                    className="relative flex items-center justify-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-[2px] border transition-all duration-300 cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(83,189,227,0.07)" }}
                    onMouseEnter={(e) => { if (otp.join("").length === 6) (e.currentTarget as HTMLButtonElement).style.background = "rgba(83,189,227,0.15)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(83,189,227,0.07)"; }}
                  >
                    Confirm
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </motion.button>

                  {/* Resend / back links */}
                  <p className="text-center text-sm leading-relaxed" style={{ color: "var(--text-faint)" }}>
                    Didn&apos;t receive it?{" "}
                    <button type="button" className="accent-link" style={{ color: "var(--accent)" }}
                      onClick={() => alert("Resend coming in Phase 2")}>
                      Resend code
                    </button>
                    {" · "}
                    <button type="button" className="accent-link" style={{ color: "var(--text-muted)" }}
                      onClick={() => { setStep("form"); setOtp(["","","","","",""]); }}>
                      Go back
                    </button>
                  </p>
                </form>
              </motion.div>
            )}

            {/* ── STEP 3: Login ─────────────────────────────────────────── */}
            {step === "login" && (
              <motion.div
                key="login"
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="panel-strong rounded-sm p-8 sm:p-10"
              >
                {/* Heading */}
                <div className="mb-8">
                  <p className="text-[10px] uppercase tracking-[3px] mb-2" style={{ color: "var(--accent)" }}>
                    Insights on Ancestry
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-bright)" }}>
                    Welcome back
                  </h1>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setStep("form")}
                      className="transition-colors duration-150 accent-link"
                      style={{ color: "var(--accent)" }}
                    >
                      Sign up
                    </button>
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                      Email Address <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <input
                      id="login-email" name="email" type="email" required autoComplete="email"
                      value={loginForm.email} onChange={handleLoginChange} placeholder="ada@example.com"
                      className="px-3 py-2.5 text-sm rounded-sm transition-all duration-200 focus:border-[var(--accent)] placeholder:opacity-30"
                      style={inputStyle}
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-[2px]" style={{ color: "var(--text-muted)" }}>
                        Password <span style={{ color: "var(--accent)" }}>*</span>
                      </label>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-[1px] transition-colors duration-150 accent-link"
                        style={{ color: "var(--accent)" }}
                        onClick={() => alert("Forgot password — coming soon.")}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password" name="password"
                        type={showLoginPassword ? "text" : "password"}
                        required autoComplete="current-password"
                        value={loginForm.password} onChange={handleLoginChange} placeholder="Your password"
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

                  {/* Login button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="mt-2 relative flex items-center justify-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-[2px] border transition-all duration-300 cursor-pointer group"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(83,189,227,0.07)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(83,189,227,0.15)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(83,189,227,0.07)"; }}
                  >
                    Log In
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </motion.button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </>
  );
}
