"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { updateMyProfile } from "@/services/api";
import { MARKET_CATEGORIES, ISRAEL_CITIES } from "@/lib/marketOptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), { ssr: false });

const editProfileSchema = z.object({
  name: z.string().trim().min(2, "שם חייב להכיל לפחות 2 תווים"),
  phone: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(600, "ביו יכול להכיל עד 600 תווים").optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().max(300).optional(),
  skillsInput: z.string().trim().optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const { user, token, isAuthenticated, refreshUser } = useAuth();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: "",
      phone: "",
      bio: "",
      city: "",
      address: "",
      skillsInput: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    setValue("name", user.name || "");
    setValue("phone", user.phone || "");
    setValue("bio", user.bio || "");
    setValue("city", user.location?.city || "");
    setValue("address", user.location?.address || "");
    setValue("skillsInput", (user.skills || []).join(", "));
  }, [setValue, user]);

  const onSubmit = async (form: EditProfileForm) => {
    setMessage("");
    if (!isAuthenticated || !token) {
      setMessage("צריך להתחבר כדי לערוך פרופיל.");
      return;
    }

    try {
      const skills = (form.skillsInput || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = new FormData();
      payload.set("name", form.name);
      payload.set("phone", form.phone || "");
      payload.set("bio", form.bio || "");
      payload.set("city", form.city || "");
      payload.set("address", form.address || "");
      payload.set("skillsInput", skills.join(","));
      if (avatarFile) {
        payload.set("avatar", avatarFile);
      }

      const result = await updateMyProfile(token, payload);

      setIsError(false);
      setMessage("הפרופיל עודכן בהצלחה.");
      if (result.user.avatarUrl) {
        setAvatarPreviewUrl(`${result.user.avatarUrl}${result.user.avatarUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(result.user.updatedAt || "")}`);
      }
      // Refresh the auth context so the navbar and all components reflect the new profile immediately.
      await refreshUser();
      router.push(`/users/${result.user._id}`);
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "עדכון הפרופיל נכשל.");
    }
  };

  return (
    <div className="min-h-screen text-white" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>עריכת פרופיל</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label className="mb-1 block">שם מלא</Label>
                <Input {...register("name")} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block">טלפון</Label>
                  <Input {...register("phone")} placeholder="050-0000000" />
                </div>
                <div>
                  <Label className="mb-1 block">תמונת פרופיל (JPG / PNG)</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setAvatarFile(nextFile);

                      if (!nextFile) {
                        setAvatarPreviewUrl((prev) => {
                          if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
                          return "";
                        });
                        return;
                      }

                      const nextPreviewUrl = URL.createObjectURL(nextFile);
                      setAvatarPreviewUrl((prev) => {
                        if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
                        return nextPreviewUrl;
                      });
                    }}
                  />
                  {(avatarPreviewUrl || user?.avatarUrl) ? (
                    <div className="mt-2 flex items-center gap-3">
                      <Image
                        src={avatarPreviewUrl || `${user?.avatarUrl}${user?.avatarUrl?.includes("?") ? "&" : "?"}v=${encodeURIComponent(user?.updatedAt || "")}`}
                        alt={user?.name || "avatar"}
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-xl object-cover ring-1 ring-black/10"
                      />
                      <p className="text-xs text-neutral-500">התמונה הנוכחית שלך</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <Label className="mb-1 block">עליי</Label>
                <Textarea {...register("bio")} rows={4} placeholder="כמה מילים על הניסיון שלך..." />
                {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>}
              </div>

              <div>
                <Label className="mb-1 block">כישורים (מופרדים בפסיק)</Label>
                <Input {...register("skillsInput")} placeholder={MARKET_CATEGORIES.slice(0, 4).join(", ")} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block">עיר</Label>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value || "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר עיר" />
                        </SelectTrigger>
                        <SelectContent>
                          {ISRAEL_CITIES.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">כתובת</Label>
                  <Input {...register("address")} />
                </div>
              </div>

              <Button disabled={isSubmitting} type="submit" className="w-full">
                {isSubmitting ? "שומר..." : "שמירת שינויים"}
              </Button>
            </form>

            {message && (
              <p className={`mt-3 text-sm font-medium ${isError ? "text-red-600" : "text-green-700"}`}>
                {message}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
