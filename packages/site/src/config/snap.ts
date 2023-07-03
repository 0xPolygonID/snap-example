/**
 * The snap origin to use.
 * Will default to the local hosted snap if no value is provided in environment.
 */
export const defaultSnapOrigin =
  process.env.SNAP_ORIGIN ?? `local:http://localhost:8080`;
export const CIRCUITS_FETCH_PATH =
  process.env.CIRCUITS_FETCH_PATH ?? 'http://localhost:8000';
