import { setupServer } from 'msw/node';
import { handlers } from './handlers/index.ts';
import { preparationHandlers } from './handlers/preparation.ts';
export const mockServer = setupServer(...preparationHandlers, ...handlers);
