import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

export default function PackingLists() {
  return (
    <ModulePage
      title="Packing Lists"
      module="Packing & Export"
      icon={icon}
      description="Generate detailed packing lists with carton-wise breakdown. Manage assortment packing (solid/ratio), record carton dimensions and weights, and print packing labels and barcodes."
      features={[
        "Packing list creation per order/shipment",
        "Carton-wise color/size assortment",
        "Solid pack & ratio pack support",
        "Carton dimension & weight recording",
        "Barcode/label generation per carton",
        "Packing list print (buyer format)",
        "Inner & outer carton management",
        "Container loading optimization"
      ]}
    />
  );
}
