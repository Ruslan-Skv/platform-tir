/**

 * Конфигурация проверки архитектуры frontend.

 * @see frontend/docs/ARCHITECTURE.md

 */



/** @type {import('./check-architecture.mjs').ArchitectureConfig} */

export default {

  layers: ['shared', 'entities', 'features', 'widgets', 'views', 'app'],



  allowedImports: {

    shared: ['shared', 'entities'],

    entities: ['shared', 'entities'],

    features: ['shared', 'entities', 'features'],

    widgets: ['shared', 'entities', 'features', 'widgets'],

    views: ['shared', 'entities', 'features', 'widgets', 'views'],

    app: ['shared', 'entities', 'features', 'widgets', 'views', 'app'],

  },



  /**

   * Известные нарушения границ слоёв. Не добавлять новые — исправлять код.

   * severity: 'warn' — не блокирует commit; 'error' — блокирует.

   */

  allowlist: [],



  /** Корни модулей: в директории разрешены только перечисленные файлы (+ подпапки). */

  moduleRoots: [

    {

      dir: 'views/admin/ContractDocuments/packages/platform/editor',

      allowedFiles: ['index.ts'],

    },

    {

      dir: 'views/admin/ContractDocuments/packages/platform/hub',

      allowedFiles: ['index.ts'],

    },

  ],



  maxFilesPerDir: {

    default: 25,

    overrides: [

      { glob: 'shared/api', max: 80, severity: 'warn' },

      { glob: 'shared/lib', max: 30, severity: 'warn' },

    ],

  },



  /** page.tsx в app/ — только тонкая оболочка */

  appPageMaxLines: 80,



  /** Предупреждение при глубоких относительных импортах */

  maxRelativeDepth: 4,

};

