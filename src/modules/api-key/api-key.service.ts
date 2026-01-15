import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "common/objection";
import { Repository } from "common/objection/objection.repository";
import { ApiKey } from "entities/api-key.entity";
import * as bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "crypto";

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    private readonly configService: ConfigService,
  ) {}

  async createKey(name: string) {
    const rawKey = randomBytes(32).toString("hex");
    const prefix = rawKey.substring(0, 7);
    const valueHash = await bcrypt.hash(rawKey, 10);

    // Let database handle createdAt default
    const apiKey = await this.apiKeyRepo
      .createOne({
        id: randomUUID(),
        name,
        valueHash,
        prefix,
      })
      .exec();

    return {
      key: rawKey,
      entity: apiKey,
    };
  }

  async validateKey(key: string): Promise<ApiKey | null> {
    const prefix = key.substring(0, 7);

    const candidates = await this.apiKeyRepo
      .findAll()
      .raw()
      .where("prefix", prefix)
      .whereNull("revokedAt");

    for (const candidate of candidates) {
      const match = await bcrypt.compare(key, candidate.valueHash);
      if (match) {
        // Fire and forget update
        void this.apiKeyRepo
          .patchOne(candidate.id, {
            lastUsedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          })
          .exec();
        return candidate;
      }
    }

    return null;
  }

  async revokeKey(id: string) {
    await this.apiKeyRepo
      .patchOne(id, {
        revokedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      })
      .exec();
  }

  async listKeys() {
    return this.apiKeyRepo.findAll().raw().orderBy("createdAt", "desc");
  }
}
