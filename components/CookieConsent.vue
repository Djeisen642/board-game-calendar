<template>
  <Transition name="consent-fade">
    <div
      v-if="show"
      class="cookie-consent"
      role="region"
      aria-label="Cookie consent"
    >
      <div class="cookie-consent__inner">
        <p class="cookie-consent__text">
          We use Firebase Analytics to see how the site is used. It only loads if
          you accept. Cookies needed for sign-in and security stay on either way.
          See our
          <NuxtLink :to="routes.privacy" class="cookie-consent__link"
            >privacy policy</NuxtLink
          >.
        </p>
        <div class="cookie-consent__actions">
          <v-btn variant="text" color="accent" size="small" @click="onReject">
            Reject
          </v-btn>
          <v-btn
            variant="elevated"
            color="primary"
            size="small"
            @click="onAccept"
          >
            Accept
          </v-btn>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import routes from '~/helpers/routes'

const { hasResponded, acceptAll, rejectAll } = useCookieConsent()

// Only decide visibility after mount so the server-rendered HTML never contains
// the banner (avoids a hydration mismatch and a flash for returning visitors who
// already answered).
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const show = computed(() => mounted.value && !hasResponded.value)

const onAccept = () => acceptAll()
const onReject = () => rejectAll()
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  inset: auto 12px 12px 12px;
  z-index: 2400;
  margin: 0 auto;
  max-width: 720px;
  background: #241808;
  border: 1px solid rgba(200, 134, 10, 0.32);
  border-radius: 12px;
  box-shadow: 0 20px 44px -16px rgba(0, 0, 0, 0.7);
}

.cookie-consent__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 16px 20px;
}

.cookie-consent__text {
  flex: 1 1 280px;
  margin: 0;
  font-family: 'Lora', Georgia, serif;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #e8d4a8;
}

.cookie-consent__link {
  color: #c0a870;
  text-decoration: underline;
}

.cookie-consent__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.consent-fade-enter-active,
.consent-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.consent-fade-enter-from,
.consent-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
