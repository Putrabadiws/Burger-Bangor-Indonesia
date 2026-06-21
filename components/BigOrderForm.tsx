"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitBigOrderForm } from "@/lib/api/big-order";
import { openBigOrderWhatsApp } from "@/lib/whatsapp";
import { useState } from "react";

const formSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name harus lebih dari 2 karakter.",
    })
    .regex(/^[a-zA-Z\s'-]+$/, {
      message: "Name tidak boleh mengandung angka atau karakter khusus.",
    }),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      { message: "Silakan masukkan alamat email yang valid." },
    ),
  phone_number: z.string().min(10, {
    message: "Nomor telepon harus lebih dari 10 karakter.",
  }),
  service_type: z.string().min(1, {
    message: "Jenis layanan harus dipilih.",
  }),
  event_type: z.string().optional(),
  event_date: z.string().min(1, {
    message: "Tanggal acara harus diisi.",
  }),
  event_location: z.string().min(5, {
    message: "Lokasi acara harus lebih dari 5 karakter.",
  }),
  quantity: z.string().min(1, {
    message: "Jumlah pesanan harus diisi.",
  }),
  message: z.string().optional(),
}).superRefine((values, ctx) => {
  const composed =
    values.message?.trim() ||
    [
      values.event_type ? `Jenis acara: ${values.event_type}` : null,
      values.event_location ? `Lokasi: ${values.event_location}` : null,
      values.quantity ? `Jumlah: ${values.quantity}` : null,
    ]
      .filter(Boolean)
      .join(". ");
  if (composed.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lengkapi detail pesanan (minimal 10 karakter).",
      path: ["event_location"],
    });
  }
});

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

interface BigOrderFormProps {
  id?: string;
  className?: string;
  /** onDark/onLight = legacy · mobile/desktop = Figma big-order (901:3156 desktop) */
  variant?: "onDark" | "onLight" | "mobile" | "desktop";
  submitButtonText?: string;
}

export function BigOrderForm({
  id = "",
  className,
  variant = "onDark",
  submitButtonText = "Kirim ke WhatsApp",
}: BigOrderFormProps) {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Get UTM parameters from URL
  const utmSource = searchParams.get("utm_source");
  const utmMedium = searchParams.get("utm_medium");
  const utmCampaign = searchParams.get("utm_campaign");
  const utmContent = searchParams.get("utm_content");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone_number: "",
      service_type: "",
      event_date: "",
      event_location: "",
      quantity: "",
      message: "",
      event_type: "",
    },
  });

  const isMobile = variant === "mobile";
  const isDesktopFigma = variant === "desktop";
  const isFigmaLayout = isMobile || isDesktopFigma;
  const isLight = variant === "onLight" || isFigmaLayout;
  const labelClass = isDesktopFigma
    ? "font-inter text-sm font-medium leading-5 text-dark-500"
    : isMobile
      ? "text-neutral-800 text-xs font-medium font-inter leading-5"
      : isLight
        ? "text-neutral-800 text-xs font-medium font-inter leading-5"
        : "text-white";
  const descClass = isLight ? "text-neutral-500" : "text-white/70";
  const inputClass = cn(
    "bg-background",
    isDesktopFigma &&
      "h-10 rounded-lg border-white-100 text-sm placeholder:text-dark-200",
    isMobile &&
      "h-10 rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
    variant === "onLight" &&
      "h-10 rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
  );
  const requiredMarkClass = isDesktopFigma ? "text-error-500" : "text-red-600";

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const composedMessage =
        values.message?.trim() ||
        [
          values.event_type ? `Jenis acara: ${values.event_type}` : null,
          `Lokasi: ${values.event_location}`,
          `Jumlah: ${values.quantity}`,
        ]
          .filter(Boolean)
          .join(". ");

      const finalMessage =
        composedMessage.length >= 10
          ? composedMessage
          : `${composedMessage}. Permintaan Big Order via website.`;

      const email =
        values.email?.trim() ||
        `bigorder-${values.phone_number.replace(/\D/g, "")}@burgerbangorindonesia.com`;

      const result = await submitBigOrderForm({
        name: values.name,
        email,
        phone_number: values.phone_number,
        service_type: values.service_type,
        event_date: values.event_date,
        event_location: values.event_location,
        quantity: values.quantity,
        message: finalMessage,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
      });

      setSubmitStatus({
        type: "success",
        message: result.message || "Formulir Big Order berhasil dikirim! Mengarahkan ke WhatsApp...",
      });

      // Reset form
      form.reset();

      // Buka WhatsApp dengan data form (iOS: tab sama, non-iOS: tab baru)
      openBigOrderWhatsApp({
        name: values.name,
        email,
        phone_number: values.phone_number,
        service_type: values.service_type,
        event_date: values.event_date,
        event_location: values.event_location,
        quantity: values.quantity,
        message: finalMessage,
      });
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit form. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("w-full", className)} id={id}>
      <div className="relative">
        {isSubmitting && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40">
            <div className="flex items-center gap-3 rounded-xl bg-secondary-900/90 px-4 py-3 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm md:text-base">
                {submitStatus.message ||
                  "Mengirim data, mohon tunggu sebentar..."}
              </span>
            </div>
          </div>
        )}

        {submitStatus.type && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              submitStatus.type === "success"
                ? "bg-success-50 border border-success-200 text-success-900"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}>
            <p className="text-b1 text-black">{submitStatus.message}</p>
          </div>
        )}

        <Form {...form}>
          <form
            className={cn(
              isFigmaLayout ? (isDesktopFigma ? "space-y-4" : "space-y-5") : "space-y-6",
              variant === "onLight" && "[&_.grid]:grid-cols-1",
            )}
            onSubmit={form.handleSubmit(onSubmit)}
            aria-busy={isSubmitting}
            id={id}>
            {isFigmaLayout ? (
              isDesktopFigma ? (
                <>
                  <div className="grid grid-cols-2 items-start gap-4">
                    <div className="flex flex-col gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="gap-2">
                            <FormLabel className={labelClass}>
                              Nama Lengkap
                              <span className={requiredMarkClass}>*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={inputClass}
                                placeholder="Jane Doe"
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone_number"
                        render={({ field }) => (
                          <FormItem className="gap-2">
                            <FormLabel className={labelClass}>
                              No. Telepon
                              <span className={requiredMarkClass}>*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                className={inputClass}
                                placeholder="08xxxxxxxxxx"
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="service_type"
                        render={({ field }) => (
                          <FormItem className="gap-2">
                            <FormLabel className={labelClass}>
                              Jenis Layanan
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className={cn(
                                    inputClass,
                                    "w-full data-[placeholder]:text-dark-200",
                                  )}
                                >
                                  <SelectValue placeholder="Pilih jenis layanan" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Big Order">
                                  Big Order
                                </SelectItem>
                                <SelectItem value="Booth">Booth</SelectItem>
                                <SelectItem value="Mobil Van">
                                  Mobil Van
                                </SelectItem>
                                <SelectItem value="Food Truck">
                                  Food Truck
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="event_type"
                        render={({ field }) => (
                          <FormItem className="gap-2">
                            <FormLabel className={labelClass}>
                              Jenis Acara
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className={cn(
                                    inputClass,
                                    "w-full data-[placeholder]:text-dark-200",
                                  )}
                                >
                                  <SelectValue placeholder="Pilih jenis Acara" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Wedding">Wedding</SelectItem>
                                <SelectItem value="Corporate Event">
                                  Corporate Event
                                </SelectItem>
                                <SelectItem value="Kumpul Keluarga">
                                  Kumpul Keluarga
                                </SelectItem>
                                <SelectItem value="Acara Sekolah">
                                  Acara Sekolah
                                </SelectItem>
                                <SelectItem value="Lainnya">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <FormField
                        control={form.control}
                        name="event_date"
                        render={({ field }) => (
                          <FormItem className="gap-2">
                            <FormLabel className={labelClass}>
                              Tanggal Acara
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                className={inputClass}
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem className="gap-2">
                            <FormLabel className={labelClass}>
                              Jumlah Pesanan
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={inputClass}
                                placeholder="Minimal order 50 Pcs"
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="event_location"
                        render={({ field }) => (
                          <FormItem className="flex flex-1 flex-col gap-2">
                            <FormLabel className={labelClass}>
                              Lokasi Acara
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                className={cn(
                                  inputClass,
                                  "min-h-[120px] flex-1 resize-none py-3",
                                )}
                                placeholder="Masukkan alamat lengkap lokasi acaramu"
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex justify-center pt-1">
                    <Button
                      type="submit"
                      className="h-10 rounded-lg bg-primary-500 px-8 font-inter text-base font-medium text-white hover:bg-primary-600"
                      id="klik-wa-bigorder"
                      disabled={isSubmitting || !form.formState.isValid}
                    >
                      {isSubmitting ? "Mengirim..." : submitButtonText}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>
                          Nama Lengkap
                          <span className={requiredMarkClass}>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={inputClass}
                            placeholder="Jane Doe"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>
                          No. Telepon
                          <span className={requiredMarkClass}>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            className={inputClass}
                            placeholder="08xx xxx xxxx"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="service_type"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>Jenis Layanan</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                inputClass,
                                "w-full data-[placeholder]:text-black/30",
                              )}
                            >
                              <SelectValue placeholder="Pilih jenis layanan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Big Order">Big Order</SelectItem>
                            <SelectItem value="Booth">Booth</SelectItem>
                            <SelectItem value="Mobil Van">Mobil Van</SelectItem>
                            <SelectItem value="Food Truck">Food Truck</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>Jenis Acara</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                inputClass,
                                "w-full data-[placeholder]:text-black/30",
                              )}
                            >
                              <SelectValue placeholder="Pilih jenis Acara" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Wedding">Wedding</SelectItem>
                            <SelectItem value="Corporate Event">
                              Corporate Event
                            </SelectItem>
                            <SelectItem value="Kumpul Keluarga">
                              Kumpul Keluarga
                            </SelectItem>
                            <SelectItem value="Acara Sekolah">
                              Acara Sekolah
                            </SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="event_date"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>Tanggal Acara</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className={inputClass}
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>Jumlah Pesanan</FormLabel>
                        <FormControl>
                          <Input
                            className={inputClass}
                            placeholder="Minimal order 50 Pcs"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="event_location"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>Lokasi Acara</FormLabel>
                        <FormControl>
                          <Textarea
                            className={cn(
                              inputClass,
                              "min-h-20 resize-none py-4",
                            )}
                            placeholder="Masukkan alamat lengkap lokasi acaramu"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-10 w-full rounded-lg bg-primary-500 text-xs font-medium text-white hover:bg-primary-600"
                    style={{
                      fontFamily: "Haas Grot Text R Trial, Inter, sans-serif",
                    }}
                    id="klik-wa-bigorder"
                    disabled={isSubmitting || !form.formState.isValid}
                  >
                    {isSubmitting ? "Mengirim..." : submitButtonText}
                  </Button>
                </>
              )
            ) : (
              <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Nama</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          "bg-background",
                          isLight &&
                            "h-10 rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
                        )}
                        placeholder="Masukkan nama lengkap"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        className={cn(
                          "bg-background",
                          isLight &&
                            "h-10 rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
                        )}
                        placeholder="nama@email.com"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Nomor Telepon</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        className={cn(
                          "bg-background",
                          isLight &&
                            "h-10 rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
                        )}
                        placeholder="081234567890"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className={labelClass}>Jenis Layanan</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "bg-background w-full",
                            isLight &&
                              "h-10 rounded-lg border-zinc-100 text-[10px] data-[placeholder]:text-black/30",
                          )}>
                          <SelectValue placeholder="Pilih jenis layanan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Big Order">Big Order</SelectItem>
                        <SelectItem value="Booth">Booth</SelectItem>
                        <SelectItem value="Mobil Van">Mobil Van</SelectItem>
                        <SelectItem value="Food Truck">Food Truck</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Tanggal Acara</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className={cn(
                          "bg-background",
                          isLight &&
                            "h-10 rounded-lg border-zinc-100 text-[10px]",
                        )}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Jumlah Pesanan</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        className={cn(
                          "bg-background",
                          isLight &&
                            "h-10 rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
                        )}
                        placeholder="Contoh: 100 pcs"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="event_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Lokasi Acara</FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        "bg-background",
                        isLight &&
                          "h-10 rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
                      )}
                      placeholder="Masukkan alamat lengkap lokasi acara"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Pesan Tambahan</FormLabel>
                  <FormControl>
                    <Textarea
                      className={cn(
                        "bg-background min-h-[120px]",
                        isLight &&
                          "rounded-lg border-zinc-100 text-[10px] placeholder:text-black/30",
                      )}
                      placeholder="Tuliskan detail tambahan atau pertanyaan Anda..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription className={descClass}>
                    Minimal 10 karakter.
                  </FormDescription>
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                className={cn(
                  "w-full",
                  isLight &&
                    "h-10 rounded-lg bg-primary-500 text-xs font-medium text-white hover:bg-primary-600",
                )}
                size={isLight ? "default" : "xl"}
                id="klik-wa-bigorder"
                disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting ? "Mengirim..." : submitButtonText}
                {!isLight ? <ArrowRight className="size-5" /> : null}
              </Button>
            </div>
              </>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
