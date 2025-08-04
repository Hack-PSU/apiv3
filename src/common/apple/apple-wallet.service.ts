import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Barcode, Location, PKPass } from "passkit-generator";
import * as fs from "fs";
import { HackathonPassData } from "../gcp/wallet/google-wallet.types";
import axios from "axios";
import { DateTime } from "luxon";

@Injectable()
export class AppleWalletService {
  private readonly logger = new Logger(AppleWalletService.name);
  private certificates: {
    wwdr: string | Buffer;
    signerCert: string | Buffer;
    signerKey: string | Buffer;
    signerKeyPassphrase?: string;
  };

  constructor(private readonly configService: ConfigService) {
    // Load certificates paths from .env or use defaults (hardcoded)
    const wwdrPath =
      this.configService.get<string>("APPLE_WWDR_CERT_PATH") ||
      "./certs/wwdr.cer";
    const signerCertPath =
      this.configService.get<string>("APPLE_SIGNER_CERT_PATH") ||
      "./certs/signerCert.pem";
    const signerKeyPath =
      this.configService.get<string>("APPLE_SIGNER_KEY_PATH") ||
      "./certs/signerKey.pem";
    const signerKeyPassphrase = this.configService.get<string>(
      "APPLE_SIGNER_KEY_PASSPHRASE",
    );

    try {
      // Validate that passphrase is provided if required
      if (!signerKeyPassphrase) {
        throw new Error(
          "APPLE_SIGNER_KEY_PASSPHRASE environment variable is required for encrypted private keys",
        );
      }

      this.certificates = {
        wwdr: fs.readFileSync(wwdrPath),
        signerCert: fs.readFileSync(signerCertPath),
        signerKey: fs.readFileSync(signerKeyPath),
        signerKeyPassphrase,
      };
      this.logger.log("Apple Wallet certificates loaded successfully");
    } catch (error) {
      this.logger.error(
        "Error loading Apple Wallet certificates. Please check the paths and passphrase.",
        error,
      );
      throw error; // Re-throw to prevent service from starting with invalid config
    }
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
  }

  private calculateEventDuration(
    startDateTime: string,
    endDateTime: string,
  ): string {
    const start = DateTime.fromISO(startDateTime);
    const end = DateTime.fromISO(endDateTime);
    const duration = end.diff(start, ["days", "hours"]);

    if (duration.days >= 1) {
      return `${Math.floor(duration.days)} day${duration.days > 1 ? "s" : ""}`;
    } else {
      return `${Math.floor(duration.hours)} hour${duration.hours > 1 ? "s" : ""}`;
    }
  }

  async generatePass(
    passData: HackathonPassData,
    userId: string,
  ): Promise<Buffer> {
    const passJson = {
      description: passData.eventName,
      formatVersion: 1,
      organizationName: passData.issuerName,
      passTypeIdentifier: "pass.hackpsu.wallet",
      serialNumber: `${Date.now()}-${userId}`,
      teamIdentifier: "HN6JG96A2Y",
      // HackPSU brand colors - clean white background with grey text and coral accents
      foregroundColor: "rgb(60,60,60)",
      backgroundColor: "rgb(255,255,255)",
      labelColor: "rgb(232,90,90)",
      logoText: "HackPSU",
      // Add visual enhancements
      sharingProhibited: false,
      maxDistance: 100,
      relevantDate: DateTime.fromJSDate(new Date(passData.startDateTime), {
        zone: "America/New_York",
      }).toISO(),
      eventTicket: {
        primaryFields: [
          {
            key: "event",
            label: "HACKATHON EVENT",
            value: passData.eventName,
            textAlignment: "PKTextAlignmentCenter",
          },
        ],
        secondaryFields: [
          {
            key: "startTime",
            label: "EVENT STARTS",
            value: DateTime.fromJSDate(new Date(passData.startDateTime), {
              zone: "America/New_York",
            }).toFormat("EEE, MMM d 'at' h:mm a"),
            textAlignment: "PKTextAlignmentLeft",
            semantics: {
              eventStartDate: DateTime.fromJSDate(
                new Date(passData.startDateTime),
                { zone: "America/New_York" },
              ).toISO(),
            },
          },
          {
            key: "duration",
            label: "DURATION",
            value: this.calculateEventDuration(
              passData.startDateTime,
              passData.endDateTime,
            ),
            textAlignment: "PKTextAlignmentRight",
          },
        ],
        auxiliaryFields: [
          {
            key: "location",
            label: "VENUE",
            value: "ECore Building\nUniversity Park, PA",
            textAlignment: "PKTextAlignmentLeft",
            semantics: {
              location: {
                latitude: passData.location.latitude,
                longitude: passData.location.longitude,
              },
            },
          },
          {
            key: "attendee",
            label: "ATTENDEE",
            value: passData.ticketHolderName || `User ${userId}`,
            textAlignment: "PKTextAlignmentRight",
          },
        ],
        backFields: [
          {
            key: "website",
            label: "Official Website",
            value: passData.homepageUri || "https://hackpsu.org",
            attributedValue: `<a href="${passData.homepageUri || "https://hackpsu.org"}">${passData.homepageUri || "https://hackpsu.org"}</a>`,
          },
          {
            key: "eventDetails",
            label: "Event Information",
            value: `Join us for ${passData.eventName}! This pass serves as your admission ticket. Please have it ready when you arrive.\n\nFor questions or support, visit hackpsu.org or contact our team.`,
          },
          {
            key: "schedule",
            label: "Event Schedule",
            value: `Check-in Opens: ${DateTime.fromJSDate(
              new Date(passData.startDateTime),
              {
                zone: "America/New_York",
              },
            ).toFormat("h:mm a")}\n\nHackathon Begins: ${DateTime.fromJSDate(
              new Date(passData.startDateTime),
              {
                zone: "America/New_York",
              },
            )
              .plus({ hours: 2 })
              .toFormat("h:mm a")}\n\nEvent Ends: ${DateTime.fromJSDate(
              new Date(passData.endDateTime),
              {
                zone: "America/New_York",
              },
            ).toFormat("h:mm a")}`,
          },
        ],
      },
    };

    const initialBuffers = {
      "pass.json": Buffer.from(JSON.stringify(passJson, null, 2)),
    };

    const pass = new PKPass(initialBuffers, this.certificates, {});

    const barcode: Barcode = {
      message: `HACKPSU_${userId}`,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
    };

    pass.setBarcodes(barcode);

    const location: Location = {
      latitude: passData.location.latitude,
      longitude: passData.location.longitude,
    };

    pass.setLocations(location);

    let iconBuffer: Buffer;
    try {
      iconBuffer = await this.downloadImage(passData.logoUrl);
      this.logger.log("Downloaded icon from URL");
    } catch (error) {
      this.logger.error("Failed to download icon", error);
      throw new Error("Failed to download required icon for pass generation");
    }
    pass.addBuffer("icon.png", iconBuffer);

    let logoBuffer: Buffer;
    try {
      logoBuffer = await this.downloadImage(passData.logoUrl);
      this.logger.log("Downloaded logo from URL");
    } catch (error) {
      this.logger.error("Failed to download logo", error);
      throw new Error("Failed to download required logo for pass generation");
    }
    pass.addBuffer("logo.png", logoBuffer);

    // Generate and return the signed .pkpass buffer.
    const pkpassBuffer = pass.getAsBuffer();
    this.logger.log("Apple Wallet pass generated");
    return pkpassBuffer;
  }
}
