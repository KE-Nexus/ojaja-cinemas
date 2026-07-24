"use client";

import { useActionState } from "react";
import { createFilmContractAction, updateFilmContractAction, type FormState } from "@/actions/admin/film-contracts";
import { Button } from "@/components/ui/button";
import { Label, Select, FieldError, Input } from "@/components/ui/input";
import type { FilmContract } from "@prisma/client";

export function FilmContractForm({
  contract,
  branches,
  movies,
}: {
  contract?: FilmContract;
  branches: { id: string; name: string }[];
  movies: { id: string; title: string }[];
}) {
  const action = contract ? updateFilmContractAction : createFilmContractAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, null);

  const dateValue = contract ? new Date(contract.contractStartDate).toISOString().slice(0, 10) : "";

  return (
    <form action={formAction} className="space-y-4">
      {contract && <input type="hidden" name="id" value={contract.id} />}

      <div>
        <Label htmlFor="branchId">Cinema</Label>
        <Select id="branchId" name="branchId" defaultValue={contract?.branchId} required>
          <option value="">Select a cinema</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="movieId">Film</Label>
        <Select id="movieId" name="movieId" defaultValue={contract?.movieId} required>
          <option value="">Select a film</option>
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="contractStartDate">Contract start date</Label>
        <Input id="contractStartDate" name="contractStartDate" type="date" defaultValue={dateValue} required />
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : contract ? "Save Changes" : "Create Contract"}
      </Button>
    </form>
  );
}
