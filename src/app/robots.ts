import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/cart", "/checkout", "/orders", "/login", "/register", "/auth"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
