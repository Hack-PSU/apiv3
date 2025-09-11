import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp";
import { FileInterceptor } from "@nestjs/platform-express";
import { nanoid } from "nanoid";
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
  ): Promise<{ photoId: string; photoUrl: string }> {
    if (!photo) {
      throw new BadRequestException("Photo is required");
    }

    const photoId = nanoid(32);

    try {
      const photoUrl = await this.photoService.uploadPhoto(photoId, photo);
      return {
        photoId,
        photoUrl,
      };
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
}
