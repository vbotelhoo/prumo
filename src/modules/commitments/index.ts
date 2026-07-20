// Public API for commitments module (AD-010)
// All imports from other modules must come through this file

// Domain types
export type {
  Commitment,
  Installment,
  CommitmentMode,
  InstallmentStatus,
  CommitmentProgress,
  CreateCommitmentInput,
  UpdateCommitmentInput,
  SetInstallmentStatusInput,
  EditScope,
} from "./domain/types";

// Data access (repository)
export { listCommitmentsByUser, getCommitmentForUser } from "./data/commitments-repository";

// Actions (server)
export { createCommitmentAction } from "./actions/create-commitment-action";
export { setInstallmentStatusAction } from "./actions/set-installment-status-action";
export { updateCommitmentAction } from "./actions/update-commitment-action";
export { deleteCommitmentAction } from "./actions/delete-commitment-action";

// Components (UI)
export { CommitmentsPageClient } from "./components/CommitmentsPageClient";
