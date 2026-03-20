import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

export default function MaterialReturn() {
  return (
    <ModulePage
      title="Material Return"
      module="Inventory"
      icon={icon}
      description="Process material returns from production floor to stores. Handle excess fabric returns, trim balance returns, and rejected material returns. Auto-update stock on return approval."
      features={[
        "Return from production to stores",
        "Return reason categorization",
        "Condition assessment (usable/damaged)",
        "Auto stock credit on approval",
        "Return against original issue reference",
        "Return note printing",
        "Material reconciliation",
        "Supplier return (debit note) processing"
      ]}
    />
  );
}
