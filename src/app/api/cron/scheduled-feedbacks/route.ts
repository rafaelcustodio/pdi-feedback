import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  buildFeedbackSubmittedEmployeeHtml,
  buildFeedbackSubmittedManagerHtml,
} from "@/lib/email-templates";
import { recalculateFeedbackSchedule } from "@/lib/schedule-utils";

/**
 * GET /api/cron/scheduled-feedbacks
 *
 * Daily cron job that auto-submits scheduled feedbacks whose scheduledAt <= today.
 *
 * For each feedback:
 * 1. Updates status from 'scheduled' to 'submitted'
 * 2. Creates notification for the employee (new feedback received)
 * 3. Creates notification for the manager (confirmation of auto-submission)
 * 4. Sends email to the employee with link to view feedback
 * 5. Recalculates feedback schedule for the employee
 *
 * On error per feedback: keeps status as 'scheduled', notifies manager of failure.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const now = new Date();

    // Find all feedbacks with status 'scheduled' and scheduledAt <= now
    const scheduledFeedbacks = await prisma.feedback.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    const log: {
      feedbackId: string;
      employeeName: string;
      status: "submitted" | "failed";
      error?: string;
    }[] = [];

    let submitted = 0;
    let failed = 0;

    for (const feedback of scheduledFeedbacks) {
      try {
        // Update feedback status to submitted
        await prisma.feedback.update({
          where: { id: feedback.id },
          data: { status: "submitted" },
        });

        const feedbackUrl = `${baseUrl}/feedbacks/${feedback.id}`;

        // Create notification for the employee
        await prisma.notification.create({
          data: {
            userId: feedback.employeeId,
            type: "feedback_submitted_auto",
            title: `Novo feedback recebido - ${feedback.manager.name}`,
            message: `Você recebeu um novo feedback de ${feedback.manager.name} referente ao período ${feedback.period}. [feedback_auto_${feedback.id}]`,
          },
        });

        // Create notification for the manager (confirmation)
        await prisma.notification.create({
          data: {
            userId: feedback.managerId,
            type: "feedback_submitted_auto",
            title: `Feedback agendado submetido - ${feedback.employee.name}`,
            message: `O feedback agendado para ${feedback.employee.name} referente ao período ${feedback.period} foi submetido automaticamente. [feedback_auto_confirm_${feedback.id}]`,
          },
        });

        // Send email to the employee
        const employeeHtml = buildFeedbackSubmittedEmployeeHtml(
          feedback.employee.name,
          feedback.manager.name,
          feedback.period,
          baseUrl
        );
        await sendEmail({
          to: feedback.employee.email,
          subject: `[Feedback] Novo feedback de ${feedback.manager.name}`,
          html: employeeHtml,
        });

        // Send confirmation email to the manager
        const managerHtml = buildFeedbackSubmittedManagerHtml(
          feedback.manager.name,
          feedback.employee.name,
          feedback.period,
          feedbackUrl
        );
        await sendEmail({
          to: feedback.manager.email,
          subject: `[Feedback] Feedback agendado para ${feedback.employee.name} submetido`,
          html: managerHtml,
        });

        // Mark both notifications as emailSent
        await prisma.notification.updateMany({
          where: {
            message: {
              in: [
                `Você recebeu um novo feedback de ${feedback.manager.name} referente ao período ${feedback.period}. [feedback_auto_${feedback.id}]`,
                `O feedback agendado para ${feedback.employee.name} referente ao período ${feedback.period} foi submetido automaticamente. [feedback_auto_confirm_${feedback.id}]`,
              ],
            },
          },
          data: { emailSent: true },
        });

        // Recalculate feedback schedule
        await recalculateFeedbackSchedule(feedback.employeeId);

        log.push({
          feedbackId: feedback.id,
          employeeName: feedback.employee.name,
          status: "submitted",
        });
        submitted++;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `[Cron] Failed to auto-submit feedback ${feedback.id}:`,
          err
        );

        // Create failure notification for the manager
        try {
          await prisma.notification.create({
            data: {
              userId: feedback.managerId,
              type: "feedback_submitted_auto",
              title: `Falha ao submeter feedback agendado - ${feedback.employee.name}`,
              message: `Não foi possível submeter automaticamente o feedback para ${feedback.employee.name} referente ao período ${feedback.period}. Por favor, submeta manualmente. [feedback_auto_fail_${feedback.id}]`,
            },
          });
        } catch (notifErr) {
          console.error(
            `[Cron] Failed to create failure notification for feedback ${feedback.id}:`,
            notifErr
          );
        }

        log.push({
          feedbackId: feedback.id,
          employeeName: feedback.employee.name,
          status: "failed",
          error: errorMessage,
        });
        failed++;
      }
    }

    console.log(
      `[Cron] Scheduled feedbacks processed: ${submitted} submitted, ${failed} failed, ${scheduledFeedbacks.length} total`
    );

    return NextResponse.json({
      success: true,
      processed: scheduledFeedbacks.length,
      submitted,
      failed,
      log,
    });
  } catch (error) {
    console.error("[Cron] Scheduled feedbacks job failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
