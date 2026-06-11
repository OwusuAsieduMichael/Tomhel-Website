import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Container({ children, className, as: Tag = "div" }: ContainerProps) {
  return <Tag className={cn("container-width", className)}>{children}</Tag>;
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  surface?: boolean;
}

export function Section({ children, className, id, surface }: SectionProps) {
  return (
    <section
      id={id}
      className={cn("section-padding", surface && "bg-surface", className)}
    >
      {children}
    </section>
  );
}
