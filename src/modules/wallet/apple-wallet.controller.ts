import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { Response } from "express";
import { AppleWalletService } from "../../common/apple/apple-wallet.service";
import { HackathonPassData } from "../../common/gcp/wallet/google-wallet.types";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { RestrictedRoles, Role } from "common/gcp";

@Controller("wallet/apple")
export class AppleWalletController {
  constructor(
    private readonly appleWalletService: AppleWalletService,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
  ) {}

  @Post(":id/pass")
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  async createPass(
    @Param("id") userId: string,
    @Res() res: Response,
  ): Promise<void> {
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
        latitude: 40.80347,
        longitude: -77.865478,
      },
    };

    // Generate the pass.
    const pkpassBuffer = await this.appleWalletService.generatePass(
      passData,
      userId,
    );

    // Set the proper headers and serve the .pkpass file.
    res.set({
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename=pass.pkpass`,
    });
    res.send(pkpassBuffer);
  }
}
