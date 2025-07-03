import { Router, Request, Response } from 'express';

const protectedRouter = Router();

protectedRouter.get('/', (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    message: 'Access granted to protected route',
    user: user.id
  })
})

export default protectedRouter;