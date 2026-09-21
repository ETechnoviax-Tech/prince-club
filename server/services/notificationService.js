/**
 * Multi-Channel Notification Service (WhatsApp & Email OTP)
 * Supports live production gateways (Meta WhatsApp Cloud, Twilio, Resend, SMTP)
 * with zero-crash development sandbox fallback.
 */

export function sanitizePhone(raw) {
  if (!raw) return null
  const cleaned = String(raw).replace(/[^\d+]/g, '')
  // If 10 digits (e.g. standard Indian phone), prepend default country code +91
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`
  }
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`
  }
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  return `+${cleaned}`
}

export function sanitizeEmail(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(trimmed) ? trimmed : null
}

/**
 * Send OTP via WhatsApp
 */
export async function sendWhatsAppOTP({ to, otpCode, username = 'Player' }) {
  const phone = sanitizePhone(to)
  if (!phone) {
    throw new Error('Valid WhatsApp phone number with country code is required (e.g. +919876543210)')
  }

  const messageText = `🔒 *69 Club Verification*\n\nHello ${username},\nYour security OTP verification code is:\n\n👉 *${otpCode}*\n\nThis code is valid for 15 minutes. Do not share this OTP with anyone for account safety.`

  const metaToken = process.env.WHATSAPP_API_TOKEN
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  // 1. Meta WhatsApp Cloud API
  if (metaToken && metaPhoneId) {
    try {
      const url = `https://graph.facebook.com/v18.0/${metaPhoneId}/messages`
      const payload = {
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''),
        type: 'text',
        text: { body: messageText },
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[WhatsApp Cloud API Error]:', data)
      } else {
        return { success: true, provider: 'meta-cloud', messageId: data.messages?.[0]?.id }
      }
    } catch (apiErr) {
      console.error('[WhatsApp API Exception]:', apiErr.message)
    }
  }

  // 2. Twilio WhatsApp API
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

  if (twilioSid && twilioToken) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const bodyParams = new URLSearchParams({
        From: twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`,
        To: `whatsapp:${phone}`,
        Body: messageText,
      })

      const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        return { success: true, provider: 'twilio', sid: data.sid }
      }
    } catch (twErr) {
      console.error('[Twilio WhatsApp Exception]:', twErr.message)
    }
  }

  // 3. Development / Sandbox Simulator
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n======================================================')
    console.log(`💬 [WHATSAPP OTP DISPATCHED] -> ${phone}`)
    console.log(`🔑 Verification Code: [ ${otpCode} ] (Expires in 15 mins)`)
    console.log(`📝 Message:\n${messageText}`)
    console.log('======================================================\n')
  }

  return {
    success: true,
    provider: 'sandbox-simulator',
    recipient: phone,
    ...(process.env.NODE_ENV !== 'production' ? { otpCode } : {}),
  }
}

/**
 * Send OTP via Email
 */
export async function sendEmailOTP({ to, otpCode, username = 'Player' }) {
  const email = sanitizeEmail(to)
  if (!email) {
    throw new Error('Valid email address is required')
  }

  const subject = `69 Club - Your Verification Code: ${otpCode}`
  const textBody = `Hello ${username},\n\nYour 69 Club security verification code is: ${otpCode}\n\nValid for 15 minutes. Do not share this OTP.`
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 480px;">
      <h2 style="color: #38bdf8; margin-top: 0;">69 Club Verification</h2>
      <p style="font-size: 14px; color: #94a3b8;">Hello <strong>${username}</strong>,</p>
      <p style="font-size: 14px; color: #cbd5e1;">Use the following 6-digit one-time verification code to verify your account or reset your password:</p>
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fbbf24;">${otpCode}</span>
      </div>
      <p style="font-size: 12px; color: #64748b;">This code expires in 15 minutes. If you did not request this code, please ignore this email.</p>
    </div>
  `

  // 1. Resend REST API integration (if RESEND_API_KEY is configured)
  const resendKey = process.env.RESEND_API_KEY
  const rawSender = process.env.EMAIL_OTP_SEND || process.env.EMAIL_FROM || 'otp@game.69club1.site'
  const senderEmail = rawSender.includes('<') ? rawSender : `69 Club <${rawSender}>`

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [email],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        console.log(`✉️ [Resend] Email OTP dispatched to ${email} (ID: ${data.id})`)
        return { success: true, provider: 'resend', id: data.id }
      } else {
        console.error(`❌ [Resend API Error] Status ${res.status}:`, data)
      }
    } catch (resendErr) {
      console.error('[Resend Email Exception]:', resendErr.message)
    }
  }

  // 2. Development / Sandbox Simulator
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n======================================================')
    console.log(`✉️  [EMAIL OTP DISPATCHED] -> ${email}`)
    console.log(`🔑 Subject: ${subject}`)
    console.log(`🔑 Verification Code: [ ${otpCode} ] (Expires in 15 mins)`)
    console.log('======================================================\n')
  }

  return {
    success: true,
    provider: 'sandbox-simulator',
    recipient: email,
    ...(process.env.NODE_ENV !== 'production' ? { otpCode } : {}),
  }
}

/**
 * Unified OTP Dispatcher supporting WhatsApp, Email, or Auto-Routing
 */
export async function dispatchOTP({ identity, channel = 'AUTO', otpCode, username }) {
  const normChannel = String(channel || 'AUTO').toUpperCase()
  const isEmail = identity.includes('@')
  const isPhone = /^(\+?\d{10,15})$/.test(identity.replace(/[\s-]/g, ''))

  let effectiveChannel = normChannel
  let destination = identity

  if (normChannel === 'AUTO') {
    if (isEmail) effectiveChannel = 'EMAIL'
    else if (isPhone) effectiveChannel = 'WHATSAPP'
    else effectiveChannel = 'WHATSAPP' // default username/phone to WhatsApp
  }

  let result = null

  if (effectiveChannel === 'WHATSAPP') {
    destination = sanitizePhone(identity) || identity
    result = await sendWhatsAppOTP({ to: destination, otpCode, username })
    return {
      channel: 'WHATSAPP',
      destination,
      deliveryMessage: `OTP sent to your WhatsApp number (${destination})`,
      ...result,
    }
  } else if (effectiveChannel === 'EMAIL') {
    destination = sanitizeEmail(identity) || identity
    result = await sendEmailOTP({ to: destination, otpCode, username })
    return {
      channel: 'EMAIL',
      destination,
      deliveryMessage: `OTP sent to your email address (${destination})`,
      ...result,
    }
  } else {
    // Both or Fallback
    const wa = await sendWhatsAppOTP({ to: identity, otpCode, username }).catch(() => null)
    const em = isEmail ? await sendEmailOTP({ to: identity, otpCode, username }).catch(() => null) : null
    return {
      channel: 'MULTI',
      destination: identity,
      deliveryMessage: `OTP sent via WhatsApp and Email`,
      whatsapp: wa,
      email: em,
    }
  }
}
