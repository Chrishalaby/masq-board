export const environment = {
  production: true,
  apiUrl: 'https://masq-board-be-production.up.railway.app/api',
  msalConfig: {
    auth: {
      clientId: '7028812e-7502-40a0-9aac-4e860bf07bcf',
      authority: 'https://login.microsoftonline.com/1eda1ee1-2c51-412e-8654-4901e72243c7',
      redirectUri: 'https://masq-board.netlify.app',
    },
    scopes: [
      'api://7028812e-7502-40a0-9aac-4e860bf07bcf/access_as_user',
      'Calendars.Read',
      'OnlineMeetings.ReadWrite',
      'User.Read',
    ],
  },
  teamsAppId: '7028812e-7502-40a0-9aac-4e860bf07bcf',
};
