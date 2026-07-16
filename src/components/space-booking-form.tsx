"use client";

import { useActionState } from "react";
import { submitSpaceBookingAction, type FormState } from "@/actions/inquiries";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export function SpaceBookingForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(submitSpaceBookingAction, null);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
        Request received! Our events team will contact you within 24 hours to confirm availability and pricing.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" required />
        </div>
        <div>
          <Label htmlFor="eventType">Event type</Label>
          <Select id="eventType" name="eventType" required defaultValue="">
            <option value="" disabled>
              Select an event type
            </option>
            <option>Birthday Party</option>
            <option>Corporate Screening</option>
            <option>Wedding / Anniversary</option>
            <option>Movie Premiere</option>
            <option>Other</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="eventDate">Preferred date</Label>
          <Input id="eventDate" name="eventDate" type="date" required />
        </div>
        <div>
          <Label htmlFor="headcount">Expected headcount</Label>
          <Input id="headcount" name="headcount" type="number" min={1} max={2000} required />
        </div>
      </div>
      <div>
        <Label htmlFor="message">Tell us more (optional)</Label>
        <Textarea id="message" name="message" rows={4} />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending request..." : "Request Booking"}
      </Button>
    </form>
  );
}
