import { Injectable, PipeTransform } from "@nestjs/common";
import * as sanitizeHtml from "sanitize-html";

@Injectable()
export class SanitizeFieldsPipe implements PipeTransform {
  constructor(private readonly fields: string[]) {}

  transform(value: Record<string, any>): any {
    if (value) {
      this.fields.forEach((field) => {
        if (Object.keys(value).includes(field)) {
          value[field] = sanitizeHtml(value[field]);
        }
      });
    }

    return value;
  }
}
