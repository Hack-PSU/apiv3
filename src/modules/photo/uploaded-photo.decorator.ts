import { ParseFilePipeBuilder, UploadedFile } from "@nestjs/common";

export function UploadedPhoto(): ParameterDecorator {
  return UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({
        fileType:
          /(jpg|jpeg|png|gif|webp|heic|heif|tiff|bmp|svg|mp4|mov|avi|wmv|flv|mkv|webm|m4v|mpg|mpeg|3gp)$/i,
      })
      .addMaxSizeValidator({
        maxSize: 100 * 1024 * 1024, // 100MB for videos
      })
      .build({ fileIsRequired: true }),
  );
}
