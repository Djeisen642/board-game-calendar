<template>
  <v-app dark>
    <v-navigation-drawer
      v-model="drawer"
      :mini-variant="miniVariant"
      :clipped="clipped"
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
      :clipped-left="clipped"
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
        @click.stop="clipped = !clipped"
      >
        <v-icon>mdi-application</v-icon>
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
        icon
        @click.stop="rightDrawer = !rightDrawer"
      >
        <v-icon>mdi-menu</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <v-container>
        <nuxt />
      </v-container>
    </v-main>
    <v-navigation-drawer
      v-model="rightDrawer"
      :right="right"
      temporary
      fixed
    >
      <v-list>
        <v-list-item @click.native="right = !right">
          <v-list-item-action>
            <v-icon light>
              mdi-repeat
            </v-icon>
          </v-list-item-action>
          <v-list-item-title>Switch drawer (click me)</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
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
import { State, Watch } from 'nuxt-property-decorator'
import firebase from 'firebase/app'

type SidebarItemType = {
  icon:string
  title:string
  to:string
}

@Component
export default class Default extends Vue {
  @State('user')
  user!:firebase.User

  clipped=false

  drawer=false

  fixed=false

  items:SidebarItemType[]=[
    {
      icon: 'mdi-apps',
      title: 'Welcome',
      to: '/'
    }
  ]

  miniVariant=false

  right=true

  rightDrawer=false

  title='Vuetify.js'

  mounted ():void {
    this.onLoginState(this.user)
  }

  @Watch('user')
  onUserLogin (newState:firebase.User|null):void {
    this.onLoginState(newState)
  }

  onLoginState (user:firebase.User|null):void {
    if (user === null) {
      const mainIndex = this.items.findIndex(item => item.title === 'Inspire')
      if (mainIndex > -1) {
        this.items.splice(mainIndex, 1)
      }
      this.items.push({
        icon: 'mdi-chart-bubble',
        title: 'Login',
        to: '/login'
      })
      return
    }

    const loginIndex = this.items.findIndex(item => item.title === 'Login')
    if (loginIndex > -1) {
      this.items.splice(loginIndex, 1)
    }
    this.items.push({
      icon: 'mdi-chart-bubble',
      title: 'Inspire',
      to: '/inspire'
    })
  }
}
</script>
