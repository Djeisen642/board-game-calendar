<template>
  <div class="meeple-container">
    <div class="meeple-glow" />
    <svg
      class="meeple-svg"
      viewBox="0 0 80 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Meeple logo"
      role="img"
    >
      <!-- Head -->
      <circle cx="40" cy="16" r="14" />
      <!-- Body with arms and legs — classic meeple silhouette -->
      <path
        d="M 40 29
           L 20 36 L 4 32
           C 1 32 1 40 4 42
           L 22 47 L 24 86
           C 24 91 27 94 31 94
           L 36 94 L 36 72 L 44 72 L 44 94 L 49 94
           C 53 94 56 91 56 86
           L 58 47 L 76 42
           C 79 40 79 32 76 32
           L 60 36 Z"
      />
    </svg>
  </div>
</template>

<style scoped>
.meeple-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.meeple-glow {
  position: absolute;
  width: 110px;
  height: 130px;
  background: radial-gradient(
    ellipse,
    rgba(200, 134, 10, 0.28) 0%,
    transparent 70%
  );
  filter: blur(22px);
  animation: meeple-breathe 3s ease-in-out infinite;
}

.meeple-svg {
  position: relative;
  z-index: 1;
  width: 110px;
  height: 130px;
  fill: #c8860a;
  filter: drop-shadow(0 0 10px rgba(200, 134, 10, 0.45));
  animation: meeple-bob 2.8s ease-in-out infinite;
}

@keyframes meeple-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes meeple-breathe {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}
</style>
