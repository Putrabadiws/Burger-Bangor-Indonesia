"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
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
import { submitContactForm } from "@/lib/api/contact";
import { useEffect, useState } from "react";

function createFormSchema(includeBudget: boolean) {
  return z.object({
    name: z
      .string()
      .min(2, {
        message: "Name harus lebih dari 2 karakter.",
      })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message: "Name tidak boleh mengandung angka atau karakter khusus.",
      }),
    email: z.string().email({
      message: "Silakan masukkan alamat email yang valid.",
    }),
    phone_number: z.string().min(10, {
      message: "Nomor telepon harus lebih dari 10 karakter.",
    }),
    message: z.string().min(10, {
      message: "Pesan harus lebih dari 10 karakter.",
    }),
    subject: z.string().min(1, {
      message: "Subjek harus dipilih.",
    }),
    budget_estimate: includeBudget
      ? z.string().min(1, {
          message: "Estimasi budget harus dipilih.",
        })
      : z.string().optional(),
  });
}

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
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

interface SubjectOption {
  value: string;
  label: string;
}

interface ContactFormProps {
  defaultSubject?: string;
  id?: string;
  className?: string;
  redirectTo?: string;
  showBudgetEstimate?: boolean;
  subjectOptions?: SubjectOption[];
  buttonId?: string;
  /** default = label putih (bg gelap) · mobile = kolom tunggal · light = label gelap di kartu putih */
  variant?: "default" | "mobile" | "light";
  submitLabel?: string;
}

const DEFAULT_SUBJECT_OPTIONS: SubjectOption[] = [
  { value: "kemitraan-pasif", label: "Kemitraan Pasif" },
  { value: "general", label: "General Inquiry" },
  { value: "partnership", label: "Partnership" },
  { value: "franchise", label: "Franchise" },
];

export function ContactForm({
  defaultSubject = "",
  id = "",
  className,
  redirectTo,
  showBudgetEstimate = false,
  subjectOptions = DEFAULT_SUBJECT_OPTIONS,
  buttonId = "form_reguler",
  variant = "default",
  submitLabel = "Kirim Pesan",
}: ContactFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const isMobile = variant === "mobile";
  const isLight = variant === "light";
  const formSchema = createFormSchema(showBudgetEstimate);
  type FormValues = z.infer<typeof formSchema>;

  // Get UTM parameters from URL
  const utmSource = searchParams.get("utm_source");
  const utmMedium = searchParams.get("utm_medium");
  const utmCampaign = searchParams.get("utm_campaign");
  const utmContent = searchParams.get("utm_content");

  // Pre-fill subject dari query `?program=<value>` kalau ada dan valid.
  // Dipakai oleh halaman Kemitraan Pasif buat pre-pilih program saat user
  // klik CTA card "Pilih Program Kemitraan". Validate value terhadap
  // subjectOptions supaya gak masuk value asing dari URL manipulation.
  const programParam = searchParams.get("program");
  const programInitialSubject =
    programParam && subjectOptions.some((opt) => opt.value === programParam)
      ? programParam
      : null;

  const labelClass = isMobile
    ? "font-inter text-xs font-semibold text-dark-500"
    : isLight
      ? "font-inter text-sm font-medium text-dark-500"
      : "text-white";
  const requiredMark =
    isMobile || isLight ? (
      <span className="text-error-500">*</span>
    ) : null;
  const formItemClass = isMobile || isLight ? "gap-2" : undefined;
  const inputClass = cn(
    "bg-background",
    (isMobile || isLight) &&
      "h-10 rounded-lg border-zinc-100 text-sm placeholder:text-dark-200",
  );
  const textareaClass = cn(
    inputClass,
    isMobile || isLight
      ? "min-h-24 resize-none py-4"
      : "min-h-[120px]",
  );
  const descClass = isLight
    ? "font-inter text-xs text-dark-300"
    : isMobile
      ? "font-inter text-[10px] font-normal text-error-500"
      : "text-white/70";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    defaultValues: {
      name: "",
      email: "",
      phone_number: "",
      subject: programInitialSubject || defaultSubject || "",
      message: "",
      budget_estimate: "",
    },
  });

  // Soft-navigation sync: kalau user klik CTA dari section program di halaman
  // yang sama (URL berubah jadi `?program=...#anchor` tanpa full reload),
  // defaultValues react-hook-form sudah ke-capture di mount — jadi kita
  // butuh setValue manual setiap kali programInitialSubject berubah.
  useEffect(() => {
    if (programInitialSubject) {
      form.setValue("subject", programInitialSubject, { shouldValidate: false });
    }
  }, [programInitialSubject, form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const result = await submitContactForm({
        name: values.name,
        email: values.email,
        phone_number: values.phone_number,
        subject: values.subject,
        message: values.message,
        budget_estimate: values.budget_estimate || null,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
      });

      setSubmitStatus({
        type: "success",
        message: result.message || "Formulir kontak berhasil dikirim!",
      });

      // Reset form
      form.reset();

      // Redirect to thank you page
      router.push(redirectTo || "/thank-you");
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
    <div className={cn("w-full", className)}>
      <div className="relative">
        {isSubmitting && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40">
            <div className="flex items-center gap-3 rounded-xl bg-secondary-900/90 px-4 py-3 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm md:text-base">
                Mengirim data, mohon tunggu sebentar...
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
            className={cn(isMobile ? "space-y-5" : isLight ? "space-y-5" : "space-y-6")}
            onSubmit={form.handleSubmit(onSubmit)}
            aria-busy={isSubmitting}
            id={id}>
            {isMobile ? (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="gap-2">
                      <FormLabel className={labelClass}>
                        Nama Lengkap{requiredMark}
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
                        No. Telepon{requiredMark}
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
                  name="email"
                  render={({ field }) => (
                    <FormItem className="gap-2">
                      <FormLabel className={labelClass}>
                        Email{requiredMark}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          className={inputClass}
                          placeholder="janedoe@gmail.com"
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
                  name="subject"
                  render={({ field }) => {
                    const isValidValue = subjectOptions.some(
                      (option) => option.value === field.value,
                    );
                    const selectValue = isValidValue ? field.value : "";

                    return (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>
                          Jenis Kemitraan{requiredMark}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          onOpenChange={(open) => {
                            if (!open) field.onBlur();
                          }}
                          value={selectValue || undefined}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(inputClass, "w-full")}
                            >
                              <SelectValue placeholder="Pilih jenis kemitraan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subjectOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                {showBudgetEstimate ? (
                  <FormField
                    control={form.control}
                    name="budget_estimate"
                    render={({ field }) => (
                      <FormItem className="gap-2">
                        <FormLabel className={labelClass}>
                          Estimasi Budget{requiredMark}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className={cn(inputClass, "w-full")}>
                              <SelectValue placeholder="Pilih estimasi budget" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Rp. 100.000.000 - Rp. 150.000.000">
                              Rp. 100.000.000 - Rp. 150.000.000
                            </SelectItem>
                            <SelectItem value="Rp. 150.000.000 - Rp. 200.000.000">
                              Rp. 150.000.000 - Rp. 200.000.000
                            </SelectItem>
                            <SelectItem value="Rp. 200.000.000 - Rp. 250.000.000">
                              Rp. 200.000.000 - Rp. 250.000.000
                            </SelectItem>
                            <SelectItem value="Lebih dari Rp. 250.000.000">
                              Lebih dari Rp. 250.000.000
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="gap-2">
                      <FormLabel className={labelClass}>
                        Saya ingin tahu lebih lanjut tentang{requiredMark}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClass}
                          placeholder="Tuliskan pesan di sini"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="font-inter text-[10px] font-normal text-error-500">
                        Minimal 10 Karakter
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  id={buttonId}
                  className="h-10 w-full rounded-lg bg-primary-500 font-inter text-xs font-medium text-white hover:bg-primary-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Mengirim..." : submitLabel}
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className={formItemClass}>
                        <FormLabel className={labelClass}>
                          {isLight ? "Nama Lengkap" : "Nama"}
                          {isLight ? requiredMark : null}
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={cn(inputClass, !isLight && "bg-background")}
                            placeholder={
                              isLight ? "Jane Doe" : "Masukkan nama lengkap"
                            }
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
                      <FormItem className={formItemClass}>
                        <FormLabel className={labelClass}>
                          Email{isLight ? requiredMark : null}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            className={cn(inputClass, !isLight && "bg-background")}
                            placeholder={
                              isLight ? "janedoe@gmail.com" : "nama@email.com"
                            }
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem className={formItemClass}>
                        <FormLabel className={labelClass}>
                          {isLight ? "No. Telepon" : "Nomor Telepon"}
                          {isLight ? requiredMark : null}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            className={cn(inputClass, !isLight && "bg-background")}
                            placeholder={
                              isLight ? "08xxxxxxxxxx" : "081234567890"
                            }
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
                    name="subject"
                    render={({ field }) => {
                      const isValidValue = subjectOptions.some(
                        (option) => option.value === field.value,
                      );
                      const selectValue = isValidValue ? field.value : "";

                      return (
                        <FormItem className={cn("w-full", formItemClass)}>
                          <FormLabel className={labelClass}>
                            {isLight ? "Jenis Kemitraan" : "Subjek"}
                            {isLight ? requiredMark : null}
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                            onOpenChange={(open) => {
                              if (!open) {
                                field.onBlur();
                              }
                            }}
                            value={selectValue || undefined}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={cn(
                                  "w-full",
                                  isLight ? inputClass : "bg-background",
                                )}
                              >
                                <SelectValue
                                  placeholder={
                                    isLight
                                      ? "Pilih jenis kemitraan"
                                      : "Pilih subjek"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjectOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  {showBudgetEstimate ? (
                    <FormField
                      control={form.control}
                      name="budget_estimate"
                      render={({ field }) => (
                        <FormItem className={cn("w-full", formItemClass)}>
                          <FormLabel className={labelClass}>
                            Estimasi Budget{isLight ? requiredMark : null}
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={cn(
                                  "w-full",
                                  isLight ? inputClass : "bg-background",
                                )}
                              >
                                <SelectValue placeholder="Pilih estimasi budget" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Rp. 100.000.000 - Rp. 150.000.000">
                                Rp. 100.000.000 - Rp. 150.000.000
                              </SelectItem>
                              <SelectItem value="Rp. 150.000.000 - Rp. 200.000.000">
                                Rp. 150.000.000 - Rp. 200.000.000
                              </SelectItem>
                              <SelectItem value="Rp. 200.000.000 - Rp. 250.000.000">
                                Rp. 200.000.000 - Rp. 250.000.000
                              </SelectItem>
                              <SelectItem value="Lebih dari Rp. 250.000.000">
                                Lebih dari Rp. 250.000.000
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className={formItemClass}>
                      <FormLabel className={labelClass}>
                        {isLight
                          ? "Saya ingin tahu lebih lanjut tentang"
                          : "Pesan"}
                        {isLight ? requiredMark : null}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={cn(
                            textareaClass,
                            !isLight && !isMobile && "min-h-[120px] bg-background",
                          )}
                          placeholder={
                            isLight
                              ? "Tuliskan pesan di sini"
                              : "Tuliskan pesan atau pertanyaan Anda di sini..."
                          }
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
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    id={buttonId}
                    className="w-fit"
                    size="xl"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Mengirim..." : submitLabel}
                    <ArrowRight className="size-5" />
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
