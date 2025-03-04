// modules/apple-wallet/apple-wallet.service.ts
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Template, Pass } from "@walletpass/pass-js";
import { HackathonPassData } from "common/gcp/wallet/google-wallet.types";
import * as admZip from "adm-zip";

@Injectable()
export class AppleWalletService implements OnModuleInit {
  private readonly logger = new Logger(AppleWalletService.name);
  private template: Template;

  constructor(private readonly configService: ConfigService) {}

  // OnModuleInit is used to perform asynchronous initialization.
  async onModuleInit(): Promise<void> {
    await this.initTemplate();
  }

  /**
   * Initializes the Apple Wallet template.
   *
   * This creates a base Template (of style “eventTicket” in this example) with default fields,
   * sets up certificate and key data, and adds any common images.
   */
  private async initTemplate(): Promise<void> {
    // Load certificate and key from environment variables.
    // (These should be set in your .env file or via your deployment environment.)
    const passCert = this.configService.get<string>("APPLE_PASS_CERT");
    const passKey = this.configService.get<string>("APPLE_PASS_KEY");
    const keyPassword = this.configService.get<string>(
      "APPLE_PASS_KEY_PASSWORD",
    ); // optional
    const passTypeIdentifier = this.configService.get<string>(
      "APPLE_PASS_TYPE_IDENTIFIER",
    );
    const teamIdentifier = this.configService.get<string>(
      "APPLE_TEAM_IDENTIFIER",
    );

    if (!passCert || !passKey || !passTypeIdentifier || !teamIdentifier) {
      throw new Error("Missing required Apple Wallet configuration.");
    }

    // Create a new Template manually.
    // Here we choose the “eventTicket” style. Adjust the style (or default fields) as needed.
    this.template = new Template("eventTicket", {
      passTypeIdentifier,
      teamIdentifier,
      backgroundColor: "rgb(0, 0, 0)",
      foregroundColor: "rgb(255, 255, 255)",
      logoText: "HackPSU",
      description: "Hackathon Pass",
      organizationName: "HackPSU",
    });

    // Set the certificate and private key so that the passes are signed.
    this.template.setCertificate(passCert);
    this.template.setPrivateKey(passKey, keyPassword);

    try {
      const iconBuffer = await fetch(
        "https://storage.googleapis.com/hackpsu-408118.appspot.com/sponsor-logos/6-Test%20Sponsor-light.png",
      ).then((res) => res.bytes().then((buf) => Buffer.from(buf)));
      await this.template.images.add("icon", iconBuffer);
      const logoBuffer = await fetch(
        "https://storage.googleapis.com/hackpsu-408118.appspot.com/sponsor-logos/output-onlinepngtools.png",
      ).then((res) => res.bytes().then((buf) => Buffer.from(buf)));

      await this.template.images.add("logo", logoBuffer);
    } catch (err) {
      this.logger.error("Error loading Apple logo image", err);
    }

    this.logger.log("Apple Wallet template initialized");
  }

  /**
   * Creates an Apple Wallet pass from the template.
   *
   * @param userId The user ID to be used as the pass serial number.
   * @param passData The dynamic data for the pass (event name, issuer name, dates, etc).
   * @returns A Buffer containing the generated .pkpass file.
   */
  async createPass(
    userId: string,
    passData: HackathonPassData,
  ): Promise<Buffer> {
    // Create a new pass from the template.
    // You can set default/dynamic values in the object passed to createPass.
    const pass: Pass = this.template.createPass({
      serialNumber: userId,
      description: passData.eventName,
      organizationName: passData.issuerName,
      logoText: passData.eventName,
      // You can add more default fields here if needed.
      barcodes: [
        {
          message: `HACKPSU_${userId}`,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        },
      ],
    });

    // (Optional) Add additional fields to the pass.
    // For example, you could add header or primary fields:
    // pass.primaryFields.add({ key: 'event', label: 'Event', value: passData.eventName });

    // (Optional) Set a relevant date.
    // pass.relevantDate = new Date(passData.startDateTime);

    try {
      // Generate the final pass as a Buffer.
      const buffer = await pass.asBuffer();
      // compress the buffer as a zip file
      const zip = new admZip();
      zip.addFile("pass.pkpass", buffer);
      const zipBuffer = zip.toBuffer();
      return zipBuffer;
      return buffer;
    } catch (err) {
      this.logger.error("Error generating Apple Wallet pass", err);
      throw err;
    }
  }
}
