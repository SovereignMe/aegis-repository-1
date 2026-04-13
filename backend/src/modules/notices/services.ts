import type { NoticeRepository } from "./repositories.js";

export class NoticeModuleService {
  constructor(private readonly repository: NoticeRepository) {}

  createNotice(...args: Parameters<NoticeRepository["createNotice"]>) { return this.repository.createNotice(...args); }
  serveNotice(...args: Parameters<NoticeRepository["serveNotice"]>) { return this.repository.serveNotice(...args); }
}
