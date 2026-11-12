import Image from "next/image";
import { schoolImages } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** The school logo inside a spinning ring: used by the welcome screen and the page loading screen. */
export function LogoSpinner({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <div className={cn("relative", lg ? "size-24" : "size-16")}>
      <span
        className={cn("absolute inset-0 animate-prep-spin rounded-full border-prep-primary-soft border-t-prep-primary motion-reduce:animate-none", lg ? "border-4" : "border-[3px]")}
        aria-hidden
      />
      <Image
        src={schoolImages.logo}
        alt=""
        width={lg ? 68 : 44}
        height={lg ? 68 : 44}
        className={cn("absolute rounded-full object-cover", lg ? "inset-[14px] size-[68px]" : "inset-[10px] size-11")}
        priority
      />
    </div>
  );
}
