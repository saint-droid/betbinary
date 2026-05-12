// @ts-nocheck
import { createAdminClient } from './supabase'

export interface MpesaCredentials {
  consumerKey: string
  consumerSecret: string
  passkey: string
  shortcode: string
  b2cInitiatorName: string
  b2cSecurityCredential: string
  b2cShortcode: string
}

async function getMpesaCreds(): Promise<MpesaCredentials | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('platform_settings')
    .select(
      'mpesa_consumer_key,mpesa_consumer_secret,mpesa_passkey,mpesa_shortcode,mpesa_paybill,' +
      'mpesa_b2c_initiator_name,mpesa_b2c_security_credential,mpesa_b2c_shortcode'
    )
    .eq('id', 1)
    .single()

  if (!data?.mpesa_consumer_key || !data?.mpesa_consumer_secret) return null

  return {
    consumerKey: data.mpesa_consumer_key,
    consumerSecret: data.mpesa_consumer_secret,
    passkey: data.mpesa_passkey || '',
    shortcode: data.mpesa_shortcode || data.mpesa_paybill || '',
    b2cInitiatorName: data.mpesa_b2c_initiator_name || '',
    b2cSecurityCredential: data.mpesa_b2c_security_credential || '',
    b2cShortcode: data.mpesa_b2c_shortcode || '',
  }
}

async function getAccessToken(creds: MpesaCredentials): Promise<string> {
  const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString('base64')
  const res = await fetch(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  )
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1)
  if (cleaned.startsWith('254')) return cleaned
  if (cleaned.startsWith('+254')) return cleaned.slice(1)
  return '254' + cleaned
}

function getTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  )
}

export async function initiateStkPush(params: {
  phone: string
  amountKes: number
  accountRef: string
  description: string
  callbackUrl: string
}): Promise<{ CheckoutRequestID: string; ResponseCode: string; ResponseDescription: string; CustomerMessage?: string } | null> {
  const creds = await getMpesaCreds()
  if (!creds) return null

  const token = await getAccessToken(creds)
  const timestamp = getTimestamp()
  const password = Buffer.from(`${creds.shortcode}${creds.passkey}${timestamp}`).toString('base64')

  const body = {
    BusinessShortCode: creds.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(params.amountKes),
    PartyA: formatPhone(params.phone),
    PartyB: creds.shortcode,
    PhoneNumber: formatPhone(params.phone),
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountRef,
    TransactionDesc: params.description,
  }

  const res = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`STK push failed: ${err}`)
  }

  return res.json()
}

export async function initiateB2C(params: {
  phone: string
  amountKes: number
  remarks: string
  occasion: string
  callbackUrl: string
  timeoutUrl: string
}): Promise<{ ConversationID: string; OriginatorConversationID: string; ResponseCode: string; ResponseDescription: string } | null> {
  const creds = await getMpesaCreds()
  if (!creds?.b2cInitiatorName || !creds?.b2cShortcode) return null

  const token = await getAccessToken(creds)

  const body = {
    InitiatorName: creds.b2cInitiatorName,
    SecurityCredential: creds.b2cSecurityCredential,
    CommandID: 'BusinessPayment',
    Amount: Math.floor(params.amountKes),
    PartyA: creds.b2cShortcode,
    PartyB: formatPhone(params.phone),
    Remarks: params.remarks,
    QueueTimeOutURL: params.timeoutUrl,
    ResultURL: params.callbackUrl,
    Occasion: params.occasion,
  }

  const res = await fetch('https://api.safaricom.co.ke/mpesa/b2c/v3/paymentrequest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`B2C failed: ${err}`)
  }

  return res.json()
}
