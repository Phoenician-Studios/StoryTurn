"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { appUrl } from "@/lib/config";
import { invitePath } from "@/lib/domain/invites";

export function CopyInviteLinkButton({ code }: { code: string }) {
  const toast = useToast();
  const href = `${appUrl()}${invitePath(code)}`;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(href);
          toast.success({
            title: "Invite link copied",
            description: href,
          });
        } catch {
          toast.error("Could not copy invite link");
        }
      }}
    >
      Copy link
    </Button>
  );
}
