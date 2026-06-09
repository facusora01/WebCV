document.addEventListener('DOMContentLoaded', function () {
  var langSelect = document.getElementById('lang-select');
  if (!langSelect) return;

  // Texts for both languages
  var translations = {
    en: {
      'title': 'Personal Web',
      'profession': 'Computer Engineering Student',
      'about-title': 'About Me',
      'about-text': 'I am a Computer Engineering student focused on software development and algorithmic logic. I specialize in creating functional applications and enjoy the challenge of optimizing code. In my downtime, I expand my skill set by creating web and mobile applications, and managing locally-run AI systems.',
      'skills-title': 'Skills',
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

      'contact-title': 'My Contact',
      'projects-title': 'Projects',
      'project-shapeshifter-title': 'ShapeShifter',
      'project-shapeshifter-desc': 'Discord bot with AI voice cloning and conversational assistant',
      'project-shapeshifter-1': 'Personally trained F5-TTS model to maintain Argentine accent',
      'project-shapeshifter-2': 'Conversational AI assistant powered by Ollama llama3.2:3b',
      'project-shapeshifter-3': 'Real-time voice impersonation and chat responses',
      'project-letitride-title': 'LetItRide Casino Bot',
      'project-letitride-desc': 'WhatsApp casino bot with live roulette and betting system',
      'project-letitride-1': 'European roulette with multiple bet types and odds',
      'project-letitride-2': 'Weekly credit system and automatic scheduled games',
      'project-letitride-3': 'Deployed on Linux server with SSH access and web admin panel',
      'project-agroscanner-title': 'AgroScanner',
      'project-agroscanner-desc': 'Mobile app for farm animal management and RFID scanning',
      'project-agroscanner-1': 'Flutter mobile app with JWT authentication',
      'project-agroscanner-2': 'Python/FastAPI backend deployed on Linux server via SSH',
      'project-agroscanner-3': 'Animal registration and tracking using RFID chips',
      'project-amankay-title': 'Amankay Web',
      'project-amankay-desc': 'Full-stack web application with data visualization and file management',
      'project-amankay-1': 'React frontend with Express backend and SQLite database',
      'project-amankay-2': 'Backend deployed on Linux server with SSH remote management',
      'project-amankay-3': 'Data visualization using Recharts and file upload system',
      'project-amankay-link': 'View Project',
      'project-coupleapp-title': 'Couple App',
      'project-coupleapp-desc': 'Web application for couples to like and share products',
      'project-coupleapp-1': 'Interactive product swiping and liking system',
      'project-coupleapp-2': 'Real-time matching and shared wishlists',
      'project-coupleapp-link': 'View Project',
      'project-onlinestore-title': 'Online Store with Chat',
      'project-onlinestore-desc': 'E-commerce platform featuring integrated user-to-user chat',
      'project-onlinestore-1': 'Complete online shopping experience with cart and checkout',
      'project-onlinestore-2': 'Real-time messaging system between buyers and sellers',
      'project-appointa-title': 'Appointa',
      'project-appointa-desc': 'Appointment management web app for businesses and independent professionals across any industry',
      'project-appointa-1': 'Online booking and scheduling for shops and individual professionals',
      'project-appointa-2': 'Configurable services, availability and calendar management',
      'project-leaguedt-title': 'LeagueDT',
      'project-leaguedt-desc': 'App that uses statistics to define the macro and micro decisions to make in League of Legends matches',
      'project-leaguedt-1': 'Data-driven macro and micro decision recommendations',
      'project-leaguedt-2': 'Match statistics analysis to guide in-game strategy',
      'repos-title': 'Repositories',
      'repo-webcv-desc': 'Personal portfolio and CV website with i18n and live GitHub contributions',
      'repo-agroscanner-desc': 'Flutter app with FastAPI backend for farm animal management and RFID scanning',
      'repo-amankay-desc': 'Full-stack web app with data visualization and file management (React + Express)',
      'repo-wantit-desc': 'Product matching web app for couples with React, Express and PostgreSQL',
      'repo-tienda-desc': 'Next.js vehicle e-commerce with authentication and Mercado Pago payments',
      'repo-leaguedt-desc': 'Electron desktop app with React that analyzes League of Legends match statistics',
      'repo-letitride-desc': 'WhatsApp casino bot with live roulette, betting and scheduled games',
      'repo-motivationbot-desc': 'WhatsApp bot that sends a daily motivational quote to a group',
      'repo-automatch-desc': 'Python tool that auto-accepts the League of Legends match queue pop',
      'repo-appruleta-desc': 'Flutter roulette game app for Android and iOS',
      'repo-moblevel-desc': 'Minecraft Fabric mod that adds mob leveling mechanics',
      'repo-shapeshifter-desc': 'Discord bot with AI voice cloning and a conversational assistant',
      'github-title': 'GitHub Contributions',
    },
    es: {
      'title': 'Web Personal',
      'profession': 'Estudiante de Ingeniería Informática',
      'about-title': 'Sobre mí',
      'about-text': 'Soy un estudiante de Ingeniería Informática enfocado en el desarrollo de software y la lógica algorítmica. Me especializo en crear aplicaciones funcionales y disfruto el desafío de optimizar el código. En mi tiempo libre, amplío mis habilidades creando aplicaciones web y móviles, y gestionando sistemas de Inteligencia Artificial de ejecución local.',
      'skills-title': 'Habilidades',
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

      'contact-title': 'Contacto',
      'projects-title': 'Proyectos',
      'project-shapeshifter-title': 'ShapeShifter',
      'project-shapeshifter-desc': 'Bot de Discord con clonación de voz y asistente conversacional de IA',
      'project-shapeshifter-1': 'Modelo F5-TTS entrenado personalmente para mantener acento argentino',
      'project-shapeshifter-2': 'Asistente conversacional de IA impulsado por Ollama llama3.2:3b',
      'project-shapeshifter-3': 'Impersonación de voz en tiempo real y respuestas de chat',
      'project-letitride-title': 'LetItRide Casino Bot',
      'project-letitride-desc': 'Bot de casino de WhatsApp con ruleta en vivo y sistema de apuestas',
      'project-letitride-1': 'Ruleta europea con múltiples tipos de apuesta y probabilidades',
      'project-letitride-2': 'Sistema de créditos semanales y juegos automáticos programados',
      'project-letitride-3': 'Desplegado en servidor Linux con acceso SSH y panel de administración web',
      'project-agroscanner-title': 'AgroScanner',
      'project-agroscanner-desc': 'Aplicación móvil para gestión y escaneo RFID de animales de granja',
      'project-agroscanner-1': 'App Flutter con autenticación JWT',
      'project-agroscanner-2': 'Backend Python/FastAPI desplegado en servidor Linux vía SSH',
      'project-agroscanner-3': 'Sistema de registro y seguimiento de animales usando chips RFID',
      'project-amankay-title': 'Amankay Web',
      'project-amankay-desc': 'Aplicación web full-stack con visualización de datos y gestión de archivos',
      'project-amankay-1': 'Frontend React con backend Express y base de datos SQLite',
      'project-amankay-2': 'Backend desplegado en servidor Linux con administración remota SSH',
      'project-amankay-3': 'Visualización de datos usando Recharts y sistema de subida de archivos',
      'project-amankay-link': 'Ver Proyecto',
      'project-coupleapp-title': 'App para Parejas',
      'project-coupleapp-desc': 'Aplicación web para parejas donde pueden darse like y compartir productos',
      'project-coupleapp-1': 'Sistema interactivo de deslizamiento y likes de productos',
      'project-coupleapp-2': 'Emparejamiento en tiempo real y listas de deseos compartidas',
      'project-coupleapp-link': 'Ver Proyecto',
      'project-onlinestore-title': 'Tienda Online con Chat',
      'project-onlinestore-desc': 'Plataforma de comercio electrónico con chat integrado entre usuarios',
      'project-onlinestore-1': 'Experiencia completa de compra online con carrito y checkout',
      'project-onlinestore-2': 'Sistema de mensajería en tiempo real entre compradores y vendedores',
      'project-appointa-title': 'Appointa',
      'project-appointa-desc': 'Aplicación web de gestión de turnos para locales y profesionales individuales de cualquier rubro',
      'project-appointa-1': 'Reserva y agendamiento online para locales y profesionales individuales',
      'project-appointa-2': 'Servicios, disponibilidad y gestión de calendario configurables',
      'project-leaguedt-title': 'LeagueDT',
      'project-leaguedt-desc': 'App que mediante estadística define las macro y micro decisiones a tomar en partidas de League of Legends',
      'project-leaguedt-1': 'Recomendaciones de macro y micro decisiones basadas en datos',
      'project-leaguedt-2': 'Análisis de estadísticas de partidas para guiar la estrategia en juego',
      'repos-title': 'Repositorios',
      'repo-webcv-desc': 'Sitio web de portfolio y CV personal con i18n y contribuciones de GitHub en vivo',
      'repo-agroscanner-desc': 'App Flutter con backend FastAPI para gestión de animales de granja y escaneo RFID',
      'repo-amankay-desc': 'App web full-stack con visualización de datos y gestión de archivos (React + Express)',
      'repo-wantit-desc': 'App web de emparejamiento de productos para parejas con React, Express y PostgreSQL',
      'repo-tienda-desc': 'E-commerce de vehículos en Next.js con autenticación y pagos con Mercado Pago',
      'repo-leaguedt-desc': 'App de escritorio en Electron con React que analiza estadísticas de partidas de League of Legends',
      'repo-letitride-desc': 'Bot de casino de WhatsApp con ruleta en vivo, apuestas y juegos programados',
      'repo-motivationbot-desc': 'Bot de WhatsApp que envía una frase motivacional diaria a un grupo',
      'repo-automatch-desc': 'Herramienta en Python que acepta automáticamente la cola de partida de League of Legends',
      'repo-appruleta-desc': 'App de juego de ruleta en Flutter para Android e iOS',
      'repo-moblevel-desc': 'Mod de Minecraft (Fabric) que agrega mecánicas de niveles a los mobs',
      'repo-shapeshifter-desc': 'Bot de Discord con clonación de voz por IA y asistente conversacional',
      'github-title': 'Contribuciones en GitHub',
    }
  };

  function setLang(lang) {
    var elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(function (el) {
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

    if (translations[lang]['title']) {
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
