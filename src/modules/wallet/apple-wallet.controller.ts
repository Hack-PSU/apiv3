import {
  Controller,
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
import { User } from "entities/user.entity";
import { RestrictedRoles, Role } from "common/gcp";
import { DateTime } from "luxon";

@Controller("wallet/apple")
export class AppleWalletController {
  constructor(
    private readonly appleWalletService: AppleWalletService,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

    const user = await User.query().findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Set event time to 2 hours before hackathon start time
    const eventStartTime = DateTime.fromJSDate(new Date(hackathon.startTime), {
      zone: "America/New_York",
    }).minus({ hours: 2 });

    const passData: HackathonPassData = {
      eventName: `HackPSU ${hackathon.name}`,
      issuerName: "HackPSU",
      homepageUri: "https://hackpsu.org",
      logoUrl:
        "https://storage.googleapis.com/hackpsu-408118.appspot.com/sponsor-logos/6-Test%20Sponsor-light.png",
      ticketHolderName: `${user.firstName} ${user.lastName}`,
      ticketNumber: userId,
      startDateTime: eventStartTime.toISO(),
      endDateTime: DateTime.fromJSDate(new Date(hackathon.endTime), {
        zone: "America/New_York",
      }).toISO(),
      location: {
        // prettier-ignore
        latitude: 40.803470,
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
