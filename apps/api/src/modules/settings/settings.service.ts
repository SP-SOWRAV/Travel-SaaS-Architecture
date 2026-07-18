import { Injectable, NotFoundException } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsRepository } from './settings.repository';

export interface SettingsResponse {
  id: string;
  agencyId: string;
  legalName: string | null;
  logoUrl: string | null;
  theme: string;
  currencyCode: string;
  timezone: string;
  invoicePrefix: string;
  ticketPrefix: string;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  cityId: string | null;
  countryId: string | null;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toSettingsResponse(settings: Settings): SettingsResponse {
  const { tenantId, ...rest } = settings;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async getSettings(): Promise<SettingsResponse> {
    const settings = (await this.settingsRepository.findForCurrentTenant()) as Settings | null;
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }
    return toSettingsResponse(settings);
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsResponse> {
    const settings = (await this.settingsRepository.updateForCurrentTenant(dto)) as Settings;
    return toSettingsResponse(settings);
  }
}
