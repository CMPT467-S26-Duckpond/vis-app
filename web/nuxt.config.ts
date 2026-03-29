// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/fonts", "@nuxt/icon", "@nuxt/ui"],

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    mongo: {
      uri: "mongodb://localhost:3001/467projdata"
    }
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
