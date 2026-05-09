import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

export interface PlanInfo {
  planType: string;
  name: string;
  nameEn: string;
  price: number;
  yearlyPrice: number;
  costBudget: number;
  hasExpiry: boolean;
}

export interface OrderInfo {
  id: string;
  orderNo: string;
  planType: string;
  planName: string;
  billingCycle: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
  expiredAt: string;
  paidAt: string | null;
}

export interface CreateOrderResult {
  order: OrderInfo;
  orderString: string;
}

export interface UpgradePriceResult {
  amount: number;
  periodEnd: string;
  isRenewal: boolean;
}

export interface CheckPayResult {
  status: string;
  paid: boolean;
}

declare module '../client' {
  interface Client {
    getPlans(): Promise<{ success: boolean; data: PlanInfo[] }>;
    getUpgradePrice(planType: string, billingCycle: 'monthly' | 'yearly'): Promise<{ success: boolean; data: UpgradePriceResult }>;
    createOrder(planType: string, paymentMethod: string, billingCycle?: 'monthly' | 'yearly'): Promise<{ success: boolean; data: CreateOrderResult }>;
    getOrderList(): Promise<{ success: boolean; data: OrderInfo[] }>;
    getOrderDetail(orderId: string): Promise<{ success: boolean; data: OrderInfo }>;
    simulatePayment(orderId: string): Promise<{ success: boolean; data: { message: string } }>;
    checkOrderPayment(orderId: string): Promise<{ success: boolean; data: CheckPayResult }>;
  }
}

Client.prototype.getPlans = async function() {
  return this.api.get(ENDPOINTS.ORDER_PLANS);
};

Client.prototype.getUpgradePrice = async function(planType: string, billingCycle: 'monthly' | 'yearly') {
  return this.api.get(`${ENDPOINTS.ORDER_PRICE}?planType=${planType}&billingCycle=${billingCycle}`);
};

Client.prototype.createOrder = async function(planType: string, paymentMethod: string, billingCycle: 'monthly' | 'yearly' = 'monthly') {
  return this.api.post(ENDPOINTS.ORDER_CREATE, { planType, paymentMethod, billingCycle });
};

Client.prototype.getOrderList = async function() {
  return this.api.get(ENDPOINTS.ORDER_LIST);
};

Client.prototype.getOrderDetail = async function(orderId: string) {
  return this.api.get(`${ENDPOINTS.ORDER_DETAIL}/${orderId}`);
};

Client.prototype.simulatePayment = async function(orderId: string) {
  return this.api.post(`${ENDPOINTS.ORDER_DETAIL}/${orderId}/simulate-pay`);
};

Client.prototype.checkOrderPayment = async function(orderId: string) {
  return this.api.get(`${ENDPOINTS.ORDER_DETAIL}/${orderId}/check-pay`);
};
