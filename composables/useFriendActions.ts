import { ref as dbRef, set, update } from 'firebase/database'

// Friend-request mutations against the top-level friendRequests/{toUid}/{fromUid}
// and blocked/{ownerUid}/{blockedUid} nodes. Authorship is enforced by the
// security rules (only the sender can create a request, only the recipient can
// remove it), so callers should expect permission errors — e.g. when blocked.
export function useFriendActions() {
  const userStore = useUserStore()
  const nuxtApp = useNuxtApp()
  const db = nuxtApp.$db
  const logEvent = nuxtApp.$logEvent

  const ownUid = () => userStore.user!.uid

  function sendFriendRequest(targetUid: string) {
    logEvent('friend_request_sent')
    return set(dbRef(db, `friendRequests/${targetUid}/${ownUid()}`), 'pending')
  }

  function acceptRequest(fromUid: string) {
    logEvent('friend_request_accepted')
    const uid = ownUid()
    return update(dbRef(db), {
      [`users/${uid}/friends/${fromUid}`]: true,
      [`users/${fromUid}/friends/${uid}`]: true,
      [`friendRequests/${uid}/${fromUid}`]: null,
    })
  }

  function declineRequest(fromUid: string) {
    logEvent('friend_request_declined')
    const uid = ownUid()
    return update(dbRef(db), {
      [`blocked/${uid}/${fromUid}`]: true,
      [`friendRequests/${uid}/${fromUid}`]: null,
    })
  }

  function removeFriend(friendId: string) {
    logEvent('friend_removed')
    const uid = ownUid()
    return update(dbRef(db), {
      [`users/${uid}/friends/${friendId}`]: null,
      [`users/${friendId}/friends/${uid}`]: null,
    })
  }

  return { sendFriendRequest, acceptRequest, declineRequest, removeFriend }
}
