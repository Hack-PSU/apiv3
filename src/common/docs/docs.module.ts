import { INestApplication, Module } from "@nestjs/common";
import { OpenAPIObject } from "@nestjs/swagger";
import { resolve } from "url";
import * as handlebars from "handlebars";
import * as pathModule from "path";
import { Request, Response } from "express";
import * as fs from "fs";

export class DocsModule {
  public static async setup(
    path: string,
    app: INestApplication,
    document: OpenAPIObject,
  ) {
    const httpAdapter = app.getHttpAdapter();
    const prefixPath = path.startsWith("/") ? path : `/${path}`;
    const suffixPath = path.endsWith("/") ? path : `${path}/`;

    const docUrl = resolve(suffixPath, "openapi.json");

    const data = {
      data: {
        docUrl,
      },
    };

    const docFilePath = pathModule.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "templates",
      "docs.hbs",
    );
    const docFile = fs.readFileSync(docFilePath);
    const docStaging = handlebars.compile(docFile.toString());
    const docHTML = docStaging(data);

    httpAdapter.get(prefixPath, (req: Request, res: Response) => {
      res.send(docHTML);
    });

    httpAdapter.get(docUrl, (req: Request, res: Response) => {
      res.setHeader("Content-Type", "application/json");
      res.send(document);
    });
  }
}
