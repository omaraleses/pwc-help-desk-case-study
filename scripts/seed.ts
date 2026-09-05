process.env.SEEDING = "true"

import { db } from "@/db"
import { categories, ticketComments, tickets } from "@/lib/db/schema"
import { account, session, user } from "@/auth-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

const PASSWORD = "Password123!"

const SEED_USERS = [
  { name: "Amina Admin", email: "admin@example.com", role: "admin" },
  { name: "Sam Support", email: "sam@example.com", role: "moderator" },
  { name: "Priya Agent", email: "priya@example.com", role: "moderator" },
  { name: "Jordan Employee", email: "jordan@example.com", role: "user" },
] as const

const daysAgo = (days: number, hours = 0) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000)

async function main() {
  console.log("Clearing existing data...")
  await db.delete(ticketComments)
  await db.delete(tickets)
  await db.delete(categories)
  await db.delete(session)
  await db.delete(account)
  await db.delete(user)

  console.log("Creating users through better-auth...")
  for (const seedUser of SEED_USERS) {
    await auth.api.signUpEmail({
      body: { name: seedUser.name, email: seedUser.email, password: PASSWORD },
      headers: new Headers(),
    })
  }

  for (const seedUser of SEED_USERS) {
    await db
      .update(user)
      .set({ role: seedUser.role, isActive: true })
      .where(eq(user.email, seedUser.email))
  }

  const [admin, sam, priya, jordan] = await Promise.all(
    SEED_USERS.map(async (seedUser) => {
      const found = await db.query.user.findFirst({
        where: eq(user.email, seedUser.email),
      })
      if (!found) throw new Error(`User not found after signup: ${seedUser.email}`)
      return found
    }),
  )

  console.log("Inserting categories...")
  const insertedCategories = await db
    .insert(categories)
    .values([
      { name: "IT Hardware" },
      { name: "IT Access & VPN" },
      { name: "HR Payroll" },
    ])
    .returning()
  const [hardware, access, payroll] = insertedCategories

  console.log("Inserting tickets...")
  const inserted = await db
    .insert(tickets)
    .values([
      {
        subject: "VPN won't connect from home",
        description:
          "Since Monday I cannot establish a VPN connection from my home network. It hangs at 'verifying credentials' and then drops.",
        status: "open",
        priority: "high",
        categoryId: access.id,
        requesterId: jordan.id,
        createdAt: daysAgo(0, 5),
        updatedAt: daysAgo(0, 5),
      },
      {
        subject: "Laptop battery not charging",
        description:
          "My laptop only charges when the cable is held at an angle. Battery health report says 41% capacity.",
        status: "in_progress",
        priority: "medium",
        categoryId: hardware.id,
        requesterId: jordan.id,
        assigneeId: sam.id,
        createdAt: daysAgo(1, 2),
        updatedAt: daysAgo(0, 8),
      },
      {
        subject: "New monitor for desk 4B",
        description:
          "The current monitor flickers constantly. Requesting a replacement 27 inch monitor for desk 4B.",
        status: "open",
        priority: "low",
        categoryId: hardware.id,
        requesterId: jordan.id,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        subject: "Cannot access payroll portal",
        description:
          "Clicking 'View payslips' returns error 403. I need last month's payslip for a loan application.",
        status: "open",
        priority: "urgent",
        categoryId: payroll.id,
        requesterId: jordan.id,
        createdAt: daysAgo(0, 9),
        updatedAt: daysAgo(0, 9),
      },
      {
        subject: "Email attachments over 25MB fail",
        description:
          "Attachments larger than 25MB fail to send with a generic error. Happens on webmail and Outlook.",
        status: "in_progress",
        priority: "medium",
        categoryId: access.id,
        requesterId: sam.id,
        assigneeId: priya.id,
        createdAt: daysAgo(3, 4),
        updatedAt: daysAgo(1, 1),
      },
      {
        subject: "Request: license for design tool",
        description:
          "Team needs one additional design tool license for the new hire starting next week.",
        status: "open",
        priority: "medium",
        categoryId: hardware.id,
        requesterId: admin.id,
        createdAt: daysAgo(1, 7),
        updatedAt: daysAgo(1, 7),
      },
      {
        subject: "Keyboard keys sticking",
        description:
          "Several keys on the shared workstation keyboard stick or double-trigger. Cleaning did not help.",
        status: "in_progress",
        priority: "low",
        categoryId: hardware.id,
        requesterId: jordan.id,
        assigneeId: sam.id,
        createdAt: daysAgo(4, 3),
        updatedAt: daysAgo(2, 6),
      },
      {
        subject: "MFA reset needed",
        description:
          "Lost my phone and cannot generate MFA codes. Need authenticator reset to enroll the new device.",
        status: "in_progress",
        priority: "high",
        categoryId: access.id,
        requesterId: admin.id,
        assigneeId: priya.id,
        createdAt: daysAgo(2, 8),
        updatedAt: daysAgo(0, 12),
      },
      {
        subject: "Monitor mount installation",
        description: "Dual monitor mount arrived, requesting installation for desk 2A.",
        status: "resolved",
        priority: "low",
        categoryId: hardware.id,
        requesterId: jordan.id,
        assigneeId: sam.id,
        createdAt: daysAgo(6),
        updatedAt: daysAgo(4, 5),
      },
      {
        subject: "Payroll discrepancy for October",
        description:
          "Overtime hours for the second week of October are missing from my payslip. Payslip shows 0 overtime hours.",
        status: "resolved",
        priority: "high",
        categoryId: payroll.id,
        requesterId: jordan.id,
        assigneeId: priya.id,
        createdAt: daysAgo(8, 2),
        updatedAt: daysAgo(5, 3),
      },
      {
        subject: "Shared drive access for intern",
        description:
          "Intern needs read access to the shared marketing drive for the campaign archive.",
        status: "resolved",
        priority: "medium",
        categoryId: access.id,
        requesterId: admin.id,
        assigneeId: sam.id,
        createdAt: daysAgo(10),
        updatedAt: daysAgo(7, 6),
      },
      {
        subject: "Broken chair wheel",
        description: "Office chair wheel snapped off. Requesting replacement or new chair.",
        status: "closed",
        priority: "low",
        categoryId: hardware.id,
        requesterId: jordan.id,
        assigneeId: sam.id,
        createdAt: daysAgo(14),
        updatedAt: daysAgo(11, 4),
      },
      {
        subject: "Password expiry notification spam",
        description:
          "Received 14 password expiry emails in one hour. Account was not actually near expiry.",
        status: "closed",
        priority: "medium",
        categoryId: access.id,
        requesterId: sam.id,
        assigneeId: priya.id,
        createdAt: daysAgo(16, 5),
        updatedAt: daysAgo(12, 2),
      },
      {
        subject: "Payslip PDF download broken",
        description:
          "Download button for payslip PDFs returns a blank file. Tried Chrome and Edge.",
        status: "closed",
        priority: "high",
        categoryId: payroll.id,
        requesterId: jordan.id,
        assigneeId: sam.id,
        createdAt: daysAgo(18, 1),
        updatedAt: daysAgo(13, 7),
      },
    ])
    .returning()

  const bySubject = (fragment: string) => {
    const found = inserted.find((t) => t.subject.includes(fragment))
    if (!found) throw new Error(`Seed ticket not found: ${fragment}`)
    return found
  }

  console.log("Inserting comments...")
  await db.insert(ticketComments).values([
    {
      ticketId: bySubject("Laptop battery").id,
      authorId: sam.id,
      body: "Ran diagnostics, battery reports 41% design capacity. Ordering a replacement unit.",
      createdAt: daysAgo(0, 8),
    },
    {
      ticketId: bySubject("Email attachments").id,
      authorId: priya.id,
      body: "Confirmed the 25MB limit with the mail gateway vendor, raising a ticket with them.",
      createdAt: daysAgo(1, 1),
    },
    {
      ticketId: bySubject("MFA reset").id,
      authorId: priya.id,
      body: "Identity verified over video call. Ready to reset the authenticator, please ping me.",
      createdAt: daysAgo(0, 12),
    },
    {
      ticketId: bySubject("Monitor mount").id,
      authorId: sam.id,
      body: "Installed and tested both arms. Let me know if the height needs adjusting.",
      createdAt: daysAgo(4, 5),
    },
    {
      ticketId: bySubject("Monitor mount").id,
      authorId: jordan.id,
      body: "Looks great, thanks. Closing this from my side.",
      createdAt: daysAgo(4, 2),
    },
    {
      ticketId: bySubject("Payroll discrepancy").id,
      authorId: priya.id,
      body: "Found the missing 6 hours, corrected payroll run scheduled for Friday.",
      createdAt: daysAgo(5, 3),
    },
    {
      ticketId: bySubject("Shared drive").id,
      authorId: sam.id,
      body: "Read access granted to marketing-share/interns. Verified with a test login.",
      createdAt: daysAgo(7, 6),
    },
    {
      ticketId: bySubject("chair wheel").id,
      authorId: sam.id,
      body: "Replaced with a spare chair from storage, old unit disposed.",
      createdAt: daysAgo(11, 4),
    },
    {
      ticketId: bySubject("Payslip PDF").id,
      authorId: jordan.id,
      body: "Download works again, got the file. Thank you.",
      createdAt: daysAgo(13, 7),
    },
  ])

  console.log("\nSeed complete:")
  console.log(`  users: ${SEED_USERS.length} (password: ${PASSWORD})`)
  console.log(`  categories: ${insertedCategories.length}`)
  console.log(`  tickets: ${inserted.length}`)
  console.log(`  comments: 9`)
  SEED_USERS.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`))
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    process.exit(0)
  })
