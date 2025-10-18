import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
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
    summary: "Get all photos",
    response: {
      ok: {
        description: "List of all photos",
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

  @Delete(":photoId")
  @Roles(Role.NONE)
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
