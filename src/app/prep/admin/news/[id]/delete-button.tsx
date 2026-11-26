"use client";

/** Deleting a post can't be undone, so it asks first. */
export function DeleteButton({ title }: { title: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(`Delete "${title}"? It is removed from the website and can't be brought back.`)) e.preventDefault();
      }}
      className="min-h-11 rounded-xl px-3 text-sm font-semibold text-prep-incorrect hover:bg-prep-incorrect-bg"
    >
      Delete this post
    </button>
  );
}
