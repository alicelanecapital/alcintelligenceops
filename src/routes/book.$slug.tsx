import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBookingAvailability, createBooking } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/book/$slug")({ component: BookingPage });

function BookingPage() {
  const { slug } = Route.useParams();
  const availFn = useServerFn(getBookingAvailability);
  const bookFn = useServerFn(createBooking);
  const avail = useQuery({ queryKey: ["booking-availability", slug], queryFn: () => availFn({ data: { slug } }) });

  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<{ startTime: string } | null>(null);

  const bookMut = useMutation({
    mutationFn: () => bookFn({ data: { slug, startTime: selected!, clientName: name, clientEmail: email, notes: notes || undefined } }),
    onSuccess: (res) => { setDone(res); toast.success("Booked!"); },
    onError: (e: any) => toast.error(e.message ?? "Failed to book"),
  });

  const grouped = (avail.data?.slots ?? []).reduce<Record<string, string[]>>((acc, iso) => {
    const day = format(new Date(iso), "EEEE, d MMMM");
    (acc[day] ??= []).push(iso);
    return acc;
  }, {});

  if (avail.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <p className="text-muted-foreground">{(avail.error as any)?.message ?? "This booking link isn't available."}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="font-serif text-2xl">You're booked!</div>
          <p className="text-muted-foreground">
            {format(new Date(done.startTime), "EEEE, d MMMM 'at' HH:mm")}. A calendar invite is on its way to {email}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="font-serif text-3xl mb-1">{avail.data?.title ?? "Book a session"}</div>
        <p className="text-muted-foreground mb-8">
          {avail.data ? `${avail.data.durationMinutes} minutes` : "Loading available times…"}
        </p>

        {!selected ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, slots]) => (
              <div key={day}>
                <div className="text-sm font-medium mb-2">{day}</div>
                <div className="flex flex-wrap gap-2">
                  {slots.map((iso) => (
                    <button
                      key={iso}
                      onClick={() => setSelected(iso)}
                      className="px-3 py-1.5 rounded-md border border-border text-sm hover:border-primary hover:bg-muted/40 transition-colors"
                    >
                      {format(new Date(iso), "HH:mm")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {avail.isSuccess && !Object.keys(grouped).length && (
              <p className="text-muted-foreground">No availability in the next two weeks — please check back soon.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-sm">
            <div className="text-sm font-medium">{format(new Date(selected), "EEEE, d MMMM 'at' HH:mm")}</div>
            <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
            <div><Label>Your email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full min-h-[70px] px-3 py-2 border rounded-md text-sm bg-background mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Back</Button>
              <Button onClick={() => bookMut.mutate()} disabled={!name || !email || bookMut.isPending}>
                {bookMut.isPending ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
