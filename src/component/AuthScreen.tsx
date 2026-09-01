"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Loader2, Eye, EyeOff, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { signInAction, signUpAction, verifyOtpAction } from "@/actions/auth";
import Link from "next/link";
import Image from "next/image";

type AuthState = "login" | "signup" | "otp";

interface AuthScreenProps {
  defaultView?: AuthState;
  onSocialSignIn?: (provider: "google") => void;
}

const IMAGES: Record<AuthState, string> = {
  login:
    "/images/korat.png",
  signup:
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop",
  otp: "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2062&auto=format&fit=crop",
};

const COPY: Record<AuthState, { title: string; body: string }> = {
  login: {
    title: "ยินดีต้อนรับกลับ",
    body: "เข้าสู่บัญชีของคุณเพื่อจัดการการเดินทาง การจอง และแรงบันดาลใจสำหรับทริปถัดไป",
  },
  signup: {
    title: "เริ่มต้นการเดินทางครั้งใหม่",
    body: "สร้างบัญชีเพื่อบันทึกสถานที่โปรด วางแผนการเดินทาง และรับข้อเสนอสุดพิเศษสำหรับสมาชิก",
  },
  otp: {
    title: "ยืนยันรหัสความปลอดภัย",
    body: "กรอกรหัสยืนยันที่ส่งถึงคุณ เพื่อดำเนินการต่ออย่างปลอดภัย",
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

type FieldErrors = { email?: string; password?: string; agreed?: string; fullName?: string };

export const AuthScreen = ({
  defaultView = "login",
  onSocialSignIn,
}: AuthScreenProps) => {
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState("/dashboard");
  const [view, setView] = useState<AuthState>(defaultView);
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectUrl(params.get("redirect_url") || "/dashboard");
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (view !== "otp") return;
    setResendCooldown(RESEND_SECONDS);
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    const raf = requestAnimationFrame(() => otpRefs.current[0]?.focus());
    return () => cancelAnimationFrame(raf);
  }, [view]);

  const switchView = (next: AuthState) => {
    setFieldErrors({});
    setPassword("");
    setFullName("");
    setShowPassword(false);
    setView(next);
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field])
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (email: string, pass: string) => {
    const errors: FieldErrors = {};
    const emailValue = email.trim().toLowerCase();

    if (view === "signup") {
      const nameValue = fullName.trim();
      if (!nameValue) {
        errors.fullName = "กรุณากรอกชื่อที่จะแสดง";
      } else if (nameValue.length < 2) {
        errors.fullName = "ชื่อสั้นเกินไป";
      } else if (nameValue.length > 60) {
        errors.fullName = "ชื่อยาวเกินไป (ไม่เกิน 60 ตัวอักษร)";
      }
    }

    if (!emailValue) {
      errors.email = "กรุณากรอกอีเมล";
    } else if (emailValue.length > 254) {
      errors.email = "อีเมลยาวเกินกำหนด";
    } else if (/[ก-๙]/.test(emailValue)) {
      errors.email = "อีเมลต้องเป็นภาษาอังกฤษเท่านั้น";
    } else if (!EMAIL_REGEX.test(emailValue)) {
      errors.email = "กรอกอีเมลให้ถูกต้องตามรูปแบบ เช่น name@email.com";
    }

    if (!pass) {
      errors.password = "กรุณากรอกรหัสผ่าน";
    } else if (pass.length > 128) {
      errors.password = "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร";
    } else if (
      view === "signup" &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/.test(pass)
    ) {
      errors.password =
        "รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข อย่างน้อย 8 ตัวอักษร";
    }

    if (view === "signup" && !agreed) {
      errors.agreed = "กรุณายอมรับข้อตกลงการใช้งานก่อนสร้างบัญชี";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAction = async (formData: FormData) => {
    const email = (formData.get("email") as string) ?? "";
    const pass = (formData.get("password") as string) ?? "";

    if (!validate(email, pass)) return;

    setLoading(true);
    setCurrentEmail(email);

    try {
      const result =
        view === "login"
          ? await signInAction(formData)
          : await signUpAction(formData);

      if (result.error && result.status !== "requires_otp") {
        toast.error(result.error);
      }

      if (result.status === "requires_otp") {
        if (result.error) toast.error(result.error);
        else toast.success("ส่งรหัส OTP ไปยังอีเมลแล้ว");
        setView("otp");
      }

      if (result.status === "success") {
        toast.success("เข้าสู่ระบบสำเร็จ");
        router.push(redirectUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (code: string) => {
    if (code.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    try {
      const result = await verifyOtpAction(currentEmail, code);
      if (result.error) {
        toast.error(result.error);
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        otpRefs.current[0]?.focus();
      } else {
        toast.success("ยืนยันตัวตนสำเร็จ");
        router.push(redirectUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(RESEND_SECONDS);
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    otpRefs.current[0]?.focus();
    toast.success("ส่งรหัส OTP ใหม่แล้ว");
  };

  const handleOtpChange = (index: number, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    setOtpDigits((prev) => {
      const next = [...prev];
      digits.split("").forEach((char, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = char;
      });
      const joined = next.join("");
      if (joined.length === OTP_LENGTH) {
        submitOtp(joined);
      } else {
        otpRefs.current[
          Math.min(index + digits.length, OTP_LENGTH - 1)
        ]?.focus();
      }
      return next;
    });
  };

  const handleOtpKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => (next[i] = char));
    setOtpDigits(next);
    if (pasted.length === OTP_LENGTH) {
      submitOtp(pasted);
    } else {
      otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    }
  };

  const passwordStrength = (() => {
    if (view !== "signup" || password.length === 0) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ["อ่อนเกินไป", "พอใช้", "ปลอดภัย", "รัดกุมมาก"][
    Math.max((passwordStrength ?? 1) - 1, 0)
  ];
  const strengthColor =
    passwordStrength && passwordStrength <= 1
      ? "bg-red-500"
      : passwordStrength === 2
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-zinc-900 lg:flex-row">
      {/* Desktop Panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-zinc-900 lg:block">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={view}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            src={IMAGES[view]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />

        <div className="absolute bottom-16 left-16 right-16 text-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${view}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="mb-4 text-4xl font-bold tracking-tight">
                {COPY[view].title}
              </h1>
              <p className="max-w-md text-lg text-zinc-200">
                {COPY[view].body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="relative h-36 w-full overflow-hidden bg-zinc-900 lg:hidden">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            src={IMAGES[view]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/50 to-zinc-900/10" />
        <div className="relative z-10 flex h-full flex-col justify-between p-5">
          <div className="flex items-center gap-1.5 text-white/90">
            <Image
              src="/images/logo-travel.png"
              alt="เที่ยวตามงบโคราช"
              width={48}
              height={48}
              className="rounded-xl shadow-sm"
              priority
            />
            <span className="text-sm font-semibold">เที่ยวตามงบโคราช</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={`mobile-title-${view}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-bold text-white"
            >
              {COPY[view].title}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 sm:px-16 lg:w-1/2 lg:py-0 xl:px-32">
        <motion.div layout className="mx-auto w-full max-w-md">
          <div className="mb-10 hidden items-center gap-3 lg:mb-12 lg:flex">
            <Image
              src="/images/logo-travel.png"
              alt="เที่ยวตามงบโคราช"
              width={48}
              height={48}
              className="rounded-xl shadow-sm"
              priority
            />
            <span className="text-xl font-bold tracking-tight">
              เที่ยวตามงบโคราช
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="mb-8">
                <h2 className="mb-2 text-3xl font-semibold tracking-tight">
                  {view === "login" && "ยินดีต้อนรับ"}
                  {view === "signup" && "สร้างบัญชีเพื่อเข้าใช้งาน"}
                  {view === "otp" && "เช็คอีเมลของคุณ"}
                </h2>
                <p className="text-zinc-500">
                  {view === "otp" ? (
                    <>
                      รหัสยืนยัน 6 หลักถูกส่งไปยัง{" "}
                      <span className="font-medium text-zinc-700">
                        {currentEmail}
                      </span>{" "}
                      แล้ว
                    </>
                  ) : (
                    "กรอกข้อมูลของคุณเพื่อดำเนินการต่อ"
                  )}
                </p>
              </div>

              {view === "otp" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitOtp(otpDigits.join(""));
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      รหัสความปลอดภัย
                    </label>
                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          maxLength={1}
                          required
                          value={digit}
                          disabled={loading}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          aria-label={`หลักที่ ${i + 1}`}
                          className="aspect-square w-full max-w-13 rounded-xl border border-zinc-200 text-center text-xl font-mono font-semibold outline-none transition-all focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-60"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={
                      loading || otpDigits.join("").length !== OTP_LENGTH
                    }
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-4 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "ยืนยันตัวตนและดำเนินการต่อ"
                    )}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => switchView("login")}
                      className="text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                      ใช้อีเมลบัญชีอื่น
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className={
                        resendCooldown > 0
                          ? "cursor-not-allowed text-zinc-400"
                          : "font-medium text-zinc-900 underline-offset-4 hover:underline"
                      }
                    >
                      {resendCooldown > 0 ? (
                        <span suppressHydrationWarning>
                          ส่งรหัสอีกครั้งใน {resendCooldown}s
                        </span>
                      ) : (
                        "ส่งรหัสอีกครั้ง"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <form action={handleAction} className="space-y-5">
                    {view === "signup" && (
                      <div>
                        <label
                          htmlFor="full_name"
                          className="mb-2 block text-sm font-medium text-zinc-700"
                        >
                          ชื่อที่จะแสดง
                        </label>
                        <div className="relative">
                          <User
                            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                            aria-hidden="true"
                          />
                          <input
                            id="full_name"
                            name="full_name"
                            type="text"
                            required
                            maxLength={60}
                            disabled={loading}
                            value={fullName}
                            placeholder="ชื่อที่จะแสดงในรีวิวและโปรไฟล์"
                            aria-invalid={!!fieldErrors.fullName}
                            aria-describedby={
                              fieldErrors.fullName ? "full_name-error" : undefined
                            }
                            onChange={(e) => {
                              setFullName(e.target.value.slice(0, 60));
                              if (fieldErrors.fullName) clearFieldError("fullName");
                            }}
                            className={`w-full rounded-xl border py-3.5 pl-12 pr-4 outline-none transition-all focus:border-transparent focus:ring-2 disabled:opacity-60 ${
                              fieldErrors.fullName
                                ? "border-red-400 focus:ring-red-500"
                                : "border-zinc-200 focus:ring-zinc-900"
                            }`}
                          />
                        </div>
                        {fieldErrors.fullName && (
                          <p
                            id="full_name-error"
                            className="mt-1.5 text-sm text-red-600"
                          >
                            {fieldErrors.fullName}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-zinc-700"
                      >
                        อีเมล
                      </label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                          aria-hidden="true"
                        />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          maxLength={254}
                          spellCheck={false}
                          autoComplete="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          inputMode="email"
                          disabled={loading}
                          placeholder="อีเมลของคุณ"
                          aria-invalid={!!fieldErrors.email}
                          aria-describedby={
                            fieldErrors.email ? "email-error" : undefined
                          }
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/[ก-๙]/g, "")
                              .trimStart();
                            e.target.value = value;
                            if (fieldErrors.email) clearFieldError("email");
                          }}
                          onPaste={(e) => {
                            if (/[ก-๙]/.test(e.clipboardData.getData("text"))) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full rounded-xl border py-3.5 pl-12 pr-4 outline-none transition-all focus:border-transparent focus:ring-2 disabled:opacity-60 ${
                            fieldErrors.email
                              ? "border-red-400 focus:ring-red-500"
                              : "border-zinc-200 focus:ring-zinc-900"
                          }`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p
                          id="email-error"
                          className="mt-1.5 text-sm text-red-600"
                        >
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label
                          htmlFor="password"
                          className="block text-sm font-medium text-zinc-700"
                        >
                          รหัสผ่าน
                        </label>
                        {view === "login" && (
                          <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
                          >
                            ลืมรหัสผ่าน?
                          </Link>
                        )}
                      </div>

                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                          aria-hidden="true"
                        />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          disabled={loading}
                          required
                          minLength={view === "signup" ? 8 : undefined}
                          maxLength={128}
                          spellCheck={false}
                          autoCapitalize="none"
                          autoCorrect="off"
                          autoComplete={
                            view === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          placeholder={
                            view === "signup"
                              ? "อย่างน้อย 8 ตัวอักษร"
                              : "รหัสผ่านของคุณ"
                          }
                          aria-invalid={!!fieldErrors.password}
                          aria-describedby={
                            fieldErrors.password ? "password-error" : undefined
                          }
                          onChange={(e) => {
                            let value = e.target.value
                              .replace(/[ก-๙]/g, "")
                              .slice(0, 128);
                            setPassword(value);
                            if (!value) setShowPassword(false);
                            if (fieldErrors.password)
                              clearFieldError("password");
                          }}
                          onPaste={(e) => {
                            if (/[ก-๙]/.test(e.clipboardData.getData("text"))) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full rounded-xl border py-3.5 pl-12 pr-12 outline-none transition-all focus:border-transparent focus:ring-2 disabled:opacity-60 ${
                            fieldErrors.password
                              ? "border-red-400 focus:ring-red-500"
                              : "border-zinc-200 focus:ring-zinc-900"
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-all duration-200 hover:text-zinc-600 ${
                            password.length > 0
                              ? "pointer-events-auto scale-100 opacity-100"
                              : "pointer-events-none scale-90 opacity-0"
                          }`}
                          aria-label={
                            showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {fieldErrors.password && (
                        <p
                          id="password-error"
                          className="mt-1.5 text-sm text-red-600"
                        >
                          {fieldErrors.password}
                        </p>
                      )}

                      {passwordStrength !== null && !fieldErrors.password && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex h-1.5 flex-1 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                  i < passwordStrength
                                    ? strengthColor
                                    : "bg-zinc-100"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-right text-xs font-medium text-zinc-400">
                            {strengthLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {view === "signup" && (
                      <div>
                        <label className="flex items-start gap-2 text-sm text-zinc-600">
                          <input
                            type="checkbox"
                            checked={agreed}
                            disabled={loading}
                            onChange={(e) => {
                              setAgreed(e.target.checked);
                              clearFieldError("agreed");
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span>
                            ฉันยอมรับ{" "}
                            <Link
                              href="/terms"
                              className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                            >
                              ข้อตกลงการใช้งาน
                            </Link>{" "}
                            และ{" "}
                            <Link
                              href="/privacy"
                              className="font-medium text-zinc-900 underline-offset-4 hover:underline"
                            >
                              นโยบายความเป็นส่วนตัว
                            </Link>
                          </span>
                        </label>
                        {fieldErrors.agreed && (
                          <p className="mt-1.5 text-sm text-red-600">
                            {fieldErrors.agreed}
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      disabled={loading}
                      type="submit"
                      className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-4 font-medium text-white shadow-lg shadow-zinc-900/20 transition-all duration-200 hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>
                            {view === "login"
                              ? "กำลังเข้าสู่ระบบ..."
                              : "กำลังสร้างบัญชี..."}
                          </span>
                        </>
                      ) : (
                        <span>
                          {view === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
                        </span>
                      )}
                    </button>
                  </form>

                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-zinc-200" />
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      หรือ
                    </span>
                    <div className="h-px flex-1 bg-zinc-200" />
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      const { createSupabaseClient } =
                        await import("@/lib/supabaseClient");
                      const supabase = createSupabaseClient();
                      await supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: {
                          redirectTo: `${window.location.origin}/auth/callback`,
                        },
                      });
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 py-3.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.41 3.62v3.01h3.49c2.04-1.88 3.21-4.65 3.21-7.93l-.27-.73z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.49-2.86c-.97.65-2.21 1.04-4.44 1.04-3.42 0-6.31-2.31-7.35-5.42H1.07v3.39C3.02 21.3 7.16 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M4.65 13.85c-.27-.81-.42-1.67-.42-2.56 0-.89.15-1.75.42-2.56V5.34H1.07A11.97 11.97 0 0 0 0 11.29c0 1.93.46 3.76 1.07 5.27l3.58-2.71z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.1-3.1C17.95 1.19 15.24 0 12 0 7.16 0 3.02 2.7 1.07 6.62l3.58 2.67C5.69 6.18 8.58 4.75 12 4.75z"
                      />
                    </svg>
                    <span>ดำเนินการต่อด้วย Google</span>
                  </button>

                  <div className="mt-8 text-center">
                    <p className="text-zinc-500">
                      {view === "login"
                        ? "ยังไม่ได้เป็นสมาชิก?"
                        : "เป็นสมาชิกอยู่แล้ว?"}
                      <button
                        type="button"
                        onClick={() =>
                          switchView(view === "login" ? "signup" : "login")
                        }
                        className="ml-2 font-semibold text-zinc-900 underline-offset-4 hover:underline"
                      >
                        {view === "login" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
                      </button>
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
