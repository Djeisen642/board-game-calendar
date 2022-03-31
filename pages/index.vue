<template>
  <v-row justify="center" align="center">
    <v-col cols="12" sm="8" md="6">
      <div class="text-center">
        <logo />
      </div>
      <v-card>
        <v-card-title class="headline">
          Welcome to the Board Game Calendar!
        </v-card-title>
        <v-card-text>
          <p>
            This calendar is currently a work in progress.
            The goal of this calendar is to facilitate people coming together
            to play specific board games instead of the game that attracts the least
            common denominator.
          </p>
          <p>
            To do this, users will be able to add their games to their collection;
            they will be able to add friends; they will be able to invite these friends
            to board game sessions to play one or more board games.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            nuxt
            to="/SignIn"
          >
            Continue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import Logo from '~/components/Logo.vue'
import { NuxtHeadType } from '~/helpers/types'
import names from '~/helpers/names'
import routes from '~/helpers/routes'

@Component({
  components: { Logo }
})
export default class index extends Vue {
  static route = routes.index
  static routeName = names.index
  static title = 'Welcome'

  head ():NuxtHeadType {
    return {
      title: index.title
    }
  }
}
</script>
