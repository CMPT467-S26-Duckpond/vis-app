<template>
  <span class="py-1" :title="displayName">
    <UIcon
      :name="name"
      class="size-7"
      @click="!disabled && $emit('click')"
      :class="{
        'cursor-not-allowed': disabled,
        'text-neutral-300': disabled,
        'text-neutral-400': !active && !disabled,
        'text-primary-500': active && !disabled,
        'hover:text-primary-300': !active && !disabled
      }"
    />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  displayName?: string;
  active?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();
</script>
