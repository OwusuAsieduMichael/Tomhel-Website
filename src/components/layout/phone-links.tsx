import { siteConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PhoneLinksProps {
  className?: string;
  linkClassName?: string;
}

export function PhoneLinks({ className, linkClassName }: PhoneLinksProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {siteConfig.phones.map((phone) => (
        <a
          key={phone.href}
          href={`tel:${phone.href}`}
          className={cn("block hover:text-accent", linkClassName)}
        >
          {phone.display}
        </a>
      ))}
    </div>
  );
}
