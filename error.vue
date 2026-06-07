<template>
  <v-app>
    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center">
        <v-col cols="12" sm="8" md="6" class="text-center">
          <h1 v-if="error.statusCode === 404">404 — Page Not Found</h1>
          <h1 v-else>An error occurred</h1>
          <NuxtLink to="/">Go to Home</NuxtLink>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script setup lang="ts">
defineProps<{ error: { statusCode?: number; message?: string } }>()
</script>

<style scoped>
h1 {
  font-size: 20px;
}
</style>
