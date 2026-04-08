"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), {
  ssr: false,
});

const loginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה."),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים."),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "השם חייב להכיל לפחות 2 תווים."),
});

type LoginFields    = z.infer<typeof loginSchema>;
type RegisterFields = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { signIn, signUp, user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [serverMessage, setServerMessage] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/gigs");
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterFields>({
    // Cast needed: resolver type changes at runtime based on mode.
    resolver: zodResolver(
      mode === "login" ? loginSchema : registerSchema
    ) as unknown as Resolver<RegisterFields>,
  });

  const onSubmit = async (data: RegisterFields) => {
    setServerMessage("");
    try {
      if (mode === "register") {
        await signUp(data as RegisterFields);
      } else {
        await signIn(data as LoginFields);
      }

      router.replace("/gigs");
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "בקשת ההתחברות נכשלה");
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setServerMessage("");
    reset();
  };

  return (
    <div className="min-h-screen text-white" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-14">
        <Card className="glass-heavy rounded-3xl border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">{mode === "login" ? "ברוכים החוזרים" : "יצירת חשבון חדש"}</CardTitle>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {mode === "register" && (
              <div>
                <Label className="mb-1 block">שם מלא</Label>
                <Input placeholder="שם מלא" {...register("name")} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
            )}

              <div>
                <Label className="mb-1 block">אימייל</Label>
                <Input type="email" placeholder="your@email.com" dir="ltr" {...register("email")} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <Label className="mb-1 block">סיסמה</Label>
                <Input type="password" placeholder="******" {...register("password")} />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <Button className="w-full bg-gradient-to-l from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/30 hover:opacity-90" disabled={isSubmitting} type="submit">
                {isSubmitting ? "מעבד בקשה..." : mode === "login" ? "התחברות" : "יצירת חשבון"}
              </Button>
            </form>

            <Button
              className="mt-4 text-blue-400 hover:text-blue-300"
              variant="link"
              onClick={switchMode}
              type="button"
            >
              מעבר ל{mode === "login" ? "הרשמה" : "התחברות"}
            </Button>

            {serverMessage && <p className="mt-3 text-sm">{serverMessage}</p>}
            {isAuthenticated && user && (
              <p className="mt-2 text-sm text-green-700">מחובר בתור {user.name} ({user.role})</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
