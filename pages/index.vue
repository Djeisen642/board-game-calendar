<template>
  <div class="hero-wrapper">
    <div class="hero-bg" />
    <v-row justify="center" align="center">
      <v-col cols="12" sm="11" md="8" lg="6">
        <div class="text-center mb-8">
          <BGCLogo />
        </div>
        <v-card class="hero-card">
          <v-card-text class="text-center pa-8">
            <h1 class="hero-title mb-4">Board Game Calendar</h1>
            <p class="hero-subtitle mb-2">
              Schedule board game nights around the games you love — not the
              ones that attract the least common denominator.
            </p>
            <p class="hero-body mb-6">
              Build your collection, add friends, and invite them to play
              specific games. No more compromising on game night.
            </p>
            <v-btn
              color="primary"
              size="large"
              to="/signin"
              class="hero-cta"
              elevation="8"
            >
              Get Started
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-text>
        </v-card>

        <div class="feature-grid mt-8">
          <v-row>
            <v-col v-for="feature in features" :key="feature.icon" cols="12" sm="4">
              <div class="feature-item text-center pa-4">
                <v-icon size="36" color="accent" class="mb-3">
                  {{ feature.icon }}
                </v-icon>
                <div class="feature-title">{{ feature.title }}</div>
                <div class="feature-desc">{{ feature.desc }}</div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Welcome' })

const features = [
  {
    icon: 'mdi-rhombus-split',
    title: 'Your Collection',
    desc: 'Catalog your board games with ratings and notes.',
  },
  {
    icon: 'mdi-account-group',
    title: 'Find Friends',
    desc: 'Connect with fellow board game enthusiasts.',
  },
  {
    icon: 'mdi-calendar-check',
    title: 'Schedule Nights',
    desc: 'Plan gatherings around the games you love.',
  },
]
</script>

<style scoped>
.hero-wrapper {
  position: relative;
  padding-top: 24px;
}

.hero-bg {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(108, 92, 231, 0.08) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.hero-card {
  overflow: visible;
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #cdd6f4 0%, #6c5ce7 50%, #00cec9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.05rem;
  color: rgba(205, 214, 244, 0.85);
  line-height: 1.6;
}

.hero-body {
  font-size: 0.95rem;
  color: rgba(205, 214, 244, 0.55);
  line-height: 1.6;
}

.hero-cta {
  font-weight: 600;
  padding: 0 32px;
  background: linear-gradient(135deg, #6c5ce7, #5a4bd1) !important;
  transition: all 0.3s ease;
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(108, 92, 231, 0.4) !important;
}

.feature-item {
  border-radius: 16px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(108, 92, 231, 0.06);
}

.feature-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
  color: rgba(205, 214, 244, 0.9);
}

.feature-desc {
  font-size: 0.82rem;
  color: rgba(205, 214, 244, 0.5);
  line-height: 1.5;
}
</style>
