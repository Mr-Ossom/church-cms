import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { createFamily } from "../actions";

export const metadata: Metadata = { title: "Add family" };

export default async function NewFamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/families" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to families
      </Link>
      <PageHeader title="Add a family" description="Create a household, then link members to it." />
      <Flash error={error} />

      <form action={createFamily}>
        <Card>
          <CardContent className="space-y-4">
            <Field label="Family name" htmlFor="name">
              <Input id="name" name="name" required placeholder="e.g. Mensah Family" />
            </Field>
            <Field label="Address" htmlFor="address">
              <Input id="address" name="address" placeholder="Area, city" />
            </Field>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" placeholder="Anything useful for pastoral care" />
            </Field>
          </CardContent>
        </Card>
        <div className="mt-5 flex justify-end">
          <SubmitButton pendingLabel="Creating...">Create family</SubmitButton>
        </div>
      </form>
    </div>
  );
}
