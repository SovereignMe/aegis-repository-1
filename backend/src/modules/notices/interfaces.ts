import { NoticeModuleService } from "./services.js";
import { noticeRepository } from "./repositories.js";

const noticeModuleService = new NoticeModuleService(noticeRepository);

export interface NoticeServicePort {
  createNotice: NoticeModuleService["createNotice"];
  serveNotice: NoticeModuleService["serveNotice"];
}

export const noticeModuleServices: { notices: NoticeServicePort } = {
  notices: noticeModuleService,
};
