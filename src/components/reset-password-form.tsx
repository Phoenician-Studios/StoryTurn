"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function ResetPasswordForm() {
  const toast = useToast();

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const email = new FormData(form).get("email");
        if (typeof email !== "string" || !email.includes("@")) {
          toast.error("Enter a valid email");
          return;
        }
        toast.success({
          title: "Reset link ready",
          description:
            "In demo mode nothing is emailed. With Supabase configured, a recovery message would go out now.",
        });
        form.reset();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button type="submit" className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
