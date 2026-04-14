"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { createGig } from "@/services/api";
import { MARKET_CATEGORIES, ISRAEL_CITIES } from "@/lib/marketOptions";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), { ssr: false });

// Mirrors shared/schemas.js createGigSchema (front-end fields only).
const postFormSchema = z.object({
  title:       z.string().trim().min(3,  "הכותרת חייבת להכיל לפחות 3 תווים"),
  description: z.string().trim().min(10, "התיאור חייב להכיל לפחות 10 תווים"),
  category:    z.string().trim().min(2,  "יש לבחור קטגוריה"),
  city:        z.string().trim().min(2,  "יש להזין עיר"),
  address:     z.string().trim().min(2,  "יש להזין כתובת"),
  tags:        z.string().trim().optional(),
  tipAmount:   z.number().min(0, "הסכום לא יכול להיות שלילי").max(10000).optional(),
  tipMethod:   z.enum(["cash", "bit"]).optional(),
});

type PostFormFields = z.infer<typeof postFormSchema>;

export default function PostPage() {
  const { token, isAuthenticated } = useAuth();
  const postType = "WANTED" as const;
  const [serverMessage, setServerMessage] = useState("");
  const [isPostError, setIsPostError] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PostFormFields>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { category: "", city: "", tipAmount: 0, tipMethod: "cash" as const },
  });

  const onSubmit = async (data: PostFormFields) => {
    setServerMessage("");
    if (!token || !isAuthenticated) {
      setServerMessage("צריך להתחבר כדי לפרסם פוסט.");
      return;
    }
    try {
      const tags = data.tags
        ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
      await createGig(token, {
        title: data.title,
        description: data.description,
        postType,
        category: data.category,
        location: { city: data.city, address: data.address },
        tags,
        status: "open",
        tipAmount: data.tipAmount ?? 0,
        tipMethod: data.tipMethod ?? "cash",
      });
      setIsPostError(false);
      setServerMessage("הפוסט פורסם בהצלחה! מעביר לשוק...");
      reset();
      setTimeout(() => { window.location.href = "/gigs"; }, 1200);
    } catch (error) {
      setIsPostError(true);
      setServerMessage(error instanceof Error ? error.message : "פרסום הפוסט נכשל.");
    }
  };

  return (
    <div className="min-h-screen text-white" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
        <Card className="glass-heavy rounded-3xl border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">יצירת פוסט חדש</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div>
                <Label className="mb-1 block">כותרת</Label>
                <Input {...register("title")} />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>

              <div>
                <Label className="mb-1 block">תיאור</Label>
                <Textarea {...register("description")} rows={5} />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              </div>

              <div className="rounded-lg border border-amber-400/20 bg-white/5 p-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block">טיפ ב-₪ <span className="font-normal text-neutral-500">(אופציונלי)</span></Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    {...register("tipAmount", { valueAsNumber: true })}
                  />
                  {errors.tipAmount && <p className="mt-1 text-xs text-red-600">{errors.tipAmount.message}</p>}
                </div>
                <div>
                  <Label className="mb-1 block">אמצעי תשלום</Label>
                  <Controller
                    control={control}
                    name="tipMethod"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "cash"}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר אמצעי">
                            {(field.value ?? "cash") === "bit" ? "Bit" : "מזומן"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">מזומן</SelectItem>
                          <SelectItem value="bit">Bit</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <div>
                  <Label className="mb-1 block">קטגוריה</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value || "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKET_CATEGORIES.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block">עיר</Label>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field }) => (
                      <CityAutocomplete
                        value={field.value ?? ""}
                        onChange={(value) => field.onChange(value)}
                        options={ISRAEL_CITIES}
                        placeholder="הקלד או בחר עיר"
                        clearAriaLabel="נקה עיר"
                      />
                    )}
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
                </div>
                <div>
                  <Label className="mb-1 block">כתובת</Label>
                  <Input {...register("address")} />
                  {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
                </div>
              </div>

              <div>
                <Label className="mb-1 block">תגיות (מופרדות בפסיקים)</Label>
                <Input {...register("tags")} placeholder="ניקיון, פעם בשבוע, בית" />
              </div>

              <Button disabled={isSubmitting} type="submit" className="w-full bg-gradient-to-l from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/30 hover:opacity-90">
                {isSubmitting ? "מפרסם..." : "פרסום פוסט"}
              </Button>
            </form>

            {serverMessage && (
              <p className={`mt-3 text-sm font-medium ${isPostError ? "text-red-600" : "text-green-700"}`}>
                {serverMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
