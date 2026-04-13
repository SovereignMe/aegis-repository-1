import { sharedSchemas } from "../../services/validation.js";

export const noticeValidators = {
  noticeBody: sharedSchemas.noticeBody,
  serveNoticeBody: sharedSchemas.serveNoticeBody,
  idParam: sharedSchemas.idParam,
};
