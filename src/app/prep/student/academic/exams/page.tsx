import { redirect } from "next/navigation";

/** Renamed to Assignments; older notices and bookmarks still point here. */
export default function ExamsPage() {
  redirect("/prep/student/academic/assignments");
}
