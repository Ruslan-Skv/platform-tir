import {
  type AdminSidebarUiPrefs,
  DEFAULT_ADMIN_SIDEBAR_UI_PREFS,
  mergeSidebarUiPrefsSaved,
} from '@/shared/lib/admin/sidebar-ui-prefs';

function prefs(overrides: Partial<AdminSidebarUiPrefs>): AdminSidebarUiPrefs {
  return { ...DEFAULT_ADMIN_SIDEBAR_UI_PREFS, ...overrides };
}

describe('mergeSidebarUiPrefsSaved', () => {
  it('сервер без navOrder (старый бэкенд) не затирает локальный порядок', () => {
    const requested = prefs({ hideIcons: true, navOrder: ['/admin/crm', '/admin'] });
    const saved = prefs({ hideIcons: true, navOrder: [] });
    expect(mergeSidebarUiPrefsSaved(requested, saved).navOrder).toEqual(['/admin/crm', '/admin']);
  });

  it('сохранённый на сервере порядок выигрывает при пустом локальном', () => {
    const requested = prefs({ navOrder: [] });
    const saved = prefs({ navOrder: ['/admin/kanban', '/admin'] });
    expect(mergeSidebarUiPrefsSaved(requested, saved).navOrder).toEqual([
      '/admin/kanban',
      '/admin',
    ]);
  });

  it('явный сброс (пустой порядок) сохраняется, когда локального порядка нет', () => {
    const requested = prefs({ navOrder: [] });
    const saved = prefs({ navOrder: [] });
    expect(mergeSidebarUiPrefsSaved(requested, saved).navOrder).toEqual([]);
  });
});
