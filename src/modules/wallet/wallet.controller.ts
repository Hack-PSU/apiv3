// wallet.controller.ts
import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { GoogleWalletService } from "common/gcp/wallet/google-wallet.service";
import { AppleWalletService } from "modules/apple-wallet/apple-wallet.service";
import { HackathonPassData } from "common/gcp/wallet/google-wallet.types";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { RestrictedRoles, Role } from "common/gcp";
import { PASS_MIME_TYPE } from "@walletpass/pass-js/dist/constants";

@ApiTags("Wallet")
@Controller("wallet")
export class WalletController {
  constructor(
    private readonly googleWalletService: GoogleWalletService,
    private readonly appleWalletService: AppleWalletService,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
  ) {}

  // Google Wallet endpoint (unchanged)
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Post(":id/google-pass")
  async createGooglePass(
    @Param("id") userId: string,
  ): Promise<{ googleWalletLink: string }> {
    const issuerId = "3388000000022850013";
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const classSuffix = hackathon.name.split(" ").join("-");
    const objectSuffix = `${userId}-${Date.now()}`;

    const passData: HackathonPassData = {
      eventName: `HackPSU ${hackathon.name}`,
      issuerName: "HackPSU",
      homepageUri: "https://hackpsu.org",
      logoUrl:
        "https://storage.googleapis.com/hackpsu-408118.appspot.com/sponsor-logos/6-Test%20Sponsor-light.png",
      ticketHolderName: `User ${userId}`,
      ticketNumber: userId,
      startDateTime: new Date(hackathon.startTime).toISOString(),
      endDateTime: new Date(hackathon.endTime).toISOString(),
      location: {
        latitude: 40.48135,
        longitude: -77.51559,
      },
    };

    await this.googleWalletService.createEventTicketClass(
      issuerId,
      classSuffix,
      passData,
    );

    await this.googleWalletService.createEventTicketObject(
      issuerId,
      classSuffix,
      objectSuffix,
      userId,
      passData,
    );

    const googleWalletLink = this.googleWalletService.createJwtForNewPasses(
      issuerId,
      classSuffix,
      objectSuffix,
      passData,
      userId,
    );

    return { googleWalletLink };
  }

  // Apple Wallet endpoint
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Post(":id/apple-pass")
  @Header("Content-Type", PASS_MIME_TYPE)
  async createApplePass(
    @Param("id") userId: string,
  ): Promise<{ appleWalletPass: Buffer }> {
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    const passData: HackathonPassData = {
      eventName: `HackPSU ${hackathon.name}`,
      issuerName: "HackPSU",
      homepageUri: "https://hackpsu.org",
      logoUrl:
        "https://storage.googleapis.com/hackpsu-408118.appspot.com/sponsor-logos/6-Test%20Sponsor-light.png",
      ticketHolderName: `User ${userId}`,
      ticketNumber: userId,
      startDateTime: new Date(hackathon.startTime).toISOString(),
      endDateTime: new Date(hackathon.endTime).toISOString(),
      location: {
        latitude: 40.48135,
        longitude: -77.51559,
      },
    };

    const appleWalletPass = await this.appleWalletService.createPass(
      userId,
      passData,
    );
    return { appleWalletPass };
  }
}
