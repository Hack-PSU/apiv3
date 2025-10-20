import { ParseFilePipeBuilder, UploadedFile } from "@nestjs/common";

export function UploadedResume(): ParameterDecorator {
  return UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({
        fileType: /(pdf|doc|docx)$/i,
      })
      .addMaxSizeValidator({
        maxSize: 10 * 1024 * 1024, // 10MB
      })
      .build({ fileIsRequired: true }),
  );
}
