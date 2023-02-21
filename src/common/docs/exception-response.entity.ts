import { ApiProperty } from "@nestjs/swagger";

export class ExceptionResponse {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;
}

export class BadRequestExceptionResponse {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string[];

  @ApiProperty()
  error: string;
}
