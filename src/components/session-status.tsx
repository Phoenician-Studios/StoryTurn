import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/lib/types";

const colors: Record<SessionStatus, string> = {
  scheduled: "bg-accent/20 text-accent-foreground",
  completed: "bg-secondary text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

export function SessionStatusBadge({
  status,
  className,
}: {
  status: SessionStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(colors[status], className)}>
      {status === "cancelled" ? "Canceled" : status[0].toUpperCase() + status.slice(1)}
    </Badge>
  );
}
