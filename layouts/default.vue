<template>
  <v-app dark>
    <v-navigation-drawer
      v-model="drawer"
      :mini-variant="miniVariant"
      clipped
      fixed
      app
    >
      <v-list>
        <v-list-item
          v-for="(item, i) in items"
          :key="i"
          :to="item.to"
          router
          exact
        >
          <v-list-item-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title v-text="item.title" />
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-app-bar
      clipped-left
      fixed
      app
    >
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-btn
        icon
        @click.stop="miniVariant = !miniVariant"
      >
        <v-icon>mdi-{{ `chevron-${miniVariant ? 'right' : 'left'}` }}</v-icon>
      </v-btn>
      <v-btn
        icon
        @click.stop="fixed = !fixed"
      >
        <v-icon>mdi-minus</v-icon>
      </v-btn>
      <v-toolbar-title v-text="title" />
      <v-spacer />
      <v-btn
        v-if="showSignOut"
        text
        @click.stop="onSignoutClicked"
      >
        Sign out
        <v-icon class="ml-2">
          mdi-logout
        </v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <v-container>
        <nuxt />
      </v-container>
    </v-main>
    <v-footer
      :absolute="!fixed"
      app
    >
      <span>&copy; {{ new Date().getFullYear() }}</span>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import { Action, State, Watch } from 'nuxt-property-decorator'
import firebase from 'firebase/app'
import { PageTitle, PageRoute } from '~/constants/constants'

type SidebarItemType = {
  icon:string
  title:string
  to:string
}

@Component
export default class Default extends Vue {
  @State('user')
  user!:firebase.User

  drawer=false

  fixed=false

  items:SidebarItemType[]=[
    {
      icon: 'mdi-apps',
      title: PageTitle.Welcome,
      to: PageRoute.Welcome
    }
  ]

  miniVariant=false

  title='Board Game Calendar'

  showSignOut=false

  @Action('signOut')
  signOut!: () => Promise<void>

  mounted ():void {
    this.onSignInState(this.user)
  }

  @Watch('user')
  onUserSignIn (newState:firebase.User|null):void {
    this.onSignInState(newState)
  }

  async onSignoutClicked ():Promise<void> {
    await this.signOut()
    await this.$router.push(PageRoute.SignIn)
  }

  onSignInState (user:firebase.User|null):void {
    this.showSignOut = !!user
    if (user === null) {
      const mainIndex = this.items.findIndex(item => item.title === PageTitle.GameCollection)
      if (mainIndex > -1) {
        this.items.splice(mainIndex, 1)
      }
      this.items.push({
        icon: 'mdi-login',
        title: PageTitle.SignIn,
        to: PageRoute.SignIn
      })
      return
    }

    const signinIndex = this.items.findIndex(item => item.title === PageTitle.SignIn)
    if (signinIndex > -1) {
      this.items.splice(signinIndex, 1)
    }
    this.items.push({
      icon: 'mdi-rhombus-split',
      title: PageTitle.GameCollection,
      to: PageRoute.GameCollection
    })
  }
}
</script>
