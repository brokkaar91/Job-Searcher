"use client";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileNav({
  links,
  menuLabel,
}: {
  links: { href: string; label: string }[];
  menuLabel: string;
}) {
  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={menuLabel}>
            <Menu aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {links.map((l) => (
            <DropdownMenuItem key={l.href} asChild>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link href={l.href as any}>{l.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
