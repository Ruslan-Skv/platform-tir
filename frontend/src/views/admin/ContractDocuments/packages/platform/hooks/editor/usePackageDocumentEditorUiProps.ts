import { usePackageWorkOrdersListSurfaceProps } from '../work-orders/usePackageWorkOrdersListSurfaceProps';
import type { UsePackageWorkOrdersListSurfacePropsOptions } from '../work-orders/usePackageWorkOrdersListSurfaceProps';
import { usePackageDocumentEditorModalsProps } from './usePackageDocumentEditorModalsProps';
import type { UsePackageDocumentEditorModalsPropsOptions } from './usePackageDocumentEditorModalsProps';
import { usePackageDocumentEditorTabContentShellProps } from './usePackageDocumentEditorTabContentShellProps';
import type { UsePackageDocumentEditorTabContentShellPropsOptions } from './usePackageDocumentEditorTabContentShellProps';
import { usePackageDocumentEditorTabProps } from './usePackageDocumentEditorTabProps';
import type { UsePackageDocumentEditorTabPropsOptions } from './usePackageDocumentEditorTabProps';

export type UsePackageDocumentEditorUiPropsOptions = {
  tab: UsePackageDocumentEditorTabPropsOptions;
  modals: UsePackageDocumentEditorModalsPropsOptions;
  shell: Omit<UsePackageDocumentEditorTabContentShellPropsOptions, 'editorTabProps'>;
  workOrdersList: UsePackageWorkOrdersListSurfacePropsOptions;
};

export function usePackageDocumentEditorUiProps({
  tab,
  modals,
  shell,
  workOrdersList,
}: UsePackageDocumentEditorUiPropsOptions) {
  const editorTabProps = usePackageDocumentEditorTabProps(tab);
  const editorModalsProps = usePackageDocumentEditorModalsProps(modals);
  const workOrdersListSurfaceProps = usePackageWorkOrdersListSurfaceProps(workOrdersList);
  const { orderedVisibleTabs, tabContentProps } = usePackageDocumentEditorTabContentShellProps({
    ...shell,
    editorTabProps,
  });

  return {
    editorTabProps,
    editorModalsProps,
    workOrdersListSurfaceProps,
    orderedVisibleTabs,
    tabContentProps,
  };
}
