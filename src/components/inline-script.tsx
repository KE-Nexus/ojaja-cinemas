// React 19 warns in dev when a rendered <script> tag reaches the client, since scripts
// inserted via client-side DOM patching never execute. Server-rendered scripts encountered
// during HTML parsing DO execute, so we mark the tag inert on the client (type="text/plain")
// and let suppressHydrationWarning paper over the type attribute mismatch.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
