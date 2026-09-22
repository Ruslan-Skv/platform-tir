const fs = require('fs');

function edit(path, pairs) {
  let s = fs.readFileSync(path, 'utf8');
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  for (const [o, n] of pairs) {
    if (!s.includes(o)) {
      console.error('NOT FOUND in ' + path + ':\n---\n' + o + '\n---');
      process.exit(1);
    }
    s = s.split(o).join(n);
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(path, s, 'utf8');
  console.log('ok ' + path);
}

// ---- repair-schedule.shared: withDerived без contract/crmContract ----
edit('src/admin/repair-schedules/repair-schedule.shared.ts', [
  [
    `    package?: {
      formData?: unknown;
      crmContract?: {
        actWorkStartDate?: Date | null;
        actWorkEndDate?: Date | null;
        contractDurationDays?: number | null;
      } | null;
    } | null;
    contract?: {
      actWorkStartDate?: Date | null;
      actWorkEndDate?: Date | null;
      contractDurationDays?: number | null;
    } | null;
    entries:`,
    `    package?: {
      formData?: unknown;
    } | null;
    entries:`,
  ],
  [
    `    crmActWorkStartDate:
      project.package?.crmContract?.actWorkStartDate ?? project.contract?.actWorkStartDate ?? null,
    crmActWorkEndDate:
      project.package?.crmContract?.actWorkEndDate ?? project.contract?.actWorkEndDate ?? null,
    crmContractDurationDays:
      project.package?.crmContract?.contractDurationDays ??
      project.contract?.contractDurationDays ??
      null,`,
    `    crmActWorkStartDate: null,
    crmActWorkEndDate: null,
    crmContractDurationDays: null,`,
  ],
]);

// ---- furniture-schedule.shared: то же ----
edit('src/admin/furniture-schedules/furniture-schedule.shared.ts', [
  [
    `    crmContractId: true,
      crmContract: {
        select: {
          id: true,
          contractNumber: true,
          contractDate: true,
          customerName: true,
          customerAddress: true,
          customerPhone: true,
          totalAmount: true,
          advanceAmount: true,
          actWorkStartDate: true,
          actWorkEndDate: true,
          contractDurationDays: true,
        },
      },
    },
  },
  contract: {
    select: {
      id: true,
      contractNumber: true,
      contractDate: true,
      customerName: true,
      customerAddress: true,
      customerPhone: true,
      actWorkStartDate: true,
      actWorkEndDate: true,
      contractDurationDays: true,
    },
  },`,
    `    },
  },`,
  ],
  [
    `    package?: {
      formData?: unknown;
      crmContract?: {
        contractDate?: Date | null;
        actWorkStartDate?: Date | null;
        actWorkEndDate?: Date | null;
        contractDurationDays?: number | null;
      } | null;
    } | null;
    contract?: {
      contractDate?: Date | null;
      actWorkStartDate?: Date | null;
      actWorkEndDate?: Date | null;
      contractDurationDays?: number | null;
    } | null;
    entries:`,
    `    package?: {
      formData?: unknown;
    } | null;
    entries:`,
  ],
  [
    `    crmContractDate:
      project.package?.crmContract?.contractDate ?? project.contract?.contractDate ?? null,
    crmActWorkStartDate:
      project.package?.crmContract?.actWorkStartDate ?? project.contract?.actWorkStartDate ?? null,
    crmActWorkEndDate:
      project.package?.crmContract?.actWorkEndDate ?? project.contract?.actWorkEndDate ?? null,
    crmContractDurationDays:
      project.package?.crmContract?.contractDurationDays ??
      project.contract?.contractDurationDays ??
      null,`,
    `    crmContractDate: null,
    crmActWorkStartDate: null,
    crmActWorkEndDate: null,
    crmContractDurationDays: null,`,
  ],
]);

// ---- packages crud: корзина без crmContract ----
edit('src/admin/contract-document-packages/contract-document-package-crud.service.ts', [
  [
    `      include: {
        deletedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        crmContract: {
          select: {
            customerName: true,
          },
        },
      },`,
    `      include: {
        deletedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },`,
  ],
]);

// ---- measurements controller: withoutContract ----
edit('src/admin/measurements/measurements.controller.ts', [
  ["    @Query('withoutContract') withoutContract?: string,\n", ''],
  ["      withoutContract: truthy(withoutContract),\n", ''],
]);

// ---- joint-objects service: селекты/инклюды ----
edit('src/admin/joint-objects/joint-objects.service.ts', [
  ["          packageId: true,\n          contractId: true,\n          note: true,\n", "          packageId: true,\n          note: true,\n"],
  [
    `          package: {
            select: {
              documentObjectId: true,
              formData: true,
              crmContract: {
                select: {
                  actWorkStartDate: true,
                  actWorkEndDate: true,
                  contractDurationDays: true,
                },
              },
            },
          },
          contract: {
            select: {
              actWorkStartDate: true,
              actWorkEndDate: true,
              contractDurationDays: true,
            },
          },
          entries:`,
    `          package: {
            select: {
              documentObjectId: true,
              formData: true,
            },
          },
          entries:`,
  ],
  ["          direction: true,\n          contractId: true,\n", "          direction: true,\n"],
]);

console.log('ALL DONE');
