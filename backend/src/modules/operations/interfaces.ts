import { ContactModuleService, IntegrationModuleService, TaskModuleService, TimerModuleService } from "./services.js";
import { contactRepository, integrationRepository, taskRepository, timerRepository } from "./repositories.js";

const integrationModuleService = new IntegrationModuleService(integrationRepository);
const taskModuleService = new TaskModuleService(taskRepository);
const contactModuleService = new ContactModuleService(contactRepository);
const timerModuleService = new TimerModuleService(timerRepository);

export interface IntegrationPort {
  listAvailable: IntegrationModuleService["listAvailable"];
  markSync: IntegrationModuleService["markSync"];
}

export interface TaskPort {
  listRules: TaskModuleService["listRules"];
  listTasks: TaskModuleService["listTasks"];
  createTaskFromDocument: TaskModuleService["createTaskFromDocument"];
  createTask: TaskModuleService["createTask"];
  completeTask: TaskModuleService["completeTask"];
}

export interface ContactPort {
  listContacts: ContactModuleService["listContacts"];
  saveContact: ContactModuleService["saveContact"];
}

export interface TimerPort {
  listTimers: TimerModuleService["listTimers"];
  startTimer: TimerModuleService["startTimer"];
  stopTimer: TimerModuleService["stopTimer"];
}

export const operationModuleServices: {
  integrations: IntegrationPort;
  tasks: TaskPort;
  contacts: ContactPort;
  timers: TimerPort;
} = {
  integrations: integrationModuleService,
  tasks: taskModuleService,
  contacts: contactModuleService,
  timers: timerModuleService,
};
