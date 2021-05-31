<template>
  <div>
    <section id="firebaseui-auth-container" />
  </div>
</template>

<script lang="ts">
import Component from 'vue-class-component'
import Vue from 'vue'
import * as firebaseui from 'firebaseui'
import { fireAuth, authProviders } from '~/plugins/firebase'

@Component
export default class Login extends Vue {
  mounted () {
    try {
      const ui =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(fireAuth)
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

  signInResult () {
    // TODO signin result
    return true
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
