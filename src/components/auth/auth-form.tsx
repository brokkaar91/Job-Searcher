"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink, type AuthState } from "./actions";
import { ConsentFields } from "./consent-fields";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState<AuthState, FormData>(sendMagicLink, {
    status: "idle",
  });
  const [googleError, setGoogleError] = useState(false);

  async function signInWithGoogle() {
    const target = next ?? (locale === "nl" ? "/matches" : `/${locale}/matches`);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
      },
    });
    if (error) setGoogleError(true);
  }

  if (state.status === "sent") {
    return (
      <div role="status" className="space-y-3 text-center">
        <MailCheck aria-hidden className="text-primary mx-auto size-10" />
        <h2 className="text-xl font-semibold">{t("sent.title")}</h2>
        <p className="text-muted-foreground text-sm">{t("sent.text")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        {next && <input type="hidden" name="next" value={next} />}
        <div className="grid gap-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        {mode === "register" && <ConsentFields />}
        {state.status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {t(`errors.${state.error ?? "failed"}`)}{" "}
            {state.error === "noAccount" && (
              <Link href="/register" className="underline">
                {t("toRegister")}
              </Link>
            )}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("sending") : t(mode === "login" ? "submitLogin" : "submitRegister")}
        </Button>
      </form>
      {mode === "login" && (
        <>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <Separator className="flex-1" /> {t("or")} <Separator className="flex-1" />
          </div>
          <Button variant="outline" className="w-full" onClick={signInWithGoogle} type="button">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4">
              <path
                fill="#4285F4"
                d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8Z"
              />
              <path
                fill="#34A853"
                d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9l3.6-2.8Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4Z"
              />
            </svg>
            {t("google")}
          </Button>
          {googleError && (
            <p role="alert" className="text-destructive text-sm">
              {t("errors.failed")}
            </p>
          )}
        </>
      )}
      <p className="text-muted-foreground text-center text-sm">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link
          href={mode === "login" ? "/register" : "/login"}
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          {mode === "login" ? t("toRegister") : t("toLogin")}
        </Link>
      </p>
    </div>
  );
}
