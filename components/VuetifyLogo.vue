<template>
  <img
    class="VuetifyLogo"
    alt="Vuetify Logo"
    :src="`${base}vuetify-logo.svg`"
  >
</template>
<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

@Component
export default class VuetifyLogo extends Vue {
  base = process.env.base;
}
</script>

<style>
.VuetifyLogo {
  height: 180px;
  width: 180px;
  transform: rotateY(560deg);
  animation: turn 3.5s ease-out forwards 1s;
}

@keyframes turn {
  100% {
    transform: rotateY(0deg);
  }
}
</style>
