import { IsInt, Max, Min } from 'class-validator';

export class RevertAddendumSigningDto {
  /** Номер доп. соглашения в пакете (1–5). */
  @IsInt()
  @Min(1)
  @Max(5)
  ordinal: number;
}
