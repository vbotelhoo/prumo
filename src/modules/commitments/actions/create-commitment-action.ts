"use server";

import { headers } from "next/headers";
import { createCommitmentCore } from "./create-commitment-core";

export async function createCommitmentAction(input: unknown) {
  const headersList = await headers();
  return createCommitmentCore(input, headersList);
}
