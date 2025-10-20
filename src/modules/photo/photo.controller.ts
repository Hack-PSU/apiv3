import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp";
import { FileInterceptor } from "@nestjs/platform-express";
import { PhotoService } from "./photo.service";
import { UploadedPhoto } from "./uploaded-photo.decorator";

@ApiTags("Photos")
@Controller("photos")
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post("/upload")
  @Roles(Role.NONE)
  @UseInterceptors(FileInterceptor("photo"))
  @ApiDoc({
    summary: "Upload a photo",
    request: {
      mimeTypes: ["multipart/form-data"],
    },
    response: {
      created: {
        description: "Photo uploaded successfully",
        schema: {
          type: "object",
          properties: {
            photoId: { type: "string" },
            photoUrl: { type: "string" },
          },
        },
      },
    },
  })
  async uploadPhoto(
    @UploadedPhoto() photo: Express.Multer.File,
    @Req() req: Request,
    @Body("fileType") fileType: string,
  ): Promise<{ photoId: string; photoUrl: string }> {
    if (!photo) {
      throw new BadRequestException("Photo is required");
    }

    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    const type = fileType || "default";

    try {
      const { photoId, photoUrl } = await this.photoService.uploadPhoto(
        userId,
        type,
        photo,
      );
      return { photoId, photoUrl };
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw new InternalServerErrorException("Failed to upload photo");
    }
  }

  @Get("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get all approved photos",
    response: {
      ok: {
        description: "List of all approved photos",
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  })
  async getAllPhotos(): Promise<
    { name: string; url: string; createdAt: Date }[]
  > {
    try {
      return await this.photoService.getAllPhotos();
    } catch (error) {
      console.error("Error fetching photos:", error);
      throw new InternalServerErrorException("Failed to fetch photos");
    }
  }

  @Get("/pending")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get all photos with approval status (admin only)",
    response: {
      ok: {
        description: "List of all photos with approval status",
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              uploadedBy: { type: "string" },
              approvalStatus: { type: "string" },
            },
          },
        },
      },
    },
  })
  async getAllPendingPhotos(): Promise<
    {
      name: string;
      url: string;
      createdAt: Date;
      uploadedBy: string;
      approvalStatus: string;
    }[]
  > {
    try {
      return await this.photoService.getAllPendingPhotos();
    } catch (error) {
      console.error("Error fetching pending photos:", error);
      throw new InternalServerErrorException("Failed to fetch pending photos");
    }
  }

  @Patch("/:filename/approve")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Approve a photo (admin only)",
    response: {
      ok: {
        description: "Photo approved successfully",
      },
    },
  })
  async approvePhoto(
    @Param("filename") filename: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const adminId = String(req.user.sub);

    try {
      await this.photoService.updatePhotoApprovalStatus(
        filename,
        "approved",
        adminId,
      );
      return { message: "Photo approved successfully" };
    } catch (error) {
      console.error("Error approving photo:", error);
      throw new InternalServerErrorException("Failed to approve photo");
    }
  }

  @Patch("/:filename/reject")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Reject a photo (admin only)",
    response: {
      ok: {
        description: "Photo rejected successfully",
      },
    },
  })
  async rejectPhoto(
    @Param("filename") filename: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const adminId = String(req.user.sub);

    try {
      await this.photoService.updatePhotoApprovalStatus(
        filename,
        "rejected",
        adminId,
      );
      return { message: "Photo rejected successfully" };
    } catch (error) {
      console.error("Error rejecting photo:", error);
      throw new InternalServerErrorException("Failed to reject photo");
    }
  }

  @Delete(":photoId")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Delete a photo",
    params: [{ name: "photoId" }],
    query: [
      {
        name: "originalName",
        description: "Original filename including the extension",
      },
    ],
    response: { noContent: true },
  })
  async deletePhoto(
    @Param("photoId") photoId: string,
    @Query("originalName") originalName: string,
  ): Promise<void> {
    if (!photoId) {
      throw new BadRequestException("photoId is required");
    }

    if (!originalName) {
      throw new BadRequestException("originalName is required");
    }

    try {
      await this.photoService.deletePhoto(photoId, originalName);
    } catch (error) {
      console.error("Error deleting photo:", error);
      throw new InternalServerErrorException("Failed to delete photo");
    }
  }
}
