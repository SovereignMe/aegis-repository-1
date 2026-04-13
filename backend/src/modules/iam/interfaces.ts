import { IamModuleService } from "./services.js";
import { iamRepository } from "./repositories.js";

const iamModuleService = new IamModuleService(iamRepository);

export interface IamServicePort {
  listUsers: IamModuleService["listUsers"];
  createUser: IamModuleService["createUser"];
  getRole: IamModuleService["getRole"];
  getPermissions: IamModuleService["getPermissions"];
  setPermissions: IamModuleService["setPermissions"];
}

export const iamModuleServices: { iam: IamServicePort } = {
  iam: iamModuleService,
};
