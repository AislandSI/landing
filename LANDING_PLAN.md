# Landing — plan por fases

Teaser visual de la marca. La interfaz tiene que hacer deducible el proyecto: una organización que se comprende a sí misma y sigue trabajando aunque nadie escriba una orden. No hay explicación de producto, ni lista de funciones, ni formulario.

El nombre visible sale de `windows/product.config.json` a través de `src/config/product.ts`. No se escribe el nombre literal en componentes.

## Metáfora

Un archipiélago visto desde arriba, en un abismo.

- Cada elipse es un lugar de la organización: área, proyecto, trabajo.
- Los puntos cian son agentes. No son islas; se mueven entre ellas.
- Las líneas son relaciones: dependencias, coordinación, contexto compartido.
- El anillo grande es la organización. El resto orbita ese centro.
- Una isla nueva aparece sola en el borde y una línea se dibuja hacia ella. Eso es la iniciativa: el sistema propone sin que el cursor lo pida.
- El pulso del ángulo superior derecho es el mismo latido. Sigue aunque la página esté quieta.
- La luz sigue al puntero, pero no enciende el campo. El campo ya estaba vivo.

Violeta y rosa pertenecen a la organización. Cian pertenece a lo que toma iniciativa. Esas dos especies no se etiquetan.

## Contrato entre fases

Variables en `src/styles/global.css`: `--abyss`, `--text`, `--glass`, `--glass-border`, `--pink`, `--violet`, `--indigo`, `--cyan`, `--glow-violet`, `--glow-pink`, `--glow-cyan`, `--px`, `--py`.

| Ancla | Fase | Qué entra |
| --- | --- | --- |
| `#campo` | 1, se profundiza en 2 | Hero. El SVG de `HeroField` queda como degradación si no hay WebGL. |
| `#ciclo` | 3 | Caja de arena del ciclo observar → conectar → proponer. |
| `#capacidades` | 4 | Bento simbólico. |

`prefers-reduced-motion` apaga el desplazamiento suave perceptible, el imán, los drifts y los trazos animados. La composición y el vínculo ya dibujado permanecen.

Lenis vive en `Layout.astro` (`src/scripts/presence.ts`) con `autoRaf` y se destruye en `pagehide`. El seguimiento del puntero se detiene cuando la interpolación llega al destino. Three.js entra en la fase 2. GSAP no se instala hasta la fase 5.

## Fase 1 — Atmósfera

Estado: hecha.

Una sola pantalla. Abismo `#050508`, vidrio, titular cinético y un campo SVG que ya cuenta la metáfora.

Incluye:

- Proyecto Astro, React, Tailwind y TypeScript en `landing/`.
- `src/layouts/Layout.astro`: idioma, título, descripción, Open Graph, `theme-color`, Lenis.
- `src/components/HeroField.astro`: archipiélago, agentes, vínculo que se propone solo.
- `src/components/BrandMark.astro`: los tres trazos del ícono, sin redibujarlos.
- `src/components/MagneticCta.tsx` (`client:idle`): imán, luz interior, clic que pasa a «Pronto».
- `src/styles/global.css` y `src/scripts/presence.ts`.

No incluye canvas WebGL, caja de arena ni bento. Esas piezas no se simulan con cajas vacías.

## Fase 2 — Campo vivo

Estado: hecha.

`src/components/HeroCanvas.tsx`, montado con `client:visible` dentro de `.hero-field`, por encima del SVG. Three.js se carga aparte, en `src/field/mount-field.ts`, solo si el campo va a montarse.

Three.js directo, sin React Three Fiber: una escena, un componente, menos peso. Puntos y líneas, dos especies.

Comportamiento:

- Sin puntero, el campo sigue en movimiento. Atracción suave entre vecinos, un ruido lento, el agente despierto recorre relaciones. La proactividad no puede depender del mouse.
- El puntero es un atractor de radio corto. Al irse, el campo no se congela: vuelve a su deriva.
- La isla que se propone en el SVG pasa a nacer dentro de la simulación, en el borde, y a buscar un vínculo.
- Tope de densidad: `devicePixelRatio` máximo 1.5. Si no hay WebGL, si el movimiento está reducido, o si el dispositivo es estrecho y sin puntero fino, no se monta el canvas y queda el SVG de la fase 1.
- Al desmontar: cancelar el frame, quitar listeners, `dispose` de geometrías, materiales y renderer, y sacar el canvas del DOM.

El titular y el botón no se reescriben.

## Fase 3 — Ciclo

Estado: hecha.

`src/components/VisualShowcase.tsx` en la sección `#ciclo`, con `client:visible`. Canvas 2D, sin Three.js. El bucle se cancela al desmontar. Con movimiento reducido, el agente llega de una vez y, si la autonomía está encendida, queda una isla propuesta ya vinculada.

Una pieza de vidrio, no un texto de funciones. El visitante arrastra una isla. Un agente se acerca y aparece un vínculo. Un control icónico de autonomía, sin párrafo:

- Encendido: cada cierto tiempo el campo propone una isla y un vínculo nuevos, aunque nadie arrastre.
- Apagado: solo responde al gesto.

Eso es el ciclo del producto en miniatura: la persona pone intención; el sistema observa, relaciona y propone. Al desmontar, se cancelan frames y listeners.

## Fase 4 — Bento simbólico

Estado: hecha.

`src/components/BentoGrid.astro` y `src/components/ConceptCard.astro`, sección `#capacidades`. Seis símbolos en SVG y CSS, sin canvas. El brillo del borde sigue al puntero fino con `--lx` y `--ly`. Con movimiento reducido, cada símbolo queda en su gesto ya cerrado.

Seis exhibidores, sin titulares explicativos largos. Cada uno es un símbolo animado:

1. Iniciativa — un punto que se enciende solo.
2. Panorama — el archipiélago visto de una vez.
3. Relaciones — líneas que se tensan hacia un centro.
4. Continuidad — un recorrido que no vuelve a cero.
5. Disciplinas — varias formas distintas en la misma órbita.
6. Coordinación — violeta y cian que cierran un mismo gesto.

El borde de cada tarjeta lleva un glow que sigue el cursor (`--lx` / `--ly`, el mismo lenguaje del botón). Las miniaturas pesadas, si usan canvas, van con `client:visible`.

## Fase 5 — Coreografía

Estado: hecha.

GSAP y ScrollTrigger. Lenis se engancha al ticker de GSAP y se deja de usar `autoRaf`, con destrucción de ambos al salir.

El scroll no presenta secciones como diapositivas. Al bajar de `#campo` a `#ciclo`, el campo se abre un poco y vuelve a cerrarse: profundidad sin perder el conjunto. Las tarjetas del bento reaccionan al llegar, no antes.

Cierre: revisar `prefers-reduced-motion` en las cinco fases, confirmar que no queda un frame ni un contexto WebGL vivo, y mirar el peso del primer documento. El canvas y el bento no entran en el bundle inicial.

## Fuera de este teaser

Alta de usuarios, precios, documentación técnica, modo claro y cualquier párrafo que explique la plataforma. El botón no promete una entrada que todavía no existe.
