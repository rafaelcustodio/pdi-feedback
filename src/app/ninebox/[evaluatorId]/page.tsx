import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNineBoxEvaluatorData } from "@/app/(dashboard)/feedbacks/ninebox-actions";
import { NineBoxForm } from "@/components/ninebox-form";

export default async function NineBoxFormPage({
  params,
}: {
  params: Promise<{ evaluatorId: string }>;
}) {
  const session = await auth();
  const { evaluatorId } = await params;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/ninebox/${evaluatorId}`);
  }

  const result = await getNineBoxEvaluatorData(evaluatorId);

  if (result.error === "not_authenticated") {
    redirect(`/login?callbackUrl=/ninebox/${evaluatorId}`);
  }

  if (result.error === "not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Avaliação não encontrada</h1>
          <p className="mt-2 text-sm text-gray-500">
            O link que você acessou não corresponde a uma avaliação válida.
          </p>
        </div>
      </div>
    );
  }

  if (result.error === "unauthorized") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Acesso não autorizado</h1>
          <p className="mt-2 text-sm text-gray-500">
            Você não tem permissão para acessar esta avaliação.
          </p>
        </div>
      </div>
    );
  }

  const data = result.data!;

  if (data.evaluatorStatus === "completed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Avaliação já respondida</h1>
          <p className="mt-2 text-sm text-gray-500">
            Você já respondeu esta avaliação. Obrigado!
          </p>
        </div>
      </div>
    );
  }

  if (data.evaluationStatus === "closed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Avaliação encerrada</h1>
          <p className="mt-2 text-sm text-gray-500">
            Esta avaliação foi encerrada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <NineBoxForm
      evaluatorId={data.evaluatorId}
      evaluateeName={data.evaluateeName}
      feedbackPeriod={data.feedbackPeriod}
    />
  );
}
