import makeFetchCookie from "fetch-cookie";

// Wrap Bun's/Node's native fetch. This singular instance acts exactly like requests.Session()
export const fetchClient = makeFetchCookie(globalThis.fetch);
