import { apiClient } from './client'
import { PaymentInvoiceResponse, OrderStatusResponse, Subscription, SubscriptionTier } from '@/types'

export interface CreateInvoicePayload {
  plan_type: SubscriptionTier
  test_id?: string | null
  user_email: string
}

export const paymentsApi = {
  async createInvoice(payload: CreateInvoicePayload): Promise<PaymentInvoiceResponse> {
    return apiClient<PaymentInvoiceResponse>('/payments/create-invoice', {
      method: 'POST',
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
