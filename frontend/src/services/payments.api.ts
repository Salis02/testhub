import { apiClient } from './client'
import { PaymentInvoiceResponse, OrderStatusResponse, Subscription, SubscriptionTier } from '@/types'

export interface CreateInvoicePayload {
  plan_type: SubscriptionTier
  test_id?: string | null
  user_email: string
}

export const paymentsApi = {
  async createInvoice(payload: CreateInvoicePayload, idempotencyKey?: string): Promise<PaymentInvoiceResponse> {
    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
    return apiClient<PaymentInvoiceResponse>('/payments/create-invoice', {
      method: 'POST',
      headers: {
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload),
    })
  },

  async getOrderStatus(orderId: string, signal?: AbortSignal): Promise<OrderStatusResponse> {
    return apiClient<OrderStatusResponse>(`/payments/status/${orderId}`, { signal })
  },

  async getUserSubscriptions(signal?: AbortSignal): Promise<Subscription[]> {
    return apiClient<Subscription[]>('/user/subscriptions', { signal })
  },
}
