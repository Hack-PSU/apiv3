import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Passbook from 'passbook';
import { HackathonPassData } from 'common/gcp/wallet/google-wallet.types';

@Injectable()
export class AppleWalletService {
  private passCertificate: Buffer;
  private appleWWDRCA: Buffer;

  constructor() {
    this.passCertificate = fs.readFileSync(
      path.resolve(__dirname, 'pass.pem')
    );
    this.appleWWDRCA = fs.readFileSync(
      path.resolve(__dirname, 'applewwdrcag6.pem')
    );
  }

  async createPass(userId: string, passData: HackathonPassData): Promise<Buffer> {
    const passDetails = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'pass.json'), 'utf8')
    );

    passDetails.serialNumber = userId;
    passDetails.barcode.message = `HACKPSU_${userId}`;
    passDetails.organizationName = passData.issuerName;
    passDetails.description = passData.eventName;
    passDetails.logoText = passData.eventName;

    const pass = new Passbook({
      model: passDetails,
      certificates: {
        wwdr: this.appleWWDRCA,
        signerCert: this.passCertificate,
        signerKey: {
          keyFile: path.resolve(__dirname, 'pass.pem')
        }
      }
    });

    pass.setBarcode({
      message: `HACKPSU_${userId}`,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1'
    });

    pass.setImages('logo', path.resolve(__dirname, 'https://storage.googleapis.com/hackpsu-408118.appspot.com/sponsor-logos/6-Test%20Sponsor-light.png'));

    return new Promise((resolve, reject) => {
      pass.generate((error, buffer) => {
        if (error) {
          return reject(error);
        }
        resolve(buffer);
      });
    });
  }
}