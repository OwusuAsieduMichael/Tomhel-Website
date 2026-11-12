import { PageHeading } from "@/components/prep/ui";
import { AcademicTabs } from "./academic-tabs";

export default function AcademicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeading title="Academic Preparation" />
      <AcademicTabs />
      <div className="mt-6">{children}</div>
    </>
  );
}
