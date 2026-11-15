import { setupServer } from 'msw/node';
import { handlers } from './handlers/index.ts';
export const mockServer = setupServer(...handlers);
