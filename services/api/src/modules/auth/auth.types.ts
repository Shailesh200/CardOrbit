export type ConsumerJwtPayload = {
  sub: string;
  email: string;
  role: 'USER';
  typ: 'consumer';
};

export type ConsumerPrincipal = {
  id: string;
  email: string;
  role: 'USER';
};

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};
