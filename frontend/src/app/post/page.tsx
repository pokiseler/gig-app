"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createGig } from "@/services/api";
import { MARKET_CATEGORIES, ISRAEL_CITIES } from "@/lib/marketOptions";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  tipAmount:   z.preprocess(
    (value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value),
    z.number().min(0, "הסכום לא יכול להיות שלילי").max(10000).optional(),
  ),
  tipMethod:   z.enum(["cash", "bit"]).optional(),
});

type PostFormFields = z.infer<typeof postFormSchema>;

export default function PostPage() {
  const { token, isAuthenticated } = useAuth();
  const postType = "WANTED" as const;
  const [serverMessage, setServerMessage] = useState("");
  const [isPostError, setIsPostError] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<PostFormFields>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { category: "", city: "", tipAmount: undefined, tipMethod: "cash" as const },
  });
  const selectedCategory = useWatch({ control, name: "category" });

  const availableCategories = [...MARKET_CATEGORIES, ...customCategories];

  const addCustomCategory = () => {
    const next = customCategory.trim();
    if (!next) return;
    if (!availableCategories.includes(next)) {
      setCustomCategories((prev) => [...prev, next]);
    }
    setValue("category", next, { shouldValidate: true, shouldDirty: true });
    setCustomCategory("");
  };

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
      setCustomCategories([]);
      setCustomCategory("");
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
                    inputMode="numeric"
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
                  <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                    {availableCategories.map((item) => {
                      const active = selectedCategory === item;
                      return (
                        <Badge
                          key={item}
                          onClick={() => setValue("category", item, { shouldValidate: true, shouldDirty: true })}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                            active
                              ? "border-blue-400/50 bg-blue-500/20 text-blue-200"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {item}
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={customCategory}
                      onChange={(event) => setCustomCategory(event.target.value)}
                      placeholder="הוסף קטגוריה מותאמת אישית"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomCategory();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="icon-sm" onClick={addCustomCategory} aria-label="הוסף קטגוריה">
                      <Plus className="size-4" />
                    </Button>
                  </div>
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
