import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/booking"] }],
    sitemap: "https://ojaja.reachcinema.io/sitemap.xml",
  };
}
