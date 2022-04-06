import { Vue } from 'nuxt-property-decorator'
import firebase from 'firebase/compat/app'

export type VForm = Vue & {
  validate(): boolean
  reset(): void
  resetValidation(): void
}

export type NuxtHeadType = {
  title: string
}

export type AuthResultType = {
  user: firebase.User
}

export type Person = {
  name: string
  email: string
  isFriend?: boolean
}

export type Friend = Person & {
  userId: string
}

export type Game = {
  id: string
  name: string
  rating?: number
  privateNote?: string
  publicNote?: string
}

export type DisplayableItemType = {
  id: string
  name: string
  description: string
  image: string
  url: string
  maxplayers: string
  maxplaytime: string
  minage: string
  minplayers: string
  minplaytime: string
  yearpublished: string
  incollection: boolean
}

export type BoardGameGeekThingItemType = {
  items: {
    item?: {
      $: {
        type: string
        id: string
      }
      description: string
      image: string
      maxplayers: {
        $: {
          value: string
        }
      }
      maxplaytime: {
        $: {
          value: string
        }
      }
      minage: {
        $: {
          value: string
        }
      }
      minplayers: {
        $: {
          value: string
        }
      }
      minplaytime: {
        $: {
          value: string
        }
      }
      yearpublished: {
        $: {
          value: string
        }
      }
      name:
        | {
            $: {
              type: string
              value: string
            }
          }[]
        | {
            $: {
              type: string
              value: string
            }
          }
    }
  }
}

export type BoardGameGeekSearchItemType = {
  $: {
    id: string
    type: string
  }
  name: {
    $: {
      type: string
      value: string
    }
  }
  yearpublished?: {
    $: {
      value: string
    }
  }
}

export type BoardGameGeekItemsType = {
  items: {
    item?: BoardGameGeekSearchItemType[]
  }
}
export type BoardGameSearchResult = {
  id: string
  name: string
  displayname: string
  yearpublished: string
}
