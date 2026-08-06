import { AppToaster } from "@/components/app-toaster";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
      <AppToaster />
    </div>
  );
}
