export type Lang = 'en' | 'es'

const chapters = {
  en: [
    {
      label: 'Initiative',
      lead: 'Never waits',
      accent: 'for a command.',
      subs: ['watches', 'notices', 'proposes', 'moves']
    },
    {
      label: 'Panorama',
      lead: 'The whole organization,',
      accent: 'at a glance.',
      subs: ['areas', 'people', 'projects', 'dependencies']
    },
    {
      label: 'Memory',
      lead: 'What it learns',
      accent: 'never repeats.',
      subs: ['precise context', 'zero rereads', 'continuity']
    },
    {
      label: 'Orbit',
      lead: 'People and agents,',
      accent: 'one team.',
      subs: ['code', 'design', 'image', 'sound', '···']
    }
  ],
  es: [
    {
      label: 'Iniciativa',
      lead: 'No espera',
      accent: 'una orden.',
      subs: ['observa', 'detecta', 'propone', 'avanza']
    },
    {
      label: 'Panorama',
      lead: 'Toda la organización,',
      accent: 'de un vistazo.',
      subs: ['áreas', 'personas', 'proyectos', 'dependencias']
    },
    {
      label: 'Memoria',
      lead: 'Lo aprendido',
      accent: 'no se repite.',
      subs: ['contexto preciso', 'cero relecturas', 'continuidad']
    },
    {
      label: 'Órbita',
      lead: 'Personas y agentes,',
      accent: 'un mismo equipo.',
      subs: ['código', 'diseño', 'imagen', 'sonido', '···']
    }
  ]
} as const

export const copy = {
  en: {
    metaTitle: 'Something is waking',
    metaDescription: 'An organization that never waits for a command. People and agents, in the same orbit.',
    locale: 'en_US',
    langLabel: 'Language',
    preloader: 'waking the ecosystem',
    agents: 'agents awake',
    signal: 'signal 0.1',
    lede: 'Your organization,',
    words: ['alive', 'connected', 'proactive', 'in motion', 'awake'],
    building: 'In progress',
    scroll: 'Scroll',
    agent: 'Agent',
    marqueeLabel: 'Principles',
    marqueeA: ['Initiative', 'Context', 'Panorama', 'Continuity', 'Judgment'],
    marqueeB: ['People', 'Agents', 'Code', 'Design', 'Image', 'Sound'],
    chapters: chapters.en,
    form: 'form',
    shapes: ['galaxy', 'mind', 'archipelago', 'memory', 'orbit', 'origin'],
    eyesIdle: 'hold still for a moment',
    eyesFound: 'nobody asked for it',
    eyesWatch: 'They\'re <em>awake.</em>',
    eyesHit: 'They found <em>something.</em>',
    proposal: 'proposal',
    transmission: 'transmission in progress',
    finale: 'Something is <em>waking.</em>',
    activity: 'activity',
    live: 'live',
    ring: 'in progress · signal 0.1 · soon · ',
    soon: 'Soon.',
    progress: 'Work in progress',
    cursor: { home: 'home', hi: 'hi', down: 'scroll', press: 'press', mail: 'mail', read: 'read' },
    briefs: [
      { kind: 'idea', code: 'Δ·04', title: 'A loose thread', rows: [['origin', 'unnamed'], ['weight', 'light'], ['next', 'a question']], meter: 22, state: 'open' },
      { kind: 'progress', code: 'Σ·14', title: 'A step already taken', rows: [['cycle', '3 of 5'], ['block', 'gone'], ['handoff', 'waiting']], meter: 60, state: 'moving' },
      { kind: 'improvement', code: '⊕·07', title: 'Less noise, same meaning', rows: [['rereads', '0'], ['kept', 'the why'], ['signal', 'clearer']], meter: 78, state: 'quieter' },
      { kind: 'idea', code: 'Δ·11', title: 'Two areas, one glance', rows: [['link', 'new'], ['overlap', 'found'], ['owner', 'undecided']], meter: 18, state: 'sketched' },
      { kind: 'progress', code: 'Σ·02', title: 'Continuity, unbroken', rows: [['resumed', 'where it stopped'], ['context', 'warm'], ['drift', 'none']], meter: 71, state: 'held' }
    ],
    feed: [
      'agent·03 spotted a new dependency',
      'proposal ready · waiting on your judgment',
      'context updated · 0 rereads',
      'design ↔ development · in sync',
      'a new island appeared at the edge',
      'module ████████ in the works',
      'agent·11 picked up where the team left off',
      'decision recorded, with its reason',
      'new discipline · ██████',
      'a block cleared before anyone saw it',
      'iteration 0.1 → 0.2 ···',
      'signal ██████████ · classified'
    ]
  },
  es: {
    metaTitle: 'Algo está despertando',
    metaDescription: 'Una organización que no espera una orden. Personas y agentes, en una misma órbita.',
    locale: 'es',
    langLabel: 'Idioma',
    preloader: 'despertando el ecosistema',
    agents: 'agentes despiertos',
    signal: 'señal 0.1',
    lede: 'Tu organización,',
    words: ['viva', 'conectada', 'proactiva', 'en marcha', 'despierta'],
    building: 'En construcción',
    scroll: 'Desliza',
    agent: 'Agente',
    marqueeLabel: 'Principios',
    marqueeA: ['Iniciativa', 'Contexto', 'Panorama', 'Continuidad', 'Criterio'],
    marqueeB: ['Personas', 'Agentes', 'Código', 'Diseño', 'Imagen', 'Sonido'],
    chapters: chapters.es,
    form: 'forma',
    shapes: ['galaxia', 'mente', 'archipiélago', 'memoria', 'órbita', 'origen'],
    eyesIdle: 'quedate quieto un momento',
    eyesFound: 'nadie se lo pidió',
    eyesWatch: 'Ya <em>despertaron.</em>',
    eyesHit: 'Encontraron <em>algo.</em>',
    proposal: 'propuesta',
    transmission: 'transmisión en curso',
    finale: 'Algo está <em>despertando.</em>',
    activity: 'actividad',
    live: 'en vivo',
    ring: 'en construcción · señal 0.1 · pronto · ',
    soon: 'Pronto.',
    progress: 'Trabajo en progreso',
    cursor: { home: 'inicio', hi: 'hola', down: 'baja', press: 'pulsa', mail: 'mail', read: 'leer' },
    briefs: [
      { kind: 'idea', code: 'Δ·04', title: 'Un hilo suelto', rows: [['origen', 'sin nombre'], ['peso', 'leve'], ['sigue', 'una pregunta']], meter: 22, state: 'abierta' },
      { kind: 'avance', code: 'Σ·14', title: 'Un paso ya dado', rows: [['ciclo', '3 de 5'], ['bloqueo', 'resuelto'], ['relevo', 'en espera']], meter: 60, state: 'en marcha' },
      { kind: 'mejora', code: '⊕·07', title: 'Menos ruido, el mismo sentido', rows: [['relecturas', '0'], ['conserva', 'el porqué'], ['señal', 'más clara']], meter: 78, state: 'más quieta' },
      { kind: 'idea', code: 'Δ·11', title: 'Dos áreas, un vistazo', rows: [['vínculo', 'nuevo'], ['cruce', 'detectado'], ['dueño', 'sin decidir']], meter: 18, state: 'bosquejada' },
      { kind: 'avance', code: 'Σ·02', title: 'Continuidad, sin corte', rows: [['retoma', 'donde quedó'], ['contexto', 'tibio'], ['deriva', 'ninguna']], meter: 71, state: 'sostenida' }
    ],
    feed: [
      'agente·03 detectó una dependencia nueva',
      'propuesta preparada · espera tu criterio',
      'contexto actualizado · 0 relecturas',
      'diseño ↔ desarrollo · sincronizados',
      'una isla nueva apareció en el borde',
      'módulo ████████ en preparación',
      'agente·11 retomó donde quedó el equipo',
      'decisión registrada, con su porqué',
      'nueva disciplina · ██████',
      'bloqueo resuelto antes de que nadie lo viera',
      'iteración 0.1 → 0.2 ···',
      'señal ██████████ · clasificado'
    ]
  }
} as const

export type Copy = (typeof copy)[Lang]

export const DEFAULT_LANG: Lang = 'en'
