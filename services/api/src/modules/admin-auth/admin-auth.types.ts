export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: 'ADMIN';
  typ: 'admin';
};

export type AdminPrincipal = {
  id: string;
  email: string;
  role: 'ADMIN';
};
