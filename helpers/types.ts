export type FormInstance = {
  validate(): Promise<{ valid: boolean }>
  reset(): void
  resetValidation(): void
}

// users/{uid}/friendRequests/{fromUid}; only ever 'pending' — accepting or
// declining removes the entry
export type FriendRequestStatus = 'pending'

export type Person = {
  name: string
  email: string
  queryableEmail?: string
  queryablePhone?: string
  friendRequests?: Record<string, FriendRequestStatus>
  blocked?: Record<string, boolean>
  isFriend?: boolean
  requestSent?: boolean
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

export type GatheringState = 'pending' | 'confirmed' | 'canceled'

// Keyed into Gathering.guests by uid; security rules let a guest write only
// their own entry
export type GuestResponse = 'invited' | 'accepted' | 'declined'

// Denormalized so guests can render game names without reading the host's
// collection
export type GatheringGame = Pick<Game, 'id' | 'name'>

// gatherings/{pushId}
export type Gathering = {
  state: GatheringState
  datetime: string // ISO date
  initiator: string // uid
  host: string // uid
  open: boolean
  maxGuests: number
  guests?: Record<string, GuestResponse> // keyed by guest uid
  games?: GatheringGame[]
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
      maxplayers: { $: { value: string } }
      maxplaytime: { $: { value: string } }
      minage: { $: { value: string } }
      minplayers: { $: { value: string } }
      minplaytime: { $: { value: string } }
      yearpublished: { $: { value: string } }
      name:
        | { $: { type: string; value: string } }[]
        | { $: { type: string; value: string } }
    }
  }
}

export type BoardGameGeekSearchItemType = {
  $: { id: string; type: string }
  name: { $: { type: string; value: string } }
  yearpublished?: { $: { value: string } }
}

export type BoardGameGeekItemsType = {
  items: { item?: BoardGameGeekSearchItemType[] }
}

export type BoardGameSearchResult = {
  id: string
  name: string
  displayname: string
  yearpublished: string
}
