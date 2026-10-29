// All site copy, bilingual. The room (3D) and the classic CV both render from here.

export const ui = {
  en: {
    tagline: 'Computer Engineering student · UBA',
    knock: 'Click the handle to come in',
    knockTouch: 'Tap the handle to come in',
    hint: 'Drag to look around · click around to explore',
    hintTouch: 'Drag to look around · tap around to explore',
    termHint: 'Type help · Tab completes · Esc to leave',
    keyboard: 'Keyboard',
    leave: 'Exit',
    zoneHint: 'Drag to look around · click an object · click outside to step back',
    screenHint: 'Use the screen · click outside to step back',
    inspectHint: 'Click to flip it · click outside to put it back',
    lookHint: 'Click to step back',
    classic: 'Classic CV',
    room: 'Back to the room',
    close: 'Close',
    back: '← Back',
    live: 'Live site ↗',
    repo: 'Source ↗',
    features: 'Highlights',
    private: 'Private project',
    sound: 'Music',
    noWebgl: 'Your browser can’t show the 3D room, so here is the classic CV.',
    sections: {
      about: 'About me', projects: 'Projects', experience: 'Experience',
      skills: 'Skills', education: 'Education', contact: 'Contact'
    },
    wallet: 'My wallet',
    walletLead: 'Everything I carry: an ID and a card for each thing I know how to do.',
    contactLead: 'Open to internships, freelance work and interesting problems.',
    walletHint: 'Click a card to take it out · click outside to close the wallet',
    walletHintTouch: 'Tap a card to read it · tap outside to close',
    id: {
      header: 'DEVELOPER ID', surname: 'Surname', name: 'Name', role: 'Occupation',
      roleValue: 'CS student · developer', nat: 'Nationality', natValue: 'Argentine',
      uni: 'University', base: 'Based in', baseValue: 'Buenos Aires, AR', pets: 'Pets', petsValue: '2 dogs'
    }
  },
  es: {
    tagline: 'Estudiante de Ingeniería Informática · UBA',
    knock: 'Hacé click en el picaporte para entrar',
    knockTouch: 'Tocá el picaporte para entrar',
    hint: 'Arrastrá para mirar · hacé click para explorar',
    hintTouch: 'Arrastrá para mirar · tocá para explorar',
    termHint: 'Escribí help · Tab autocompleta · Esc para salir',
    keyboard: 'Teclado',
    leave: 'Salir',
    zoneHint: 'Arrastrá para mirar · click en un objeto · click afuera para volver',
    screenHint: 'Usá la pantalla · click afuera para volver',
    inspectHint: 'Click para darla vuelta · click afuera para devolverla',
    lookHint: 'Click para volver',
    classic: 'CV clásico',
    room: 'Volver al cuarto',
    close: 'Cerrar',
    back: '← Volver',
    live: 'Ver sitio ↗',
    repo: 'Código ↗',
    features: 'Lo destacado',
    private: 'Proyecto privado',
    sound: 'Música',
    noWebgl: 'Tu navegador no puede mostrar el cuarto 3D, así que acá va el CV clásico.',
    sections: {
      about: 'Sobre mí', projects: 'Proyectos', experience: 'Experiencia',
      skills: 'Habilidades', education: 'Educación', contact: 'Contacto'
    },
    wallet: 'Mi billetera',
    walletLead: 'Todo lo que llevo encima: una credencial y una tarjeta por cada cosa que sé hacer.',
    contactLead: 'Abierto a pasantías, trabajos freelance y problemas interesantes.',
    walletHint: 'Hacé click en una tarjeta para sacarla · click afuera para cerrar la billetera',
    walletHintTouch: 'Tocá una tarjeta para leerla · tocá afuera para cerrar',
    id: {
      header: 'CREDENCIAL DE DESARROLLADOR', surname: 'Apellido', name: 'Nombre', role: 'Ocupación',
      roleValue: 'Estudiante · desarrollador', nat: 'Nacionalidad', natValue: 'Argentina',
      uni: 'Universidad', base: 'Vive en', baseValue: 'Buenos Aires, AR', pets: 'Mascotas', petsValue: '2 perros'
    }
  }
};

export const about = {
  en: [
    'I’m Facundo, a Computer Engineering student at UBA. I like software that keeps working when nobody is watching: bots that send messages on time, screens that update themselves, servers that recover alone.',
    'Most of what I build ends up in production on a small Linux server I run myself, behind nginx and PM2. In between I train local AI models, write game mods and print things in 3D, with two dogs asleep at my feet.'
  ],
  es: [
    'Soy Facundo, estudiante de Ingeniería Informática en la UBA. Me gusta el software que sigue andando cuando nadie lo mira: bots que mandan mensajes a horario, pantallas que se actualizan solas, servidores que se recuperan solos.',
    'Casi todo lo que construyo termina en producción en un servidor Linux chico que administro yo, detrás de nginx y PM2. En el medio entreno modelos de IA locales, escribo mods de juegos e imprimo cosas en 3D, con dos perros durmiendo a mis pies.'
  ]
};

const L = (en, es) => ({ en, es });

export const projects = [
  {
    id: 'farmaceutica',
    dir: 'farmaceutica',
    title: 'Farmacéutica',
    tag: L('Real-time · Full-stack', 'Tiempo real · Full-stack'),
    stack: ['NestJS', 'Prisma', 'PostgreSQL', 'Socket.IO', 'React', 'TypeScript', 'Leaflet'],
    summary: L(
      'On-duty pharmacy system. By law, every pharmacy must display which pharmacies are on duty each day; today that list arrives by message and gets printed by hand. Here the pharmacists’ association loads the shifts in a web panel, and every pharmacy shows a live TV screen sorted by distance from where it stands.',
      'Sistema de farmacias de turno. Por normativa, cada farmacia debe informar cuáles están de turno cada día; hoy esa lista llega por mensaje y se imprime a mano. Acá el Colegio carga los turnos en un panel web y cada farmacia proyecta una pantalla TV en vivo, ordenada por distancia desde donde está.'
    ),
    features: L(
      ['Live TV screens over WebSocket: each one sorts the list from its own location (Haversine)',
        'Shift delegation between pharmacies (accept / reject) or automatic draw that picks the best city coverage',
        'Admin panel with maps on OpenStreetMap + Nominatim geocoding',
        'NestJS + Prisma + PostgreSQL backend with JWT auth'],
      ['Pantallas TV en vivo por WebSocket: cada una ordena la lista desde su propia ubicación (Haversine)',
        'Delegación de turnos entre farmacias (acepta / rechaza) o sorteo automático que elige la mejor cobertura',
        'Panel de administración con mapas sobre OpenStreetMap + geocoding con Nominatim',
        'Backend NestJS + Prisma + PostgreSQL con auth JWT']
    ),
    links: []
  },
  {
    id: 'motibot',
    dir: 'motibot',
    title: 'MotiBot',
    tag: L('Bot · Local AI', 'Bot · IA local'),
    stack: ['Node.js', 'SQLite', 'WebSocket', 'Ollama', 'PM2'],
    summary: L(
      'A WhatsApp bot that sends motivational quotes to groups. Each group picks language, time and frequency, and can build its own quote collection. Community members can plug their own local LLM (Ollama) into the bot with an open-source agent, so the AI runs on their PC and not on my server.',
      'Un bot de WhatsApp que manda frases motivacionales a grupos. Cada grupo elige idioma, hora y frecuencia, y puede armar su propia colección de frases. Los miembros de la comunidad pueden conectar su propio LLM local (Ollama) con un agente de código abierto, así la IA corre en su PC y no en mi servidor.'
    ),
    features: L(
      ['Per-group schedules, languages and custom quote collections (SQLite)',
        'Community LLMs: an isolated gateway process receives agents over WebSocket',
        'Every incoming image is rebuilt from raw pixels in a sandboxed process before use',
        'Watchdog, session backup and email alert when the WhatsApp session drops'],
      ['Horarios, idiomas y colecciones de frases propias por grupo (SQLite)',
        'LLMs de la comunidad: un proceso gateway aislado recibe a los agentes por WebSocket',
        'Cada imagen entrante se rehace desde los píxeles en un proceso aislado antes de usarla',
        'Watchdog, backup de sesión y alerta por mail cuando se cae la sesión de WhatsApp']
    ),
    links: [{ kind: 'repo', url: 'https://github.com/facusora01/motibot-agent' }]
  },
  {
    id: 'vikunja',
    dir: 'vikunja-extra',
    title: 'vikunja-extra',
    tag: L('Infra · Real-time', 'Infra · Tiempo real'),
    stack: ['PostgreSQL', 'WebSocket', 'nginx', 'GitHub Actions', 'MCP'],
    summary: L(
      'Self-hosted Vikunja as a Linear replacement, plus my own layer that adds real-time updates and quick assignment without forking Vikunja. Built around a hard limit: the whole server has 1.8 GB of RAM.',
      'Vikunja self-hosted como reemplazo de Linear, más una capa propia que le agrega tiempo real y asignación rápida sin forkear Vikunja. Diseñado alrededor de un límite duro: el servidor entero tiene 1.8 GB de RAM.'
    ),
    features: L(
      ['No polling anywhere: Postgres triggers + LISTEN/NOTIFY, pushed by a sidecar over WebSocket',
        'nginx injects a small script into Vikunja’s UI (sub_filter) instead of patching it',
        'Push-to-deploy with GitHub Actions',
        'MCP server so an AI assistant can create and edit tickets with the caller’s own token'],
      ['Sin polling en ningún lado: triggers de Postgres + LISTEN/NOTIFY, empujado por un sidecar por WebSocket',
        'nginx inyecta un script chico en la UI de Vikunja (sub_filter) en vez de parchearla',
        'Deploy automático con GitHub Actions al pushear',
        'Servidor MCP para que un asistente de IA cree y edite tickets con el token de quien pide']
    ),
    links: []
  },
  {
    id: 'agroscanner',
    dir: 'agroscanner',
    title: 'AgroScanner',
    tag: L('Private · Web + Mobile', 'Privado · Web + Mobile'),
    stack: ['React', 'React Native', 'FastAPI', 'PostgreSQL'],
    private: true,
    summary: L(
      'Livestock and farm management platform, organized by field: web app, mobile app and API. In active development; details on request.',
      'Plataforma de gestión ganadera y agrícola organizada por campo: web, app móvil y API. En desarrollo activo; más detalles a pedido.'
    ),
    features: L([], []),
    links: []
  },
  {
    id: 'lootmarket',
    dir: 'lootmarket',
    title: 'LootMarket',
    tag: L('E-commerce · Security', 'E-commerce · Seguridad'),
    stack: ['React', 'Express', 'PostgreSQL 16', 'Docker'],
    summary: L(
      'Peer-to-peer marketplace for gaming assets with a full escrow flow. Built as a database-security project: its depth is the hardened data layer.',
      'Marketplace peer-to-peer de activos gaming con flujo de escrow completo. Hecho como proyecto de seguridad en bases de datos: su profundidad está en la capa de datos endurecida.'
    ),
    features: L(
      ['Escrow lifecycle (held → transferred → released / refunded) with moderator disputes',
        'Row-Level Security + ABAC, just-in-time moderator access that expires on its own',
        'Append-only forensic audit log, data masking and pgcrypto encryption at rest'],
      ['Ciclo de escrow (retenido → transferido → liberado / reembolsado) con disputas por moderador',
        'Row-Level Security + ABAC, acceso just-in-time de moderadores que expira solo',
        'Log de auditoría forense append-only, enmascarado y cifrado en reposo con pgcrypto']
    ),
    links: []
  },
  {
    id: 'shapeshifter',
    dir: 'shapeshifter',
    title: 'ShapeShifter',
    tag: L('AI · Voice', 'IA · Voz'),
    stack: ['Python', 'F5-TTS', 'Ollama', 'Discord API'],
    summary: L(
      'Discord bot that clones voices and holds conversations. I trained an F5-TTS model to keep a natural Argentine accent and paired it with a local Ollama assistant: no cloud AI.',
      'Bot de Discord que clona voces y conversa. Entrené un modelo F5-TTS para conservar el acento argentino y lo combiné con un asistente Ollama local: sin IA en la nube.'
    ),
    features: L(
      ['Custom-trained F5-TTS voice model', 'Fully offline LLM assistant (llama3.2:3b)', 'Real-time voice and text replies'],
      ['Modelo de voz F5-TTS entrenado a medida', 'Asistente LLM totalmente offline (llama3.2:3b)', 'Respuestas de voz y texto en tiempo real']
    ),
    links: []
  },
  {
    id: 'letitride',
    dir: 'letitride',
    title: 'LetItRide',
    tag: L('Bot · Game', 'Bot · Juego'),
    stack: ['Node.js', 'WhatsApp', 'Linux'],
    summary: L(
      'WhatsApp casino bot built around a live European roulette, with weekly credits and games that start on a schedule.',
      'Bot de casino de WhatsApp centrado en una ruleta europea en vivo, con créditos semanales y partidas que arrancan por horario.'
    ),
    features: L(
      ['Multiple bet types with real payout odds', 'Scheduled automatic rounds', 'Web admin panel'],
      ['Múltiples tipos de apuesta con pagos reales', 'Rondas automáticas programadas', 'Panel de administración web']
    ),
    links: []
  },
  {
    id: 'showcase3d',
    dir: 'showcase-3d',
    title: 'Showcase 3D',
    tag: L('3D printing · Open source', 'Impresión 3D · Open source'),
    stack: ['three.js', 'WebCodecs', 'Neutralinojs'],
    summary: L(
      'Opens a 3MF or STL with its real filament colors and records a spinning MP4 to send to the client. Windows app and web version.',
      'Abre un 3MF o STL con los colores reales de los filamentos y graba un MP4 girando para mandarle al cliente. App de Windows y versión web.'
    ),
    features: L(
      ['Reads OrcaSlicer projects: filament colors, hand painting and plates',
        'MP4 (H.264) encoded in the browser with WebCodecs, ready for WhatsApp',
        'Works offline: the .exe is a single 4 MB file'],
      ['Lee proyectos de OrcaSlicer: colores de filamento, pintura a mano y placas',
        'MP4 (H.264) codificado en el navegador con WebCodecs, listo para WhatsApp',
        'Funciona sin internet: el .exe es un solo archivo de 4 MB']
    ),
    links: [{ kind: 'live', url: 'https://showcase3d.facundosorasio.com/' }, { kind: 'repo', url: 'https://github.com/facusora01/showcase-3d' }]
  },
  {
    id: 'amankay',
    dir: 'amankay',
    title: 'Amankay Web',
    tag: L('Full-stack', 'Full-stack'),
    stack: ['React', 'Express', 'SQLite', 'Recharts'],
    summary: L(
      'Full-stack web app for data visualization and file management, running on my Linux server.',
      'App web full-stack de visualización de datos y gestión de archivos, corriendo en mi servidor Linux.'
    ),
    features: L(
      ['Recharts dashboards', 'File upload and management', 'Express + SQLite backend'],
      ['Dashboards con Recharts', 'Subida y gestión de archivos', 'Backend Express + SQLite']
    ),
    links: [{ kind: 'live', url: 'https://amankay-2eb11.web.app/' }]
  },
  {
    id: 'leaguedt',
    dir: 'leaguedt',
    title: 'LeagueDT',
    tag: L('Desktop · Data', 'Escritorio · Datos'),
    stack: ['Electron', 'React', 'TypeScript'],
    summary: L(
      'Desktop app that turns League of Legends match statistics into macro and micro decisions.',
      'App de escritorio que convierte estadísticas de partidas de League of Legends en decisiones macro y micro.'
    ),
    features: L([], []),
    links: []
  },
  {
    id: 'wantit',
    dir: 'wantit',
    title: 'Wantit',
    tag: L('Full-stack', 'Full-stack'),
    stack: ['React', 'Express', 'PostgreSQL'],
    summary: L(
      'Web app for couples: each partner swipes products and the app shows real-time matches and a shared wishlist.',
      'App web para parejas: cada uno desliza productos y la app muestra coincidencias en tiempo real y una lista de deseos compartida.'
    ),
    features: L([], []),
    links: [{ kind: 'live', url: 'https://wantit-e3418.web.app/' }]
  },
  {
    id: 'appointa',
    dir: 'appointa',
    title: 'Appointa',
    tag: L('Web · SaaS', 'Web · SaaS'),
    stack: ['Next.js', 'React', 'Firebase'],
    summary: L(
      'Appointment management for shops and independent professionals of any trade: online booking with configurable services, availability and calendar, so businesses stop taking reservations over the phone.',
      'Gestión de turnos para locales y profesionales independientes de cualquier rubro: reservas online con servicios, disponibilidad y calendario configurables, para dejar de tomar turnos por teléfono.'
    ),
    features: L(
      ['Online booking for shops and solo professionals', 'Configurable services and availability windows', 'Calendar management'],
      ['Reservas online para locales y profesionales', 'Servicios y ventanas de disponibilidad configurables', 'Gestión de calendario']
    ),
    links: []
  },
  {
    id: 'martina',
    dir: 'martusorasio',
    title: 'martusorasio.com',
    tag: L('Web · CMS', 'Web · CMS'),
    stack: ['Next.js 15', 'Tailwind v4', 'SQLite', 'Drizzle', 'sharp'],
    summary: L(
      'Site and admin panel for Martina Sorasio, a fashion and lifestyle content creator. Two public pages and an /admin panel that edits everything: numbers, texts, brands, services and photos. The code has zero hard-coded content.',
      'Sitio y panel de administración de Martina Sorasio, creadora de contenido de moda y lifestyle. Dos páginas públicas y un panel /admin que edita todo: números, textos, marcas, servicios y fotos. El código no tiene ni un dato hardcodeado.'
    ),
    features: L(
      ['Server Components: HTML arrives ready, minimal client JS',
        'Figma design tokens mapped 1:1 to the Tailwind v4 theme',
        'Images processed once on upload into eight variants (sharp + HEIC support)',
        'Single-user auth with Argon2 + JWT in an httpOnly cookie; encrypted DB backups'],
      ['Server Components: el HTML llega armado y el JS del cliente es mínimo',
        'Los tokens del diseño en Figma mapeados 1:1 al tema de Tailwind v4',
        'Imágenes procesadas una vez al subirlas, en ocho variantes (sharp + soporte HEIC)',
        'Auth de un solo usuario con Argon2 + JWT en cookie httpOnly; backups cifrados de la base']
    ),
    links: [{ kind: 'live', url: 'https://martusorasio.com' }]
  },
  {
    id: 'automatch',
    dir: 'automatch-accept',
    title: 'AutoMatch Accept',
    tag: L('Tool · Open source', 'Herramienta · Open source'),
    stack: ['Python', 'Computer vision'],
    summary: L(
      'Open-source tool that watches the screen and accepts the League of Legends match pop for you, so you can leave the queue running and go make coffee.',
      'Herramienta open source que mira la pantalla y acepta la partida de League of Legends por vos, así dejás la cola corriendo y vas a hacerte un café.'
    ),
    features: L([], []),
    links: [{ kind: 'repo', url: 'https://github.com/facusora01/AutoMatch_Accept' }]
  },
  {
    id: 'stackstorage',
    dir: 'stackstorage',
    title: 'StackStorage',
    tag: L('Minecraft mod', 'Mod de Minecraft'),
    stack: ['Java', 'Forge', 'NeoForge', 'Gradle'],
    summary: L(
      'Quick-stack your inventory into nearby containers and sort chests with one click, alphabetically or into columns by material.',
      'Guardá tu inventario en los cofres cercanos y ordená cofres con un click, alfabéticamente o en columnas por material.'
    ),
    features: L(
      ['One branch per Minecraft version, from 1.20.1 up to 26.2', 'A shared vanilla-only core compiled into every loader’s jar', 'Game tests run on a headless server'],
      ['Una rama por versión de Minecraft, desde 1.20.1 hasta 26.2', 'Un núcleo común, solo con código vanilla, compilado en el jar de cada loader', 'Game tests corriendo en un servidor sin interfaz']
    ),
    links: [{ kind: 'repo', url: 'https://github.com/facusora01/StackStorage' }]
  },
  {
    id: 'moblevel',
    dir: 'moblevel',
    title: 'MobLevel',
    tag: L('Minecraft mod', 'Mod de Minecraft'),
    stack: ['Java', 'Fabric', 'NeoForge'],
    summary: L(
      'Gives mobs experience levels, with drops and difficulty that scale with them.',
      'Les da niveles de experiencia a los mobs, con drops y dificultad que escalan con el nivel.'
    ),
    features: L([], []),
    links: [{ kind: 'repo', url: 'https://github.com/facusora01/MobLevel' }]
  },
  {
    id: 'babyneeds',
    dir: 'babyneeds',
    title: 'BabyNeeds',
    tag: L('Minecraft mod', 'Mod de Minecraft'),
    stack: ['Java', 'Forge 1.20.1'],
    summary: L(
      'Replaces the vanilla “baby grows on a timer” rule with a food chain: grass feeds the mother, the mother feeds the calf, and an overcrowded pasture wears out.',
      'Reemplaza la regla vanilla de “la cría crece por tiempo” con una cadena real: el pasto alimenta a la madre, la madre a la cría, y el potrero se degrada si hay animales de más.'
    ),
    features: L([], []),
    links: []
  },
  {
    id: 'readingmarathon',
    dir: 'reading-marathon',
    title: 'Reading Marathon',
    tag: L('Project Zomboid mod', 'Mod de Project Zomboid'),
    stack: ['Lua', 'Build 42'],
    summary: L(
      'Adds a “reading marathon” action: sitting on a couch, your character reads skill books first and recipes next, snacks automatically and takes a break with a magazine when bored.',
      'Agrega la acción “maratón de lectura”: sentado en un sillón, el personaje lee primero los libros de skill y después las recetas, come snacks solo y se toma un respiro con una revista si se aburre.'
    ),
    features: L([], []),
    links: []
  }
];

export const experience = [
  {
    title: L('Self-hosted production infrastructure', 'Infraestructura propia en producción'), date: '2026',
    points: L(
      ['Run every project on my own Linux server: PM2, nginx, PostgreSQL, Cloudflare tunnels',
        'Push-to-deploy pipelines with GitHub Actions and automatic daily backups',
        'Design under tight constraints: the whole stack fits in 1.8 GB of RAM'],
      ['Corro todos mis proyectos en un servidor Linux propio: PM2, nginx, PostgreSQL, túneles de Cloudflare',
        'Pipelines de deploy automático con GitHub Actions y backups diarios automáticos',
        'Diseño con restricciones duras: todo el stack entra en 1.8 GB de RAM']
    )
  },
  {
    title: L('SaaS & product development', 'Desarrollo de producto y SaaS'), date: '2026',
    points: L(
      ['Designed and shipped full-stack web apps from idea to deployment',
        'Real-time features over WebSocket, auth, scheduling and admin panels',
        'React / Next.js frontends with NestJS, Express and FastAPI backends'],
      ['Diseñé y publiqué apps web full-stack desde la idea hasta el despliegue',
        'Funciones en tiempo real por WebSocket, auth, turnos y paneles de administración',
        'Frontends React / Next.js con backends NestJS, Express y FastAPI']
    )
  },
  {
    title: L('AI & bot engineering', 'IA y bots'), date: '2024 — 2026',
    points: L(
      ['Trained an F5-TTS voice model to keep an Argentine accent',
        'Conversational assistants on local Ollama models',
        'WhatsApp and Discord bots running 24/7'],
      ['Entrené un modelo de voz F5-TTS para conservar el acento argentino',
        'Asistentes conversacionales sobre modelos Ollama locales',
        'Bots de WhatsApp y Discord funcionando 24/7']
    )
  },
  {
    title: L('Software engineering (Java)', 'Ingeniería de software (Java)'), date: '2024',
    points: L(
      ['Collaborated on Java applications: business logic and UI', 'Test-driven development with JUnit'],
      ['Colaboré en aplicaciones Java: lógica de negocio e interfaz', 'Desarrollo guiado por tests con JUnit']
    )
  },
  {
    title: L('Frontend web', 'Frontend web'), date: '2023',
    points: L(
      ['Built and maintained websites, focused on performance and responsiveness'],
      ['Construí y mantuve sitios web, con foco en rendimiento y responsividad']
    )
  },
  {
    title: L('Backend & automation', 'Backend y automatización'), date: '2020',
    points: L(
      ['Helped build client websites and wrote scripts to automate workflows'],
      ['Ayudé a construir sitios para clientes y escribí scripts para automatizar flujos de trabajo']
    )
  }
];

// Skills, as the cards in the wallet. Every card and brand here is made up.
export const cards = [
  { name: 'AI Agents', kind: L('Credit', 'Crédito'), theme: 'agents', items: ['Claude Code', 'Sub-agents', 'MCP', 'Ollama', 'F5-TTS'] },
  { name: 'Python', kind: L('Debit', 'Débito'), theme: 'python', items: ['Python', 'FastAPI', 'Scraping', 'Automation', 'pytest'] },
  { name: 'TypeScript', kind: L('Platinum', 'Platinum'), theme: 'ts', items: ['TypeScript', 'React', 'Next.js', 'Node.js', 'NestJS', 'Three.js'] },
  { name: 'Data', kind: L('Gold', 'Gold'), theme: 'data', items: ['PostgreSQL', 'SQLite', 'Prisma', 'Drizzle', 'Socket.IO'] },
  { name: 'Infra', kind: L('Black', 'Black'), theme: 'infra', items: ['Linux', 'Docker', 'nginx', 'PM2', 'GitHub Actions', 'Cloudflare'] },
  { name: 'Game Dev', kind: L('Gift card', 'Gift card'), theme: 'game', items: ['Java · Minecraft modding', 'Lua', 'C++ · Unreal 5'] },
  { name: 'Mobile', kind: L('Prepaid', 'Prepaga'), theme: 'mobile', items: ['React Native', 'Expo', 'Flutter'] },
  { name: 'FIUBA', kind: L('Student', 'Estudiante'), theme: 'uni', items: ['C++', 'Java', 'Elixir', 'Algorithms', 'TDD'] }
];

export const education = {
  title: L('Computer Engineering · in progress', 'Ingeniería en Informática · en curso'),
  place: L('Universidad de Buenos Aires (UBA) · Faculty of Engineering', 'Universidad de Buenos Aires (UBA) · Facultad de Ingeniería'),
  date: L('2020 — present', '2020 — actualidad')
};

export const contact = [
  { label: 'Email', value: 'facusorasio@hotmail.com', url: 'mailto:facusorasio@hotmail.com' },
  { label: 'GitHub', value: 'github.com/facusora01', url: 'https://github.com/facusora01' },
  { label: 'WhatsApp', value: '+54 2477 62-4468', url: 'https://wa.me/542477624468' }
];

// Clickable things in the room. Objects with a `zone` are only clickable once you
// have walked up to that zone (the desk, the printer table).
export const hotspots = {
  desk:     { label: L('Desk', 'Escritorio') },
  table:    { label: L('Printer table', 'Mesa de la impresora') },
  nightstand: { label: L('Nightstand', 'Mesa de luz') },
  monitor:  { zone: 'desk', label: L('Terminal', 'Terminal') },
  monitor2: { zone: 'desk', label: L('Computer', 'Computadora') },
  tv:       { zone: 'desk', label: L('Farmacéutica', 'Farmacéutica') },
  phone:    { zone: 'desk', label: L('Contact', 'Contacto') },
  ps5:      { zone: 'desk', label: L('Games', 'Juegos') },
  creeper:  { zone: 'desk', label: L('Mods', 'Mods') },
  printer:  { zone: 'table', label: L('Print queue', 'Cola de impresión') },
  wallet:   { zone: 'table', label: L('Wallet', 'Billetera') },
  cow:      { zone: 'table', label: L('AgroScanner', 'AgroScanner') },
  backpack: { label: L('Backpack', 'Mochila') },
  server:   { label: L('The server', 'El servidor') },
  sticker:  { zone: 'nightstand', label: L('Appointa', 'Appointa') },
  posterLive: { label: L('Poster', 'Cuadro') },
  posterPast: { label: L('Poster', 'Cuadro') },
  simon:    { label: L('Simón', 'Simón') },
  manolo:   { label: L('Manolo', 'Manolo') },
  pendant:  { label: L('Light', 'Luz') },
  cheat:    { zone: 'desk', label: L('Cheat sheet', 'Machete') },
  lightSwitch: { label: L('Light switch', 'Interruptor') },
  lamp:     { zone: 'desk', label: L('Desk lamp', 'Velador') },
  mug:      { zone: 'desk', label: L('Coffee', 'Café') },
  claudio:  { zone: 'desk', label: L('Claudio', 'Claudio') },
  motibot:  { label: L('MotiBot', 'MotiBot') }
};

// MotiBot's phrases, a small copy of the bot's local library (MotiBot/phrases.js).
// The real bot has no public endpoint to ask, so the raccoon picks from these.
export const motibotPhrases = [
  { en: 'Success is not the key to happiness. Happiness is the key to success.', es: 'El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.', by: 'Albert Schweitzer' },
  { en: "Don't count the days, make the days count.", es: 'No cuentes los días, hacé que los días cuenten.', by: 'Muhammad Ali' },
  { en: 'It does not matter how slowly you go as long as you do not stop.', es: 'No importa lo lento que vayas, siempre y cuando no te detengas.', by: 'Confucius' },
  { en: 'We are what we repeatedly do. Excellence, then, is not an act but a habit.', es: 'Somos lo que hacemos repetidamente. La excelencia no es un acto sino un hábito.', by: 'Aristotle' },
  { en: 'Fall seven times, stand up eight.', es: 'Cae siete veces, levantate ocho.', by: 'Japanese proverb' },
  { en: 'A journey of a thousand miles begins with a single step.', es: 'El camino de mil millas comienza con un solo paso.', by: 'Lao Tzu' },
  { en: 'Do what you can, with what you have, where you are.', es: 'Hacé lo que podés, con lo que tenés, donde estás.', by: 'Theodore Roosevelt' },
  { en: 'Success is the sum of small efforts, repeated day in and day out.', es: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', by: 'Robert Collier' },
  { en: 'In the middle of difficulty lies opportunity.', es: 'En el medio de la dificultad reside la oportunidad.', by: 'Albert Einstein' },
  { en: "It's not that I'm so smart, it's just that I stay with problems longer.", es: 'No es que sea tan inteligente, es que me quedo más tiempo con los problemas.', by: 'Albert Einstein' },
  { en: 'The best time to plant a tree was 20 years ago. The second best time is now.', es: 'El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.', by: 'Chinese proverb' },
  { en: 'The secret of getting ahead is getting started.', es: 'El secreto para salir adelante es empezar.', by: 'Mark Twain' },
  { en: 'It always seems impossible until it is done.', es: 'Siempre parece imposible hasta que se hace.', by: 'Nelson Mandela' },
  { en: "I have not failed. I've just found 10,000 ways that won't work.", es: 'No fallé. Solo encontré 10.000 formas que no funcionan.', by: 'Thomas Edison' },
  { en: 'It is never too late to be what you might have been.', es: 'Nunca es tarde para ser lo que podrías haber sido.', by: 'George Eliot' },
  { en: 'Optimism is the faith that leads to achievement.', es: 'El optimismo es la fe que conduce al logro.', by: 'Helen Keller' },
  { en: 'Act as if what you do makes a difference. It does.', es: 'Actuá como si lo que hacés marcara la diferencia. La marca.', by: 'William James' },
  { en: 'The only limit to our realization of tomorrow will be our doubts of today.', es: 'El único límite a nuestros logros de mañana son nuestras dudas de hoy.', by: 'Franklin D. Roosevelt' },
  { en: 'Start where you are. Use what you have. Do what you can.', es: 'Empezá donde estás. Usá lo que tenés. Hacé lo que podés.', by: 'Arthur Ashe' },
  { en: 'Motivation is what gets you started. Habit is what keeps you going.', es: 'La motivación es lo que te pone en marcha. El hábito es lo que te mantiene.', by: 'Jim Ryun' },
  { en: "Don't watch the clock; do what it does. Keep going.", es: 'No mires el reloj. Hacé lo mismo que él: seguí adelante.', by: 'Sam Levenson' },
  { en: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', es: 'El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje para continuar.', by: 'Winston Churchill' },
  { en: 'Every great achievement was once considered impossible.', es: 'Cada logro grande alguna vez fue imposible.', by: 'Anonymous' },
  { en: "Don't give up. The beginning is always the hardest.", es: 'No te rindas. El principio siempre es lo más difícil.', by: 'Anonymous' },
  { en: 'Turn every obstacle into an opportunity.', es: 'Convertí cada obstáculo en una oportunidad.', by: 'Anonymous' }
];

// Text drawn inside the 3D scene (screens, cards, the notebook).
export const screenText = {
  en: {
    tvTitle: 'On-duty pharmacies', tvCount: 'on duty', tvNearest: 'Nearest on duty',
    aboutSystem: 'About this system', liveScreen: 'Back to the live screen', back: 'Back',
    private: 'Private project', visit: 'Visit site ↗', repo: 'Source ↗',
    games: 'Games', mods: 'Mods', queue: 'PRINT QUEUE',
    serverHint: 'click a process to see what it is',
    contactLead: 'Open to internships, freelance work and interesting problems.',
    aboutTitle: 'About me',
    tags: { simon: ['SIMÓN', 'Head of Security'], manolo: ['MANOLO', 'Chief Happiness Officer'] },
    tagBack: {
      simon: ['On guard 24/7', 'Alarm system: one bark', 'Status: power-saving mode'],
      manolo: ['Shift: all day long', 'Measures happiness', 'in tail wags per minute']
    },
    notebookHint: 'click to turn the page',
    experienceTitle: 'Experience',
    cheat: ['CHEAT SHEET', ['ls', 'list'], ['cd <project>', 'go in'], ['cat README.md', 'read it'], ['cd ..', 'go back'], ['Tab', 'autocomplete'], ['help', 'every command']]
  },
  es: {
    tvTitle: 'Farmacias de turno', tvCount: 'de turno', tvNearest: 'La más cercana de turno',
    aboutSystem: 'Sobre este sistema', liveScreen: 'Volver a la pantalla en vivo', back: 'Volver',
    private: 'Proyecto privado', visit: 'Ver sitio ↗', repo: 'Código ↗',
    games: 'Juegos', mods: 'Mods', queue: 'COLA DE IMPRESIÓN',
    serverHint: 'hacé click en un proceso para ver qué es',
    contactLead: 'Abierto a pasantías, trabajos freelance y problemas interesantes.',
    aboutTitle: 'Sobre mí',
    tags: { simon: ['SIMÓN', 'Jefe de Seguridad'], manolo: ['MANOLO', 'Director de Bienestar'] },
    tagBack: {
      simon: ['De guardia 24/7', 'Sistema de alarma: un ladrido', 'Estado: ahorro de energía'],
      manolo: ['Turno: todo el día', 'Mide la felicidad', 'en colas por minuto']
    },
    notebookHint: 'click para pasar de página',
    experienceTitle: 'Experiencia',
    cheat: ['MACHETE', ['ls', 'listar'], ['cd <proyecto>', 'entrar'], ['cat README.md', 'leerlo'], ['cd ..', 'volver'], ['Tab', 'autocompletar'], ['help', 'todos los comandos']]
  }
};

// Made-up pharmacies for the TV demo; the real screen shows the city's real list.
export const pharmacies = [
  ['Central', 'Av. Rivadavia 2140', '0.3 km'],
  ['Del Pueblo', 'Belgrano 455', '0.8 km'],
  ['San Martín', 'San Martín 1020', '1.2 km'],
  ['Moreno', 'Moreno 731', '1.7 km'],
  ['Sol', 'Mitre 88', '2.1 km'],
  ['Norte', 'Av. Libertador 3300', '2.9 km']
];
