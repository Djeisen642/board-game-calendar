<template>
  <v-app>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <v-navigation-drawer v-model="drawer" aria-label="Main navigation">
      <div class="drawer-header">
        <BGCLogo />
        <div class="drawer-brand">BGC</div>
      </div>
      <v-divider class="mb-2" />
      <v-list nav class="nav-list">
        <v-list-item
          v-for="(item, i) in activeItems"
          :key="i"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          exact
          min-height="56"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar class="bgc-app-bar" flat>
      <v-app-bar-nav-icon aria-label="Open navigation menu" @click.stop="drawer = !drawer" />
      <v-toolbar-title class="app-bar-title">
        <v-icon class="app-bar-title-icon" color="primary" size="20"
          >mdi-hexagon-multiple</v-icon
        >
        <span class="d-none d-sm-inline">{{ title }}</span>
        <span class="d-inline d-sm-none">BGC</span>
      </v-toolbar-title>
      <v-spacer />
      <v-btn
        v-if="showSignOut"
        class="d-sm-none"
        variant="elevated"
        color="primary"
        icon
        size="small"
        aria-label="Sign out"
        title="Sign out"
        @click.stop="onSignoutClicked"
      >
        <v-icon>mdi-logout</v-icon>
      </v-btn>
      <v-btn
        v-if="showSignOut"
        class="d-none d-sm-flex"
        variant="elevated"
        color="primary"
        size="small"
        @click.stop="onSignoutClicked"
      >
        <v-icon start>mdi-logout</v-icon>Sign out
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container id="main-content">
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
  {
    icon: 'mdi-castle',
    title: 'Welcome',
    to: routes.index,
    type: PageType.AlwaysShow,
  },
  {
    icon: 'mdi-account-key',
    title: 'Sign In',
    to: routes.signIn,
    type: PageType.BeforeAuth,
  },
  {
    icon: 'mdi-calendar-month',
    title: 'Calendar',
    to: routes.calendar,
    type: PageType.NeedsAuth,
  },
  {
    icon: 'mdi-dice-multiple',
    title: 'New Gathering',
    to: routes.newGathering,
    type: PageType.NeedsAuth,
  },
  {
    icon: 'mdi-cards-outline',
    title: 'Game Collection',
    to: routes.gameCollection,
    type: PageType.NeedsAuth,
  },
  {
    icon: 'mdi-account-group',
    title: 'Friends',
    to: routes.friends,
    type: PageType.NeedsAuth,
  },
  {
    icon: 'mdi-account',
    title: 'Profile',
    to: routes.profile,
    type: PageType.NeedsAuth,
  },
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
  padding: 20px 16px 14px;
  border-bottom: 1px solid rgba(200, 134, 10, 0.14);
}

.drawer-brand {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #c8860a;
  text-shadow: 0 0 14px rgba(200, 134, 10, 0.4);
}

.app-bar-title {
  font-family: 'Cinzel', Georgia, serif;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #f0dfc4;
}

.app-bar-title-icon {
  margin-right: 8px;
  vertical-align: middle;
}

.nav-list :deep(.v-list-item-title) {
  font-family: 'Lora', Georgia, serif;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.4;
}

.nav-list :deep(.v-icon) {
  font-size: 1.3rem;
  color: rgba(200, 134, 10, 0.7);
}

.nav-list :deep(.v-list-item--active .v-icon) {
  color: #c8860a;
}
</style>
