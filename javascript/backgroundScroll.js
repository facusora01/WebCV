// Efecto de capas de fondo que se desplazan verticalmente según el scroll

function setBackgroundHeight() {
  const bgLayers = document.getElementById('background-layers');
  if (bgLayers) {
    // Usar 100vh para compatibilidad móvil y escritorio
    bgLayers.style.height = '100vh';
  }
}

function setBackgroundScroll() {
  const bgLayers = document.getElementById('background-layers');
  if (bgLayers) {
    bgLayers.style.transform = `translateY(-${window.scrollY}px)`;
  }
}

// Debounce para evitar ejecuciones excesivas
function debounce(fn, delay = 16) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

window.addEventListener('resize', debounce(setBackgroundHeight, 50));
window.addEventListener('scroll', debounce(setBackgroundScroll, 0));
window.addEventListener('DOMContentLoaded', () => {
  setBackgroundHeight();
  setBackgroundScroll();
});
