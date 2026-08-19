import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://rms.geckoworksnepal.com.np";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/staff/*",
        "/admin/*",
        "/super-admin/*",
        "/api/*",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
