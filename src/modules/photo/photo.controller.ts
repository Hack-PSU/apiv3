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
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp";
import { FileInterceptor } from "@nestjs/platform-express";
import { PhotoService } from "./photo.service";
import { UploadedPhoto } from "./uploaded-photo.decorator";
import {
  PaginatedPhotosResponse,
  PhotoItem,
  UploadPhotoBody,
  UploadPhotoResponse,
} from "./photo.types";

class MessageResponse {
  @ApiProperty()
  message: string;
}

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
      body: { type: UploadPhotoBody },
    },
    response: {
      created: {
        type: UploadPhotoResponse,
        description: "The stored photo and its derivatives",
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
        type: [PhotoItem],
        description: "All approved photos",
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
        type: PaginatedPhotosResponse,
        description: "A page of photos",
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

      return await this.photoService.getPaginatedPhotos(
        pageNum,
        limitNum,
        status,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error("Error fetching paginated photos:", error);
      throw new InternalServerErrorException(
        "Failed to fetch paginated photos",
      );
    }
  }

  @Get("/pending")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get all photos with approval status (admin only)",
    response: {
      ok: {
        type: [PhotoItem],
        description: "All photos, including pending ones",
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
      derivatives: Record<string, string>;
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
    params: [
      { name: "filename", type: String, description: "The stored photo filename" },
    ],
    response: {
      ok: { type: MessageResponse, description: "Photo approved successfully" },
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
    params: [
      { name: "filename", type: String, description: "The stored photo filename" },
    ],
    response: {
      ok: { type: MessageResponse, description: "Photo rejected successfully" },
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
