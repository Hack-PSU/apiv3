import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import * as jwt from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { HackathonPassData } from "./google-wallet.types";

@Injectable()
export class GoogleWalletService {
  private readonly logger = new Logger(GoogleWalletService.name);
  private walletClient: any;
  private credentials: any;
  private keyFilePath: string;

  constructor(private readonly configService: ConfigService) {
    // GOOGLE_APPLICATION_CREDENTIALS should point to your service account key file.
    this.keyFilePath = this.configService.get<string>(
      "GOOGLE_APPLICATION_CREDENTIALS",
    );
    this.init();
  }

  private async init() {
    // Build the auth options.
    const authOptions: any = {
      scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
    };

    // If a service account key file is specified (e.g. for local testing),
    // include it in the options. Otherwise (on Cloud Run), omit the keyFile
    // so that Application Default Credentials are used.
    if (process.env.GOOGLE_CERT) {
      authOptions.keyFile = this.keyFilePath;
    }

    const auth = new google.auth.GoogleAuth(authOptions);

    // If using a key file, load credentials from it.
    // Otherwise, retrieve credentials via Application Default Credentials.
    if (process.env.GOOGLE_CERT) {
      this.credentials = require(this.keyFilePath);
    } else {
      this.credentials = await auth.getCredentials();
    }

    this.walletClient = google.walletobjects({
      version: "v1",
      auth,
    });
  }

  /**
   * Create (or update) an event ticket class.
   *
   * Minimal fields:
   * - Header from passData.eventName
   * - Logo from passData.logoUrl
   * - Venue hardcoded as "Penn State University"
   * - Date/time information from passData.startDateTime and passData.endDateTime
   * - A links module that shows a Google Maps link if location data is available.
   *
   * @param issuerId The issuer ID.
   * @param classSuffix A unique class suffix.
   * @param passData The pass details.
   * @returns The full class ID.
   */
  async createEventTicketClass(
    issuerId: string,
    classSuffix: string,
    passData: HackathonPassData,
  ): Promise<string> {
    const resourceId = `${issuerId}.${classSuffix}`;

    const newClass = {
      id: resourceId,
      issuerName: passData.issuerName,
      reviewStatus: "UNDER_REVIEW",
      eventName: {
        defaultValue: {
          language: "en-US",
          value: passData.eventName,
        },
      },
      logo: {
        sourceUri: {
          uri: passData.logoUrl || "https://example.com/default-logo.jpg",
        },
        contentDescription: {
          defaultValue: {
            language: "en-US",
            value: "Logo image description",
          },
        },
      },
      dateTime: {
        start: passData.startDateTime,
        end: passData.endDateTime,
      },
      ...(passData.location && {
        linksModuleData: {
          uris: [
            {
              uri: `https://www.google.com/maps/search/?api=1&query=${passData.location.latitude},${passData.location.longitude}`,
              description: "Venue Location",
              id: "VENUE_MAP",
            },
          ],
        },
      }),
    };

    try {
      // Check if the class exists.
      await this.walletClient.eventticketclass.get({ resourceId });
      this.logger.log(`Class ${resourceId} already exists. Updating it.`);
      await this.walletClient.eventticketclass.update({
        resourceId,
        requestBody: newClass,
      });
      return resourceId;
    } catch (err: any) {
      if (!(err.response && err.response.status === 404)) {
        this.logger.error("Error checking class existence", err);
        // Fall through to insert.
      }
    }

    const response = await this.walletClient.eventticketclass.insert({
      requestBody: newClass,
    });

    this.logger.log(
      `Created class: ${resourceId}`,
      JSON.stringify(response.data),
    );
    return resourceId;
  }

  /**
   * Create (or update) an event ticket object.
   *
   * Minimal fields:
   * - Barcode (formatted as "HACKPSU_" + userId)
   * - Valid time interval (using passData.startDateTime and passData.endDateTime)
   * - Optionally, include a links module with a Google Maps link (if location data is available)
   *
   * @param issuerId The issuer ID.
   * @param classSuffix The pass class suffix.
   * @param objectSuffix A unique object suffix.
   * @param userId The user ID.
   * @param passData The pass details.
   * @returns The full object ID.
   */
  async createEventTicketObject(
    issuerId: string,
    classSuffix: string,
    objectSuffix: string,
    userId: string,
    passData: HackathonPassData,
  ): Promise<string> {
    const resourceId = `${issuerId}.${objectSuffix}`;

    const newObject: any = {
      id: resourceId,
      classId: `${issuerId}.${classSuffix}`,
      state: "ACTIVE",
      barcode: {
        type: "QR_CODE",
        value: `HACKPSU_${userId}`,
        alternateText: "",
      },
      ...(passData.location && {
        linksModuleData: {
          uris: [
            {
              uri: `https://www.google.com/maps/search/?api=1&query=${passData.location.latitude},${passData.location.longitude}`,
              description: "Venue Location",
              id: "OBJECT_VENUE_MAP",
            },
          ],
        },
      }),
    };

    try {
      // Check if the object exists.
      await this.walletClient.eventticketobject.get({ resourceId });
      this.logger.log(`Object ${resourceId} already exists. Updating it.`);
      await this.walletClient.eventticketobject.update({
        resourceId,
        requestBody: newObject,
      });
      return resourceId;
    } catch (err: any) {
      if (!(err.response && err.response.status === 404)) {
        this.logger.error("Error checking object existence", err);
        // Fall through to insert.
      }
    }

    const response = await this.walletClient.eventticketobject.insert({
      requestBody: newObject,
    });

    this.logger.log(
      `Created object: ${resourceId}`,
      JSON.stringify(response.data),
    );
    return resourceId;
  }

  /**
   * Generate a signed JWT that creates (or re‑creates) a pass using the minimal definitions.
   *
   * @param issuerId The issuer ID.
   * @param classSuffix The pass class suffix.
   * @param objectSuffix The pass object suffix.
   * @param passData The pass details.
   * @param userId The user ID (for barcode generation).
   * @returns An "Add to Google Wallet" link.
   */
  createJwtForNewPasses(
    issuerId: string,
    classSuffix: string,
    objectSuffix: string,
    passData: HackathonPassData,
    userId: string,
  ): string {
    const newClass = {
      id: `${issuerId}.${classSuffix}`,
      issuerName: passData.issuerName,
      reviewStatus: "UNDER_REVIEW",
      eventName: {
        defaultValue: {
          language: "en-US",
          value: passData.eventName,
        },
      },
      logo: {
        sourceUri: {
          uri: passData.logoUrl || "",
        },
        contentDescription: {
          defaultValue: {
            language: "en-US",
            value: "Logo image description",
          },
        },
      },
      dateTime: {
        start: passData.startDateTime,
        end: passData.endDateTime,
      },
      ...(passData.location && {
        linksModuleData: {
          uris: [
            {
              uri: `https://www.google.com/maps/search/?api=1&query=${passData.location.latitude},${passData.location.longitude}`,
              description: "Venue Location",
              id: "VENUE_MAP",
            },
          ],
        },
      }),
    };

    const newObject = {
      id: `${issuerId}.${objectSuffix}`,
      classId: `${issuerId}.${classSuffix}`,
      state: "ACTIVE",
      barcode: {
        type: "QR_CODE",
        value: `HACKPSU_${userId}`,
        alternateText: "",
      },
      ...(passData.location && {
        linksModuleData: {
          uris: [
            {
              uri: `https://www.google.com/maps/search/?api=1&query=${passData.location.latitude},${passData.location.longitude}`,
              description: "Venue Location",
              id: "OBJECT_VENUE_MAP",
            },
          ],
        },
      }),
    };

    const claims = {
      iss: this.credentials.client_email,
      aud: "google",
      origins: ["https://hackpsu.org"], // Update with your valid domain(s)
      typ: "savetowallet",
      payload: {
        eventTicketClasses: [newClass],
        eventTicketObjects: [newObject],
      },
    };

    const token = jwt.sign(claims, this.credentials.private_key, {
      algorithm: "RS256",
    });
    const addToWalletUrl = `https://pay.google.com/gp/v/save/${token}`;
    this.logger.log(`Generated Add to Wallet link: ${addToWalletUrl}`);
    return addToWalletUrl;
  }
}
