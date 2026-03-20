import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ExportDocuments() {
  return (
    <ModulePage
      title="Export Documentation"
      module="Packing & Export"
      icon={icon}
      description="Prepare all export documentation including commercial invoices, bills of lading, certificates of origin, and GSP forms. Manage shipping schedules, vessel bookings, and customs compliance."
      features={[
        "Commercial invoice generation",
        "Bill of Lading / Airway Bill creation",
        "Certificate of Origin preparation",
        "GSP Form A generation",
        "Shipping instruction management",
        "Vessel/flight booking tracker",
        "Pre-shipment document checklist",
        "LC/payment term document compliance"
      ]}
    />
  );
}
