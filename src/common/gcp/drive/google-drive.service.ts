import { Injectable, Logger } from "@nestjs/common";
import { google, drive_v3 } from "googleapis";
import { ConfigService } from "@nestjs/config";
import {
  DrivePermission,
  DriveFolderInfo,
  CreateFolderOptions,
  ShareFolderOptions,
} from "./google-drive.types";

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private driveClient: drive_v3.Drive;
  private credentials: any;
  private keyFilePath: string;

  constructor(private readonly configService: ConfigService) {
    this.keyFilePath = this.configService.get<string>("GOOGLE_CERT");
    this.init();
  }

  /**
   * Initialize the Google Drive API client.
   *
   * For local testing, if process.env.GOOGLE_CERT is defined, we load the key file.
   * On Cloud Run (when GOOGLE_CERT is not set), we use Application Default Credentials.
   */
  private async init() {
    const authOptions: any = {
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
      ],
    };

    // When testing locally, we expect a service account key file.
    if (process.env.GOOGLE_CERT) {
      authOptions.keyFile = this.keyFilePath;
    }

    const auth = new google.auth.GoogleAuth(authOptions);

    if (process.env.GOOGLE_CERT) {
      // Load credentials from key file.
      this.credentials = require(this.keyFilePath);
    } else {
      // Use Application Default Credentials.
      this.credentials = await auth.getCredentials();
      // On Cloud Run these credentials may not include a private key,
      // so fall back to environment variables.
      if (!this.credentials.private_key) {
        this.credentials.private_key = process.env.GOOGLE_PRIVATE_KEY;
        this.credentials.client_email = process.env.GOOGLE_CLIENT_EMAIL;
      }
    }

    this.driveClient = google.drive({
      version: "v3",
      auth,
    });

    this.logger.log("Google Drive client initialized");
  }

  /**
   * List all permissions for a given folder.
   *
   * @param folderId The Google Drive folder ID.
   * @returns A list of permissions.
   */
  async listFolderPermissions(folderId: string): Promise<DrivePermission[]> {
    try {
      this.logger.log(`Fetching permissions for folder: ${folderId}`);

      const response = await this.driveClient.permissions.list({
        fileId: folderId,
        fields:
          "permissions(id, type, role, emailAddress, displayName, domain, deleted)",
        supportsAllDrives: true,
      });

      const permissions = (response.data.permissions || []).map((perm) => ({
        id: perm.id!,
        type: perm.type as DrivePermission["type"],
        role: perm.role as DrivePermission["role"],
        emailAddress: perm.emailAddress,
        displayName: perm.displayName,
        domain: perm.domain,
        deleted: perm.deleted,
      }));

      this.logger.log(
        `Found ${permissions.length} permissions for folder ${folderId}`,
      );
      return permissions;
    } catch (error) {
      this.logger.error(
        `Error fetching permissions for folder ${folderId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get detailed folder information including permissions.
   *
   * @param folderId The Google Drive folder ID.
   * @returns Folder information with permissions.
   */
  async getFolderInfo(folderId: string): Promise<DriveFolderInfo> {
    try {
      this.logger.log(`Fetching folder info for: ${folderId}`);

      const [fileResponse, permissions] = await Promise.all([
        this.driveClient.files.get({
          fileId: folderId,
          fields: "id, name, mimeType, parents",
          supportsAllDrives: true,
        }),
        this.listFolderPermissions(folderId),
      ]);

      const folderInfo: DriveFolderInfo = {
        id: fileResponse.data.id!,
        name: fileResponse.data.name!,
        mimeType: fileResponse.data.mimeType!,
        parents: fileResponse.data.parents,
        permissions,
      };

      this.logger.log(`Folder info retrieved: ${folderInfo.name}`);
      return folderInfo;
    } catch (error) {
      this.logger.error(`Error fetching folder info for ${folderId}`, error);
      throw error;
    }
  }

  /**
   * Create a new folder in Google Drive.
   *
   * @param options Folder creation options.
   * @returns The created folder ID.
   */
  async createFolder(options: CreateFolderOptions): Promise<string> {
    try {
      this.logger.log(`Creating folder: ${options.name}`);

      const fileMetadata: drive_v3.Schema$File = {
        name: options.name,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (options.parentId) {
        fileMetadata.parents = [options.parentId];
      }

      const response = await this.driveClient.files.create({
        requestBody: fileMetadata,
        fields: "id, name",
        supportsAllDrives: true,
      });

      const folderId = response.data.id!;
      this.logger.log(`Created folder: ${response.data.name} (${folderId})`);
      return folderId;
    } catch (error) {
      this.logger.error(`Error creating folder: ${options.name}`, error);
      throw error;
    }
  }

  /**
   * Share a folder with a user.
   *
   * @param options Share options.
   * @returns The permission ID.
   */
  async shareFolder(options: ShareFolderOptions): Promise<string> {
    try {
      this.logger.log(
        `Sharing folder ${options.folderId} with ${options.emailAddress} as ${options.role}`,
      );

      const response = await this.driveClient.permissions.create({
        fileId: options.folderId,
        requestBody: {
          type: "user",
          role: options.role,
          emailAddress: options.emailAddress,
        },
        fields: "id",
        sendNotificationEmail: options.sendNotificationEmail ?? false,
        supportsAllDrives: true,
      });

      const permissionId = response.data.id!;
      this.logger.log(
        `Folder shared successfully. Permission ID: ${permissionId}`,
      );
      return permissionId;
    } catch (error) {
      this.logger.error(
        `Error sharing folder ${options.folderId} with ${options.emailAddress}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a folder structure recursively.
   *
   * @param folderStructure Array of folder names representing the hierarchy.
   * @param parentId Optional parent folder ID to create the structure under.
   * @returns The ID of the deepest created folder.
   */
  async createFolderStructure(
    folderStructure: string[],
    parentId?: string,
  ): Promise<string> {
    let currentParentId = parentId;

    for (const folderName of folderStructure) {
      currentParentId = await this.createFolder({
        name: folderName,
        parentId: currentParentId,
      });
    }

    return currentParentId!;
  }

  /**
   * Share a folder with multiple users.
   *
   * @param folderId The folder ID to share.
   * @param shares Array of email addresses and their roles.
   * @returns Array of permission IDs.
   */
  async shareFolderWithMultipleUsers(
    folderId: string,
    shares: Array<{ emailAddress: string; role: ShareFolderOptions["role"] }>,
  ): Promise<string[]> {
    const permissionIds: string[] = [];

    for (const share of shares) {
      const permissionId = await this.shareFolder({
        folderId,
        emailAddress: share.emailAddress,
        role: share.role,
      });
      permissionIds.push(permissionId);
    }

    return permissionIds;
  }

  /**
   * Setup folder structure for a new hackathon.
   * Creates main hackathon folder and team subfolders, shares with exec team.
   *
   * @param hackathonName The name of the hackathon.
   * @param rootFolderId The root folder ID to create the hackathon folder under.
   * @param execEmails Array of exec team member email addresses.
   * @returns The ID of the created hackathon folder.
   */
  async setupHackathonFolderStructure(
    hackathonName: string,
    rootFolderId: string,
    execEmails: string[],
  ): Promise<string> {
    this.logger.log(
      `Setting up folder structure for hackathon: ${hackathonName}`,
    );

    // Create main hackathon folder
    const hackathonFolderId = await this.createFolder({
      name: `HackPSU ${hackathonName}`,
      parentId: rootFolderId,
    });

    // Team subfolders to create
    const teamFolders = [
      "Finance",
      "Entertainment",
      "Design",
      "Communication",
      "Technology",
      "Exec",
      "Marketing",
      "Logistics",
      "Education",
      "Sponsorship",
    ];

    // Create all team subfolders
    const subfolderPromises = teamFolders.map((teamName) =>
      this.createFolder({
        name: teamName,
        parentId: hackathonFolderId,
      }),
    );

    await Promise.all(subfolderPromises);

    // Share the entire hackathon folder with all exec team members
    if (execEmails.length > 0) {
      const sharePromises = execEmails.map((email) =>
        this.shareFolder({
          folderId: hackathonFolderId,
          emailAddress: email,
          role: "writer",
          sendNotificationEmail: false,
        }),
      );

      await Promise.all(sharePromises);
      this.logger.log(
        `Shared hackathon folder with ${execEmails.length} exec team members`,
      );
    }

    this.logger.log(
      `Hackathon folder structure created successfully: ${hackathonFolderId}`,
    );
    return hackathonFolderId;
  }

  /**
   * List all subfolders within a folder.
   *
   * @param folderId The parent folder ID.
   * @returns Array of subfolder information.
   */
  async listSubfolders(folderId: string): Promise<DriveFolderInfo[]> {
    try {
      this.logger.log(`Listing subfolders in: ${folderId}`);

      const response = await this.driveClient.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name, mimeType, parents)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const subfolders: DriveFolderInfo[] = [];

      for (const file of response.data.files || []) {
        const permissions = await this.listFolderPermissions(file.id!);
        subfolders.push({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType!,
          parents: file.parents,
          permissions,
        });
      }

      this.logger.log(`Found ${subfolders.length} subfolders`);
      return subfolders;
    } catch (error) {
      this.logger.error(`Error listing subfolders for ${folderId}`, error);
      throw error;
    }
  }
}
