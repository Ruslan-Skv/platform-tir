type AttributeColorDotProps = {
  color: string;
  className?: string;
};

/** Цветной индикатор значения атрибута (runtime background). */
export function AttributeColorDot({ color, className }: AttributeColorDotProps) {
  return <span className={className} style={{ background: color }} />;
}
