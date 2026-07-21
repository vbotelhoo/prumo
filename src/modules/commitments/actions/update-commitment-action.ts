"use server";

import { headers } from "next/headers";
import { updateCommitmentCore } from "./update-commitment-core";

export async function updateCommitmentAction(commitmentId: string, input: unknown) {
  const headersList = await headers();
  return updateCommitmentCore(commitmentId, input, headersList);
}
