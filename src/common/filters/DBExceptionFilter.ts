import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { DBError, UniqueViolationError } from "db-errors";

@Catch()
export class DBExceptionFilter implements ExceptionFilter {
  catch(exception: DBError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    if (exception instanceof UniqueViolationError) {
      // if used during staging, show more details on error
      if (
        req.user &&
        "aud" in req.user &&
        req.user.aud === "hackpsu18-staging"
      ) {
        res.status(HttpStatus.CONFLICT).send({
          statusCode: HttpStatus.CONFLICT,
          message: exception.message,
          data: {
            columns: exception.columns,
            constraint: exception.constraint,
          },
        });
      } else {
        res.status(HttpStatus.CONFLICT).send({
          statusCode: HttpStatus.CONFLICT,
          message: "Duplicate entry",
        });
      }
    }
  }
}
