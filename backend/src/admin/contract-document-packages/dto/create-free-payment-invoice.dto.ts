import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PaymentInvoiceLineItemDto } from './payment-invoice-line-item.dto';

/** Типы для свободного счёта (без Д/с — он привязан к договору в базе). */
export enum CreateFreePaymentInvoiceTypeDto {
  PREPAYMENT = 'PREPAYMENT',
  ADVANCE = 'ADVANCE',
  FINAL = 'FINAL',
}

/** Свободный счёт на оплату без договора в базе: реквизиты передаются в запросе. */
export class CreateFreePaymentInvoiceDto {
  @IsISO8601({ strict: true })
  invoiceDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(CreateFreePaymentInvoiceTypeDto)
  paymentType!: CreateFreePaymentInvoiceTypeDto;

  @IsString()
  @MinLength(1)
  basis!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PaymentInvoiceLineItemDto)
  lineItems?: PaymentInvoiceLineItemDto[];

  /** № договора (текстом — договора в базе нет). */
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  contractDate?: string;

  /** Карточка заказчика в CRM (если выбрана через «Поиск заказчика в базе»). */
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  @MinLength(1)
  customerName!: string;

  /** Снимок профиля исполнителя (справочник «Реквизиты») для печати и штампа ЭП. */
  @IsOptional()
  @IsObject()
  executorProfile?: Record<string, unknown>;

  /** Снимок реквизитов заказчика (телефон, e-mail, ИНН, адрес) для печатной формы. */
  @IsOptional()
  @IsObject()
  customerSnapshot?: Record<string, unknown>;
}
