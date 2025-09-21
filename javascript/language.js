// Simple language switcher for index.html and QRGenerator.html
// Add data-i18n attributes to elements you want to translate

document.addEventListener('DOMContentLoaded', function () {
  var langSelect = document.getElementById('lang-select');
  if (!langSelect) return;

  // Texts for both languages
  var translations = {
    en: {
      'title': 'Personal Web',
      'about-title': 'About Me',
      'about-text': 'Welcome to my online resume! I am a web developer with a passion for creating beautiful and functional websites and some game design.',
      'skills-title': 'Skills',
      'qr-title': 'QR Code Generator',
      'qr-generate': 'Generate Your QR Code',
      'qr-label': 'Enter text or URL:',
      'qr-generate-btn': 'Generate QR Code',
      'qr-copy': 'Copy',
      'qr-download': 'Download',
      'qr-result-title': 'Your QR Code:',
      'go-back': 'Go Back',
      'in-progress': 'In progress',
      'experience-title': 'Experience',
      'exp-webdev-title': 'Web Developer',
      'exp-webdev-date': 'June 2023 - Present',
      'exp-webdev-1': 'Developed and maintained small personal website.',
      'exp-webdev-2': 'Collaborated with design team to implement new features.',
      'exp-webdev-3': 'Optimized website performance and frontend responsiveness.',
      'exp-pydev-title': 'Python Developer',
      'exp-pydev-date': 'Jan 2020 - Present',
      'exp-pydev-1': 'Assisted in developing client websites.',
      'exp-pydev-2': 'Create automated scripts to streamline workflows.',
      'exp-pydev-3': 'Worked in a team to deliver high-quality software solutions.',
      'exp-javadev-title': 'Java Developer',
      'exp-javadev-date': 'Jan 2024 - Present',
      'exp-javadev-1': 'Collaborated in the development of a Java-based card game.',
      'exp-javadev-2': 'Implemented game logic and user interface components.',
      'exp-javadev-3': 'Implemented TDD to ensure code quality and functionality.',
      'education-title': 'Education',
      'edu-uni': 'UBA University of Engineering, 2021 - Present',
      'edu-career': 'Software Engineering',
      'qr-generate-link': 'Generate your own QR codes easily!',
      'contact-title': 'My Contact',
    },
    es: {
      'title': 'Web Personal',
      'about-title': 'Sobre mí',
      'about-text': '¡Bienvenido a mi currículum online! Soy un desarrollador web con pasión por crear sitios hermosos y funcionales y algo de diseño de juegos.',
      'skills-title': 'Habilidades',
      'qr-title': 'Generador de Códigos QR',
      'qr-generate': 'Genera tu código QR',
      'qr-label': 'Introduce texto o URL:',
      'qr-generate-btn': 'Generar código QR',
      'qr-copy': 'Copiar',
      'qr-download': 'Descargar',
      'qr-result-title': 'Tu código QR:',
      'go-back': 'Volver',
      'in-progress': 'En progreso',
      'experience-title': 'Experiencia',
      'exp-webdev-title': 'Desarrollador Web',
      'exp-webdev-date': 'Junio 2023 - Presente',
      'exp-webdev-1': 'Desarrollé y mantuve un sitio web personal pequeño.',
      'exp-webdev-2': 'Colaboré con el equipo de diseño para implementar nuevas funciones.',
      'exp-webdev-3': 'Optimizé el rendimiento y la respuesta del frontend.',
      'exp-pydev-title': 'Desarrollador Python',
      'exp-pydev-date': 'Ene 2020 - Presente',
      'exp-pydev-1': 'Asistí en el desarrollo de sitios web para clientes.',
      'exp-pydev-2': 'Creé scripts automatizados para agilizar flujos de trabajo.',
      'exp-pydev-3': 'Trabajé en equipo para entregar soluciones de software de calidad.',
      'exp-javadev-title': 'Desarrollador Java',
      'exp-javadev-date': 'Ene 2024 - Presente',
      'exp-javadev-1': 'Colaboré en el desarrollo de un juego de cartas en Java.',
      'exp-javadev-2': 'Implementé la lógica del juego y componentes de interfaz.',
      'exp-javadev-3': 'Implementé TDD para asegurar calidad y funcionalidad.',
      'education-title': 'Educación',
      'edu-uni': 'UBA Universidad de Ingeniería, 2021 - Presente',
      'edu-career': 'Ingeniería en Software',
      'qr-generate-link': '¡Genera tus propios códigos QR fácilmente!',
      'contact-title': 'Contacto',
    }
  };

  function setLang(lang) {
    // Cambia textos con data-i18n
    var elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        if (el.tagName === 'INPUT' && el.type === 'submit') {
          el.value = translations[lang][key];
        } else if (el.tagName === 'BUTTON') {
          el.textContent = translations[lang][key];
        } else {
          el.innerHTML = translations[lang][key];
        }
      }
    });
    // Cambia el título de la página
    if (translations[lang]['qr-title'] && document.title.match(/QR/)) {
      document.title = translations[lang]['qr-title'] + ' - WebCV';
    } else if (translations[lang]['title']) {
      document.title = translations[lang]['title'] + ' - WebCV';
    }
    // Guarda preferencia
    localStorage.setItem('lang', lang);
  }

  // Cambia idioma al seleccionar
  langSelect.addEventListener('change', function () {
    setLang(this.value);
  });

  // Carga idioma guardado o por defecto
  var saved = localStorage.getItem('lang') || langSelect.value;
  langSelect.value = saved;
  setLang(saved);
});
