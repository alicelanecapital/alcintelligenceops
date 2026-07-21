import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrCreateBookingLink } from "@/lib/booking.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Personal booking link (share with clients to auto-book meetings).
 * Rendered on Admin → Accounts, immediately below the Email Signature card.
 */
export function BookingLinkCard() {
  const getLinkFn = useServerFn(getOrCreateBookingLink);
  const q = useQuery({ queryKey: ["booking-link"], queryFn: () => getLinkFn() });
  const url = q.data && typeof window !== "undefined" ? `${window.location.origin}/book/${(q.data as any).slug}` : null;
  const prettyUrl = url ? url.replace(/^https?:\/\//, "") : null;

  return (
    <Card className="mt-6 border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarPlus className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-serif text-lg leading-tight">Your personal booking link</div>
            <div className="text-xs text-muted-foreground mt-0.5">Share this with clients — they'll see your open times and book directly into your calendar.</div>
          </div>
        </div>
        {url ? (
          <div className="flex items-center gap-2 flex-wrap pl-12">
            <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline break-all">
              {prettyUrl}
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied — paste it into an email or message", { id: "booking-copy" }); }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy link
            </Button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground pl-12">{q.isLoading ? "Creating your link…" : ""}</div>
        )}
      </CardContent>
    </Card>
  );
}
