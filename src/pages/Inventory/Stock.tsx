import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

export default function Stock() {
  return (
    <ModulePage
      title="Stock Management"
      module="Inventory"
      icon={icon}
      description="Real-time inventory tracking across warehouses and locations. Monitor stock levels by material, color, and lot. Set reorder points and get low-stock alerts. Complete material traceability from receipt to consumption."
      features={[
        "Real-time stock balance view",
        "Warehouse/location-wise stock",
        "Roll-wise fabric inventory",
        "Lot/batch tracking",
        "Stock aging analysis",
        "Reorder level alerts",
        "Stock valuation reports",
        "Material ledger with full history"
      ]}
    />
  );
}
