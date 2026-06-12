import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesCrudService } from './services/categories-crud.service';
import {
  CategoriesAttributesService,
  type AddAttributeDto,
  type ApplyAttributesToProductsDto,
  type BulkAttributeDto,
} from './services/categories-attributes.service';

export type { AddAttributeDto, BulkAttributeDto, ApplyAttributesToProductsDto };

@Injectable()
export class CategoriesService {
  constructor(
    private crud: CategoriesCrudService,
    private attributes: CategoriesAttributesService,
  ) {}

  create(createCategoryDto: CreateCategoryDto, createdByUserId?: string) {
    return this.crud.create(createCategoryDto, createdByUserId);
  }

  inheritAttributesFromParentPublic(categoryId: string) {
    return this.attributes.inheritAttributesFromParentPublic(categoryId);
  }

  findAll(includeInactive = false) {
    return this.crud.findAll(includeInactive);
  }

  findAllFlat() {
    return this.crud.findAllFlat();
  }

  getNavigationStructure() {
    return this.crud.getNavigationStructure();
  }

  findOne(id: string) {
    return this.crud.findOne(id);
  }

  findBySlug(slug: string) {
    return this.crud.findBySlug(slug);
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto) {
    return this.crud.update(id, updateCategoryDto);
  }

  remove(id: string) {
    return this.crud.remove(id);
  }

  getCategoryAttributes(categoryId: string) {
    return this.attributes.getCategoryAttributes(categoryId);
  }

  getMergedAttributesForCategories(categoryIds: string[]) {
    return this.attributes.getMergedAttributesForCategories(categoryIds);
  }

  addAttributeToCategory(categoryId: string, dto: AddAttributeDto) {
    return this.attributes.addAttributeToCategory(categoryId, dto);
  }

  bulkAddAttributesToCategory(categoryId: string, dto: BulkAttributeDto) {
    return this.attributes.bulkAddAttributesToCategory(categoryId, dto);
  }

  removeAttributeFromCategory(categoryId: string, attributeId: string) {
    return this.attributes.removeAttributeFromCategory(categoryId, attributeId);
  }

  updateCategoryAttribute(
    categoryId: string,
    attributeId: string,
    data: { isRequired?: boolean; order?: number },
  ) {
    return this.attributes.updateCategoryAttribute(categoryId, attributeId, data);
  }

  applyAttributesToProducts(categoryId: string, attributes: ApplyAttributesToProductsDto[]) {
    return this.attributes.applyAttributesToProducts(categoryId, attributes);
  }

  getAllAttributes() {
    return this.attributes.getAllAttributes();
  }

  createAttribute(data: Parameters<CategoriesAttributesService['createAttribute']>[0]) {
    return this.attributes.createAttribute(data);
  }

  updateAttribute(id: string, data: Parameters<CategoriesAttributesService['updateAttribute']>[1]) {
    return this.attributes.updateAttribute(id, data);
  }

  deleteAttribute(id: string) {
    return this.attributes.deleteAttribute(id);
  }
}
