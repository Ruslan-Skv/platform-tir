export const KNOWLEDGE_QUIZ_IMPORT_FILE_ICON_SIZE = 48;

const ICON_SRC = '/icons/knowledge-quiz-import-file.png';

export type KnowledgeQuizImportFileIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Импорт вопросов из файла» */
export function KnowledgeQuizImportFileIcon({
  size = KNOWLEDGE_QUIZ_IMPORT_FILE_ICON_SIZE,
  className,
}: KnowledgeQuizImportFileIconProps) {
  return (
    <img
      src={ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
      draggable={false}
    />
  );
}
