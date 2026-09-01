import type { operations } from "./api-schema";

type JsonContent<T> = T extends { content: { "application/json": infer Body } } ? Body : never;
type Responses<K extends keyof operations> = operations[K] extends { responses: infer Value } ? Value : never;
type Request<K extends keyof operations> = operations[K] extends { requestBody: infer Value } ? JsonContent<Value> : never;

/** Couples a locally refined response shape to its generated OpenAPI operation. */
export type OperationResult<K extends keyof operations, Shape extends object = object> =
  JsonContent<Responses<K>[keyof Responses<K>]> & Shape;

/** Generated JSON request body for an OpenAPI operation. */
export type OperationBody<K extends keyof operations> = Request<K>;
