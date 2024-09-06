import { createCheerioRouter, MissingRouteError } from 'crawlee';

export const router = createCheerioRouter();

router.addDefaultHandler(async () => {
    throw new MissingRouteError("Default route reached.");
});
