// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/fonts", "@nuxt/icon", "@nuxt/ui"],

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "Global Water Consumption",
      htmlAttrs: {
        lang: "en"
      },
      meta: [
        { charset: "utf-8" },
        { name: "link", rel: "icon", href: "/favicon.ico" }
      ]
    }
  },

  runtimeConfig: {
    mongo: {
      uri: "mongodb://localhost:3001/467projdata"
    }
  },

  nitro: {
    publicAssets: [
      // Leaflet requires some extra assets which aren't bundled by Nuxt by default.
      // This instructs nuxt on how to find those assets to make sure they are included.
      {
        dir: "../node_modules/leaflet/dist/images"
      }
    ]
  },

  ui: {
    fonts: true,
    colorMode: false
  },

  imports: {
    scan: false
  },

  components: {
    dirs: []
  },

  ssr: false
});
