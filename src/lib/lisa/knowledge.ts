import * as site from "@/lib/constants";

/**
 * What LISA knows: the website's own text (src/lib/constants.ts, the same values the pages show), the pages of
 * the site and how its services work. Nothing about any student, parent or payment: LISA can't look anything up.
 * Built from the content, so when the website's text changes, LISA's answers follow.
 */

/** Keys that hold pictures, videos, links or layout settings, not words a visitor would ask about. */
const SKIP = /^(image|images|img|src|slides|video|videoSrc|poster|href|phoneHref|imageAlt|imageFit|alt|icon|url|social|phones|backgroundImage|thumbnail|embed|youtube|logo)$/i;

function toText(value: unknown, depth = 0): string {
  const pad = "  ".repeat(depth);
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const t = toText(v, depth + 1).trim();
        return t ? `${pad}- ${t.replace(/\n/g, `\n${pad}  `)}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    const lines = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => !SKIP.test(k) && v !== "" && v !== null && v !== undefined)
      .map(([k, v]) => {
        const t = toText(v, depth + 1);
        if (!t.trim()) return "";
        return t.includes("\n") ? `${pad}${k}:\n${t}` : `${pad}${k}: ${t}`;
      })
      .filter(Boolean);
    return lines.join("\n");
  }
  return "";
}

const section = (title: string, value: unknown) => {
  const t = toText(value).trim();
  return t ? `## ${title}\n${t}` : "";
};

const PAGES = `## Pages of the website (link to them with their path, e.g. [Admissions](/admissions))
- Home: /
- About (history, values, leadership, headmaster's welcome): /about
- Academics (programmes from Creche to Junior High): /academics
- Admissions (steps, requirements, FAQs, applying): /admissions
- Student Life (sports, clubs, culture, student representatives): /student-life
- Gallery (photos): /gallery
- News & Events (news, announcements, upcoming dates): /news
- Contact (phone, email, location, contact form, booking a visit): /contact
- Pay Fees (pay school fees online): /pay-fees
- Donate (support school projects): /donate
- Academic Prep portal for students, parents and staff (log in): /prep/login`;

const SERVICES = `## How the website's services work
Paying school fees online (/pay-fees): enter the child's Student ID (it is on the school report and the portal login slip). The page shows the child's first name and class, each term's fee, what has been paid and the balance. Pay all or part of a term with MTN MoMo, Telecel Cash, AirtelTigo Money or a bank card through Paystack's secure page, then get a printable receipt. If a class's fees are not shown online yet, or online payment is not open, pay at the school office. Questions about a particular child's fees or a payment go to the school office: LISA cannot see any account or payment.

Donating (/donate): choose one of the school's projects or the general fund, choose an amount, and pay by mobile money or card through Paystack. Donors can keep their name private. A receipt is shown after paying.

Academic Prep portal (/prep/login): students practise BECE past papers (Practice mode mixes every year's questions with answers shown straight away; Test mode is one year's paper like the exam), do quizzes and assignments their teachers set, and follow their progress. Parents log in with their own Parent ID (for example TP11 for student TMH11) and the temporary password the school gives them, then choose their own password; they see their children's progress, quizzes, assignments and BECE practice, and can't change anything. Teachers and staff log in with their Staff ID. A forgotten password is reset by the school office (the portal has no "forgot password" link): call or visit the office.`;

/** The part that changes only when the website's text changes. Kept first, so it is cached between questions. */
export function staticKnowledge(): string {
  return [
    section("School", site.siteConfig),
    section("Headmaster's welcome", site.headmasterWelcome),
    section("History", site.schoolHistory),
    section("History timeline", site.historyTimeline),
    section("Core values", site.coreValues),
    section("Pillars", site.pillars),
    section("Key figures", site.stats),
    section("Why choose Tomhel", site.vantageSection),
    section("Leadership", site.leadership),
    section("Programmes", site.programs),
    section("Academics", site.academicsData),
    section("Facilities", site.facilities),
    section("Staff", site.staffSection),
    section("Kitchen and catering", site.kitchenStaffSection),
    section("School transport", site.transportSection),
    section("Student life", site.studentLifeCategories),
    section("Student representatives", site.studentRepresentativeVoting),
    section("Admission steps", site.admissionSteps),
    section("Admission questions and answers", site.admissionFaqs),
    section("What parents say", site.testimonials),
    PAGES,
    SERVICES,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export type DynamicKnowledge = {
  news: { title: string; excerpt: string; category: string; publishedAt: string; slug: string; eventStart?: string; eventEnd?: string }[];
  projects: { title: string; description: string }[];
};

/** News, dates and donation projects: changes during the term, so it comes after the cached part. */
export function dynamicKnowledge(d: DynamicKnowledge, today: Date): string {
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const news = d.news
    .slice(0, 15)
    .map((n) => {
      const when = n.eventStart ? ` (date: ${day(n.eventStart)}${n.eventEnd && n.eventEnd !== n.eventStart ? ` to ${day(n.eventEnd)}` : ""})` : "";
      return `- ${n.title}${when}. ${n.excerpt} [${n.category}, posted ${day(n.publishedAt)}, page /news/${n.slug}]`;
    })
    .join("\n");
  const projects = d.projects.map((p) => `- ${p.title}: ${p.description}`).join("\n");
  return [
    `## Today\n${today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })}`,
    `## Latest news, events and dates\n${news || "No news posted yet."}`,
    `## Donation projects open now\n${projects || "No projects right now; donations go to the general fund."}`,
  ].join("\n\n");
}
