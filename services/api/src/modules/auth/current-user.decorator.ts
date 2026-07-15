import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { ConsumerPrincipal } from './auth.types';

type RequestWithUser = {
  user?: ConsumerPrincipal;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ConsumerPrincipal => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user!;
  },
);
