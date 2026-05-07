# 🎨 Guía de Diseño: WebCV - Facundo Sorasio

Este documento detalla la nueva identidad visual para el CV de Facundo Sorasio, estudiante de Ingeniería Informática en la UBA. El diseño se aleja de los tonos industriales para adoptar una estética **Cyber-Warm** (Ámbar y Café), ideal para resaltar proyectos técnicos como **LetItRide** y **AgroScanner**.

---

## 1. Paleta de Colores (Warm Tech)
Esta paleta sustituye por completo los grises y blancos estándar por tonos profundos y cálidos que reducen la fatiga visual.

| Uso | Color | Hex | Descripción |
| :--- | :--- | :--- | :--- |
| **Fondo Base** | Café Profundo | `#1A120B` | Fondo principal oscuro con matiz cálido. |
| **Fondo de Tarjetas** | Madera Sombría | `#3C2A21` | Para bloques de proyectos y experiencia. |
| **Texto Principal** | Crema de Trigo | `#E5BA73` | Reemplaza al blanco para una lectura orgánica. |
| **Color de Acento** | Ámbar Eléctrico | `#C58940` | Para botones, iconos de herramientas y links. |
| **Resaltado** | Oro Viejo | `#FAEAB1` | Usado en títulos y estados de "hover". |

---

## 2. Tipografía y Estilo Visual
Para reflejar el rigor de la Ingeniería Informática:
* **Títulos:** `Montserrat` o `Inter` (Sans-serif) para una estructura sólida.
* **Cuerpo y Detalles:** `Fira Code` o `JetBrains Mono` en etiquetas de habilidades, reforzando la identidad de programador.

---

## 3. Interacciones y Micro-animaciones
Para mejorar la experiencia de usuario en las secciones definidas en `index.html`:

### A. Resplandor de Habilidades (Skills Glow)
* **Acción:** Al pasar el cursor sobre los iconos de `devicon` (Python, Java, Flutter, etc.).
* **Efecto:** El icono debe emitir un resplandor ámbar sutil.
* **CSS:** `filter: drop-shadow(0 0 10px #C58940); transform: translateY(-5px);`.

### B. Revelado Dinámico (Scroll Reveal)
* **Acción:** A medida que el usuario baja por las secciones de **Experiencia** y **Proyectos**.
* **Efecto:** Los bloques aparecen con un fundido suave y un ligero desplazamiento hacia arriba.

### C. Tarjetas Interactivas (Glassmorphism Cálido)
* Las tarjetas de proyectos como **LetItRide** y **Amankay Web** deben tener un borde sutil de 1px en `#C58940`.
* **Efecto Hover:** Al posicionar el mouse, el fondo de la tarjeta aumenta levemente su brillo.

---

## 4. Mejoras Específicas por Sección

### Perfil y Profesión
* La foto de perfil (`#profile-picture`) debe tener un borde circular en color Ámbar.
* El texto "Computer Engineering Student" debe resaltarse en Oro Viejo (`#FAEAB1`).

### Proyectos y Experiencia
* Utilizar el icono de un cursor de terminal (`>`) como viñeta para los logros en **Python Developer** o **Java Developer**.
* Para el proyecto **AgroScanner**, incluir un pequeño distintivo (badge) que diga "Mobile / IoT" usando el color secundario.

### Herramienta QR
* El botón de **"Go to Tool"** debe ser el elemento con mayor jerarquía visual, utilizando un gradiente lineal de `#C58940` a `#A27035`.

---

## 5. Notas Técnicas
* **Contraste:** Verificar que el texto Crema sea legible sobre los fondos de Madera Sombría para cumplir con estándares de accesibilidad.
* **Mobile:** El selector de idioma (`#lang-select`) debe mantenerse accesible en la parte superior derecha de forma fija.