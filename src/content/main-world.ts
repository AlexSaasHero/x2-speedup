// Page-world (MAIN) entry, injected only on lecture-platform domains at document_start.
// See src/shared/rate-guard.ts. Keep it tiny: it runs before the player's own scripts.
import { installRateGuard } from '../shared/rate-guard';

installRateGuard(HTMLMediaElement.prototype);
