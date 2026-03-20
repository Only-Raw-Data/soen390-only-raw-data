export const CALENDAR_OAUTH_SCOPES = {
  google: [
	"https://www.googleapis.com/auth/calendar.readonly",
	"openid",
	"email",
	"profile",
  ],
} as const;

export const GOOGLE_CALENDAR_SCOPES = [...CALENDAR_OAUTH_SCOPES.google];

