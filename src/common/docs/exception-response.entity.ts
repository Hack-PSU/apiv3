import { ApiProperty } from "@nestjs/swagger";

export class ExceptionResponse {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;
}

export class BadRequestExceptionResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty()
  message: string[];

  @ApiProperty()
  error: string;
}

export class DBExceptionProductionResponse {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty()
  message: string;
}

class DBExceptionStagingData {
  @ApiProperty({ required: false })
  columns: string[];

  @ApiProperty()
  constraint: string;
}

export class DBExceptionStagingResponse extends DBExceptionProductionResponse {
  @ApiProperty({ example: 409 })
  declare statusCode: number;

  @ApiProperty()
  declare message: string;

  @ApiProperty({ type: DBExceptionStagingData })
  data: DBExceptionStagingData;
}
