<template>
  <v-icon
    size="200"
    class="logo"
  >
    mdi-chess-bishop
  </v-icon>
</template>

<style>
.logo {
  transform: rotateY(360deg);
  animation: turn 3.5s ease-out forwards 1s;
}

@keyframes turn {
  100% {
    transform: rotateX(0deg);
  }
}
</style>
