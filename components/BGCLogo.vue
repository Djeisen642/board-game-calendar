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
      <circle cx="40" cy="14" r="13" />
      <path
        d="M 40 27
           C 46 27, 60 29, 66 31
           C 70 32, 75 34, 76 38
           C 77 43, 72 46, 66 45
           C 60 44, 54 44, 51 46
           C 52 52, 54 60, 54 72
           L 54 83
           C 54 89, 51 93, 47 93
           L 43 93
           L 43 68
           L 37 68
           L 37 93
           L 33 93
           C 29 93, 26 89, 26 83
           L 26 72
           C 26 60, 28 52, 29 46
           C 26 44, 20 44, 14 45
           C 8 46, 3 43, 4 38
           C 5 33, 10 32, 14 31
           C 20 29, 34 27, 40 27
           Z"
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
