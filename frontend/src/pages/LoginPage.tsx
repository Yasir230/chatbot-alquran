import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "../store/authStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { BookOpen, Moon, Stars } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).optional(),
  password: z.string().min(6),
  mode: z.enum(["login", "register"])
});

type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [errorText, setErrorText] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "login" }
  });

  const mode = watch("mode");

  const onSubmit = async (values: FormValues) => {
    setErrorText(null);
    try {
      if (values.mode === "register") {
        await authApi.register({
          email: values.email,
          username: values.username || "",
          password: values.password
        });
      }
      const res = await authApi.login({
        email: values.email,
        password: values.password
      });
      setAuth(res.data.token, res.data.user);
      navigate("/chat");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Terjadi kesalahan. Coba lagi.";
      setErrorText(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-islamic-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-islamic-600/5 rounded-full blur-3xl" />
      </div>
      
      {/* Stars decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Stars className="absolute top-10 left-10 w-4 h-4 text-gold-400/30 animate-pulse" />
        <Stars className="absolute top-40 right-20 w-3 h-3 text-islamic-400/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <Stars className="absolute bottom-20 left-1/4 w-3 h-3 text-gold-400/30 animate-pulse" style={{ animationDelay: '1s' }} />
        <Stars className="absolute bottom-40 right-1/3 w-4 h-4 text-islamic-400/30 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-islamic-600 to-islamic-800 shadow-islamic-lg mb-4">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-islamic mb-2">
            Chatbot Al-Quran
          </h1>
          <p className="text-slate-400 text-sm">
            Temukan jawaban dari Al-Quran dengan AI
          </p>
        </div>

        {/* Form Card */}
        <div className="card-islamic p-8 animate-slide-up">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Toggle Tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-slate-800/50 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  const form = document.querySelector('form');
                  if (form) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'mode';
                    input.value = 'login';
                    form.appendChild(input);
                  }
                }}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  mode === "login"
                    ? "bg-gradient-to-r from-islamic-600 to-islamic-500 text-white shadow-islamic"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.querySelector('form');
                  if (form) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'mode';
                    input.value = 'register';
                    form.appendChild(input);
                  }
                }}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  mode === "register"
                    ? "bg-gradient-to-r from-islamic-600 to-islamic-500 text-white shadow-islamic"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Daftar
              </button>
            </div>

            {/* Error Message */}
            {errorText && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                {errorText}
              </div>
            )}

            {/* Email Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                className="input-modern"
                type="email"
                placeholder="email@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Username Input (Register only) */}
            {mode === "register" && (
              <div className="mb-4 animate-fade-in">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username
                </label>
                <input
                  className="input-modern"
                  type="text"
                  placeholder="nama_pengguna"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.username.message}</p>
                )}
              </div>
            )}

            {/* Password Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                className="input-modern"
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-islamic flex items-center justify-center gap-2 py-3"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" />
                  <span>{mode === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}</span>
                </>
              )}
            </button>

            {/* Footer Text */}
            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? (
                <>
                  Belum punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.querySelector('form');
                      if (form) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'mode';
                        input.value = 'register';
                        form.appendChild(input);
                      }
                    }}
                    className="text-islamic-400 hover:text-islamic-300 font-medium"
                  >
                    Daftar sekarang
                  </button>
                </>
              ) : (
                <>
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.querySelector('form');
                      if (form) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'mode';
                        input.value = 'login';
                        form.appendChild(input);
                      }
                    }}
                    className="text-islamic-400 hover:text-islamic-300 font-medium"
                  >
                    Masuk
                  </button>
                </>
              )}
            </p>
          </form>
        </div>

        {/* Decorative bottom */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-slate-500 text-xs">
            <Stars className="w-3 h-3" />
            <span>Powered by AI • Al-Quran Knowledge Base</span>
            <Stars className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
