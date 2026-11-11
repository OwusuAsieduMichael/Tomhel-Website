import { insert, newId, update, type Notice, type Store, type WriteOp } from "./store";

/**
 * In-app notices: short messages to one user, shown on their home page with a count in the menu.
 * The portal sends no email or SMS, so this is how students hear about new work, reminders and returned marks.
 */

export type NoticeInput = { title: string; body?: string | null; href?: string | null };

/** Write ops that send the same notice to each user. Add them to the batch that makes the change. */
export function noticeOps(userIds: string[], n: NoticeInput, now = new Date()): WriteOp[] {
  const ids = [...new Set(userIds)];
  if (!ids.length) return [];
  const rows: Notice[] = ids.map((userId) => ({
    id: newId(),
    userId,
    title: n.title.slice(0, 200),
    body: n.body ? n.body.slice(0, 1000) : null,
    href: n.href ?? null,
    createdAt: now,
    readAt: null,
  }));
  return [insert("notices", rows)];
}

/** The user's notices, newest first (at most `limit`). */
export async function listNotices(store: Store, userId: string, limit = 20) {
  const { notices } = await store.read("notices");
  return notices
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function unreadNoticeCount(store: Store, userId: string) {
  const { notices } = await store.read("notices");
  return notices.filter((n) => n.userId === userId && !n.readAt).length;
}

export async function markNoticesRead(store: Store, userId: string, now = new Date()) {
  const { notices } = await store.read("notices");
  await store.write(notices.filter((n) => n.userId === userId && !n.readAt).map((n) => update("notices", n.id, { readAt: now })));
}
