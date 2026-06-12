import { ref, watch, type Ref } from 'vue'
import {
  ref as dbRef,
  get,
  query,
  orderByChild,
  startAt,
  endAt,
  limitToFirst,
} from 'firebase/database'
import constants from '~/helpers/constants'
import type { Friend, Person } from '~/helpers/types'

// Debounced friend search over the public profiles/ node's queryableName /
// queryableEmail / queryablePhone indexes, annotating each result with
// friendship status.
export function useFriendSearch(
  friends: Ref<Friend[]>,
  onError: (err: unknown) => void
) {
  const userStore = useUserStore()
  const db = useNuxtApp().$db

  // clearable text fields set the model to null
  const searchQuery = ref<string | null>('')
  const searchResults = ref<Record<string, Person>>({})
  const isSearching = ref(false)
  let searchTimerId: number | undefined

  watch(searchQuery, (input) => {
    clearTimeout(searchTimerId)
    if (!input || input.length < constants.MinSearchLength) {
      searchResults.value = {}
      return
    }
    searchTimerId = window.setTimeout(() => {
      fetchResults(input)
    }, constants.DebounceThrottleInMs)
  })

  function searchFieldFor(input: string): { field: string; term: string } {
    const trimmed = input.trim()
    if (trimmed.includes('@'))
      return { field: 'queryableEmail', term: trimmed.toLowerCase() }
    const digits = trimmed.replace(/[\s\-().+]/g, '')
    if (digits.length >= constants.MinPhoneSearchDigits && /^\d+$/.test(digits))
      return { field: 'queryablePhone', term: digits }
    return { field: 'queryableName', term: trimmed.toLowerCase() }
  }

  async function fetchResults(input: string) {
    isSearching.value = true
    try {
      const { field, term } = searchFieldFor(input)
      const q = query(
        dbRef(db, 'profiles'),
        orderByChild(field),
        startAt(term),
        endAt(term + '\uf8ff'),
        limitToFirst(10)
      )
      const snapshot = await get(q)
      const val = snapshot.val()
      if (!val) {
        searchResults.value = {}
        return
      }
      const ownUid = userStore.user!.uid
      const { [ownUid]: _own, ...others } = val
      const filtered: Record<string, Person> = others
      await Promise.all(
        Object.entries(filtered).map(async ([id, person]) => {
          person.isFriend = friends.value.some(
            (friend) => friend.userId === id
          )
          // the rules let a sender read their own outgoing request entry
          const sentSnap = await get(
            dbRef(db, `friendRequests/${id}/${ownUid}`)
          )
          person.requestSent = sentSnap.exists()
        })
      )
      searchResults.value = filtered
    } catch (err) {
      onError(err)
    } finally {
      isSearching.value = false
    }
  }

  return { searchQuery, searchResults, isSearching }
}
