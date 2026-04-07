<template>
  <span class="py-1" :title="displayName">
    <UIcon
      :name="name"
      class="size-7"
      @click="$emit('click')"
      :class="{
        'text-neutral-400': !active,
        'text-primary-500': active,
        'hover:text-primary-300': !active
      }"
    />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  displayName?: string;
  active?: boolean;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();
</script>
