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
    '@formkit/auto-animate/nuxt',
  ],
  icon: {
    collections: ["mdi","lucide"],
    serverBundle: "remote",
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
        //PWA Meta Tags
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "KeepTrack" },
        { name: "apple-touch-fullscreen", content: "yes" },
        { name: "msapplication-TileColor", content: "#2aaa59" },
        { name: "msapplication-TileImage", content: "/pwa-512x512.png" },
        { name: "theme-color", content: "#2aaa59" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "application-name", content: "KeepTrack" },
        { name: "msapplication-navbutton-color", content: "#2aaa59" },
        // SEO Meta Tags
        {
          name: "description",
          content: "Halte deine Listen und Todos immer im Blick und teile sie mit anderen!",
        },
        { name: "robots", content: "index, follow" },
        { name: "author", content: "KeepList" },
        { name: "keywords", content: "Liste, Todo, Teilen" },
        //Apple links
        { name: "apple-touch-icon", content: "/pwa-512x512.png" },
        { name: "apple-touch-icon", content: "/pwa-192x192.png" },
      ],
    },
  },
  colorMode: {
    classSuffix: "",
    storage: 'cookie',
    preference: 'system',
  },
});