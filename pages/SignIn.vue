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
import { auth, authProviders, db, logEvent } from '~/plugins/firebase'
import Snackbar from '~/components/Snackbar.vue'
import { AuthResultType, NuxtHeadType } from '~/helpers/types'
import GameCollection from '~/pages/GameCollection.vue'
import helpers from '~/helpers/helpers'
import names from '~/helpers/names'
import routes from '~/helpers/routes'

@Component({
  components: { Snackbar }
})
export default class SignIn extends Vue {
  static route = routes.signIn
  static routeName = names.signIn
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
      const handledError = helpers.handleError(err)
      this.$refs.snackbar.showSnackbarWithMessage(handledError.message, true)
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
