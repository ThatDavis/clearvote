import nodemailer from 'nodemailer'
import { Resend } from 'resend'

// Detect which email provider is configured
const emailProvider = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'smtp')

// Resend setup
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// SMTP setup
const smtpTransporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null

interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail({
  to,
  subject,
  html,
}: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  // Try Resend first if configured
  if (emailProvider === 'resend' && resend) {
    try {
      const result = await resend.emails.send({
        from: process.env.SMTP_FROM || 'Clearvote <no-reply@clearvote.app>',
        to,
        subject,
        html,
      })
      return { success: true, id: result.data?.id }
    } catch (error) {
      console.error('Resend failed, falling back to SMTP:', error)
      // Fall through to SMTP if available
    }
  }

  // Try SMTP
  if (smtpTransporter) {
    try {
      const result = await smtpTransporter.sendMail({
        from: process.env.SMTP_FROM || 'Clearvote <no-reply@clearvote.app>',
        to,
        subject,
        html,
      })
      return { success: true, id: result.messageId }
    } catch (error) {
      console.error('SMTP failed:', error)
      return { success: false, error: 'Failed to send email via SMTP' }
    }
  }

  // No provider configured
  console.warn('No email provider configured. Email would be sent to:', to)
  return { success: false, error: 'No email provider configured' }
}

export async function sendVoteInvite({
  to,
  pollTitle,
  voteLink,
}: {
  to: string
  pollTitle: string
  voteLink: string
}) {
  return sendEmail({
    to,
    subject: `You're invited to vote: ${pollTitle}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a1a1a; font-size: 20px; margin-bottom: 16px;">You've been invited to vote</h1>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
          You've been invited to participate in a poll on Clearvote:
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 8px 0;">${pollTitle}</h2>
        </div>
        <a href="${voteLink}" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Cast your vote</a>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 24px;">
          Or copy this link: ${voteLink}
        </p>
      </div>
    `,
  })
}

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string
  name: string
}) {
  return sendEmail({
    to,
    subject: 'Welcome to Clearvote',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a1a1a; font-size: 20px; margin-bottom: 16px;">Welcome to Clearvote, ${name}</h1>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
          Your account has been created. You can now participate in ranked-choice polls and elections run by your community.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Go to dashboard</a>
      </div>
    `,
  })
}

export async function sendPollOpenNotification({
  to,
  pollTitle,
  voteLink,
}: {
  to: string
  pollTitle: string
  voteLink: string
}) {
  return sendEmail({
    to,
    subject: `Voting has started: ${pollTitle}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a1a1a; font-size: 20px; margin-bottom: 16px;">Voting is now open</h1>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
          The poll <strong>${pollTitle}</strong> has opened and your vote is ready to be cast.
        </p>
        <a href="${voteLink}" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Cast your vote</a>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 24px;">
          Or copy this link: ${voteLink}
        </p>
      </div>
    `,
  })
}

export async function sendOrgInvite({
  to,
  orgName,
  inviteLink,
}: {
  to: string
  orgName: string
  inviteLink: string
}) {
  return sendEmail({
    to,
    subject: `You're invited to join ${orgName} on Clearvote`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a1a1a; font-size: 20px; margin-bottom: 16px;">You're invited to join ${orgName}</h1>
        <p style="color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
          You've been invited to join <strong>${orgName}</strong> on Clearvote. Click the link below to accept the invitation.
        </p>
        <a href="${inviteLink}" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Join organization</a>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 24px;">
          Or copy this link: ${inviteLink}
        </p>
      </div>
    `,
  })
}
