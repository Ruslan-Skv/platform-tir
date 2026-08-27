import { PartialType } from '@nestjs/mapped-types';
import { CreateMarketingChannelDto } from './create-marketing-channel.dto';

export class UpdateMarketingChannelDto extends PartialType(CreateMarketingChannelDto) {}
