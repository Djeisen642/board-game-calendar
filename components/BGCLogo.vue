<template>
  <div class="logo-container">
    <div class="logo-glow" />
    <v-icon size="120" class="logo" color="primary"> mdi-chess-bishop </v-icon>
  </div>
</template>

<style scoped>
.logo-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logo-glow {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.3) 0%, transparent 70%);
  filter: blur(20px);
  animation: glow-pulse 3s ease-in-out infinite;
}

.logo {
  position: relative;
  z-index: 1;
  transform: rotateY(360deg);
  animation: turn 3.5s ease-out forwards 1s;
  filter: drop-shadow(0 0 20px rgba(108, 92, 231, 0.4));
}

@keyframes turn {
  100% {
    transform: rotateX(0deg);
  }
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>
