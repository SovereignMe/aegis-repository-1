export interface LoginDto {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface RegisterDto {
  email: string;
  fullName: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface EnableMfaDto {
  code: string;
}

export interface VerifyMfaChallengeDto {
  challengeToken: string;
  code: string;
}
