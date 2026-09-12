import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { GoogleDriveService } from "common/gcp/drive";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp/auth";
import { ApiProperty, ApiTags } from "@nestjs/swagger";

const DRIVE_ROLES = [
  "owner",
  "organizer",
  "fileOrganizer",
  "writer",
  "commenter",
  "reader",
] as const;

const SHARE_ROLES = ["owner", "writer", "commenter", "reader"] as const;

class DrivePermissionEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ["user", "group", "domain", "anyone"] })
  type: "user" | "group" | "domain" | "anyone";

  @ApiProperty({ enum: DRIVE_ROLES })
  role: (typeof DRIVE_ROLES)[number];

  @ApiProperty({ required: false })
  emailAddress?: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  domain?: string;
}

class DriveFolderInfoEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty({ type: [String], required: false })
  parents?: string[];

  @ApiProperty({ type: [DrivePermissionEntity] })
  permissions: DrivePermissionEntity[];
}

class CreateFolderBody {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  parentId?: string;
}

class ShareFolderBody {
  @ApiProperty()
  emailAddress: string;

  @ApiProperty({ enum: SHARE_ROLES })
  role: (typeof SHARE_ROLES)[number];

  @ApiProperty({ required: false })
  sendNotificationEmail?: boolean;
}

class FolderShare {
  @ApiProperty()
  emailAddress: string;

  @ApiProperty({ enum: SHARE_ROLES })
  role: (typeof SHARE_ROLES)[number];
}

class ShareFolderMultipleBody {
  @ApiProperty({ type: [FolderShare] })
  shares: FolderShare[];
}

class CreateFolderStructureBody {
  @ApiProperty({ type: [String] })
  folderStructure: string[];

  @ApiProperty({ required: false })
  parentId?: string;
}

@ApiTags("Drive")
@Controller("drive")
export class DriveController {
  constructor(private readonly driveService: GoogleDriveService) {}

  @Get("folder/:folderId/permissions")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Get folder permissions",
    params: [
      { name: "folderId", type: String, description: "A valid Drive folder ID" },
    ],
    response: {
      ok: { type: [DrivePermissionEntity] },
    },
    auth: Role.TECH,
  })
  async getFolderPermissions(@Param("folderId") folderId: string) {
    return await this.driveService.listFolderPermissions(folderId);
  }

  @Get("folder/:folderId/info")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Get folder info with permissions",
    params: [
      { name: "folderId", type: String, description: "A valid Drive folder ID" },
    ],
    response: {
      ok: { type: DriveFolderInfoEntity },
    },
    auth: Role.TECH,
  })
  async getFolderInfo(@Param("folderId") folderId: string) {
    return await this.driveService.getFolderInfo(folderId);
  }

  @Get("folder/:folderId/subfolders")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "List all subfolders with permissions",
    params: [
      { name: "folderId", type: String, description: "A valid Drive folder ID" },
    ],
    response: {
      ok: { type: [DriveFolderInfoEntity] },
    },
    auth: Role.TECH,
  })
  async listSubfolders(@Param("folderId") folderId: string) {
    return await this.driveService.listSubfolders(folderId);
  }

  @Post("folder/create")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Create a new folder",
    request: {
      body: { type: CreateFolderBody },
    },
    response: {
      created: { type: String, description: "The new folder ID" },
    },
    auth: Role.TECH,
  })
  async createFolder(@Body() body: { name: string; parentId?: string }) {
    return await this.driveService.createFolder(body);
  }

  @Post("folder/:folderId/share")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Share a folder with a user",
    params: [
      { name: "folderId", type: String, description: "A valid Drive folder ID" },
    ],
    request: {
      body: { type: ShareFolderBody },
    },
    response: {
      created: { type: String, description: "The new permission ID" },
    },
    auth: Role.TECH,
  })
  async shareFolder(
    @Param("folderId") folderId: string,
    @Body()
    body: {
      emailAddress: string;
      role: "owner" | "writer" | "commenter" | "reader";
      sendNotificationEmail?: boolean;
    },
  ) {
    return await this.driveService.shareFolder({
      folderId,
      ...body,
    });
  }

  @Post("folder/create-structure")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Create nested folder structure",
    request: {
      body: { type: CreateFolderStructureBody },
    },
    response: {
      created: { type: String, description: "The deepest created folder ID" },
    },
    auth: Role.TECH,
  })
  async createFolderStructure(
    @Body() body: { folderStructure: string[]; parentId?: string },
  ) {
    return await this.driveService.createFolderStructure(
      body.folderStructure,
      body.parentId,
    );
  }

  @Post("folder/:folderId/share-multiple")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Share folder with multiple users",
    params: [
      { name: "folderId", type: String, description: "A valid Drive folder ID" },
    ],
    request: {
      body: { type: ShareFolderMultipleBody },
    },
    response: {
      created: { type: [String], description: "The new permission IDs" },
    },
    auth: Role.TECH,
  })
  async shareFolderWithMultiple(
    @Param("folderId") folderId: string,
    @Body()
    body: {
      shares: Array<{
        emailAddress: string;
        role: "owner" | "writer" | "commenter" | "reader";
      }>;
    },
  ) {
    return await this.driveService.shareFolderWithMultipleUsers(
      folderId,
      body.shares,
    );
  }
}
