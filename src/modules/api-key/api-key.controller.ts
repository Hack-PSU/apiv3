import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiKeyService } from "./api-key.service";
import { Roles } from "common/gcp/auth/roles.decorator";
import { Role } from "common/gcp/auth/firebase-auth.types";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("API Keys")
@Controller("api-keys")
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(@Body("name") name: string) {
    return this.apiKeyService.createKey(name);
  }

  @Get()
  async findAll() {
    return this.apiKeyService.listKeys();
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.apiKeyService.revokeKey(id);
  }
}
