export type ReminderItem = {
  employeeName: string;
  type: "PDI" | "Feedback";
  dueDate: string;
  isOverdue: boolean;
  linkUrl: string;
};

/**
 * Build the HTML email template for PDI/Feedback reminders.
 * Sends a consolidated email to the manager with all pending items.
 */
export function buildReminderEmailHtml(
  managerName: string,
  items: ReminderItem[],
  baseUrl: string
): string {
  const overdueItems = items.filter((i) => i.isOverdue);
  const upcomingItems = items.filter((i) => !i.isOverdue);

  const renderItem = (item: ReminderItem) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        ${item.employeeName}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 13px; font-weight: 500; background: ${item.type === "PDI" ? "#dbeafe" : "#ede9fe"}; color: ${item.type === "PDI" ? "#1d4ed8" : "#6d28d9"};">
          ${item.type}
        </span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; ${item.isOverdue ? "color: #dc2626; font-weight: 600;" : ""}">
        ${item.dueDate}${item.isOverdue ? " (atrasado)" : ""}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <a href="${item.linkUrl}" style="color: #1d4ed8; text-decoration: none; font-weight: 500;">
          Ver &rarr;
        </a>
      </td>
    </tr>`;

  const renderSection = (
    title: string,
    sectionItems: ReminderItem[],
    headerColor: string
  ) => {
    if (sectionItems.length === 0) return "";
    return `
      <h2 style="font-size: 18px; color: ${headerColor}; margin: 24px 0 12px;">
        ${title} (${sectionItems.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 10px 16px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Colaborador</th>
            <th style="padding: 10px 16px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Tipo</th>
            <th style="padding: 10px 16px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Vencimento</th>
            <th style="padding: 10px 16px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${sectionItems.map(renderItem).join("")}
        </tbody>
      </table>`;
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="background: #1d4ed8; color: #fff; padding: 24px 32px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">
        PDI &amp; Feedback - Lembretes
      </h1>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">
        Resumo de pendências para ${managerName}
      </p>
    </div>

    <!-- Body -->
    <div style="background: #fff; padding: 24px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Olá <strong>${managerName}</strong>,
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Você tem <strong>${items.length}</strong> PDI(s) e/ou feedback(s) que necessitam de sua atenção.
      </p>

      ${renderSection("Atrasados", overdueItems, "#dc2626")}
      ${renderSection("Próximos do vencimento", upcomingItems, "#d97706")}

      <div style="margin-top: 32px; text-align: center;">
        <a href="${baseUrl}/dashboard" style="display: inline-block; padding: 12px 32px; background: #1d4ed8; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px;">
          Acessar o sistema
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 16px; font-size: 12px; color: #9ca3af;">
      Este é um e-mail automático do sistema PDI &amp; Feedback HR.
      <br>
      Não responda a este e-mail.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build the subject line for the reminder email.
 */
export function buildReminderEmailSubject(
  overdueCount: number,
  upcomingCount: number
): string {
  const parts: string[] = [];
  if (overdueCount > 0) {
    parts.push(`${overdueCount} atrasado(s)`);
  }
  if (upcomingCount > 0) {
    parts.push(`${upcomingCount} próximo(s) do vencimento`);
  }
  return `[PDI & Feedback] Lembretes: ${parts.join(", ")}`;
}

/**
 * Build the HTML email sent to an employee when a scheduled feedback is auto-submitted.
 */
export function buildFeedbackSubmittedEmployeeHtml(
  employeeName: string,
  managerName: string,
  period: string,
  feedbackUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    <div style="background: #1d4ed8; color: #fff; padding: 24px 32px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">
        Novo Feedback Disponível
      </h1>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">
        Você recebeu um novo feedback
      </p>
    </div>
    <div style="background: #fff; padding: 24px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Olá <strong>${employeeName}</strong>,
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Seu gestor <strong>${managerName}</strong> submeteu um feedback referente ao período <strong>${period}</strong>.
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Clique no botão abaixo para visualizar o feedback completo.
      </p>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${feedbackUrl}" style="display: inline-block; padding: 12px 32px; background: #1d4ed8; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px;">
          Ver Feedback
        </a>
      </div>
    </div>
    <div style="text-align: center; padding: 16px; font-size: 12px; color: #9ca3af;">
      Este é um e-mail automático do sistema PDI &amp; Feedback HR.
      <br>
      Não responda a este e-mail.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build the HTML email sent to a manager confirming their scheduled feedback was auto-submitted.
 */
export function buildFeedbackSubmittedManagerHtml(
  managerName: string,
  employeeName: string,
  period: string,
  feedbackUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    <div style="background: #059669; color: #fff; padding: 24px 32px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">
        Feedback Agendado Submetido
      </h1>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">
        Confirmação de submissão automática
      </p>
    </div>
    <div style="background: #fff; padding: 24px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Olá <strong>${managerName}</strong>,
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        O feedback agendado para <strong>${employeeName}</strong> referente ao período <strong>${period}</strong> foi submetido automaticamente com sucesso.
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        O colaborador já pode visualizar o feedback.
      </p>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${feedbackUrl}" style="display: inline-block; padding: 12px 32px; background: #059669; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px;">
          Ver Feedback
        </a>
      </div>
    </div>
    <div style="text-align: center; padding: 16px; font-size: 12px; color: #9ca3af;">
      Este é um e-mail automático do sistema PDI &amp; Feedback HR.
      <br>
      Não responda a este e-mail.
    </div>
  </div>
</body>
</html>`;
}
