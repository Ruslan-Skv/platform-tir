import { PartialType } from '@nestjs/swagger';
import { CreateProductComponentDto } from './create-product-component.dto';

export class UpdateProductComponentDto extends PartialType(CreateProductComponentDto) {}
