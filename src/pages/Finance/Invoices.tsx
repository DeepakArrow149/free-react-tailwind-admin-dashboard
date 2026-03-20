import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
);

export default function Invoices() {
  return (
    <ModulePage
      title="Invoices"
      module="Finance"
      icon={icon}
      description="Create and manage sales invoices against buyer orders and shipments. Track invoice status from draft to payment received. Support multi-currency invoicing with exchange rate management."
      features={[
        "Invoice generation from shipment/order",
        "Multi-currency support with exchange rates",
        "Tax calculation (GST/VAT) support",
        "Proforma invoice creation",
        "Invoice approval workflow",
        "Debit/Credit note processing",
        "Invoice aging analysis",
        "Payment allocation against invoices"
      ]}
    />
  );
}
