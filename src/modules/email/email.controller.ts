import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  HttpStatus,
} from "@nestjs/common";
import { NamecheapEmailForwardingService } from "common/namecheap/namecheap.service";
import { ApiTags } from "@nestjs/swagger";
import { ApiDoc, BadRequestExceptionResponse } from "common/docs";
import { Role, Roles } from "common/gcp";

@ApiTags("Email")
@Controller("email")
export class EmailController {
  constructor(private readonly namecheap: NamecheapEmailForwardingService) {}

  @Get("/forwarding")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get all email forwarding settings for hackpsu.org",
    auth: Role.EXEC,
    response: {
      custom: [
        { status: HttpStatus.BAD_REQUEST, type: BadRequestExceptionResponse },
      ],
    },
  })
  async getEmailForwarding() {
    const entries = await this.namecheap.getEmailForwarding();
    return { ok: entries };
  }

  @Post("/forwarding")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Add one email-forwarding entry for hackpsu.org",
    auth: Role.EXEC,
    response: {
      ok: { type: Boolean },
      custom: [
        { status: HttpStatus.BAD_REQUEST, type: BadRequestExceptionResponse },
      ],
    },
  })
  async addEmailForwarding(
    @Query("mailbox") mailbox: string,
    @Query("forwardTo") forwardTo: string,
  ) {
    const list = await this.namecheap.getEmailForwarding();

    if (!list.some((e) => e.mailbox === mailbox && e.forwardTo === forwardTo)) {
      list.push({ mailbox, forwardTo });
    }

    const ok = await this.namecheap.setEmailForwarding(list);
    return { ok };
  }

  @Delete("/forwarding")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Delete one email-forwarding entry for hackpsu.org",
    auth: Role.EXEC,
    response: {
      ok: { type: Boolean },
      custom: [
        { status: HttpStatus.BAD_REQUEST, type: BadRequestExceptionResponse },
      ],
    },
  })
  async deleteEmailForwarding(
    @Query("mailbox") mailbox: string,
    @Query("forwardTo") forwardTo: string,
  ) {
    const list = await this.namecheap.getEmailForwarding();

    const filtered = list.filter(
      (e) => !(e.mailbox === mailbox && e.forwardTo === forwardTo),
    );

    const ok = await this.namecheap.setEmailForwarding(filtered);
    return { ok };
  }
}
