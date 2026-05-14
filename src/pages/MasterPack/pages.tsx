/**
 * Per-master page configurations using the generic <MasterCrudPage>.
 * Each masterX export below is a thin wrapper rendering MasterCrudPage with
 * the right columns + fields. All 25 new masters live here for cohesion.
 */

import MasterCrudPage, { type ColumnDef, type FieldDef, type MasterApi } from './MasterCrudPage';
import apiClient from '../../api/client';
import {
  locationApi, rackApi, binApi, sizeApi, diaApi, itemDescriptionApi, buyerCodeApi,
  paymentTermApi, taxTypeApi, taxGroupApi, taxDeductionApi,
  voucherGroupApi, voucherTypeApi, portApi, documentTypeApi, numberSeriesApi,
  countryApi, cityApi, partyTypeApi, partyApi,
  yarnTypeApi, compositionApi, yarnApi,
  fabricStructureApi, fabricApi, attributeApi,
  processGroupApi, processApi,
  portionApi, styleComponentApi, knitTypeApi, washTypeApi,
} from '../../api/masterPack';

// Helper: load options from a masterPack API list endpoint
function loadFrom(api: { list: (params?: Record<string, unknown>) => Promise<{ data: { data: unknown[] } }> }, valueKey = 'id', labelKey = 'name', extraLabelKey?: string) {
  return async () => {
    const { data: resp } = await api.list({ limit: 500 });
    const rows = resp.data as Record<string, unknown>[];
    return rows.map((r) => {
      const label = extraLabelKey
        ? `${String(r[extraLabelKey] ?? '')} — ${String(r[labelKey] ?? '')}`
        : String(r[labelKey] ?? r['code'] ?? r['id']);
      return { value: r[valueKey] as number, label };
    });
  };
}

// Helper: load options from an arbitrary /master/* path using the authenticated client
function loadFromPath(path: string, valueKey = 'id', labelKey = 'name', extraLabelKey?: string) {
  return async () => {
    const { data: resp } = await apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>(path, { params: { limit: 500 } });
    const rows = (resp.data ?? []) as Record<string, unknown>[];
    return rows.map((r) => {
      const label = extraLabelKey
        ? `${String(r[extraLabelKey] ?? '')} — ${String(r[labelKey] ?? '')}`
        : String(r[labelKey] ?? r['code'] ?? r['id']);
      return { value: r[valueKey] as number, label };
    });
  };
}

// Common columns
const codeCol = <T extends { code?: string; processCode?: string },>(): ColumnDef<T> => ({
  key: 'code', header: 'Code', width: '140px',
  render: (r) => <span className="font-medium text-brand-500">{String(r.code ?? r.processCode ?? '—')}</span>,
});
const nameCol = <T extends { name?: string; processName?: string },>(label = 'Name'): ColumnDef<T> => ({
  key: 'name', header: label,
  render: (r) => <span className="text-gray-800 dark:text-white/90">{String(r.name ?? r.processName ?? '—')}</span>,
});
const descCol = <T extends { description?: string | null },>(): ColumnDef<T> => ({
  key: 'description', header: 'Description', className: 'text-gray-500 dark:text-gray-400',
  render: (r) => <span>{r.description ?? '—'}</span>,
});

// Common fields
const codeField = (required = true): FieldDef => ({
  name: 'code', label: 'Code', type: 'text', required, readOnlyOnEdit: true,
  placeholder: 'UNIQUE-CODE',
});
const nameField = (label = 'Name', required = true): FieldDef => ({
  name: 'name', label, type: 'text', required, placeholder: 'Display name',
});
const descField = (): FieldDef => ({
  name: 'description', label: 'Description', type: 'textarea', colSpan: 2,
});
const activeField = (): FieldDef => ({ name: 'isActive', label: 'Active', type: 'boolean' });

// ─── Phase 1 ───

export function LocationPage() {
  return <MasterCrudPage
    title="Location"
    api={locationApi as unknown as MasterApi<{ id: number; code: string; name: string; isActive?: boolean }>}
    columns={[
      codeCol(), nameCol('Location Name'),
      { key: 'company', header: 'Company', render: (r: any) => r.company?.name ?? '—' },
      { key: 'branch', header: 'Branch', render: (r: any) => r.branch?.name ?? '—' },
      descCol(),
    ]}
    fields={[
      codeField(), nameField('Location Name'),
      { name: 'companyId', label: 'Company', type: 'select', loadOptions: loadFromPath('/master/companies', 'id', 'name', 'code') },
      { name: 'branchId', label: 'Branch', type: 'select', loadOptions: loadFromPath('/master/branches', 'id', 'name', 'code') },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function RackPage() {
  return <MasterCrudPage
    title="Rack"
    api={rackApi as never}
    columns={[
      codeCol(), nameCol('Rack Name'),
      { key: 'location', header: 'Location', render: (r: any) => r.location ? `${r.location.code} — ${r.location.name}` : '—' },
      descCol(),
    ]}
    fields={[
      codeField(), nameField('Rack Name'),
      { name: 'locationId', label: 'Location', type: 'select', required: true, loadOptions: loadFrom(locationApi as never, 'id', 'name', 'code') },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function BinPage() {
  return <MasterCrudPage
    title="Bin"
    api={binApi as never}
    columns={[
      codeCol(), nameCol('Bin Name'),
      { key: 'rack', header: 'Rack', render: (r: any) => r.rack ? `${r.rack.code}` : '—' },
      { key: 'location', header: 'Location', render: (r: any) => r.rack?.location?.name ?? '—' },
      descCol(),
    ]}
    fields={[
      codeField(), nameField('Bin Name'),
      { name: 'rackId', label: 'Rack', type: 'select', required: true, loadOptions: loadFrom(rackApi as never, 'id', 'name', 'code') },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function SizePage() {
  return <MasterCrudPage
    title="Size"
    api={sizeApi as never}
    columns={[
      codeCol(), nameCol('Size Name'),
      { key: 'sizeGroup', header: 'Size Group', render: (r: any) => r.sizeGroup?.groupName ?? '—' },
      { key: 'sortOrder', header: 'Sort', width: '80px' },
    ]}
    fields={[
      codeField(), nameField('Size Name'),
      { name: 'sizeGroupId', label: 'Size Group', type: 'select', loadOptions: loadFromPath('/master/size-groups', 'id', 'groupName') },
      { name: 'sortOrder', label: 'Sort Order', type: 'number', min: 0 },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true, sortOrder: 0 }}
  />;
}

export function DiaPage() {
  return <MasterCrudPage
    title="DIA"
    api={diaApi as never}
    columns={[
      codeCol(),
      { key: 'diaValue', header: 'DIA Value', render: (r: any) => `${r.diaValue} ${r.unit}` },
      descCol(),
    ]}
    fields={[
      codeField(),
      { name: 'diaValue', label: 'DIA Value', type: 'number', required: true, step: 0.01, min: 0 },
      { name: 'unit', label: 'Unit', type: 'text', placeholder: 'INCH' },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true, unit: 'INCH' }}
  />;
}

export function ItemDescriptionPage() {
  return <MasterCrudPage
    title="Item Description"
    api={itemDescriptionApi as never}
    columns={[
      codeCol(),
      { key: 'description', header: 'Description', render: (r: any) => r.description },
      { key: 'category', header: 'Category' },
    ]}
    fields={[
      codeField(),
      { name: 'description', label: 'Description', type: 'text', required: true, colSpan: 2 },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
      activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function BuyerCodePage() {
  return <MasterCrudPage
    title="Buyer Code"
    api={buyerCodeApi as never}
    columns={[
      { key: 'buyer', header: 'Buyer', render: (r: any) => r.buyer ? `${r.buyer.code} — ${r.buyer.name}` : '—' },
      { key: 'referenceCode', header: 'Reference Code', render: (r: any) => <span className="font-medium">{r.referenceCode}</span> },
      descCol(),
    ]}
    fields={[
      { name: 'buyerId', label: 'Buyer', type: 'select', required: true, loadOptions: loadFromPath('/master/buyers', 'id', 'name', 'code') },
      { name: 'referenceCode', label: 'Reference Code', type: 'text', required: true, colSpan: 2 },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function PaymentTermPage() {
  return <MasterCrudPage
    title="Payment Term"
    api={paymentTermApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'creditDays', header: 'Credit Days', width: '110px' },
      descCol(),
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'creditDays', label: 'Credit Days', type: 'number', min: 0 },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true, creditDays: 0 }}
  />;
}

export function TaxTypePage() {
  return <MasterCrudPage
    title="Tax Type"
    api={taxTypeApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'ratePct', header: 'Rate %', render: (r: any) => `${Number(r.ratePct).toFixed(3)}%` },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'ratePct', label: 'Rate %', type: 'number', required: true, min: 0, max: 100, step: 0.01 },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true, ratePct: 0 }}
  />;
}

export function TaxGroupPage() {
  return <MasterCrudPage
    title="Tax Group"
    api={taxGroupApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'taxLinks', header: 'Tax Types', render: (r: any) => (r.taxLinks ?? []).map((l: any) => l.taxType?.code).join(', ') || '—' },
    ]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function TaxDeductionPage() {
  return <MasterCrudPage
    title="Tax Deduction"
    api={taxDeductionApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'ratePct', header: 'Rate %', render: (r: any) => `${Number(r.ratePct).toFixed(3)}%` },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'ratePct', label: 'Rate %', type: 'number', required: true, min: 0, max: 100, step: 0.01 },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true, ratePct: 0 }}
  />;
}

export function VoucherGroupPage() {
  return <MasterCrudPage
    title="Voucher Group"
    api={voucherGroupApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'types', header: 'Voucher Types', render: (r: any) => (r.types ?? []).map((t: any) => t.code).join(', ') || '—' },
    ]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function VoucherTypePage() {
  return <MasterCrudPage
    title="Voucher Type"
    api={voucherTypeApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'group', header: 'Group', render: (r: any) => r.group?.code ?? '—' },
      { key: 'prefix', header: 'Prefix', width: '80px' },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'voucherGroupId', label: 'Voucher Group', type: 'select', required: true, loadOptions: loadFrom(voucherGroupApi as never, 'id', 'name', 'code') },
      { name: 'prefix', label: 'Prefix', type: 'text', placeholder: 'JV' },
      { name: 'numberingPattern', label: 'Numbering Pattern', type: 'text', placeholder: 'JV-{YYYY}-####' },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function PortPage() {
  return <MasterCrudPage
    title="Port"
    api={portApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'country', header: 'Country', width: '90px' },
      { key: 'portType', header: 'Type', width: '90px' },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'country', label: 'Country (ISO3)', type: 'text', placeholder: 'IND' },
      { name: 'portType', label: 'Port Type', type: 'select', required: true, options: [
        { value: 'SEA', label: 'Sea' }, { value: 'AIR', label: 'Air' }, { value: 'INLAND', label: 'Inland' },
      ] },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true, portType: 'SEA' }}
  />;
}

export function DocumentTypePage() {
  return <MasterCrudPage
    title="Document Type"
    api={documentTypeApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'moduleName', header: 'Module', width: '130px' },
      { key: 'mandatory', header: 'Mandatory', width: '100px', render: (r: any) => r.mandatory ? 'Yes' : 'No' },
      { key: 'fileTypes', header: 'File Types', width: '130px' },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'moduleName', label: 'Module', type: 'text', required: true, placeholder: 'ORDERS' },
      { name: 'mandatory', label: 'Mandatory', type: 'boolean' },
      { name: 'fileTypes', label: 'Allowed File Types', type: 'text', placeholder: 'pdf,xlsx' },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true, mandatory: false }}
  />;
}

export function NumberSeriesPage() {
  return <MasterCrudPage
    title="Number Series"
    api={numberSeriesApi as never}
    columns={[
      { key: 'entityType', header: 'Entity', render: (r: any) => <span className="font-medium">{r.entityType}</span> },
      { key: 'prefix', header: 'Prefix', width: '100px' },
      { key: 'padding', header: 'Padding', width: '90px' },
      { key: 'current', header: 'Current #', width: '110px' },
    ]}
    fields={[
      { name: 'entityType', label: 'Entity Type', type: 'text', required: true, readOnlyOnEdit: true },
      { name: 'prefix', label: 'Prefix', type: 'text' },
      { name: 'padding', label: 'Padding', type: 'number', min: 0, max: 10 },
      { name: 'current', label: 'Current Number', type: 'number', min: 0 },
    ]}
    defaults={{ prefix: '', padding: 4, current: 0 }}
  />;
}

// ─── Phase 2 ───

export function CountryPage() {
  return <MasterCrudPage
    title="Country"
    api={countryApi as never}
    columns={[
      codeCol(), { key: 'iso2', header: 'ISO2', width: '80px' }, nameCol(),
      { key: 'currency', header: 'Currency', render: (r: any) => r.currency?.code ?? '—' },
      { key: 'phoneCode', header: 'Phone Code', width: '110px' },
    ]}
    fields={[
      codeField(),
      { name: 'iso2', label: 'ISO2', type: 'text', placeholder: 'IN', helperText: '2-letter code' },
      nameField('Country Name'),
      { name: 'currencyId', label: 'Currency', type: 'select', loadOptions: loadFromPath('/master/currencies', 'id', 'code') },
      { name: 'phoneCode', label: 'Phone Code', type: 'text', placeholder: '+91' },
      activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function CityPage() {
  return <MasterCrudPage
    title="City"
    api={cityApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'state', header: 'State', render: (r: any) => r.state ? `${r.state.code} — ${r.state.name}` : '—' },
      { key: 'pinCode', header: 'PIN', width: '100px' },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'stateId', label: 'State', type: 'select', required: true, loadOptions: loadFromPath('/master/states', 'id', 'name', 'code') },
      { name: 'pinCode', label: 'PIN Code', type: 'text' },
      activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function PartyTypePage() {
  return <MasterCrudPage
    title="Party Type"
    api={partyTypeApi as never}
    columns={[codeCol(), nameCol(), descCol()]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function PartyPage() {
  return <MasterCrudPage
    title="Party"
    api={partyApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'partyType', header: 'Type', render: (r: any) => r.partyType?.code ?? '—' },
      { key: 'contactPerson', header: 'Contact' },
      { key: 'phone', header: 'Phone', width: '140px' },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'partyTypeId', label: 'Party Type', type: 'select', required: true, loadOptions: loadFrom(partyTypeApi as never, 'id', 'name', 'code') },
      { name: 'contactPerson', label: 'Contact Person', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'gstin', label: 'GSTIN', type: 'text' },
      { name: 'pan', label: 'PAN', type: 'text' },
      { name: 'countryId', label: 'Country', type: 'select', loadOptions: loadFrom(countryApi as never, 'id', 'name') },
      { name: 'stateId', label: 'State', type: 'select', loadOptions: loadFromPath('/master/states', 'id', 'name') },
      activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function YarnTypePage() {
  return <MasterCrudPage title="Yarn Type" api={yarnTypeApi as never}
    columns={[codeCol(), nameCol(), descCol()]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function CompositionPage() {
  return <MasterCrudPage title="Composition" api={compositionApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'items', header: 'Fibers', render: (r: any) => (r.items ?? []).map((i: any) => `${i.fiberName} ${i.percentage}%`).join(' / ') || '—' },
    ]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function YarnPage() {
  return <MasterCrudPage title="Yarn" api={yarnApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'yarnType', header: 'Type', render: (r: any) => r.yarnType?.code ?? '—' },
      { key: 'composition', header: 'Composition', render: (r: any) => r.composition?.code ?? '—' },
      { key: 'count', header: 'Count', render: (r: any) => r.count?.code ?? '—' },
    ]}
    fields={[
      codeField(), nameField(),
      { name: 'yarnTypeId', label: 'Yarn Type', type: 'select', required: true, loadOptions: loadFrom(yarnTypeApi as never, 'id', 'name', 'code') },
      { name: 'compositionId', label: 'Composition', type: 'select', loadOptions: loadFrom(compositionApi as never, 'id', 'name', 'code') },
      { name: 'countId', label: 'Count', type: 'select', loadOptions: loadFromPath('/master/counts', 'id', 'name', 'code') },
      { name: 'uomId', label: 'UOM', type: 'select', loadOptions: loadFromPath('/master/units', 'id', 'name', 'code') },
      { name: 'hsCodeId', label: 'HSN Code', type: 'select', loadOptions: loadFromPath('/master/hs-codes', 'id', 'code') },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function FabricStructurePage() {
  return <MasterCrudPage title="Fabric Structure" api={fabricStructureApi as never}
    columns={[codeCol(), nameCol(), descCol()]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function FabricPage() {
  return <MasterCrudPage title="Fabric" api={fabricApi as never}
    columns={[
      { key: 'material', header: 'Material', render: (r: any) => r.material ? `${r.material.materialCode}` : '—' },
      { key: 'materialName', header: 'Name', render: (r: any) => r.material?.materialName ?? '—' },
      { key: 'yarn', header: 'Yarn', render: (r: any) => r.yarn?.code ?? '—' },
      { key: 'composition', header: 'Composition', render: (r: any) => r.composition?.code ?? '—' },
      { key: 'fabricStructure', header: 'Structure', render: (r: any) => r.fabricStructure?.code ?? '—' },
      { key: 'gsm', header: 'GSM' },
    ]}
    fields={[
      { name: 'materialId', label: 'Material', type: 'select', required: true, readOnlyOnEdit: true,
        loadOptions: loadFromPath('/master/materials', 'id', 'materialName', 'materialCode'),
        helperText: 'Must be SHELL_FABRIC / LINING / INTERLINING' },
      { name: 'yarnId', label: 'Yarn', type: 'select', loadOptions: loadFrom(yarnApi as never, 'id', 'name', 'code') },
      { name: 'compositionId', label: 'Composition', type: 'select', loadOptions: loadFrom(compositionApi as never, 'id', 'name', 'code') },
      { name: 'fabricStructureId', label: 'Structure', type: 'select', loadOptions: loadFrom(fabricStructureApi as never, 'id', 'name', 'code') },
      { name: 'diaId', label: 'DIA', type: 'select', loadOptions: loadFrom(diaApi as never, 'id', 'code') },
      { name: 'gsm', label: 'GSM', type: 'number', step: 0.01, min: 0 },
      { name: 'width', label: 'Width', type: 'number', step: 0.01, min: 0 },
      { name: 'finishType', label: 'Finish Type', type: 'text' },
      { name: 'shrinkagePct', label: 'Shrinkage %', type: 'number', step: 0.01, min: 0, max: 100 },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

export function AttributePage() {
  return <MasterCrudPage title="Attribute" api={attributeApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'values', header: 'Values', render: (r: any) => (r.values ?? []).map((v: any) => v.code).join(', ') || '—' },
    ]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
    headerActions={<span className="text-xs text-gray-500">Edit Attribute → manage values via API or future drawer</span>}
  />;
}

export function ProcessGroupPage() {
  return <MasterCrudPage title="Process Group" api={processGroupApi as never}
    columns={[
      codeCol(), nameCol(),
      { key: 'sequence', header: 'Sequence', width: '110px' },
      { key: 'processes', header: 'Processes', render: (r: any) => (r.processes ?? []).map((p: any) => p.processCode).join(', ') || '—' },
    ]}
    fields={[codeField(), nameField(),
      { name: 'sequence', label: 'Sequence', type: 'number', min: 0 },
      descField(), activeField()]}
    defaults={{ isActive: true, sequence: 0 }}
  />;
}

export function ProcessPage() {
  return <MasterCrudPage title="Process" api={processApi as never}
    columns={[
      { key: 'processCode', header: 'Code', width: '140px', render: (r: any) => <span className="font-medium text-brand-500">{r.processCode}</span> },
      { key: 'processName', header: 'Name', render: (r: any) => r.processName },
      { key: 'processType', header: 'Type', width: '120px' },
      { key: 'processGroup', header: 'Group', render: (r: any) => r.processGroup?.code ?? '—' },
      { key: 'defaultSam', header: 'Default SAM', width: '110px' },
    ]}
    fields={[
      { name: 'processCode', label: 'Process Code', type: 'text', required: true, readOnlyOnEdit: true },
      { name: 'processName', label: 'Process Name', type: 'text', required: true },
      { name: 'processType', label: 'Process Type', type: 'select', required: true, options: [
        { value: 'CUTTING', label: 'Cutting' }, { value: 'SEWING', label: 'Sewing' },
        { value: 'WASHING', label: 'Washing' }, { value: 'PRINTING', label: 'Printing' },
        { value: 'EMBROIDERY', label: 'Embroidery' }, { value: 'FINISHING', label: 'Finishing' },
        { value: 'PACKING', label: 'Packing' }, { value: 'OTHER', label: 'Other' },
      ]},
      { name: 'processGroupId', label: 'Process Group', type: 'select', loadOptions: loadFrom(processGroupApi as never, 'id', 'name', 'code') },
      { name: 'sequence', label: 'Sequence', type: 'number', min: 0 },
      { name: 'defaultSam', label: 'Default SAM', type: 'number', step: 0.01, min: 0 },
      descField(), activeField(),
    ]}
    defaults={{ isActive: true }}
  />;
}

// ─── Fabric Consumption Masters ───

export function PortionPage() {
  return <MasterCrudPage
    title="Portion"
    api={portionApi as never}
    columns={[codeCol(), nameCol(), descCol()]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function StyleComponentPage() {
  return <MasterCrudPage
    title="Style Component"
    api={styleComponentApi as never}
    columns={[codeCol(), nameCol(), descCol()]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function KnitTypePage() {
  return <MasterCrudPage
    title="Knit Type"
    api={knitTypeApi as never}
    columns={[codeCol(), nameCol(), descCol()]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}

export function WashTypePage() {
  return <MasterCrudPage
    title="Wash Type"
    api={washTypeApi as never}
    columns={[codeCol(), nameCol(), descCol()]}
    fields={[codeField(), nameField(), descField(), activeField()]}
    defaults={{ isActive: true }}
  />;
}
