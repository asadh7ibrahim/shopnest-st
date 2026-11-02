"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryFormState,
} from "@/app/actions/admin-categories";
import type { Category } from "@/types/db";

export function CategoryCreateForm() {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(createCategory, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      <h2 className="font-semibold">New category</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">Name</label>
          <input id="c-name" name="name" required maxLength={80} className="input" />
        </div>
        <div>
          <label htmlFor="c-slug" className="label">Slug (optional)</label>
          <input id="c-slug" name="slug" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="input font-mono" placeholder="auto-generated" />
        </div>
      </div>
      <div>
        <label htmlFor="c-desc" className="label">Description (optional)</label>
        <input id="c-desc" name="description" maxLength={500} className="input" />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}

export function CategoryRow({ category }: { category: Category }) {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(
    updateCategory.bind(null, category.id),
    undefined,
  );
  const [deleting, startDelete] = useTransition();

  return (
    <li className="p-4">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <div>
          <label htmlFor={`n-${category.id}`} className="label">Name</label>
          <input id={`n-${category.id}`} name="name" required maxLength={80} defaultValue={category.name} className="input" />
        </div>
        <div>
          <label htmlFor={`s-${category.id}`} className="label">Slug</label>
          <input id={`s-${category.id}`} name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={category.slug} className="input font-mono" />
        </div>
        <div>
          <label htmlFor={`d-${category.id}`} className="label">Description</label>
          <input id={`d-${category.id}`} name="description" maxLength={500} defaultValue={category.description ?? ""} className="input" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <button
            type="button"
            className="btn-secondary text-red-600"
            disabled={deleting}
            onClick={() => {
              if (window.confirm(`Delete "${category.name}"? Products in it will become uncategorised.`)) {
                startDelete(async () => {
                  await deleteCategory(category.id);
                });
              }
            }}
          >
            Delete
          </button>
        </div>
      </form>
      {state?.error && <p className="mt-2 text-sm text-red-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-green-700" role="status">Saved.</p>}
    </li>
  );
}
