import { UploadedFile, ParseFilePipeBuilder } from "@nestjs/common";

export function UploadProjectCsv(): ParameterDecorator {
  return UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: "csv" })
      .build({ fileIsRequired: true }),
  );
}
