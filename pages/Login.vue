<template>
  <div>
    <section id="firebaseui-auth-container" />
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import * as firebaseui from 'firebaseui'
import { auth, authProviders } from '~/plugins/firebase'

@Component
export default class Login extends Vue {
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

  signInResult ():boolean {
    // TODO signin result
    this.$router.push('inspire')
    return false
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
