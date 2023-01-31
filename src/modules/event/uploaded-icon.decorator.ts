import { ParseFilePipeBuilder, UploadedFile } from "@nestjs/common";

export function UploadedIcon(): ParameterDecorator {
  return UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: "image" })
      .build({ fileIsRequired: false }),
  );
}
