"use client";

import { InlineScript } from "@/components/inline-script";

// InlineScript's server/client type-attribute switch only takes effect when it
// re-executes in the browser during hydration, which requires a Client Component
// boundary — a Server Component only evaluates it once, on the server.
export function ThemeInitScript() {
  return <InlineScript html="(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();" />;
}
