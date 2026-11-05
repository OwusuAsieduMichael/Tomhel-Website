import type { Role } from "@/lib/prep/store";

export type NavIcon = "home" | "book" | "chart" | "user" | "clipboard" | "inbox" | "users" | "school" | "library";

export type NavItem = { label: string; href: string; icon: NavIcon };

/** Main navigation per role. The first item is the role's home and only matches exactly. */
export const navByRole: Record<Role, NavItem[]> = {
  student: [
    { label: "Home", href: "/prep/student", icon: "home" },
    { label: "Academic Prep", href: "/prep/student/academic", icon: "book" },
    { label: "Progress", href: "/prep/student/progress", icon: "chart" },
    { label: "Profile", href: "/prep/student/profile", icon: "user" },
  ],
  teacher: [
    { label: "Dashboard", href: "/prep/teacher", icon: "home" },
    { label: "Assignments", href: "/prep/teacher/assignments", icon: "clipboard" },
    { label: "Review queue", href: "/prep/teacher/review", icon: "inbox" },
    { label: "Profile", href: "/prep/teacher/profile", icon: "user" },
  ],
  admin: [
    { label: "Overview", href: "/prep/admin", icon: "home" },
    { label: "People", href: "/prep/admin/people", icon: "users" },
    { label: "Classes & subjects", href: "/prep/admin/classes", icon: "school" },
    { label: "Questions", href: "/prep/admin/questions", icon: "library" },
    { label: "Profile", href: "/prep/admin/profile", icon: "user" },
  ],
};

/** Sub-tabs inside Academic Preparation (students). */
export const academicTabs = [
  { label: "BECE", href: "/prep/student/academic/bece" },
  { label: "Quiz", href: "/prep/student/academic/quiz" },
  { label: "Exams", href: "/prep/student/academic/exams" },
] as const;

export function isActive(item: { href: string }, pathname: string, isHome: boolean): boolean {
  if (isHome) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export const roleLabel: Record<Role, string> = { student: "Student", teacher: "Teacher", admin: "Admin" };
