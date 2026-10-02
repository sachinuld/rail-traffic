// Server-side future modules. No inactive feature is presented as a live capability.
// Implement auth before persisting user favourites, PNRs or subscriptions.
const modules=new Map();
export function registerFeature(name,implementation){if(!/^[a-z][a-z-]*$/.test(name)||!implementation)throw Error('Invalid feature module');modules.set(name,implementation);}
export function feature(name){return modules.get(name)||null;}
// Suggested contracts:
// auth: { verifySession(request): Promise<{userId}> }
// favourites: { list(userId), save(userId, item), remove(userId, id) }
// notifications: { subscribe(userId, token), deliver(event) }
// pnr / availability / fares: { query(validatedInput) }
// train-alerts / platform-alerts: { evaluate(normalizedLiveData) }
