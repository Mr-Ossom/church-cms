import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Flash } from "@/components/ui/flash";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { importMembers } from "../actions";

export const metadata: Metadata = { title: "Import members" };

const columns = [
  "first_name",
  "last_name",
  "other_names",
  "gender",
  "date_of_birth",
  "marital_status",
  "phone",
  "email",
  "address",
  "joined_date",
  "status",
  "notes",
];

export default async function ImportMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/members" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2`}>
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>
      <PageHeader
        title="Import members"
        description="Upload a CSV file to add many people to the directory at once."
      />
      <Flash error={error} />

      <Card>
        <CardContent className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">CSV format</p>
            <p className="mt-1">
              The first row must contain column names. Only{" "}
              <code className="rounded bg-white px-1 py-0.5 text-xs">first_name</code> and{" "}
              <code className="rounded bg-white px-1 py-0.5 text-xs">last_name</code> are required.
            </p>
            <p className="mt-2 break-words text-xs text-slate-500">{columns.join(", ")}</p>
            <Link
              href="/members-template.csv"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Download className="h-3.5 w-3.5" /> Download template
            </Link>
          </div>

          <form action={importMembers} className="space-y-4">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700"
            />
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Importing...">
                <Upload className="h-4 w-4" /> Import members
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
