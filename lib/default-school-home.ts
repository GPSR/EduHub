export function getDefaultSchoolHomePath(roleKey: string) {
  return roleKey === "ADMIN" ? "/dashboard" : "/home";
}
