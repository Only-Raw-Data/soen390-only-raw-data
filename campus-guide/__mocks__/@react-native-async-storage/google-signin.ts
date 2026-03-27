export const statusCodes = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
};

export const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn(async () => true),
  signIn: jest.fn(),
  addScopes: jest.fn(async () => undefined),
  getTokens: jest.fn(),
  revokeAccess: jest.fn(async () => undefined),
  signOut: jest.fn(async () => undefined),
};

export const isSuccessResponse = (response: unknown) => {
  return (
    typeof response === "object" &&
    response !== null &&
    "type" in response &&
    (response as { type?: string }).type === "success"
  );
};

export const isErrorWithCode = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
};