import { contractClient, contractData } from "@/lib/contractClient";
import type { OperationResult } from "@/generated/contract-types";

export async function getDevelopmentHealth() {
  return contractData<OperationResult<"getHealth">>(await contractClient.GET("/health"));
}
