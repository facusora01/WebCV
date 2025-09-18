// Efecto de capas de fondo que se desplazan verticalmente según el scroll


function resizeBackgroundLayers() {
    const bgLayers = document.getElementById('background-layers');
    if (bgLayers) {
        // Ajusta el alto al total del contenido de la página
        bgLayers.style.height = document.body.scrollHeight + 'px';
    }
}

window.addEventListener('scroll', function() {
    const scrollY = window.scrollY;
    const bgLayers = document.getElementById('background-layers');
    if (bgLayers) {
        bgLayers.style.transform = `translateY(-${scrollY}px)`;
        bgLayers.style.transition = 'transform 0s';
    }
});

window.addEventListener('resize', resizeBackgroundLayers);
window.addEventListener('DOMContentLoaded', function() {
    resizeBackgroundLayers();
    window.dispatchEvent(new Event('scroll'));
});
