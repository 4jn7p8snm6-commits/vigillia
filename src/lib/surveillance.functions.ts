import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

export const getSurveillance = createServerFn({ method: "GET" }).handler(async () => {
  const { readSurveillance } = await import("./detection-map.server");
  return readSurveillance();
});
export const surveillanceQuery = queryOptions({ queryKey: ["surveillance"], queryFn: () => getSurveillance(), staleTime: 15000, refetchInterval: 30000 });