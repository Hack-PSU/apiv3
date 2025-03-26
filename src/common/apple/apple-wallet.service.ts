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

    this.certificates = {
      wwdr: fs.readFileSync(wwdrPath),
      signerCert: fs.readFileSync(signerCertPath),
      signerKey: fs.readFileSync(signerKeyPath),
      signerKeyPassphrase,
    };

    this.logger.log("Apple Wallet certificates loaded");
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
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
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: "rgb(134,157,203)",
      eventTicket: {
        primaryFields: [
          {
            key: "event",
            label: "Event",
            value: passData.eventName,
          },
        ],
        secondaryFields: [
          {
            key: "startTime",
            label: "Start Time",
            value: DateTime.fromJSDate(new Date(passData.startDateTime), {
              zone: "America/New_York",
            }).toLocaleString(DateTime.DATETIME_MED),
            semantics: {
              eventStartDate: DateTime.fromJSDate(
                new Date(passData.startDateTime),
                { zone: "America/New_York" },
              ).toISO(),
            },
          },
          {
            key: "endTime",
            label: "End Time",
            value: DateTime.fromJSDate(new Date(passData.endDateTime), {
              zone: "America/New_York",
            }).toLocaleString(DateTime.DATETIME_MED),
            semantics: {
              eventEndDate: DateTime.fromJSDate(
                new Date(passData.endDateTime),
                { zone: "America/New_York" },
              ).toISO(),
            },
          },
        ],
        auxiliaryFields: [
          {
            key: "location",
            label: "Location",
            value: "Business Building, University Park, PA",
            semantics: {
              location: {
                latitude: passData.location.latitude,
                longitude: passData.location.longitude,
              },
            },
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
      this.logger.error(
        "Error downloading icon, using fallback local icon",
        error,
      );
    }
    pass.addBuffer("icon.png", iconBuffer);

    let logoBuffer: Buffer;
    try {
      logoBuffer = await this.downloadImage(passData.logoUrl);
      this.logger.log("Downloaded logo from URL");
    } catch (error) {
      this.logger.error(
        "Error downloading logo, using fallback local logo",
        error,
      );
    }
    pass.addBuffer("logo.png", logoBuffer);

    // Generate and return the signed .pkpass buffer.
    const pkpassBuffer = pass.getAsBuffer();
    this.logger.log("Apple Wallet pass generated");
    return pkpassBuffer;
  }
}
