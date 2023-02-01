import { ParseFilePipeBuilder, UploadedFile } from "@nestjs/common";

export function UploadedLogo(): ParameterDecorator {
  return UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: "image" })
      .build({ fileIsRequired: false }),
  );
}
