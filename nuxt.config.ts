// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  modules: [
    "@nuxtjs/tailwindcss",
    "shadcn-nuxt",
    "@nuxt/icon",
    "@nuxtjs/sitemap",
    "@nuxtjs/color-mode",
    "@pinia/nuxt",
    "@formkit/auto-animate/nuxt",
  ],
  nitro: {
    vercel: {
      functions: {
        maxDuration: 30,
      },
    },
  },
  app: {
    head: {
      charset: "utf-8",
      meta: [
        // Primary Meta Tags
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { name: "twitter:image", content: "/pwa-512x512.png" },
        { name: "x-ua-compatible", content: "IE=edge" },
        { name: "format-detection", content: "telephone=no" },
        // SEO Meta Tags
        {
          name: "description",
          content:
            "Halte deine Listen und Todos immer im Blick und teile sie mit anderen!",
        },
        { name: "robots", content: "index, follow" },
        { name: "author", content: "KeepList" },
        { name: "keywords", content: "Liste, Todo, Teilen" },
        { name: "og:image", content: "/pwa-512x512.png" },
        { name: "og:site_name", content: "KeepList" },
        //Apple links
        { name: "apple-touch-icon", content: "/pwa-512x512.png" },
        { name: "apple-touch-icon", content: "/pwa-192x192.png" },
      ],
    },
  },
  colorMode: {
    classSuffix: "",
    storage: "cookie",
    preference: "system",
  },
});
