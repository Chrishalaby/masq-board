export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  msalConfig: {
    auth: {
      clientId: '7028812e-7502-40a0-9aac-4e860bf07bcf',
      authority: 'https://login.microsoftonline.com/1eda1ee1-2c51-412e-8654-4901e72243c7',
      redirectUri: 'http://localhost:4200',
    },
    apiScopes: ['api://masq-board.netlify.app/7028812e-7502-40a0-9aac-4e860bf07bcf/access_as_user'],
    graphScopes: ['Calendars.Read', 'OnlineMeetings.ReadWrite', 'User.Read'],
  },
  teamsAppId: '7028812e-7502-40a0-9aac-4e860bf07bcf',
};
