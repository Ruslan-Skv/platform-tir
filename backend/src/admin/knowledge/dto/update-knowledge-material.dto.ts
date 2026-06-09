import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeMaterialDto } from './create-knowledge-material.dto';

export class UpdateKnowledgeMaterialDto extends PartialType(CreateKnowledgeMaterialDto) {}
