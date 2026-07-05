/* ===== Project detail modal =====
 * Clicking a project card opens a modal with an in-depth description, the tech
 * stack, a dedicated feature list (distinct from the card bullets) and any
 * live links. Title + badge are read from the card DOM; everything else lives
 * here, bilingual, keyed by the card's data-project id.
 *
 * LootMarket's detail is sourced from its repository (security TP mapping);
 * the others are summarised from project knowledge.
 */
(function () {
    'use strict';

    var DATA = {
        lootmarket: {
            stack: ['React', 'Node.js', 'Express', 'PostgreSQL 16', 'Docker'],
            links: [],
            detail: {
                en: 'A peer-to-peer marketplace for gaming assets — accounts, skins, in-game items and activation keys — where every account can both buy and sell. Purchases run through a full escrow state machine (held → transferred → confirmed → released, or disputed → refunded) with moderator-resolved disputes. Built as a university database-security project on React, Node/Express and PostgreSQL 16 in Docker, its real depth is the hardened data layer: a Repository access pattern, RBAC in the app plus ABAC via Row-Level Security in the database, and a complete forensic audit trail.',
                es: 'Un marketplace peer-to-peer de activos gaming — cuentas, skins, ítems y claves de activación — donde toda cuenta puede comprar y vender. Las compras pasan por una máquina de estados de escrow completa (retenido → transferido → confirmado → liberado, o disputado → reembolsado) con disputas resueltas por moderador. Hecho como proyecto de seguridad en bases de datos sobre React, Node/Express y PostgreSQL 16 en Docker, su profundidad real es la capa de datos endurecida: patrón Repository, RBAC en la app más ABAC vía Row-Level Security en la base, y una traza de auditoría forense completa.'
            },
            features: {
                en: [
                    'Full escrow lifecycle (held → transferred → released / refunded) with moderator dispute resolution',
                    'Row-Level Security + ABAC policies evaluating subject, resource and environment (JIT grant expiry)',
                    'Append-only forensic audit log with before/after images and an admin transaction-tracer',
                    'Just-in-Time access: moderators get 15-minute, reason-logged, auto-expiring access to dispute data',
                    'Dynamic data masking (sellers’ emails hidden from buyers); payment data encrypted at rest with pgcrypto',
                    'Least-privilege DB role, fully parameterized queries, Postgres bound to localhost'
                ],
                es: [
                    'Ciclo de escrow completo (retenido → transferido → liberado / reembolsado) con disputas por moderador',
                    'Row-Level Security + ABAC evaluando sujeto, recurso y entorno (expiración de grants JIT)',
                    'Log de auditoría forense append-only con before/after image y rastreador de transacciones para admin',
                    'Acceso Just-in-Time: los moderadores obtienen acceso de 15 min, con motivo registrado y auto-expiración',
                    'Enmascarado dinámico (el comprador no ve el email del vendedor); pagos cifrados en reposo con pgcrypto',
                    'Rol de base de mínimo privilegio, consultas parametrizadas, Postgres solo en localhost'
                ]
            }
        },
        shapeshifter: {
            stack: ['Python', 'F5-TTS', 'Ollama', 'Discord API'],
            links: [],
            detail: {
                en: 'A Discord bot that clones voices and holds real conversations. I personally trained an F5-TTS text-to-speech model to preserve a natural Argentine accent, then paired it with a conversational assistant running on a locally-hosted Ollama llama3.2:3b model — no external AI API. It impersonates a target voice and replies in chat in real time.',
                es: 'Un bot de Discord que clona voces y mantiene conversaciones reales. Entrené personalmente un modelo de texto a voz F5-TTS para conservar un acento argentino natural, y lo combiné con un asistente conversacional sobre un modelo Ollama llama3.2:3b alojado localmente — sin API de IA externa. Impersona una voz objetivo y responde en el chat en tiempo real.'
            },
            features: {
                en: [
                    'Custom-trained F5-TTS voice model tuned to keep an Argentine accent',
                    'Local LLM assistant (Ollama llama3.2:3b) — fully offline, no cloud API',
                    'Real-time voice impersonation and text chat responses',
                    'Discord integration across voice and text channels'
                ],
                es: [
                    'Modelo de voz F5-TTS entrenado a medida para mantener el acento argentino',
                    'Asistente LLM local (Ollama llama3.2:3b) — totalmente offline, sin API en la nube',
                    'Impersonación de voz y respuestas de chat en tiempo real',
                    'Integración con Discord en canales de voz y texto'
                ]
            }
        },
        letitride: {
            stack: ['Node.js', 'WhatsApp API', 'Linux', 'SSH'],
            links: [],
            detail: {
                en: 'A WhatsApp casino bot centred on a live European roulette. Players bet through chat with multiple bet types and correct payout odds, get a weekly credit allowance and can join games that start automatically on a schedule. It is deployed on a Linux server with SSH access and a web admin panel.',
                es: 'Un bot de casino de WhatsApp centrado en una ruleta europea en vivo. Los jugadores apuestan por chat con múltiples tipos de apuesta y pagos correctos, reciben créditos semanales y participan en partidas que arrancan automáticamente por horario. Está desplegado en un servidor Linux con acceso SSH y un panel de administración web.'
            },
            features: {
                en: [
                    'European roulette with multiple bet types and real payout odds',
                    'Weekly credit allowance and automatic scheduled game rounds',
                    'WhatsApp chat interface for placing bets',
                    'Linux deployment with SSH access and a web admin panel'
                ],
                es: [
                    'Ruleta europea con múltiples tipos de apuesta y pagos reales',
                    'Créditos semanales y rondas de juego automáticas programadas',
                    'Interfaz de apuestas por chat de WhatsApp',
                    'Despliegue en Linux con acceso SSH y panel de administración web'
                ]
            }
        },
        agroscanner: {
            stack: ['Flutter', 'Python', 'FastAPI', 'PostgreSQL', 'Linux'],
            links: [],
            detail: {
                en: 'A mobile app that digitises livestock management through RFID. A Flutter app with JWT authentication communicates with a Python/FastAPI backend deployed on a Linux server over SSH. Each animal is registered and tracked via an RFID chip, giving producers a searchable digital record of their herd.',
                es: 'Una app móvil que digitaliza la gestión de ganado mediante RFID. Una app Flutter con autenticación JWT se comunica con un backend Python/FastAPI desplegado en un servidor Linux por SSH. Cada animal se registra y se rastrea con un chip RFID, dándole al productor un registro digital y consultable de su hacienda.'
            },
            features: {
                en: [
                    'Flutter mobile app with JWT authentication',
                    'Python/FastAPI backend deployed on a Linux server via SSH',
                    'RFID chip scanning for animal registration and tracking',
                    'Searchable digital herd record for producers'
                ],
                es: [
                    'App móvil Flutter con autenticación JWT',
                    'Backend Python/FastAPI desplegado en servidor Linux por SSH',
                    'Escaneo de chips RFID para registro y seguimiento de animales',
                    'Registro digital de la hacienda, consultable por el productor'
                ]
            }
        },
        amankay: {
            stack: ['React', 'Express', 'SQLite', 'Recharts', 'Linux'],
            links: [{ url: 'https://amankay-2eb11.web.app/', primary: true }],
            detail: {
                en: 'A full-stack web application for data visualization and file management. Its React frontend talks to an Express backend backed by SQLite, deployed on a Linux server with SSH remote management. It provides Recharts-based dashboards and a file upload and management system.',
                es: 'Una aplicación web full-stack para visualización de datos y gestión de archivos. Su frontend React se comunica con un backend Express con SQLite, desplegado en un servidor Linux con administración remota por SSH. Ofrece dashboards con Recharts y un sistema de subida y gestión de archivos.'
            },
            features: {
                en: [
                    'React frontend with an Express + SQLite backend',
                    'Recharts-based data visualization dashboards',
                    'File upload and management system',
                    'Linux server deployment with SSH remote management'
                ],
                es: [
                    'Frontend React con backend Express + SQLite',
                    'Dashboards de visualización de datos con Recharts',
                    'Sistema de subida y gestión de archivos',
                    'Despliegue en servidor Linux con administración remota por SSH'
                ]
            }
        },
        coupleapp: {
            stack: ['React', 'Express', 'PostgreSQL'],
            links: [{ url: 'https://wantit-e3418.web.app/', primary: true }],
            detail: {
                en: 'A web app for couples to discover and save products together. Each partner swipes and likes products, and the app surfaces real-time matches and a shared wishlist — turning shopping into a two-person activity.',
                es: 'Una app web para que las parejas descubran y guarden productos juntos. Cada uno desliza y da like a productos, y la app muestra coincidencias en tiempo real y una lista de deseos compartida — convirtiendo la compra en una actividad de a dos.'
            },
            features: {
                en: [
                    'Tinder-style product swiping and liking',
                    'Real-time matching between partners',
                    'Shared wishlists',
                    'React + Express + PostgreSQL stack'
                ],
                es: [
                    'Deslizamiento y likes de productos estilo Tinder',
                    'Coincidencias en tiempo real entre la pareja',
                    'Listas de deseos compartidas',
                    'Stack React + Express + PostgreSQL'
                ]
            }
        },
        onlinestore: {
            stack: ['React', 'Node.js', 'Express', 'PostgreSQL'],
            links: [],
            detail: {
                en: 'An e-commerce platform with a built-in buyer-to-seller chat. It covers the whole shopping journey — catalog, cart and checkout — and adds a real-time messaging layer so buyers and sellers can negotiate directly inside the store.',
                es: 'Una plataforma de e-commerce con chat integrado entre comprador y vendedor. Cubre todo el recorrido de compra — catálogo, carrito y checkout — y suma una capa de mensajería en tiempo real para que compradores y vendedores negocien directamente dentro de la tienda.'
            },
            features: {
                en: [
                    'Full shopping flow: catalog, cart and checkout',
                    'Real-time buyer-to-seller messaging',
                    'Product listings and browsing',
                    'Full-stack React / Node / Express / PostgreSQL'
                ],
                es: [
                    'Flujo de compra completo: catálogo, carrito y checkout',
                    'Mensajería en tiempo real entre comprador y vendedor',
                    'Publicación y navegación de productos',
                    'Full-stack React / Node / Express / PostgreSQL'
                ]
            }
        },
        appointa: {
            stack: ['Next.js', 'React', 'Firebase'],
            links: [],
            detail: {
                en: 'An appointment-management web app for shops and independent professionals across any industry. It offers online booking with configurable services, availability windows and calendar management, letting businesses take reservations without back-and-forth phone calls.',
                es: 'Una app web de gestión de turnos para locales y profesionales independientes de cualquier rubro. Ofrece reservas online con servicios configurables, ventanas de disponibilidad y gestión de calendario, para que los negocios tomen reservas sin idas y vueltas telefónicas.'
            },
            features: {
                en: [
                    'Online booking and scheduling for shops and solo professionals',
                    'Configurable services and availability windows',
                    'Calendar management',
                    'Built with Next.js, React and Firebase'
                ],
                es: [
                    'Reservas y agendamiento online para locales y profesionales',
                    'Servicios y ventanas de disponibilidad configurables',
                    'Gestión de calendario',
                    'Construida con Next.js, React y Firebase'
                ]
            }
        },
        leaguedt: {
            stack: ['Electron', 'React', 'TypeScript'],
            links: [],
            detail: {
                en: 'A desktop app that turns match statistics into concrete in-game guidance for League of Legends. Built with Electron and React (TypeScript), it analyses match data and recommends both macro decisions (map control, objectives) and micro decisions (lane trades, positioning).',
                es: 'Una app de escritorio que convierte estadísticas de partida en guía concreta dentro del juego para League of Legends. Hecha con Electron y React (TypeScript), analiza los datos de la partida y recomienda decisiones macro (control del mapa, objetivos) y micro (trades de línea, posicionamiento).'
            },
            features: {
                en: [
                    'Statistical analysis of League of Legends match data',
                    'Macro decision guidance (map control, objectives)',
                    'Micro decision guidance (lane trades, positioning)',
                    'Electron + React (TypeScript) desktop app'
                ],
                es: [
                    'Análisis estadístico de datos de partidas de League of Legends',
                    'Guía de decisiones macro (control del mapa, objetivos)',
                    'Guía de decisiones micro (trades de línea, posicionamiento)',
                    'App de escritorio Electron + React (TypeScript)'
                ]
            }
        }
    };

    var LINK_LABEL = { en: 'Live site ↗', es: 'Ver sitio ↗' };

    document.addEventListener('DOMContentLoaded', function () {
        var modal = document.getElementById('project-modal');
        if (!modal) return;

        var titleEl = modal.querySelector('#pm-title');
        var badgeEl = modal.querySelector('.pm-badge');
        var stackEl = modal.querySelector('.pm-stack');
        var detailEl = modal.querySelector('.pm-detail');
        var featuresEl = modal.querySelector('.pm-features');
        var featTitleEl = modal.querySelector('.pm-features-title');
        var linksEl = modal.querySelector('.pm-links');
        var closeBtn = modal.querySelector('.project-modal-close');

        var currentId = null;

        function lang() {
            return localStorage.getItem('lang') === 'es' ? 'es' : 'en';
        }

        function render(id) {
            var data = DATA[id];
            var card = document.querySelector('.project[data-project="' + id + '"]');
            if (!data || !card) return;
            var L = lang();

            // Title + badge from the (already translated) card
            var titleSpan = card.querySelector('h3 span[data-i18n]');
            titleEl.textContent = titleSpan ? titleSpan.textContent : '';
            var badge = card.querySelector('.badge');
            badgeEl.className = 'pm-badge ' + (badge ? badge.className : '');
            badgeEl.textContent = badge ? badge.textContent : '';

            // Stack chips
            stackEl.innerHTML = '';
            data.stack.forEach(function (t) {
                var chip = document.createElement('span');
                chip.className = 'tech-chip';
                chip.textContent = t;
                stackEl.appendChild(chip);
            });

            // Deep detail
            detailEl.textContent = data.detail[L];

            // Dedicated feature list (distinct from the card bullets)
            var feats = data.features[L] || [];
            featuresEl.innerHTML = '';
            feats.forEach(function (f) {
                var li = document.createElement('li');
                li.textContent = f;
                featuresEl.appendChild(li);
            });
            featTitleEl.style.display = feats.length ? '' : 'none';

            // Links
            linksEl.innerHTML = '';
            data.links.forEach(function (lnk) {
                var a = document.createElement('a');
                a.href = lnk.url;
                a.target = '_blank';
                a.rel = 'noopener';
                if (lnk.primary) a.className = 'pm-link-primary';
                a.textContent = LINK_LABEL[L];
                linksEl.appendChild(a);
            });
        }

        function open(id) {
            currentId = id;
            render(id);
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            closeBtn.focus();
        }

        function close() {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            if (currentId) {
                var card = document.querySelector('.project[data-project="' + currentId + '"]');
                if (card) card.focus();
            }
            currentId = null;
        }

        document.querySelectorAll('.project[data-project]').forEach(function (card) {
            card.addEventListener('click', function () { open(card.getAttribute('data-project')); });
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open(card.getAttribute('data-project'));
                }
            });
        });

        modal.querySelectorAll('[data-close]').forEach(function (el) {
            el.addEventListener('click', close);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) close();
        });

        window.addEventListener('langchange', function () {
            if (currentId) render(currentId);
        });
    });
})();
