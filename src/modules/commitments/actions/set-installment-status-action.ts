"use server";

import { headers } from "next/headers";
import { setInstallmentStatusCore } from "./set-installment-status-core";

export async function setInstallmentStatusAction(input: unknown) {
  const headersList = await headers();
  return setInstallmentStatusCore(input, headersList);
}
