import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function ProductionPlan() {
  return (
    <ModulePage
      title="Production Planning"
      module="Planning"
      icon={icon}
      description="Plan and schedule production runs against confirmed orders. Allocate production lines, set cut dates, and balance workload across sewing lines. Ensure on-time delivery through intelligent scheduling."
      features={[
        "Order-to-line allocation planning",
        "Cut plan generation",
        "Sewing line balancing",
        "Delivery date-driven backward scheduling",
        "Capacity vs load visualization",
        "Multi-order line sharing",
        "Plan revision & re-scheduling",
        "Production calendar management"
      ]}
    />
  );
}
