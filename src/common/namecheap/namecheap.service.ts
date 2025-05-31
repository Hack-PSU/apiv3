import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { XMLParser } from "fast-xml-parser";
import { ConfigService } from "@nestjs/config";
import { ConfigToken } from "common/config";
import { NamecheapOptions } from "common/config/namecheap";

const DOMAIN = "hackpsu.org";

@Injectable()
export class NamecheapEmailForwardingService {
  private readonly opts: NamecheapOptions;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.opts = this.config.get<NamecheapOptions>(ConfigToken.NAMECHEAP);
  }

  async getEmailForwarding(): Promise<
    Array<{ mailbox: string; forwardTo: string }>
  > {
    const { apiUser, apiKey, clientIp, baseUrl } = this.opts;
    const qs = new URLSearchParams({
      ApiUser: apiUser,
      ApiKey: apiKey,
      UserName: apiUser,
      ClientIp: clientIp,
      Command: "namecheap.domains.dns.getEmailForwarding",
      DomainName: DOMAIN,
    }).toString();

    const resp = await firstValueFrom(
      this.http.get(`${baseUrl}?${qs}`, { responseType: "text" }),
    );

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "value",
    });
    const parsed = parser.parse(resp.data);

    console.log("Parsed XML:", parsed);

    const result =
      parsed?.ApiResponse?.CommandResponse?.DomainDNSGetEmailForwardingResult;
    if (!result) {
      throw new InternalServerErrorException(
        "Namecheap API: missing DomainDNSGetEmailForwardingResult",
      );
    }

    const forwards = result.Forward
      ? Array.isArray(result.Forward)
        ? result.Forward
        : [result.Forward]
      : [];

    return forwards.map((f: any) => ({
      mailbox: f.mailbox,
      forwardTo: f.value as string,
    }));
  }

  async setEmailForwarding(
    entries: Array<{ mailbox: string; forwardTo: string }>,
  ): Promise<boolean> {
    const { apiUser, apiKey, clientIp, baseUrl } = this.opts;
    const qs = new URLSearchParams({
      ApiUser: apiUser,
      ApiKey: apiKey,
      UserName: apiUser,
      ClientIp: clientIp,
      Command: "namecheap.domains.dns.setEmailForwarding",
      DomainName: DOMAIN,
      ...entries.reduce(
        (acc, { mailbox, forwardTo }, i) => {
          const idx = i + 1;
          acc[`MailBox${idx}`] = mailbox;
          acc[`ForwardTo${idx}`] = forwardTo;
          return acc;
        },
        {} as Record<string, string>,
      ),
    }).toString();

    const resp = await firstValueFrom(
      this.http.get(`${baseUrl}?${qs}`, { responseType: "text" }),
    );
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const parsed = parser.parse(resp.data);

    const success =
      parsed?.ApiResponse?.CommandResponse?.DomainDNSSetEmailForwardingResult
        ?.IsSuccess === "true";
    if (!success) {
      throw new InternalServerErrorException(
        "Namecheap API: failed to set email forwarding",
      );
    }
    return true;
  }
}
