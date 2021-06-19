<template>
  <div>
    <section id="firebaseui-auth-container" />
    <Snackbar
      ref="snackbar"
    />
  </div>
</template>

<script lang="ts">
import { Component, State, Vue } from 'nuxt-property-decorator'
import * as firebaseui from 'firebaseui'
import firebase from 'firebase/app'
import PhoneNumber from 'awesome-phonenumber'
import { auth, authProviders, db, log, logEvent, LogLevel } from '~/plugins/firebase'
import Snackbar from '~/components/Snackbar.vue'
import { NuxtHeadType } from '~/constants/types'
import GameCollection from '~/pages/GameCollection.vue'

type AuthResultType = {
  user: firebase.User
}

@Component({
  components: { Snackbar }
})
export default class SignIn extends Vue {
  static route = '/signin'
  static routeName = 'SignIn'
  static title = 'Sign In'

  @State('user')
  user!:firebase.User

  $refs !: {
    snackbar: Snackbar
  }

  head ():NuxtHeadType {
    return {
      title: SignIn.title
    }
  }

  mounted ():void {
    if (this.user) {
      this.$router.push(GameCollection.route)
      return
    }
    try {
      const ui =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(auth)
      const uiConfig:firebaseui.auth.Config = {
        signInFlow: 'popup',
        signInOptions: [authProviders.Google, authProviders.Facebook, authProviders.Email],
        callbacks: {
          signInSuccessWithAuthResult: this.signInResult.bind(this)
        }
      }
      ui.start('#firebaseui-auth-container', uiConfig)
    } catch (err) {
      log(LogLevel.ERROR, err.message, { stack: err.stack })
      this.$refs.snackbar.showSnackbarWithMessage(err.message, true)
    }
  }

  signInResult (authResult:AuthResultType):boolean {
    logEvent('login')
    const user:firebase.User = authResult.user
    db.ref(`users/${user.uid}`).update({
      name: user.displayName,
      queryableName: user.displayName?.toLowerCase(),
      email: user.email,
      phoneNumber: user.phoneNumber && new PhoneNumber(user.phoneNumber, 'US').getNumber('national')
    })
    this.$router.push(GameCollection.route)
    return false
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
