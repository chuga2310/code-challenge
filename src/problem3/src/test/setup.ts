import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Explicit, because test globals are off (so they can't leak into app types).
afterEach(cleanup);
