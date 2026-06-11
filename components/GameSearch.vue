<template>
  <v-card-text>
    <v-autocomplete
      ref="boardGameSearch"
      v-model="selectedItem"
      v-model:search="searchInput"
      :items="searchResults"
      :loading="isLoading"
      item-title="displayname"
      item-value="id"
      label="Board Game Search"
      placeholder="Start typing to search"
      :hint="`Type at least ${constants.MinSearchLength} characters`"
      prepend-icon="mdi-database-search"
      return-object
      @blur="displayEntries"
      @keyup.enter="searchEnterPressed"
      @click="resetData"
    />
    <v-list>
      <v-list-item v-for="(item, i) in entriesToShow" :key="i">
        <template #prepend>
          <v-avatar rounded="0" size="56">
            <v-img :src="item.image" />
          </v-avatar>
        </template>

        <v-list-item-title>
          {{ item.name }} ({{ item.yearpublished }})
        </v-list-item-title>
        <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>

        <template #append>
          <div class="d-flex gap-2">
            <v-btn
              :disabled="item.incollection"
              color="primary"
              size="small"
              @click.stop="addToCollection(item)"
            >
              <v-icon start>mdi-plus-circle</v-icon>Add
            </v-btn>
            <v-btn :href="item.url" target="_blank" rel="noopener noreferrer" color="primary" size="small">
              <v-icon start>mdi-link</v-icon>Link
            </v-btn>
          </div>
        </template>
      </v-list-item>
    </v-list>
    <div v-if="!selectedItem && entriesToShow.length !== searchResults.length">
      Showing the top {{ constants.NumberToShow }} matches — refine your search
      to narrow the results.
    </div>
  </v-card-text>
</template>

<script setup lang="ts">
import { ref, watch, toRef } from 'vue'
import type { DisplayableItemType } from '~/helpers/types'
import constants from '~/helpers/constants'
import { useBoardGameSearch } from '~/composables/useBoardGameSearch'

const props = defineProps<{
  idsInCollection: string[]
  addToCollection: (item: DisplayableItemType) => void
}>()

const emit = defineEmits<{ error: [error: Error] }>()

const boardGameSearch = ref<{ blur: () => void } | null>(null)

const { searchResults, selectedItem, searchInput, isLoading, entriesToShow, resetData, displayEntries } =
  useBoardGameSearch(toRef(props, 'idsInCollection'), (err) => emit('error', err))

function searchEnterPressed() {
  if (!searchResults.value.length) return
  boardGameSearch.value?.blur()
}

watch(selectedItem, () => {
  if (!searchResults.value.length) return
  boardGameSearch.value?.blur()
  displayEntries()
})
</script>
