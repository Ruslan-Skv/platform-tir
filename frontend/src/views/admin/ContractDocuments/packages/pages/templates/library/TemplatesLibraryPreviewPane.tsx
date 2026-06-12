'use client';

import measurementFormStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { TemplateEditorZoomControl } from './editor/templateEditorFormatToolbar';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';

type TemplatesLibraryPreviewPaneProps = Pick<
  TemplatesLibraryPageModel,
  | 'capturePreviewPaneHeight'
  | 'commitPreviewZoomDraft'
  | 'previewPaneHeightPx'
  | 'previewPaneRef'
  | 'previewZoomDraft'
  | 'previewZoomPct'
  | 'renderedPreviewDisplay'
  | 'setPreviewZoomDraft'
  | 'stepPreviewZoom'
>;

export function TemplatesLibraryPreviewPane({
  previewPaneRef,
  previewPaneHeightPx,
  capturePreviewPaneHeight,
  previewZoomPct,
  previewZoomDraft,
  setPreviewZoomDraft,
  commitPreviewZoomDraft,
  stepPreviewZoom,
  renderedPreviewDisplay,
}: TemplatesLibraryPreviewPaneProps) {
  return (
    <div className={cdTemplates.contractPreviewColumn}>
      <div
        className={`${measurementFormStyles.blankSheet} ${cdTemplates.templatesLibraryPaneBlank}`}
      >
        <div className={cdTemplates.templatesLibraryPreviewHead}>
          <h3 className={cdTemplates.previewBlockTitle}>Предпросмотр</h3>
          <div className={cdTemplates.templatesLibraryPaneToolbar}>
            <TemplateEditorZoomControl
              id="templates-library-preview-zoom"
              value={previewZoomPct}
              draft={previewZoomDraft}
              ariaLabel="Масштаб предпросмотра"
              title="Масштаб предпросмотра на экране (не влияет на печать)"
              onDraftChange={setPreviewZoomDraft}
              onCommit={commitPreviewZoomDraft}
              onStep={stepPreviewZoom}
            />
          </div>
        </div>
        <div
          ref={previewPaneRef}
          className={`${cdTemplates.docPane} ${cdDocPreview.docPane} ${cdTemplates.previewResizable}`}
          style={{ height: previewPaneHeightPx ? `${previewPaneHeightPx}px` : undefined }}
          onMouseUp={capturePreviewPaneHeight}
          onTouchEnd={capturePreviewPaneHeight}
        >
          <div
            style={{
              zoom: `${previewZoomPct}%`,
              width: '100%',
              overflowX: 'hidden',
            }}
            dangerouslySetInnerHTML={{ __html: renderedPreviewDisplay }}
          />
        </div>
      </div>
    </div>
  );
}
