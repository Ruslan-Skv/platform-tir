import { PartialType } from '@nestjs/swagger';
import { CreateInstallerDto } from './create-installer.dto';

export class UpdateInstallerDto extends PartialType(CreateInstallerDto) {}
