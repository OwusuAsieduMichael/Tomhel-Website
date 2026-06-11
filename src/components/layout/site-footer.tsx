import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Separator } from "@/components/ui/separator";
import { navigation, schoolImages, siteConfig } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-primary text-white">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src={schoolImages.logo}
              alt={siteConfig.name}
              width={64}
              height={64}
              className="h-14 w-14 rounded-full object-cover"
            />
            <p className="mt-3 text-sm font-medium text-taim">{siteConfig.slogan}</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              {siteConfig.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              {navigation.slice(0, 6).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {siteConfig.address}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                <a href={`tel:${siteConfig.phoneHref}`} className="hover:text-white">
                  {siteConfig.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                  {siteConfig.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">Connect</h3>
            <div className="mt-4 flex gap-3">
              <a href={siteConfig.social.facebook} aria-label="Facebook" className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={siteConfig.social.instagram} aria-label="Instagram" className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20">
                <Instagram className="h-4 w-4" />
              </a>
              <a href={siteConfig.social.linkedin} aria-label="LinkedIn" className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-6 text-sm text-white/60">{siteConfig.officeHours}</p>
          </div>
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/50 md:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/admissions" className="hover:text-white">Admissions</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
