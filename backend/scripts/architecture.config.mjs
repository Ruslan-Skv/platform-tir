/**



 * Конфигурация проверки архитектуры backend.



 * @see backend/docs/ARCHITECTURE.md



 */







/** @type {import('./check-architecture.mjs').ArchitectureConfig} */



export default {



  zones: {



    infrastructure: ['common', 'database', 'elasticsearch'],



    core: ['auth', 'users'],



    admin: ['admin'],



    bootstrap: ['main.ts', 'app.module.ts', 'app.controller.ts', 'app.service.ts'],



  },







  allowedImports: {



    infrastructure: ['infrastructure'],



    core: ['infrastructure', 'core'],



    public: ['infrastructure', 'core', 'public'],



    admin: ['infrastructure', 'core', 'public', 'admin'],



    bootstrap: ['infrastructure', 'core', 'public', 'admin', 'bootstrap'],



  },







  allowlist: [],







  moduleRootMaxFiles: 12,



  dtoDirWarnThreshold: 15,



  largeServiceLineThreshold: 600,



};



