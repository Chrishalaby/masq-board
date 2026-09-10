import { bootstrapApplication } from '@angular/platform-browser';
import { app as teamsApp } from '@microsoft/teams-js';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const TEAMS_INIT_TIMEOUT_MS = 8000;

const initTimeout = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('Teams initialization timed out')), TEAMS_INIT_TIMEOUT_MS),
);

Promise.race([teamsApp.initialize(), initTimeout])
  .then(() => {
    console.log('Teams SDK initialized');
    teamsApp.notifySuccess();
  })
  .catch((error: unknown) => {
    console.log('Continuing without Teams host:', error instanceof Error ? error.message : error);
  })
  .finally(() => {
    bootstrapApplication(App, appConfig).catch((err) => console.error(err));
  });
