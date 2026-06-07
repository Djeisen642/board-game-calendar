<template>
  <v-app>
    <v-navigation-drawer v-model="drawer">
      <div class="drawer-header">
        <BGCLogo />
        <div class="drawer-brand">BGC</div>
      </div>
      <v-divider class="mb-2" />
      <v-list nav>
        <v-list-item
          v-for="(item, i) in activeItems"
          :key="i"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          exact
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar class="bgc-app-bar" flat>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-toolbar-title class="app-bar-title">
        <span class="app-bar-title-icon">♟</span>
        {{ title }}
      </v-toolbar-title>
      <v-spacer />
      <v-btn
        v-if="showSignOut"
        variant="tonal"
        color="primary"
        size="small"
        @click.stop="onSignoutClicked"
      >
        <v-icon start>mdi-logout</v-icon>
        Sign out
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
        <slot />
      </v-container>
    </v-main>

    <v-footer app class="bgc-footer">
      <span>Jason Suttles &copy; {{ new Date().getFullYear() }}</span>
    </v-footer>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import routes from '~/helpers/routes'

enum PageType {
  AlwaysShow,
  NeedsAuth,
  BeforeAuth,
}

const userStore = useUserStore()
const router = useRouter()

const title = 'Board Game Calendar'
const drawer = ref(false)

const items = [
  { icon: 'mdi-apps', title: 'Welcome', to: routes.index, type: PageType.AlwaysShow },
  { icon: 'mdi-login', title: 'Sign In', to: routes.signIn, type: PageType.BeforeAuth },
  { icon: 'mdi-calendar', title: 'Calendar', to: routes.calendar, type: PageType.NeedsAuth },
  { icon: 'mdi-rhombus-split', title: 'Game Collection', to: routes.gameCollection, type: PageType.NeedsAuth },
  { icon: 'mdi-account-group', title: 'Friends', to: routes.friends, type: PageType.NeedsAuth },
  { icon: 'mdi-account', title: 'Profile', to: routes.profile, type: PageType.NeedsAuth },
]

const activeItems = computed(() => {
  if (userStore.user) {
    return items.filter((item) =>
      [PageType.AlwaysShow, PageType.NeedsAuth].includes(item.type)
    )
  }
  return items.filter((item) =>
    [PageType.AlwaysShow, PageType.BeforeAuth].includes(item.type)
  )
})

const showSignOut = computed(() => !!userStore.user)

async function onSignoutClicked() {
  await userStore.signOut()
  await router.push(routes.signIn)
}
</script>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 12px;
}

.drawer-brand {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #6c5ce7, #00cec9);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.app-bar-title {
  font-weight: 600;
  letter-spacing: 0.01em;
}

.app-bar-title-icon {
  margin-right: 6px;
  font-size: 1.1em;
}
</style>
