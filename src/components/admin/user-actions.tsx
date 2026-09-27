"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  adminDeleteUser,
  markContactHandled,
  setUserRole,
} from "@/app/[locale]/admin/users/actions";

export function UserActions({
  id,
  role,
  email,
}: {
  id: string;
  role: "user" | "admin";
  email: string;
}) {
  const t = useTranslations("admin.users");
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await setUserRole(id, role === "admin" ? "user" : "admin");
              toast.success(t("updated"));
            } catch (e) {
              toast.error((e as Error).message);
            }
          })
        }
      >
        {role === "admin" ? t("demote") : t("promote")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        disabled={pending}
        onClick={() =>
          confirm(t("confirmDelete", { email })) &&
          start(async () => {
            try {
              await adminDeleteUser(id);
              toast.success(t("deleted"));
            } catch (e) {
              toast.error((e as Error).message);
            }
          })
        }
      >
        {t("delete")}
      </Button>
    </div>
  );
}

export function ContactHandled({ id }: { id: string }) {
  const t = useTranslations("admin.users");
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => markContactHandled(id))}
    >
      {t("handled")}
    </Button>
  );
}
