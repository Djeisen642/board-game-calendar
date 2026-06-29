<template>
  <svg
    :width="width"
    :height="size"
    viewBox="0 0 80 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    :style="{ display: 'inline-block', verticalAlign: 'middle', fill: fillColor }"
  >
    <circle cx="40" cy="14" r="13" />
    <path
      d="M 40 27
         C 46 27, 60 29, 66 31
         C 70 32, 75 34, 76 38
         C 77 43, 72 46, 66 45
         C 60 44, 54 44, 51 46
         C 52 52, 54 60, 54 72
         L 54 83
         C 54 89, 51 93, 47 93
         L 43 93
         L 43 68
         L 37 68
         L 37 93
         L 33 93
         C 29 93, 26 89, 26 83
         L 26 72
         C 26 60, 28 52, 29 46
         C 26 44, 20 44, 14 45
         C 8 46, 3 43, 4 38
         C 5 33, 10 32, 14 31
         C 20 29, 34 27, 40 27
         Z"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: number
    color?: string
  }>(),
  {
    size: 24,
    color: '#C8860A',
  }
)

const width = computed(() => Math.round(props.size * 0.8))
const fillColor = computed(() => props.color)
</script>
