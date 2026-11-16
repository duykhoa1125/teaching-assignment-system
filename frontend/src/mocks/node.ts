import { setupServer } from 'msw/node';
import { handlers } from './handlers/index.ts';
import { preparationHandlers } from './handlers/preparation.ts';
import { assignmentHandlers } from './handlers/assignment.ts';
import { governanceHandlers } from './handlers/governance.ts';
export const mockServer = setupServer(
    ...governanceHandlers,
    ...assignmentHandlers,
    ...preparationHandlers,
    ...handlers,
);
