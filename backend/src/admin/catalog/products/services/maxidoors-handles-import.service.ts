import { Injectable } from '@nestjs/common';

import { MAXIDOORS_HANDLES_CATEGORY_ID } from './maxidoors-catalogs';
import { MaxidoorsImportService, type MaxidoorsImportJob } from './maxidoors-import.service';

/** @deprecated use MaxidoorsImportService with catalog: 'handles' */
export const DEFAULT_MAXIDOORS_HANDLES_CATEGORY_ID = MAXIDOORS_HANDLES_CATEGORY_ID;

export type MaxidoorsHandlesImportJob = MaxidoorsImportJob;
export type MaxidoorsHandlesImportJobStatus = MaxidoorsImportJob['status'];

/**
 * Обёртка над универсальным MaxidoorsImportService для раздела «Ручки (м)».
 * @deprecated предпочитайте MaxidoorsImportService.startImport({ catalog: 'handles', ... })
 */
@Injectable()
export class MaxidoorsHandlesImportService {
  constructor(private readonly maxidoorsImport: MaxidoorsImportService) {}

  getJob(jobId: string) {
    return this.maxidoorsImport.getJob(jobId);
  }

  startImport(
    opts: {
      categoryId?: string;
      supplierId?: string;
      limit?: number;
      delayMs?: number;
      skipExisting?: boolean;
    } = {},
  ) {
    return this.maxidoorsImport.startImport({
      catalog: 'handles',
      ...opts,
    });
  }

  importSync(
    opts: {
      categoryId?: string;
      supplierId?: string;
      limit?: number;
      delayMs?: number;
      skipExisting?: boolean;
    } = {},
  ) {
    return this.maxidoorsImport.importSync({
      catalog: 'handles',
      ...opts,
    });
  }
}
