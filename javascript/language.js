document.addEventListener('DOMContentLoaded', function () {
  var langSelect = document.getElementById('lang-select');
  if (!langSelect) return;

  // Texts for both languages
  var translations = {
    en: {
      'title': 'Personal Web',
      'profession': 'Computer Engineering Student',
      'about-title': 'About Me',
      'about-text': 'I am a Computer Engineering student focused on software development and algorithmic logic. I specialize in creating functional applications and enjoy the challenge of optimizing code. In my downtime, I expand my skill set by exploring game development engines and mechanics.',
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
      'exp-webdev-date': 'June 2023',
      'exp-webdev-1': 'Developed and maintained small personal website.',
      'exp-webdev-2': 'Collaborated with design team to implement new features.',
      'exp-webdev-3': 'Optimized website performance and frontend responsiveness.',
      'exp-pydev-title': 'Python Developer',
      'exp-pydev-date': 'Jan 2020',
      'exp-pydev-1': 'Assisted in developing client websites.',
      'exp-pydev-2': 'Create automated scripts to streamline workflows.',
      'exp-pydev-3': 'Worked in a team to deliver high-quality software solutions.',
      'exp-javadev-title': 'Java Developer',
      'exp-javadev-date': 'Jan 2024',
      'exp-javadev-1': 'Collaborated in the development of Java-based applications.',
      'exp-javadev-2': 'Implemented logic and user interface components.',
      'exp-javadev-3': 'Implemented TDD to ensure code quality and functionality.',
      'exp-appdev-title': 'App Developer',
      'exp-appdev-date': 'Nov 2025 - In progress',
      'exp-appdev-1': 'Currently learning mobile app development using Flutter.',
      'exp-appdev-2': 'Exploring cross-platform solutions for Android and iOS.',
      'exp-appdev-3': 'Building an app to improve management in Agricultural/Livestock areas.',
      'education-title': 'Education',
      'edu-uni': 'UBA University of Engineering, 2021',
      'edu-career': 'Computer Engineering',
      'qr-generate-link': 'Generate your own QR codes easily!',
      'contact-title': 'My Contact',
    },
    es: {
      'title': 'Web Personal',
      'profession': 'Estudiante de Ingeniería Informática',
      'about-title': 'Sobre mí',
      'about-text': 'Soy un estudiante de Ingeniería Informática enfocado en el desarrollo de software y la lógica algorítmica. Me especializo en crear aplicaciones funcionales y disfruto el desafío de optimizar el código. En mi tiempo libre, amplío mis habilidades explorando motores y mecánicas de desarrollo de juegos.',
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
      'exp-webdev-date': 'Junio 2023',
      'exp-webdev-1': 'Desarrollé y mantuve un sitio web personal pequeño.',
      'exp-webdev-2': 'Colaboré con el equipo de diseño para implementar nuevas funciones.',
      'exp-webdev-3': 'Optimizé el rendimiento y la respuesta del frontend.',
      'exp-pydev-title': 'Desarrollador Python',
      'exp-pydev-date': 'Enero 2020',
      'exp-pydev-1': 'Asistí en el desarrollo de sitios web para clientes.',
      'exp-pydev-2': 'Creé scripts automatizados para agilizar flujos de trabajo.',
      'exp-pydev-3': 'Trabajé en equipo para entregar soluciones de software de calidad.',
      'exp-javadev-title': 'Desarrollador Java',
      'exp-javadev-date': 'Enero 2024',
      'exp-javadev-1': 'Colaboré en el desarrollo de aplicaciones basadas en Java.',
      'exp-javadev-2': 'Implementé la lógica y componentes de interfaz.',
      'exp-javadev-3': 'Implementé TDD para asegurar calidad y funcionalidad.',
      'exp-appdev-title': 'Desarrollador de Apps',
      'exp-appdev-date': 'Noviembre 2025 - En progreso',
      'exp-appdev-1': 'Actualmente aprendiendo desarrollo de apps móviles con Flutter.',
      'exp-appdev-2': 'Explorando soluciones multiplataforma para Android e iOS.',
      'exp-appdev-3': 'Construyendo una app para mejorar la gestion en las zonas Agricolas/Ganaderas.',
      'education-title': 'Educación',
      'edu-uni': 'UBA Universidad de Ingeniería, 2021',
      'edu-career': 'Ingeniería en Informática',
      'qr-generate-link': '¡Genera tus propios códigos QR fácilmente!',
      'contact-title': 'Contacto',
    }
  };

  function setLang(lang) {
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

    if (translations[lang]['qr-title'] && document.title.match(/QR/)) {
      document.title = translations[lang]['qr-title'] + ' - WebCV';
    } else if (translations[lang]['title']) {
      document.title = translations[lang]['title'] + ' - WebCV';
    }

    localStorage.setItem('lang', lang);
  }

  langSelect.addEventListener('change', function () {
    setLang(this.value);
  });

  var saved = localStorage.getItem('lang') || langSelect.value;
  langSelect.value = saved;
  setLang(saved);
});
