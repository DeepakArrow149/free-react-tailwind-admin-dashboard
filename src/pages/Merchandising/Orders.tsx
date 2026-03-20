import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function BuyerOrders() {
  return (
    <ModulePage
      title="Buyer Orders"
      module="Merchandising"
      icon={icon}
      description="Manage buyer purchase orders from inquiry to confirmation. Track order quantities, delivery dates, prices, and amendments. Integrate with costing and production planning for seamless order-to-delivery workflow."
      features={[
        "Order booking with multi-line items",
        "Style/Color/Size breakdown (size-wise quantity)",
        "Auto number series generation",
        "Order amendment & revision tracking",
        "Delivery date scheduling per line",
        "Order approval workflow",
        "Link to cost sheet for margin tracking",
        "Export to Excel / PDF"
      ]}
    />
  );
}
