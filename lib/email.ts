import { formatTicketNo } from "@/lib/types"

type TicketEmail = {
  ticketId: number
  subject: string
  requesterEmail: string
}

export async function sendTicketCreated(email: TicketEmail) {
  console.log(
    `[email mock] ticket created: ${formatTicketNo(email.ticketId)} "${email.subject}" raised by ${email.requesterEmail}`,
  )
}

export async function sendTicketResolved(
  email: TicketEmail & { resolvedByEmail: string },
) {
  console.log(
    `[email mock] ticket resolved: ${formatTicketNo(email.ticketId)} "${email.subject}" resolved by ${email.resolvedByEmail}, notify ${email.requesterEmail}`,
  )
}
