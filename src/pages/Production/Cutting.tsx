import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
  </svg>
);

export default function Cutting() {
  return (
    <ModulePage
      title="Cutting"
      module="Production"
      icon={icon}
      description="Manage the cutting process from lay planning to cut piece bundling. Create cutting orders, plan marker layouts, record actual fabric consumption, and track cut-to-order ratio for waste control."
      features={[
        "Cutting order creation from production plan",
        "Lay/marker planning with ratio",
        "Fabric consumption recording per lay",
        "Cut piece quantity registration",
        "Bundle generation & numbering",
        "Cutting wastage tracking",
        "Spreading & cutting efficiency KPIs",
        "End-bit and remnant management"
      ]}
    />
  );
}
