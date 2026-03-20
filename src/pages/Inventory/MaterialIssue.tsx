import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

export default function MaterialIssue() {
  return (
    <ModulePage
      title="Material Issue"
      module="Inventory"
      icon={icon}
      description="Issue materials from stores to production floors against orders. Track fabric rolls, trims quantities, and accessories issued per cutting lot. Maintain complete consumption traceability."
      features={[
        "Issue against production order",
        "Roll-wise fabric issue for cutting",
        "Trims & accessories issue",
        "Issue requisition approval flow",
        "Auto stock deduction on issue",
        "Issue slip printing",
        "Excess issue control & alerts",
        "Issue vs consumption variance tracking"
      ]}
    />
  );
}
