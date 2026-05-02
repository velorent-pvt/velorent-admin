import { PaymentList } from "~/features/payments/payment-list";

export default function CustomerRefundPayments() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <PaymentList section="customer-refund" />
    </div>
  );
}
