import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

export default function GRN() {
  return (
    <ModulePage
      title="Goods Received Note"
      module="Procurement"
      icon={icon}
      description="Record material receipts against purchase orders. Perform incoming quality checks, manage partial deliveries, and auto-update inventory. Track GRN history and supplier delivery performance."
      features={[
        "GRN entry against PO",
        "Partial receipt support",
        "Quality inspection at receipt",
        "Fabric width/weight/shade recording",
        "Roll-wise GRN for fabrics",
        "Automatic stock update on approval",
        "Excess/short receipt handling",
        "GRN reversal capability"
      ]}
    />
  );
}
