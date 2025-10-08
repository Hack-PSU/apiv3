import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { GoogleDriveService } from "common/gcp/drive";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp/auth";

@Controller("drive")
export class DriveController {
  constructor(private readonly driveService: GoogleDriveService) {}

  @Get("folder/:folderId/permissions")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Get folder permissions",
    auth: Role.TECH,
  })
  async getFolderPermissions(@Param("folderId") folderId: string) {
    return await this.driveService.listFolderPermissions(folderId);
  }

  @Get("folder/:folderId/info")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Get folder info with permissions",
    auth: Role.TECH,
  })
  async getFolderInfo(@Param("folderId") folderId: string) {
    return await this.driveService.getFolderInfo(folderId);
  }

  @Get("folder/:folderId/subfolders")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "List all subfolders with permissions",
    auth: Role.TECH,
  })
  async listSubfolders(@Param("folderId") folderId: string) {
    return await this.driveService.listSubfolders(folderId);
  }

  @Post("folder/create")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Create a new folder",
    auth: Role.TECH,
  })
  async createFolder(@Body() body: { name: string; parentId?: string }) {
    return await this.driveService.createFolder(body);
  }

  @Post("folder/:folderId/share")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Share a folder with a user",
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
