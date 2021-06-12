<template>
  <v-app dark>
    <v-navigation-drawer
      v-model="drawer"
      clipped
      fixed
      app
    >
      <v-list>
        <v-list-item
          v-for="(item, i) in activeItems"
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
      :absolute="false"
      app
    >
      <span>Jason Suttles &copy; {{ new Date().getFullYear() }}</span>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import { Action, State } from 'nuxt-property-decorator'
import firebase from 'firebase/app'
import index from '~/pages/index.vue'
import GameCollection from '~/pages/GameCollection.vue'
import SignIn from '~/pages/SignIn.vue'
import Profile from '~/pages/Profile.vue'
import Friends from '~/pages/Friends.vue'

export enum PageType {
  AlwaysShow,
  NeedsAuth,
  BeforeAuth
}

type SidebarItemType = {
  icon:string
  title:string
  to:string
  type:PageType
}

@Component
export default class Default extends Vue {
  @State('user')
  user!:firebase.User

  title='Board Game Calendar'
  drawer=false
  items:SidebarItemType[]=[
    {
      icon: 'mdi-apps',
      title: index.title,
      to: index.route,
      type: PageType.AlwaysShow
    },
    {
      icon: 'mdi-login',
      title: SignIn.title,
      to: SignIn.route,
      type: PageType.BeforeAuth
    },
    {
      icon: 'mdi-rhombus-split',
      title: GameCollection.title,
      to: GameCollection.route,
      type: PageType.NeedsAuth
    },
    {
      icon: 'mdi-account-group',
      title: Friends.title,
      to: Friends.route,
      type: PageType.NeedsAuth
    },
    {
      icon: 'mdi-account',
      title: Profile.title,
      to: Profile.route,
      type: PageType.NeedsAuth
    }
  ]

  get activeItems ():SidebarItemType[] {
    if (this.user) {
      return this.items.filter(item => [PageType.AlwaysShow, PageType.NeedsAuth].includes(item.type))
    }
    return this.items.filter(item => [PageType.AlwaysShow, PageType.BeforeAuth].includes(item.type))
  }

  get showSignOut ():boolean {
    return !!this.user
  }

  @Action('signOut')
  signOut!: () => Promise<void>

  async onSignoutClicked ():Promise<void> {
    await this.signOut()
    await this.$router.push(SignIn.route)
  }
}
</script>
