"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, Info, MapPin, Images, Ticket } from "lucide-react";
import { updateHiveSettingsAction, type FormState } from "@/actions/admin/hive-settings";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { BranchImageGrid } from "@/components/admin/branch-image-grid";

function SectionCard({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glow-card rounded-2xl border border-border bg-surface p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-light">{icon}</div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Self-contained so remounting it (via `key`) clears the picked file and its own "new" badge. */
function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <label
      htmlFor="logo"
      className="group relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2"
    >
      {preview || logoUrl ? (
        <Image src={preview ?? logoUrl!} alt="Cinema logo" width={112} height={112} unoptimized className="h-full w-full object-contain p-2" />
      ) : (
        <span className="px-3 text-center text-xs text-muted">No logo yet</span>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
        <Camera size={18} />
        <span className="text-[11px] font-medium">Change logo</span>
      </div>
      {preview && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-surface" />}
      <input
        id="logo"
        name="logo"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </label>
  );
}

export function HiveSettingsForm({
  selectedBranch,
  promotionalImages,
  galleryImages,
}: {
  selectedBranch: {
    id: string;
    aboutUs: string | null;
    useFilmSchedule: boolean;
    logoUrl: string | null;
    address: string;
    phone: string;
    email: string | null;
  };
  promotionalImages: { id: string; dataUrl: string }[];
  galleryImages: { id: string; dataUrl: string }[];
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateHiveSettingsAction, null);

  // Remounting the image pickers (rather than resetting the whole form) clears just the picked
  // files after a successful save — text fields keep showing what was just saved, not stale defaults.
  const [pickerGeneration, setPickerGeneration] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state?.success) setPickerGeneration((g) => g + 1);
  }

  const lastToasted = useRef<FormState>(null);
  useEffect(() => {
    if (state === lastToasted.current) return;
    lastToasted.current = state;
    if (state?.success) toast.success("Cinema metadata updated.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="branchId" value={selectedBranch.id} />

      <SectionCard icon={<Info size={17} />} title="Cinema Meta Data" subtitle="Update your cinema photo and details here.">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <LogoUploader key={`logo-${pickerGeneration}`} logoUrl={selectedBranch.logoUrl} />

          <div className="grid flex-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="aboutUs">About Us</Label>
              <Textarea id="aboutUs" name="aboutUs" rows={5} defaultValue={selectedBranch.aboutUs ?? ""} placeholder="Describe this cinema..." />
            </div>
            <div>
              <Label>Banner</Label>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/80 px-3.5 py-2.5 text-sm">
                <input type="checkbox" name="useFilmSchedule" defaultChecked={selectedBranch.useFilmSchedule} className="h-4 w-4 accent-brand" />
                Use Film Schedule
              </label>
              <p className="mt-1.5 text-xs text-muted">
                When on, this cinema&rsquo;s page hero automatically features its currently scheduled films. When off, it shows the promotional
                banners below instead.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<MapPin size={17} />} title="Location Details" subtitle="Contact information shown on this cinema's public page.">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={selectedBranch.address} required />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" name="phone" defaultValue={selectedBranch.phone} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={selectedBranch.email ?? ""} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Ticket size={17} />} title="Promotional Banner(s)" subtitle="Featured when “Use Film Schedule” is off.">
        <BranchImageGrid
          images={promotionalImages}
          addInputId="promotionalImages"
          addInputName="promotionalImages"
          pickerKey={pickerGeneration}
        />
      </SectionCard>

      <SectionCard icon={<Images size={17} />} title="Cinema Image(s)" subtitle="Photo gallery shown on this cinema's public page.">
        <BranchImageGrid images={galleryImages} addInputId="galleryImages" addInputName="galleryImages" pickerKey={pickerGeneration} />
      </SectionCard>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <div className="glass sticky bottom-4 flex justify-center rounded-2xl border border-white/5 p-3">
        <Button type="submit" size="lg" className="w-full sm:w-auto sm:px-10" disabled={isPending}>
          {isPending ? "Saving..." : "Update Metadata"}
        </Button>
      </div>
    </form>
  );
}
