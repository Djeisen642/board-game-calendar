<template>
  <div>
    <section id="firebaseui-auth-container" />
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import * as firebaseui from 'firebaseui'
import firebase from 'firebase/app'
import { auth, authProviders, db } from '~/plugins/firebase'

type AuthResultType = {
  user: firebase.User
}

@Component
export default class SignIn extends Vue {
  mounted ():void {
    try {
      const ui =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(auth)
      const uiConfig:firebaseui.auth.Config = {
        signInFlow: 'popup',
        signInOptions: [authProviders.Google, authProviders.Email],
        callbacks: {
          signInSuccessWithAuthResult: this.signInResult.bind(this)
        }
      }
      ui.start('#firebaseui-auth-container', uiConfig)
    } catch (err) {
      // TODO add error
    }
  }

  signInResult (authResult:AuthResultType):boolean {
    const user:firebase.User = authResult.user
    db.ref(`users/${user.uid}`).set({
      name: user.displayName,
      email: user.email
    })
    this.$router.push('gamecollection')
    return false
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
