import { ParseFilePipeBuilder, UploadedFile } from "@nestjs/common";

export function UploadedResume(): ParameterDecorator {
  return UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: "pdf" })
      .build({ fileIsRequired: false }),
  );
}
