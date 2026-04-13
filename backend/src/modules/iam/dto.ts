export interface CreateUserDto {
  email: string;
  fullName: string;
  role: "VIEWER" | "EDITOR" | "ADMIN";
  password: string;
}

export interface UpdatePermissionsDto {
  permissions: Record<string, boolean>;
}
