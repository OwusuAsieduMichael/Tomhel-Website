"use client";

import { useActionState } from "react";
import { Field, FormMessage, prepButton, SelectField } from "@/components/prep/ui";
import { cn } from "@/lib/utils";
import { saveNewsAction, type NewsFormState } from "./actions";

type Post = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  eventStart: string;
  eventEnd: string;
  status: "draft" | "published";
};

const area = "w-full rounded-xl border border-prep-input bg-prep-surface px-3.5 py-3 text-base leading-relaxed focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary";

/** Write or edit a website post. "Publish" puts it on the website; "Save draft" keeps it for admins only. */
export function NewsForm({ post, savedNote }: { post?: Post; savedNote?: string }) {
  const [state, action, pending] = useActionState<NewsFormState, FormData>(saveNewsAction, savedNote ? { saved: savedNote } : {});
  const published = post?.status === "published";
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} success={state.saved} />
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <Field label="Title" name="title" defaultValue={post?.title} required maxLength={140} />
      <SelectField label="Category" name="category" defaultValue={post?.category ?? "Announcements"} required>
        <option value="Announcements">Announcements</option>
        <option value="Events">Events</option>
        <option value="Achievements">Achievements</option>
      </SelectField>
      <div className="space-y-1.5">
        <label htmlFor="news-excerpt" className="block text-sm font-semibold">
          Summary
        </label>
        <textarea id="news-excerpt" name="excerpt" defaultValue={post?.excerpt} rows={2} maxLength={300} required aria-describedby="news-excerpt-hint" className={area} />
        <p id="news-excerpt-hint" className="text-sm text-prep-muted">
          One or two sentences, shown on the news cards.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="news-body" className="block text-sm font-semibold">
          Full text <span className="font-normal text-prep-muted">(optional)</span>
        </label>
        <textarea id="news-body" name="body" defaultValue={post?.body} rows={10} aria-describedby="news-body-hint" className={area} />
        <p id="news-body-hint" className="text-sm text-prep-muted">
          Leave a blank line between paragraphs.
        </p>
      </div>
      <fieldset className="space-y-3 rounded-xl border border-prep-line p-4">
        <legend className="px-1 text-sm font-semibold">Date of the event (optional)</legend>
        <p className="text-sm text-prep-muted">For graduation, sports day, vacation and other dates. They show under &quot;Upcoming dates&quot; on the website until they are over.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From" name="eventStart" type="date" defaultValue={post?.eventStart} />
          <Field label="To (if more than one day)" name="eventEnd" type="date" defaultValue={post?.eventEnd} />
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="intent" value="publish" className={prepButton()} disabled={pending}>
          {pending ? "Saving…" : published ? "Save and keep published" : "Publish on the website"}
        </button>
        <button type="submit" name="intent" value="draft" className={cn(prepButton({ variant: "secondary" }))} disabled={pending}>
          {published ? "Take off the website (draft)" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
