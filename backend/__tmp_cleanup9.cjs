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

const p = 'src/admin/joint-objects/joint-objects.shared.ts';
const pairs = [
  // типы
  ['  packageId: string | null;\n  contractId: string | null;\n};\n\nexport type JointObjectCluster', '  packageId: string | null;\n};\n\nexport type JointObjectCluster'],
  ['  packageId: string | null;\n  contractId: string | null;\n};\n\nexport const DIRECTION_LABELS', '  packageId: string | null;\n};\n\nexport const DIRECTION_LABELS'],
  // nodeKeys
  [
    `function nodeKeys(input: {
  customerName: string | null;
  customerAddress: string | null;
  documentObjectId?: string | null;
  packageId: string | null;
  contractId: string | null;
}): Omit<JointRawNode, 'item'> {
  return {
    addressKey: normalizeAddress(input.customerAddress),
    customerKey: normalizeName(input.customerName),
    documentObjectId: input.documentObjectId ?? null,
    packageId: input.packageId,
    contractId: input.contractId,
  };
}`,
    `function nodeKeys(input: {
  customerName: string | null;
  customerAddress: string | null;
  documentObjectId?: string | null;
  packageId: string | null;
}): Omit<JointRawNode, 'item'> {
  return {
    addressKey: normalizeAddress(input.customerAddress),
    customerKey: normalizeName(input.customerName),
    documentObjectId: input.documentObjectId ?? null,
    packageId: input.packageId,
  };
}`,
  ],
  // installationToNode
  [
    `  installerName: string | null;
  packageId: string | null;
  contractId: string | null;
  note: string | null;`,
    `  installerName: string | null;
  packageId: string | null;
  note: string | null;`,
  ],
  [
    `      documentObjectId: row.package?.documentObjectId,
      packageId: row.packageId,
      contractId: row.contractId,
    }),`,
    `      documentObjectId: row.package?.documentObjectId,
      packageId: row.packageId,
    }),`,
  ],
  [
    `      deadlineWarning: null,
      packageId: row.packageId,
      contractId: row.contractId,
    },
  };
}

export function repairToNode(`,
    `      deadlineWarning: null,
      packageId: row.packageId,
    },
  };
}

export function repairToNode(`,
  ],
  // repairToNode
  [
    `    installerName: string | null;
    packageId: string | null;
    contractId: string | null;
    plannedStartDate: Date | null;
    workCloseActDate: Date | null;
    createdAt: Date;
    note: string | null;
    contractSum: Prisma.Decimal | null;
    package?: { documentObjectId?: string | null } | null;
  },
): JointRawNode {
  const derived = withRepairDerived(row);`,
    `    installerName: string | null;
    packageId: string | null;
    plannedStartDate: Date | null;
    workCloseActDate: Date | null;
    createdAt: Date;
    note: string | null;
    contractSum: Prisma.Decimal | null;
    package?: { documentObjectId?: string | null } | null;
  },
): JointRawNode {
  const derived = withRepairDerived(row);`,
  ],
  [
    `      documentObjectId: row.package?.documentObjectId ?? null,
      packageId: row.packageId,
      contractId: row.contractId,
    }),
    item: {
      id: row.id,
      kind: 'repair',`,
    `      documentObjectId: row.package?.documentObjectId ?? null,
      packageId: row.packageId,
    }),
    item: {
      id: row.id,
      kind: 'repair',`,
  ],
  [
    `      deadlineWarning: derived.deadlineWarning ?? null,
      packageId: row.packageId,
      contractId: row.contractId,
    },
  };
}

export function furnitureToNode(`,
    `      deadlineWarning: derived.deadlineWarning ?? null,
      packageId: row.packageId,
    },
  };
}

export function furnitureToNode(`,
  ],
  // furnitureToNode
  [
    `    installerName: string | null;
    packageId: string | null;
    contractId: string | null;
    plannedStartDate: Date | null;
    contractDate: Date | null;`,
    `    installerName: string | null;
    packageId: string | null;
    plannedStartDate: Date | null;
    contractDate: Date | null;`,
  ],
  [
    `      documentObjectId: row.package?.documentObjectId ?? null,
      packageId: row.packageId,
      contractId: row.contractId,
    }),
    item: {
      id: row.id,
      kind: 'furniture',`,
    `      documentObjectId: row.package?.documentObjectId ?? null,
      packageId: row.packageId,
    }),
    item: {
      id: row.id,
      kind: 'furniture',`,
  ],
  [
    `      deadlineWarning: derived.deadlineWarning ?? null,
      packageId: row.packageId,
      contractId: row.contractId,
    },
  };
}

export function waybillToNode(`,
    `      deadlineWarning: derived.deadlineWarning ?? null,
      packageId: row.packageId,
    },
  };
}

export function waybillToNode(`,
  ],
  // waybillToNode
  [
    `  customerName: string | null;
  customerAddress: string | null;
  contractId: string | null;
}): JointRawNode {`,
    `  customerName: string | null;
  customerAddress: string | null;
}): JointRawNode {`,
  ],
  [
    `      customerAddress: row.customerAddress,
      packageId: null,
      contractId: row.contractId,
    }),`,
    `      customerAddress: row.customerAddress,
      packageId: null,
    }),`,
  ],
  [
    `      note: time,
      contractSum: null,
      deadlineWarning: null,
      packageId: null,
      contractId: row.contractId,
    },`,
    `      note: time,
      contractSum: null,
      deadlineWarning: null,
      packageId: null,
    },`,
  ],
];

edit(p, pairs);
console.log('ALL DONE');
