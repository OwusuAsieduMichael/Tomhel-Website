/** Kept in its own module so Edge middleware can import it without pulling in Node/database code. */
export const SESSION_COOKIE = "tomhel_prep_session";

/** Request header the middleware sets to the requested /prep path, so server code knows where the user is. */
export const PATH_HEADER = "x-prep-path";
