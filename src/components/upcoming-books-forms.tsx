"use client";

import {
  addRandomBooksToUpcomingAction,
  shuffleUpcomingBooksAction,
} from "@/app/actions";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";

function updatedCount(result: unknown) {
  return result && typeof result === "object" && "updated" in result
    ? Number((result as { updated: number }).updated)
    : 0;
}

function nights(count: number) {
  return `${count} night${count === 1 ? "" : "s"}`;
}

export function AddRandomBooksForm() {
  return (
    <ToastForm
      action={addRandomBooksToUpcomingAction}
      successMessage={(result) => `Added books to ${nights(updatedCount(result))}`}
    >
      <Button type="submit">Add random books to upcoming nights</Button>
    </ToastForm>
  );
}

export function ShuffleUpcomingBooksForm() {
  return (
    <ToastForm
      action={shuffleUpcomingBooksAction}
      successMessage={(result) => `Shuffled books on ${nights(updatedCount(result))}`}
    >
      <Button type="submit" variant="secondary">
        Shuffle books for all upcoming nights
      </Button>
    </ToastForm>
  );
}
