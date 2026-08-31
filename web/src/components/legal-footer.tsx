import Link from "next/link";

const LINKS = [
  { href: "/sms", label: "SMS opt-in" },
  { href: "/sms/flow", label: "Message flow" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 ${className}`}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35 hover:text-cyan-200/80"
        >
          {link.label}
        </Link>
      ))}
    </footer>
  );
}

export function LegalShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#05070F] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">
          ← Galaxy Health
        </Link>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">{title}</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-white/70">{children}</div>
        <LegalFooter className="mt-12 border-t border-white/10 pt-6" />
      </div>
    </main>
  );
}
