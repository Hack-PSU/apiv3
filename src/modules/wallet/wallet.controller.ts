import { Controller, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { GoogleWalletService } from "common/gcp/wallet/google-wallet.service";
import { HackathonPassData } from "common/gcp/wallet/google-wallet.types";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon } from "@entities/hackathon.entity";
import { RestrictedRoles, Role } from "common/gcp";

@ApiTags("Wallet")
@Controller("wallet")
export class WalletController {
  constructor(
    private readonly googleWalletService: GoogleWalletService,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
  ) {}

  /**
   * Create (or re‑sign) a wallet pass for the given user.
   * This route is protected so that only the authenticated user (whose uid equals :id) may access it.
   */
  @RestrictedRoles({
    roles: [Role.NONE],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Post(":id/pass")
  async createPass(
    @Param("id") userId: string,
  ): Promise<{ walletLink: string }> {
    // Use a fixed issuer ID (or load it from configuration)
    const issuerId = "3388000000022850013";

    // Query the currently active hackathon.
    const hackathon = await Hackathon.query().findOne({ active: true });
    if (!hackathon) {
      throw new NotFoundException("No active hackathon found");
    }

    // Use the hackathon's name (with spaces replaced by dashes) as the class suffix.
    const classSuffix = hackathon.name.split(" ").join("-");
    // Create a unique object suffix using the userId and current timestamp.
    const objectSuffix = `${userId}-${Date.now()}`;

    // Build the pass data. Convert hackathon.startTime and hackathon.endTime (assumed numbers or Date strings)
    // into ISO strings. Also include a constant location (for example, Penn State University coordinates).
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

    // Create (or update) the pass class.
    await this.googleWalletService.createEventTicketClass(
      issuerId,
      classSuffix,
      passData,
    );

    // Create (or update) the pass object.
    await this.googleWalletService.createEventTicketObject(
      issuerId,
      classSuffix,
      objectSuffix,
      userId,
      passData,
    );

    // Generate a signed JWT URL for adding the pass to Google Wallet.
    const walletLink = this.googleWalletService.createJwtForNewPasses(
      issuerId,
      classSuffix,
      objectSuffix,
      passData,
      userId,
    );

    return { walletLink };
  }
}
