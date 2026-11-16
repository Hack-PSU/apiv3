import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import { ApiKeyService } from "./api-key.service";
import { Roles } from "common/gcp/auth/roles.decorator";
import { Role } from "common/gcp/auth/firebase-auth.types";
import { ApiProperty, ApiTags, OmitType } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { ApiKey } from "entities/api-key.entity";

class ApiKeyEntity extends OmitType(ApiKey, ["valueHash"] as const) {}

class CreateApiKeyEntity {
  @ApiProperty({ description: "A human readable label for the key" })
  name: string;
}

class CreateApiKeyResponse {
  @ApiProperty({
    description: "The raw key. Shown once, at creation, and never again.",
  })
  key: string;

  @ApiProperty({ type: ApiKeyEntity })
  entity: ApiKeyEntity;
}

@ApiTags("API Keys")
@Controller("api-keys")
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Create an API Key",
    request: {
      body: { type: CreateApiKeyEntity },
    },
    response: {
      created: { type: CreateApiKeyResponse },
    },
    auth: Role.TECH,
  })
  async create(@Body("name") name: string) {
    return this.apiKeyService.createKey(name);
  }

  @Get()
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Get All API Keys",
    response: {
      ok: { type: [ApiKeyEntity] },
    },
    auth: Role.TECH,
  })
  async findAll() {
    return this.apiKeyService.listKeys();
  }

  @Delete(":id")
  @Roles(Role.TECH)
  @HttpCode(204)
  @ApiDoc({
    summary: "Revoke an API Key",
    params: [{ name: "id", type: String, description: "A valid API key ID" }],
    response: {
      noContent: true,
    },
    auth: Role.TECH,
  })
  async remove(@Param("id") id: string) {
    return this.apiKeyService.revokeKey(id);
  }
}
