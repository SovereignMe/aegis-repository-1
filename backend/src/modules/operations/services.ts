import type { ContactRepository, IntegrationRepository, TaskRepository, TimerRepository } from "./repositories.js";

export class IntegrationModuleService {
  constructor(private readonly repository: IntegrationRepository) {}
  listAvailable(...args: Parameters<IntegrationRepository["listAvailable"]>) { return this.repository.listAvailable(...args); }
  markSync(...args: Parameters<IntegrationRepository["markSync"]>) { return this.repository.markSync(...args); }
}

export class TaskModuleService {
  constructor(private readonly repository: TaskRepository) {}
  listRules(...args: Parameters<TaskRepository["listRules"]>) { return this.repository.listRules(...args); }
  listTasks(...args: Parameters<TaskRepository["listTasks"]>) { return this.repository.listTasks(...args); }
  createTaskFromDocument(...args: Parameters<TaskRepository["createTaskFromDocument"]>) { return this.repository.createTaskFromDocument(...args); }
  createTask(...args: Parameters<TaskRepository["createTask"]>) { return this.repository.createTask(...args); }
  completeTask(...args: Parameters<TaskRepository["completeTask"]>) { return this.repository.completeTask(...args); }
}

export class ContactModuleService {
  constructor(private readonly repository: ContactRepository) {}
  listContacts(...args: Parameters<ContactRepository["listContacts"]>) { return this.repository.listContacts(...args); }
  saveContact(...args: Parameters<ContactRepository["saveContact"]>) { return this.repository.saveContact(...args); }
}

export class TimerModuleService {
  constructor(private readonly repository: TimerRepository) {}
  listTimers(...args: Parameters<TimerRepository["listTimers"]>) { return this.repository.listTimers(...args); }
  startTimer(...args: Parameters<TimerRepository["startTimer"]>) { return this.repository.startTimer(...args); }
  stopTimer(...args: Parameters<TimerRepository["stopTimer"]>) { return this.repository.stopTimer(...args); }
}
