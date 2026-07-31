'use client';

import { CallCustomerIcon } from '@/shared/ui/icons/crm/CallCustomerIcon';
import {
  crmPhoneToTelHref,
  formatCrmPhoneOrDash,
} from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';

import styles from './Waybills.module.css';

function WaybillMobileCallRow({ phone }: { phone: string }) {
  const phoneDisplay = formatCrmPhoneOrDash(phone);
  const telHref = crmPhoneToTelHref(phone);
  if (!telHref || !phoneDisplay || phoneDisplay === '—') return null;

  return (
    <div className={styles.mobilePhoneRow}>
      <a href={telHref} className={styles.mobilePhoneLink} aria-label={`Позвонить ${phoneDisplay}`}>
        {phoneDisplay}
      </a>
      <a
        href={telHref}
        className={styles.mobileCall}
        aria-label={`Позвонить клиенту ${phoneDisplay}`}
        title={`Позвонить клиенту ${phoneDisplay}`}
      >
        <CallCustomerIcon size={22} />
      </a>
    </div>
  );
}

export function WaybillMobileCallControl({
  phone,
  phones,
}: {
  phone?: string | null;
  phones?: string[] | null;
}) {
  const list = (phones?.length ? phones : phone ? [phone] : [])
    .map((p) => p.trim())
    .filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div className={styles.mobilePhoneList}>
      {list.map((p) => (
        <WaybillMobileCallRow key={p} phone={p} />
      ))}
    </div>
  );
}
