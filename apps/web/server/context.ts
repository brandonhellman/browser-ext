import { type CreateNextContextOptions } from '@trpc/server/adapters/next';

export const createContext = async ({ req, res }: CreateNextContextOptions) => {
  return {
    req: req,
    res: res,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;