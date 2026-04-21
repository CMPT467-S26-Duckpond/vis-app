<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
useSeoMeta({
  description:
    "SFU CMPT 467 Spring 2026 Visualization Final Project by Group 7 Duck pO(n)d",
  ogTitle: "Global Water Consumption | Duck pO(n)d",
  ogDescription: "SFU CMPT 467 Spring 2026 Visualization Final Project",
  ogImage: "/favicon.png",
  ogUrl: "https://467finalproj.bumblebea.me",
  twitterCard: "summary"
});

useHead({
  htmlAttrs: {
    lang: "en"
  },
  link: [
    {
      rel: "icon",
      type: "image/png",
      href: "/favicon.png"
    }
  ]
});
</script>
