import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';

export class ConsentAcceptedDto {
  @ApiProperty({ example: true, description: 'Согласие на обработку персональных данных' })
  @IsBoolean()
  @Equals(true, { message: 'Необходимо согласие на обработку персональных данных' })
  consentAccepted: boolean;
}
