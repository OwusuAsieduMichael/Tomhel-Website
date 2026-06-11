# Tomhel Preparatory School — Official Website

Modern, premium official website for Tomhel Preparatory School, built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, and Sanity CMS.

## Product Documentation

See [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) for information architecture, user flows, component inventory, design system, wireframes, and high-fidelity specifications.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (Radix primitives)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **CMS:** Sanity (optional — fallback content included)
- **Forms:** React Hook Form + Zod
- **Hosting:** Vercel-ready

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
```

Without Sanity configured, the site uses built-in fallback news content.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, pillars, stats, programs, TAIM, facilities, testimonials, news |
| `/about` | Story, mission, vision, values, leadership, timeline |
| `/academics` | Kindergarten, Primary, JHS programs |
| `/admissions` | Process, requirements, application form, FAQs |
| `/student-life` | Sports, clubs, competitions, excursions, culture |
| `/gallery` | Masonry gallery with category tabs |
| `/news` | CMS-powered news & events |
| `/contact` | Contact form, info, map |
| `/portal` | TAIM gateway with role-based login |

## Deploy to Vercel

Set environment variables in the Vercel dashboard before deploying.

## Accessibility & Performance

- WCAG 2.2 AA: semantic HTML, skip link, focus states, ARIA labels
- SEO: metadata, Open Graph, JSON-LD, sitemap, robots.txt
- Target: Lighthouse 90+ with optimized images and minimal client JS
