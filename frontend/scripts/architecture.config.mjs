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
      { glob: 'views/admin/ContractDocuments/packages/platform/hooks', max: 40, severity: 'warn' },
    ],
  },

  /**
   * Раскладка доменов в views/admin (см. ARCHITECTURE.md § views/admin).
   * severity: 'error' — нарушения раскладки блокируют pre-commit.
   */
  viewsAdminLayout: {
    /** Не проверять (отдельная схема packages/). */
    excludeGlobs: ['views/admin/ContractDocuments/**'],

    /**
     * Плоский корень: слишком много .ts/.tsx без подпапок раздела.
     * Примеры: views/admin/Partners, views/admin/Catalog/Suppliers.
     */
    flatRootGlobs: [
      'views/admin/*',
      'views/admin/Catalog/*',
      'views/admin/CRM/*',
      'views/admin/Content/*',
      'views/admin/Settings/*',
      'views/admin/Orders',
      'views/admin/Partners',
      'views/admin/Users',
      'views/admin/ServiceCatalog',
      'views/admin/Accounting',
    ],

    /**
     * Строгий корень: при доменных подпапках (Blog/, list/, …) — только index.ts.
     */
    groupedRootGlobs: [
      'views/admin/Content',
      'views/admin/Settings',
      'views/admin/Knowledge',
      'views/admin/Catalog/Products',
    ],

    /** Подпапки паттерна shell/hook/view — не считаются «доменными». */
    structuralSubdirs: [
      'hooks',
      'sections',
      'shared',
      'ui',
      'form',
      'territory',
      'materials',
      'hub',
      'list',
      'edit',
      'create',
      'modals',
      'detail',
      'attributes',
      'checkout-info',
      'service-orders',
      'shipping',
      'section',
      'items',
      'editor',
      'workspace',
      'mutations',
      'toolbars',
      'typography',
    ],

    /** Не применять layout-проверки к служебным папкам (hooks/, sections/, …). */
    skipDirBasenames: [
      'hooks',
      'sections',
      'shared',
      'ui',
      'form',
      'modals',
      'detail',
      'attributes',
      'checkout-info',
      'service-orders',
      'shipping',
      'section',
      'items',
      'editor',
      'workspace',
      'mutations',
      'toolbars',
      'typography',
      'editorformat',
    ],

    allowedRootFiles: ['index.ts'],
    allowedRootGlobs: ['*.md', 'README*'],

    maxRootTsFiles: 6,

    severity: 'error',
  },

  /** page.tsx в app/ — только тонкая оболочка */
  appPageMaxLines: 80,

  /**
   * Оболочки экранов views: *Page.tsx (не *PageView.tsx).
   * Рекомендация: shell + use*Page + *PageView.
   */
  viewPageShellMaxLines: {
    max: 80,
    glob: 'views/**/*Page.tsx',
    excludeGlobs: ['**/*PageView.tsx', '**/sections/**', '**/hooks/**'],
    severity: 'warn',
  },

  /** Крупные экраны до декомпозиции (любой *Page.tsx в views). */
  viewPageMaxLines: {
    max: 250,
    glob: 'views/**/*Page.tsx',
    excludeGlobs: ['**/*PageView.tsx'],
    severity: 'warn',
  },

  /** Предупреждение при глубоких относительных импортах (--verbose) */
  maxRelativeDepth: 4,
};
