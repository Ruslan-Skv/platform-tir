'use client';

import { useState } from 'react';

import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './CustomersPage.module.css';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  status: string;
  stage: string;
  dealValue: number;
  manager: { firstName: string; lastName: string } | null;
  createdAt: string;
}

// Mock data
const mockCustomers: Customer[] = [
  {
    id: '1',
    email: 'ivan@company.ru',
    firstName: 'Иван',
    lastName: 'Петров',
    phone: '+7 (999) 123-45-67',
    company: 'ООО "СтройКомплект"',
    status: 'CUSTOMER',
    stage: 'WON',
    dealValue: 450000,
    manager: { firstName: 'Алексей', lastName: 'Смирнов' },
    createdAt: '2026-01-15',
  },
  {
    id: '2',
    email: 'maria@example.com',
    firstName: 'Мария',
    lastName: 'Сидорова',
    phone: '+7 (999) 234-56-78',
    company: 'ИП Сидорова',
    status: 'PROSPECT',
    stage: 'PROPOSAL',
    dealValue: 180000,
    manager: { firstName: 'Алексей', lastName: 'Смирнов' },
    createdAt: '2026-01-18',
  },
  {
    id: '3',
    email: 'sergey@tech.ru',
    firstName: 'Сергей',
    lastName: 'Козлов',
    phone: '+7 (999) 345-67-89',
    company: 'ТехноДом',
    status: 'LEAD',
    stage: 'NEW',
    dealValue: 0,
    manager: null,
    createdAt: '2026-01-19',
  },
];

export function CustomersPage() {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      LEAD: 'Лид',
      PROSPECT: 'Потенциальный',
      CUSTOMER: 'Клиент',
      INACTIVE: 'Неактивен',
      CHURNED: 'Ушёл',
    };
    return labels[status] || status;
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      NEW: 'Новый',
      CONTACTED: 'Контакт',
      QUALIFIED: 'Квалифицирован',
      PROPOSAL: 'Предложение',
      NEGOTIATION: 'Переговоры',
      WON: 'Выигран',
      LOST: 'Проигран',
    };
    return labels[stage] || stage;
  };

  const columns = [
    {
      key: 'name',
      title: 'Клиент',
      render: (customer: Customer) => (
        <div className={styles.customerCell}>
          <div className={styles.customerAvatar}>
            {customer.firstName[0]}
            {customer.lastName?.[0] || ''}
          </div>
          <div className={styles.customerInfo}>
            <span className={styles.customerName}>
              {customer.firstName} {customer.lastName}
            </span>
            <span className={styles.customerEmail}>{customer.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      title: 'Компания',
      render: (customer: Customer) => customer.company || '—',
    },
    {
      key: 'phone',
      title: 'Телефон',
    },
    {
      key: 'status',
      title: 'Статус',
      render: (customer: Customer) => (
        <span className={`${styles.badge} ${styles[`status${customer.status}`]}`}>
          {getStatusLabel(customer.status)}
        </span>
      ),
    },
    {
      key: 'stage',
      title: 'Этап',
      render: (customer: Customer) => (
        <span className={`${styles.badge} ${styles[`stage${customer.stage}`]}`}>
          {getStageLabel(customer.stage)}
        </span>
      ),
    },
    {
      key: 'dealValue',
      title: 'Сумма сделки',
      render: (customer: Customer) =>
        customer.dealValue ? formatCurrency(customer.dealValue) : '—',
    },
    {
      key: 'manager',
      title: 'Менеджер',
      render: (customer: Customer) =>
        customer.manager ? `${customer.manager.firstName} ${customer.manager.lastName}` : '—',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Клиенты</h1>
          <span className={styles.count}>{customers.length} клиентов</span>
        </div>
        <button className={styles.addButton}>+ Добавить клиента</button>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по имени, email, телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все статусы</option>
          <option value="LEAD">Лиды</option>
          <option value="PROSPECT">Потенциальные</option>
          <option value="CUSTOMER">Клиенты</option>
          <option value="INACTIVE">Неактивные</option>
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все этапы</option>
          <option value="NEW">Новые</option>
          <option value="CONTACTED">Контакт</option>
          <option value="QUALIFIED">Квалифицированные</option>
          <option value="PROPOSAL">Предложение</option>
          <option value="NEGOTIATION">Переговоры</option>
          <option value="WON">Выигранные</option>
          <option value="LOST">Проигранные</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActions}>
          <span>Выбрано: {selectedIds.length}</span>
          <button className={styles.bulkButton}>Назначить менеджера</button>
          <button className={styles.bulkButton}>Изменить статус</button>
          <button className={`${styles.bulkButton} ${styles.danger}`}>Удалить</button>
        </div>
      )}

      <DataTable
        data={customers}
        columns={columns}
        keyExtractor={(customer) => customer.id}
        onRowClick={(customer) => {
          window.location.href = `/admin/crm/customers/${customer.id}`;
        }}
        selectable
        onSelectionChange={setSelectedIds}
        pagination={{
          page: 1,
          limit: 20,
          total: customers.length,
          onPageChange: (page) => console.log('Page:', page),
        }}
      />
    </div>
  );
}
