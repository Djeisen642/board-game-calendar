import firebase from 'firebase/app'
import firebaseConf from '~/firebase.config.js'
import 'firebase/database'
import 'firebase/auth'

!firebase.apps.length && firebase.initializeApp(firebaseConf)

export const authProviders = {
  Google: {
    provider: firebase
      .auth.GoogleAuthProvider.PROVIDER_ID,
    providerId: firebase
      .auth.GoogleAuthProvider.PROVIDER_ID
  },
  Email: {
    provider: firebase
      .auth.EmailAuthProvider.PROVIDER_ID,
    providerId: firebase
      .auth.EmailAuthProvider.PROVIDER_ID
  }
}
export const db = firebase.database()
export const auth = firebase.auth()
