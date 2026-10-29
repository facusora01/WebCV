# WebCV design guide

The site is Facundo's real room, modelled low-poly from photos (kept locally in
`images/Reference/`, which is git-ignored because it includes an ID photo). You
start in the hallway in front of a white door with a crooked name sign, the sun
coming from a window behind you and your own shadow on the left wall. Clicking
the handle opens the door and walks you in. Inside, the view is first person:
drag to look around, click an object to fly to it, click anywhere else to leave.

## Palette

| Token | Hex | Use |
|---|---|---|
| night | `#15132a` | Panels background, classic CV |
| dusk | `#221f3d` | Panels, cards |
| cream | `#f3ead8` | Text, primary buttons |
| lamp | `#ffcf8a` | Markers, warm light, highlights |
| peach | `#f4b393` | Eyebrows, links, bullets |
| mint | `#8fd6b8` | Tech chips, "on" states, server LEDs |
| pink / lavender | `#e98ea0` / `#a69cd9` | Room accents |

The 3D colours live in `C` at the top of `src/room.js`; the CSS tokens in
`src/style.css`. Keep both in sync.

## Type

- Fraunces (serif): name, headings. Soft and warm, sets the lofi tone.
- Inter: body text.
- JetBrains Mono: tags, dates, labels, the terminal on the monitor.

## Room map

No side panels: every piece of information lives in the room. From the room you
walk up to a zone (the desk, the printer table); there each object becomes
clickable. Clicking outside, or Esc, always steps back one level.

| Where | Object | What it does |
|---|---|---|
| Desk | Main monitor (cheat sheet on the bezel) | Interactive terminal: `ls`, `cd`, `cat`, Tab completion |
| Desk | Second monitor | Browser with the web projects (martusorasio.com, Amankay, Wantit) |
| Desk | TV | Farmacéutica's live on-duty screen, with an "about this system" page |
| Desk | Purple DualSense on the PC tower | Turns the TV into a console menu: gaming projects as games |
| Desk | Creeper plush under the TV | Turns the TV into a Minecraft menu: the mods |
| Desk | Phone | Contact app; the buttons open email, WhatsApp, GitHub |
| Printer table | Wallet | Opens like the real bifold; a card taken out flies to the centre and flips over |
| Printer table | Printer touch screen | Print queue: ShapeShifter, LetItRide |
| Printer table | Blue printed cow | Its ear tag: AgroScanner (private, minimal info) |
| Room | Backpack | The notebook inside: education and experience, page by page |
| Room | Old laptop on the shelf | The server: `pm2 list`, MotiBot and vikunja-extra |
| Room | Appointa name tag | Flips over to show Appointa |
| Room | Simón y Manolo | Their staff badge |
| Room | Pendant lamp | Turns the light on and off |
| Desk | Coffee mug | You pick it up, blow on it, take a sip and put it back |
| Desk | Claudio | Chirps, shuts his eyes and jumps |
| Room | MotiBot, on the shelf above the server | Walk up to him; each click is a motivational phrase (a small copy of MotiBot's own library) |

CDF is never shown anywhere on the site. The ID and the cards in the wallet are
made up: no real document numbers, no real bank or government branding.

## Rules

- Content lives only in `src/content.js`. The room panels and the classic CV both
  render from it.
- The classic CV is the accessible path and the fallback when WebGL is missing.
- Respect `prefers-reduced-motion`: camera moves become instant.
- No external models or textures: everything is built from primitives and
  canvas textures, so the page loads in one JS file.

## Generated models

The dogs, the backpack and the DualSense in `public/models/` were made with
fal.ai: a reference image from a text prompt (flux/dev), then image-to-3D
(Trellis), then `gltf-transform optimize` (simplify, WebP textures, meshopt).
Each is about 50 KB.

MotiBot is modelled from scratch in Blender by `tools/motibot.py`, after his avatar
(`images/Reference/MotiBot.jpg`): low-poly geometry shaped with bmesh, colours as
materials per face (no image textures), one closed mesh with a skeleton (Body, Head,
LegL, LegR, Tail) and smoothed weights, so his legs bend over the shelf's edge without
tearing. The command to rebuild it is at the top of the script; the comparison sheets
against the reference are in `tools/motibot-sheets/`. Keep the bone names: `room.js`
animates them by name. Everything else is built from primitives in `room.js`.

## Performance

Static meshes are merged into one draw call per material at load. Shadows are
rendered on demand, not every frame. Canvas screens redraw only as often as
they change. Software renderers (no GPU) start at half resolution, and the
resolution drops further on its own if the frame rate falls under 45 fps.
