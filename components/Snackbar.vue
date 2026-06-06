<template>
  <v-snackbar v-model="showSnackbar">
    {{ snackbarText }}
    <template #actions>
      <v-btn color="pink" variant="text" @click="showSnackbar = false">
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const snackbarText = ref('')
const isError = ref(false)
const showSnackbar = ref(false)

function showSnackbarWithMessage(text: string, error: boolean) {
  snackbarText.value = text
  isError.value = error
  showSnackbar.value = true
}

function hideSnackbar() {
  snackbarText.value = ''
  isError.value = false
  showSnackbar.value = false
}

defineExpose({ showSnackbarWithMessage, hideSnackbar })
</script>
