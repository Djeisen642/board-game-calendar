<template>
  <v-app>
    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center">
        <v-col cols="12" sm="8" md="6" class="text-center">
          <v-icon size="80" color="primary" class="mb-4" style="opacity: 0.4">
            {{ error.statusCode === 404 ? 'mdi-map-marker-question' : 'mdi-alert-circle-outline' }}
          </v-icon>
          <h1 class="error-code mb-2">{{ error.statusCode || 'Error' }}</h1>
          <p class="error-message mb-6">
            {{ error.statusCode === 404 ? 'This page doesn\'t exist.' : 'Something went wrong.' }}
          </p>
          <v-btn color="primary" variant="tonal" to="/">
            <v-icon start>mdi-home</v-icon>Go Home
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script setup lang="ts">
defineProps<{ error: { statusCode?: number; message?: string } }>()
</script>

<style scoped>
.error-code {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6c5ce7, #00cec9);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.error-message {
  font-size: 1rem;
  color: rgba(205, 214, 244, 0.5);
}
</style>
