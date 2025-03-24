import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Barcode, PKPass } from "passkit-generator";
import * as fs from "fs";
import { HackathonPassData } from "../gcp/wallet/google-wallet.types";
import axios from "axios";

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
      serialNumber: `${Date.now()}`,
      teamIdentifier: "HN6JG96A2Y",
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
            value: new Date(passData.startDateTime).toLocaleString(),
          },
          {
            key: "endTime",
            label: "End Time",
            value: new Date(passData.endDateTime).toLocaleString(),
          },
        ],
        auxiliaryFields: [],
      },
    };

    // Create the initial buffers with the pass.json file.
    const initialBuffers = {
      "pass.json": Buffer.from(JSON.stringify(passJson, null, 2)),
    };

    // Create a new PKPass instance.
    const pass = new PKPass(initialBuffers, this.certificates, {});

    const barcode: Barcode = {
      message: `HACKPSU_${userId}`,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
    };

    pass.setBarcodes(barcode);

    let iconBuffer: Buffer;
    if (passData.logoUrl) {
      try {
        iconBuffer = await this.downloadImage(passData.logoUrl);
        this.logger.log("Downloaded icon from URL");
      } catch (error) {
        this.logger.error(
          "Error downloading icon, using fallback local icon",
          error,
        );
        iconBuffer = fs.readFileSync("./assets/icon.png");
      }
    } else {
      iconBuffer = fs.readFileSync("./assets/icon.png");
    }
    pass.addBuffer("icon.png", iconBuffer);

    if (passData.logoUrl) {
      let logoBuffer: Buffer;
      try {
        logoBuffer = await this.downloadImage(passData.logoUrl);
        this.logger.log("Downloaded logo from URL");
      } catch (error) {
        this.logger.error(
          "Error downloading logo, using fallback local logo",
          error,
        );
        logoBuffer = fs.readFileSync("./assets/logo.png");
      }
      pass.addBuffer("logo.png", logoBuffer);
    }

    // Generate and return the signed .pkpass buffer.
    const pkpassBuffer = pass.getAsBuffer();
    this.logger.log("Apple Wallet pass generated");
    return pkpassBuffer;
  }
}
