// Efecto de capas de fondo que se desplazan verticalmente según el scroll

window.addEventListener('scroll', function() {
    const scrollY = window.scrollY;
    const bgLayers = document.getElementById('background-layers');
    if (bgLayers) {
        bgLayers.style.transform = `translateY(-${scrollY}px)`;
        bgLayers.style.transition = 'transform 0s';
    }
});

// Inicializar el fondo al cargar la página
window.dispatchEvent(new Event('scroll'));
