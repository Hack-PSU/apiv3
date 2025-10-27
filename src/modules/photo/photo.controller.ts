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
import { PaginatedPhotosResponse } from "./photo.types";

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
            derivatives: {
              type: "object",
              additionalProperties: { type: "string" },
              description:
                "Responsive image URLs (e.g., webp_480, webp_960, webp_1600)",
            },
          },
        },
      },
    },
  })
  async uploadPhoto(
    @UploadedPhoto() photo: Express.Multer.File,
    @Req() req: Request,
    @Body("fileType") fileType: string,
  ): Promise<{
    photoId: string;
    photoUrl: string;
    derivatives: Record<string, string>;
  }> {
    if (!photo) {
      throw new BadRequestException("Photo is required");
    }

    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    const type = fileType || "default";

    try {
      const { photoId, photoUrl, derivatives } =
        await this.photoService.uploadPhoto(userId, type, photo);
      return { photoId, photoUrl, derivatives };
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
              derivatives: {
                type: "object",
                additionalProperties: { type: "string" },
                description:
                  "Responsive image URLs (e.g., webp_480, webp_960, webp_1600)",
              },
            },
          },
        },
      },
    },
  })
  async getAllPhotos(): Promise<
    {
      name: string;
      url: string;
      createdAt: Date;
      derivatives: Record<string, string>;
    }[]
  > {
    try {
      return await this.photoService.getAllPhotos();
    } catch (error) {
      console.error("Error fetching photos:", error);
      throw new InternalServerErrorException("Failed to fetch photos");
    }
  }

  @Get("/paginated")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get paginated photos",
    query: [
      {
        name: "page",
        required: false,
        description: "Page number (default: 1)",
        schema: { type: "number", default: 1 },
      },
      {
        name: "limit",
        required: false,
        description: "Number of photos per page (default: 10)",
        schema: { type: "number", default: 10 },
      },
      {
        name: "status",
        required: false,
        description: "Filter by approval status (approved, pending, rejected)",
        schema: { type: "string" },
      },
    ],
    response: {
      ok: {
        description: "Paginated photos with metadata",
        schema: {
          type: "object",
          properties: {
            photos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  url: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  uploadedBy: { type: "string", nullable: true },
                  approvalStatus: { type: "string", nullable: true },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                currentPage: { type: "number" },
                totalPages: { type: "number" },
                totalItems: { type: "number" },
                hasNext: { type: "boolean" },
                hasPrevious: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  })
  async getPaginatedPhotos(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("status") status?: string,
  ): Promise<PaginatedPhotosResponse> {
    try {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;

      // Validate page and limit
      if (pageNum < 1) {
        throw new BadRequestException("Page must be greater than 0");
      }
      if (limitNum < 1 || limitNum > 100) {
        throw new BadRequestException("Limit must be between 1 and 100");
      }

      return await this.photoService.getPaginatedPhotos(pageNum, limitNum, status);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error("Error fetching paginated photos:", error);
      throw new InternalServerErrorException("Failed to fetch paginated photos");
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
