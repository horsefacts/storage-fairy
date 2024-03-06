import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";

export const publicClient = createPublicClient({
  chain: optimism,
  transport: http(),
});
