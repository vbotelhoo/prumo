"use server";

import { headers } from "next/headers";
import { deleteCommitmentCore } from "./delete-commitment-core";

export async function deleteCommitmentAction(commitmentId: string) {
  const headersList = await headers();
  return deleteCommitmentCore(commitmentId, headersList);
}
