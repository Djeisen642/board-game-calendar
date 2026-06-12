import { ref as dbRef, set, update } from 'firebase/database'

// Friend-request mutations against the top-level friendRequests/{toUid}/{fromUid}
// and blocked/{ownerUid}/{blockedUid} nodes. Authorship is enforced by the
// security rules (only the sender can create a request, only the recipient can
// remove it), so callers should expect permission errors — e.g. when blocked.
export function useFriendActions() {
  const userStore = useUserStore()
  const db = useNuxtApp().$db

  const ownUid = () => userStore.user!.uid

  function sendFriendRequest(targetUid: string) {
    return set(dbRef(db, `friendRequests/${targetUid}/${ownUid()}`), 'pending')
  }

  function acceptRequest(fromUid: string) {
    const uid = ownUid()
    return update(dbRef(db), {
      [`users/${uid}/friends/${fromUid}`]: true,
      [`users/${fromUid}/friends/${uid}`]: true,
      [`friendRequests/${uid}/${fromUid}`]: null,
    })
  }

  function declineRequest(fromUid: string) {
    const uid = ownUid()
    return update(dbRef(db), {
      [`blocked/${uid}/${fromUid}`]: true,
      [`friendRequests/${uid}/${fromUid}`]: null,
    })
  }

  function removeFriend(friendId: string) {
    const uid = ownUid()
    return update(dbRef(db), {
      [`users/${uid}/friends/${friendId}`]: null,
      [`users/${friendId}/friends/${uid}`]: null,
    })
  }

  return { sendFriendRequest, acceptRequest, declineRequest, removeFriend }
}
