<template>
  <v-row>
    <v-col class="text-center">
      <img
        :src="`${base}v.png`"
        alt="Vuetify.js"
        class="mb-5"
      >
      <blockquote class="blockquote">
        &#8220;First, solve the problem. Then, write the code.&#8221;
        <footer>
          <small>
            <em>&mdash;John Johnson</em>
          </small>
        </footer>
        <v-btn
          @click="logout"
        >
          Logout
        </v-btn>
      </blockquote>
    </v-col>
  </v-row>
</template>
<script lang="ts">
import { Action, Component, Vue } from 'nuxt-property-decorator'

@Component
export default class InspirePage extends Vue {
  base = process.env.base;

  @Action('signOut')
  signOut!: () => Promise<void>

  async logout ():Promise<void> {
    try {
      await this.signOut()
      await this.$router.push('login')
    } catch (err) {
      // TODO deal with the error
    }
  }
}
</script>
