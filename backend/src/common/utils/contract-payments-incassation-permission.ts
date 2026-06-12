import { PrismaService } from '../../database/prisma.service';

const INCASSATION_RESOURCE_ID = 'admin.crm.contract-payments.incassation';

export async function canEditContractPaymentsIncassation(
  prisma: PrismaService,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === 'SUPER_ADMIN') return true;
  const permission = await prisma.adminResourcePermission.findFirst({
    where: {
      resourceId: INCASSATION_RESOURCE_ID,
      userId,
      permission: 'EDIT',
    },
  });
  return !!permission;
}
