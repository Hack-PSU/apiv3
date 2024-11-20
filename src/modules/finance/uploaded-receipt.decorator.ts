import { ParseFilePipeBuilder, UploadedFile } from "@nestjs/common";

export function UploadedReceipt(): ParameterDecorator {
  return UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: "pdf" })
      .build({ fileIsRequired: false }),
  );
}
