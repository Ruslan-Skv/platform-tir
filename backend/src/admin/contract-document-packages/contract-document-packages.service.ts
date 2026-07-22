import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';

import { SetGlobalExecutorProfilesDto } from './dto/set-global-executor-profiles.dto';
import { SetGlobalContractTemplatesDto } from './dto/set-global-contract-templates.dto';
import { SetGlobalSignatoryProfilesDto } from './dto/set-global-signatory-profiles.dto';
import { SetGlobalEstimatePresetsDto } from './dto/set-global-estimate-presets.dto';
import { SetGlobalContractTemplateDto } from './dto/set-global-contract-template.dto';
import { CreateContractDocumentPackageDto } from './dto/create-contract-document-package.dto';
import { UpdateContractDocumentPackageDto } from './dto/update-contract-document-package.dto';
import {
  ApplyRepairWorkPeriodToAllDto,
  SetRepairContractSettingsDto,
} from './dto/set-repair-settings.dto';
import { SetWindowsWorkOrderMarkupDto } from './dto/set-windows-work-order-markup.dto';
import { SetWindowsContractSettingsDto } from './dto/set-windows-settings.dto';
import { ContractDocumentPackageGlobalLibraryService } from './contract-document-package-global-library.service';
import { ContractDocumentPackageEstimatePresetsService } from './contract-document-package-estimate-presets.service';
import { ContractDocumentPackageKindSettingsService } from './contract-document-package-kind-settings.service';
import { ContractDocumentPackageCrudService } from './contract-document-package-crud.service';
import { ContractDocumentPackageCeilingsPriceListService } from './contract-document-package-ceilings-price-list.service';
import { SetCeilingsPriceListDto } from './dto/set-ceilings-price-list.dto';

@Injectable()
export class ContractDocumentPackagesService {
  constructor(
    private readonly crud: ContractDocumentPackageCrudService,
    private readonly globalLibrary: ContractDocumentPackageGlobalLibraryService,
    private readonly estimatePresets: ContractDocumentPackageEstimatePresetsService,
    private readonly kindSettings: ContractDocumentPackageKindSettingsService,
    private readonly ceilingsPriceList: ContractDocumentPackageCeilingsPriceListService,
  ) {}

  create(dto: CreateContractDocumentPackageDto, createdById?: string) {
    return this.crud.create(dto, createdById);
  }

  findAll(kind?: ContractDocumentPackageKind) {
    return this.crud.findAll(kind);
  }

  findOne(id: string, options?: { allowTrashed?: boolean }) {
    return this.crud.findOne(id, options);
  }

  findTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    return this.crud.findTrash(kind, params);
  }

  update(id: string, dto: UpdateContractDocumentPackageDto, savedById?: string | null) {
    return this.crud.update(id, dto, savedById);
  }

  listVersions(packageId: string) {
    return this.crud.listVersions(packageId);
  }

  getVersion(packageId: string, versionId: string) {
    return this.crud.getVersion(packageId, versionId);
  }

  moveToTrash(id: string, actorUserId?: string) {
    return this.crud.moveToTrash(id, actorUserId);
  }

  restoreFromTrash(id: string) {
    return this.crud.restoreFromTrash(id);
  }

  remove(id: string, actorUserId?: string) {
    return this.crud.remove(id, actorUserId);
  }

  getGlobalTemplate(kind: ContractDocumentPackageKind, tab: string) {
    return this.globalLibrary.getGlobalTemplate(kind, tab);
  }

  setGlobalTemplate(dto: SetGlobalContractTemplateDto, updatedById?: string) {
    return this.globalLibrary.setGlobalTemplate(dto, updatedById);
  }

  getGlobalContractTemplates(kind: ContractDocumentPackageKind) {
    return this.globalLibrary.getGlobalContractTemplates(kind);
  }

  findContractTemplatesTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    return this.globalLibrary.findContractTemplatesTrash(kind, params);
  }

  trashContractTemplate(
    kind: ContractDocumentPackageKind,
    templateId: string,
    actorUserId?: string,
  ) {
    return this.globalLibrary.trashContractTemplate(kind, templateId, actorUserId);
  }

  restoreContractTemplateFromTrash(
    kind: ContractDocumentPackageKind,
    templateId: string,
    updatedById?: string,
  ) {
    return this.globalLibrary.restoreContractTemplateFromTrash(kind, templateId, updatedById);
  }

  setGlobalContractTemplates(dto: SetGlobalContractTemplatesDto, updatedById?: string) {
    return this.globalLibrary.setGlobalContractTemplates(dto, updatedById);
  }

  getGlobalExecutorProfiles(kind: ContractDocumentPackageKind) {
    return this.globalLibrary.getGlobalExecutorProfiles(kind);
  }

  setGlobalExecutorProfiles(dto: SetGlobalExecutorProfilesDto, updatedById?: string) {
    return this.globalLibrary.setGlobalExecutorProfiles(dto, updatedById);
  }

  getGlobalSignatoryProfiles(kind: ContractDocumentPackageKind) {
    return this.globalLibrary.getGlobalSignatoryProfiles(kind);
  }

  setGlobalSignatoryProfiles(dto: SetGlobalSignatoryProfilesDto, updatedById?: string) {
    return this.globalLibrary.setGlobalSignatoryProfiles(dto, updatedById);
  }

  getGlobalEstimatePresets(kind: ContractDocumentPackageKind) {
    return this.estimatePresets.getGlobalEstimatePresets(kind);
  }

  findEstimatePresetsTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    return this.estimatePresets.findEstimatePresetsTrash(kind, params);
  }

  trashEstimatePreset(kind: ContractDocumentPackageKind, presetId: string, actorUserId?: string) {
    return this.estimatePresets.trashEstimatePreset(kind, presetId, actorUserId);
  }

  restoreEstimatePresetFromTrash(kind: ContractDocumentPackageKind, presetId: string) {
    return this.estimatePresets.restoreEstimatePresetFromTrash(kind, presetId);
  }

  listGlobalEstimatePresetsHistory(kind: ContractDocumentPackageKind) {
    return this.estimatePresets.listGlobalEstimatePresetsHistory(kind);
  }

  setGlobalEstimatePresets(dto: SetGlobalEstimatePresetsDto, updatedById?: string) {
    return this.estimatePresets.setGlobalEstimatePresets(dto, updatedById);
  }

  resolveDefaultWorkPeriodDays(kind: ContractDocumentPackageKind) {
    return this.kindSettings.resolveDefaultWorkPeriodDays(kind);
  }

  resolveDefaultRepairWorkPeriodDays() {
    return this.kindSettings.resolveDefaultRepairWorkPeriodDays();
  }

  getWorkPeriodSettings(kind: ContractDocumentPackageKind) {
    return this.kindSettings.getWorkPeriodSettings(kind);
  }

  getRepairSettings() {
    return this.kindSettings.getRepairSettings();
  }

  getWindowsSettings() {
    return this.kindSettings.getWindowsSettings();
  }

  setWorkPeriodSettings(
    kind: ContractDocumentPackageKind,
    dto: SetRepairContractSettingsDto,
    updatedById?: string,
  ) {
    return this.kindSettings.setWorkPeriodSettings(kind, dto, updatedById);
  }

  setRepairSettings(dto: SetRepairContractSettingsDto, updatedById?: string) {
    return this.kindSettings.setRepairSettings(dto, updatedById);
  }

  setWindowsSettings(dto: SetWindowsContractSettingsDto, updatedById?: string) {
    return this.kindSettings.setWindowsSettings(dto, updatedById);
  }

  applyWorkPeriodToAllPackages(
    kind: ContractDocumentPackageKind,
    dto: ApplyRepairWorkPeriodToAllDto,
  ) {
    return this.kindSettings.applyWorkPeriodToAllPackages(kind, dto);
  }

  applyRepairWorkPeriodToAllPackages(dto: ApplyRepairWorkPeriodToAllDto) {
    return this.kindSettings.applyRepairWorkPeriodToAllPackages(dto);
  }

  applyWindowsWorkPeriodToAllPackages(dto: ApplyRepairWorkPeriodToAllDto) {
    return this.kindSettings.applyWindowsWorkPeriodToAllPackages(dto);
  }

  resolveWindowsWorkOrderMarkupPercent() {
    return this.kindSettings.resolveWindowsWorkOrderMarkupPercent();
  }

  getWindowsWorkOrderMarkupSettings() {
    return this.kindSettings.getWindowsWorkOrderMarkupSettings();
  }

  setWindowsWorkOrderMarkupSettings(dto: SetWindowsWorkOrderMarkupDto, updatedById?: string) {
    return this.kindSettings.setWindowsWorkOrderMarkupSettings(dto, updatedById);
  }

  getCeilingsPriceList() {
    return this.ceilingsPriceList.getPriceList();
  }

  setCeilingsPriceList(dto: SetCeilingsPriceListDto, updatedById?: string) {
    return this.ceilingsPriceList.setPriceList(dto, updatedById);
  }
}
