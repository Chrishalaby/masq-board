import { bootstrapApplication } from '@angular/platform-browser';
import { app as teamsApp } from '@microsoft/teams-js';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Initialize Teams SDK if running inside Teams, then bootstrap Angular
teamsApp
  .initialize()
  .then(() => {
    console.log('Teams SDK initialized');
    teamsApp.notifySuccess();
  })
  .catch(() => {
    // Not running in Teams — that's fine, continue normally
    console.log('Not running inside Teams');
  })
  .finally(() => {
    bootstrapApplication(App, appConfig).catch((err) => console.error(err));
  });
