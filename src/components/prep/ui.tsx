import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Buttons for /prep. 44px minimum height for touch targets. Use on <button> or <Link>. */
export const prepButton = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-prep-primary text-white hover:bg-prep-primary/90",
        secondary: "border border-prep-line bg-prep-surface text-prep-ink hover:bg-prep-ground",
        ghost: "text-prep-ink hover:bg-prep-primary-soft",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary" },
  },
);

export type PrepButtonVariants = VariantProps<typeof prepButton>;

export function PrepCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-prep-line bg-prep-surface p-5", className)} {...props} />;
}

export function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {description ? <p className="mt-1 text-prep-muted">{description}</p> : null}
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string };

/** Labelled input. The label is always visible (not just a placeholder). */
export function Field({ label, name, hint, className, id, ...props }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-describedby={hintId}
        className={cn(
          "block min-h-[52px] w-full rounded-xl border border-prep-input bg-prep-surface px-4 text-base text-prep-ink placeholder:text-prep-muted focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary",
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-prep-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string };

/** Labelled native select: works with every phone keyboard and screen reader. */
export function SelectField({ label, name, className, id, children, ...props }: SelectProps) {
  const selectId = id ?? `field-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-sm font-semibold">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        className={cn(
          "block min-h-[52px] w-full rounded-xl border border-prep-input bg-prep-surface px-4 text-base text-prep-ink focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error)
    return (
      <p role="alert" className="rounded-xl border border-prep-incorrect/30 bg-prep-incorrect-bg px-4 py-3 text-sm text-prep-incorrect">
        {error}
      </p>
    );
  if (success)
    return (
      <p role="status" className="rounded-xl border border-prep-awarded/30 bg-prep-primary-soft px-4 py-3 text-sm text-prep-awarded">
        {success}
      </p>
    );
  return null;
}

/** Marks a screen whose features arrive in a later build phase. */
export function ComingSoon({ what, phase }: { what: string; phase: number }) {
  return (
    <PrepCard className="border-dashed text-prep-muted">
      <p>
        <span className="font-semibold text-prep-ink">{what}</span> is coming in build phase {phase}.
      </p>
    </PrepCard>
  );
}
