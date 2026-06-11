# Tomhel Preparatory School — Product Specification

## 1. Information Architecture

```
Tomhel Preparatory School (Root)
├── Home
├── About
│   ├── School Story
│   ├── Mission & Vision
│   ├── Core Values
│   ├── Leadership Team
│   └── History Timeline
├── Academics
│   ├── Kindergarten
│   ├── Primary
│   └── Junior High School
├── Admissions
│   ├── Process
│   ├── Requirements
│   ├── Application Form
│   └── FAQs
├── Student Life
│   ├── Sports
│   ├── Clubs
│   ├── Competitions
│   ├── Excursions
│   └── Cultural Activities
├── Gallery
│   ├── Campus
│   ├── Academics
│   ├── Events
│   ├── Sports
│   └── Graduation
├── News & Events (CMS)
│   ├── News
│   ├── Events
│   ├── Announcements
│   └── Achievements
├── Contact
└── Portal Access (TAIM Gateway)
    ├── Student Login
    ├── Parent Login
    ├── Teacher Login
    └── Admin Login
```

**Global elements:** Header navigation, footer, skip link, mobile menu, CTA patterns.

---

## 2. User Flows

### Prospective Parent (Primary)
1. Land on Home → scan hero & pillars → view stats & programs
2. Explore Academics → review curriculum per level
3. Read About → trust signals (leadership, history)
4. Admissions → process → submit application form
5. Contact for follow-up OR Portal preview

### Current Parent
1. Home → Portal Access → Parent login (TAIM)
2. News & Events → announcements
3. Contact → office hours, phone

### Student
1. Portal Access → Student login
2. Student Life → clubs, sports
3. Gallery → campus life

### Alumni / Partner
1. About → history & achievements
2. News → achievements
3. Contact → partnership inquiry

---

## 3. Page Hierarchy

| Page | Priority | Primary Goal |
|------|----------|--------------|
| Home | P0 | First impression, conversion |
| Admissions | P0 | Application submissions |
| Academics | P1 | Program understanding |
| About | P1 | Trust & credibility |
| Portal | P1 | Ecosystem gateway |
| Contact | P1 | Communication |
| Student Life | P2 | Culture & engagement |
| News | P2 | Updates (CMS) |
| Gallery | P2 | Visual proof |

---

## 4. Component Inventory

### Layout
- `SiteHeader` — sticky nav, mobile drawer
- `SiteFooter` — links, contact, social
- `Container` — max-width 1280px
- `Section` — consistent vertical rhythm (120px+)
- `SkipLink` — accessibility

### Marketing
- `HeroSection` — full-screen hero with CTAs
- `PillarGrid` — 4-column value props
- `StatCounter` — animated numbers
- `ProgramCard` — academic level cards
- `TaimShowcase` — SaaS-style feature grid
- `FacilityGallery` — premium image grid
- `TestimonialCarousel` — social proof
- `NewsPreview` — CMS article cards
- `AdmissionsCTA` — conversion band
- `PageHero` — interior page headers
- `Timeline` — history visualization
- `TeamGrid` — leadership cards
- `AccordionFAQ` — admissions FAQs
- `MasonryGallery` — categorized photos
- `PortalGateway` — login role cards

### UI (shadcn)
- Button, Card, Input, Label, Textarea, Select
- Tabs, Accordion, Badge, Separator

### Motion
- `FadeIn` — scroll-triggered reveal
- `AnimatedCounter` — stat animation

### Forms
- `ContactForm` — validated contact
- `ApplicationForm` — admissions conversion

---

## 5. Design System

### Typography — Inter
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| hero | 72–96px | 700 | Home headline |
| h1 | 48–64px | 700 | Page titles |
| h2 | 32–40px | 600 | Section titles |
| h3 | 24–28px | 600 | Subsections |
| body | 16–18px | 400 | Paragraphs |
| small | 14px | 400 | Meta, captions |

### Colors
| Token | Value | Use |
|-------|-------|-----|
| primary | #0A0A0A | Text, buttons |
| background | #FFFFFF | Page bg |
| accent | #2563EB | Links, highlights |
| muted | #737373 | Secondary text |
| border | #E5E5E5 | Dividers |
| surface | #FAFAFA | Cards, sections |

### Spacing
- Section: `py-24 md:py-32` (96–128px)
- Container: `max-w-7xl mx-auto px-6 lg:px-8`
- Gap scale: 4, 6, 8, 12, 16, 24

### Radius & Shadow
- Cards: `rounded-2xl`, subtle `shadow-sm`
- Buttons: `rounded-full` (primary CTA)

---

## 6. Wireframes (Structural)

### Home
```
[Header]
[Hero — full viewport, headline + 2 CTAs + image]
[Why Tomhel — 4 cards]
[Stats — 4 counters]
[Programs — 3 cards]
[TAIM — split layout, feature list]
[Facilities — 2x2 image grid]
[Testimonials — 3 cards]
[News — 3 article cards]
[Admissions CTA — dark band]
[Footer]
```

### Interior pages
```
[Header]
[Page Hero — title + breadcrumb optional]
[Content sections — alternating white/surface]
[Footer]
```

---

## 7. High-Fidelity Design Specification

- **Aesthetic:** Apple minimalism + Stripe layout precision + Linear micro-interactions
- **Hero:** Dark overlay on educational photography, white text, pill CTAs
- **Cards:** White on `#FAFAFA` sections, 1px border, hover lift
- **TAIM section:** Dark `#0A0A0A` background, gradient accent, product mockup feel
- **Typography:** Tight tracking on headlines (-0.02em), relaxed body (1.7 line-height)
- **Motion:** 0.5s ease-out fades, stagger 0.1s on grids, counter spring animation
- **Images:** Next/Image with blur placeholders, aspect-ratio locked
- **Focus:** 2px accent ring, visible on all interactive elements
- **Mobile:** Single column, hamburger nav, stacked CTAs full-width

---

*This document governs implementation. Code lives in `/src`.*
