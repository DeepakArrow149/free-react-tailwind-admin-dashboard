import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

export default function PurchaseOrders() {
  return (
    <ModulePage
      title="Purchase Orders"
      module="Procurement"
      icon={icon}
      description="Create and manage purchase orders for fabric, trims, and accessories. Auto-generate POs from BOM requirements. Track supplier confirmations, delivery schedules, and partial receipts."
      features={[
        "PO creation from BOM requirements",
        "Multi-supplier PO generation",
        "Supplier rate comparison",
        "Delivery schedule per PO line",
        "PO amendment & revision control",
        "Pending PO tracking dashboard",
        "PO approval workflow",
        "Supplier performance scoring"
      ]}
    />
  );
}
