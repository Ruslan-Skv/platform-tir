import { Controller, Get, Param, Post, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { OriginGuard } from '../common/guards/origin.guard';
import { RejectContractDocumentDto, SignContractDocumentDto } from './dto/public-signing.dto';
import { ContractDocumentSigningService } from './contract-document-signing.service';

@Controller('contract-document-signing')
export class ContractDocumentSigningPublicController {
  constructor(private readonly signing: ContractDocumentSigningService) {}

  @Get(':token')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  getSession(@Param('token') token: string) {
    return this.signing.getPublicSession(token);
  }

  @Post(':token/view')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  markViewed(@Param('token') token: string) {
    return this.signing.markViewed(token);
  }

  @Post(':token/sign')
  @HttpCode(200)
  @UseGuards(OriginGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  sign(
    @Param('token') token: string,
    @Body() body: SignContractDocumentDto,
    @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    const ua = req.headers?.['user-agent'];
    return this.signing.sign(
      token,
      {
        otpCode: body.otpCode,
        signedName: body.signedName,
        consent: body.consent,
      },
      {
        ip: req.ip,
        userAgent: Array.isArray(ua) ? ua[0] : ua,
      },
    );
  }

  @Post(':token/reject')
  @HttpCode(200)
  @UseGuards(OriginGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  reject(@Param('token') token: string, @Body() body: RejectContractDocumentDto) {
    return this.signing.reject(token, body.reason);
  }
}
