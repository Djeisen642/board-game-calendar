<template>
  <v-snackbar v-model="showSnackbar">
    {{ snackbarText }}

    <template #action="{ attrs }">
      <v-btn color="pink" text v-bind="attrs" @click="showSnackbar = false">
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>
<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

@Component
export default class Snackbar extends Vue {
  snackbarText = ''

  isError = false

  showSnackbar = false

  showSnackbarWithMessage(text: string, isError: boolean): void {
    this.snackbarText = text
    this.isError = isError
    this.showSnackbar = true
  }

  hideSnackbar(): void {
    this.snackbarText = ''
    this.isError = false
    this.showSnackbar = false
  }
}
</script>
