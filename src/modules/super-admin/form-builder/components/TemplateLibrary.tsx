/**
 * TemplateLibrary – Browse and use pre-built form templates
 * Lets users start from a template instead of a blank form,
 * save existing forms as reusable templates, and manage custom templates.
 */

import { useState, useEffect } from 'react';
import {
  fetchTemplates,
  useTemplate as applyTemplate,
  deleteTemplate,
  saveFormAsTemplate,
  type FormTemplate,
} from '../../api/formBuilderApi';
import { useFormBuilderStore } from '../store';
import { toast } from 'sonner';

// ─── Built-in templates (seeded client-side when API has none) ──

const BUILTIN_TEMPLATES: Array<{
  name: string;
  category: string;
  icon: string;
  description: string;
  snapshot: Record<string, unknown>;
}> = [
  {
    name: 'Contact Us',
    category: 'general',
    icon: '📬',
    description: 'Simple contact form with name, email, and message',
    snapshot: {
      name: 'Contact Us',
      description: 'Get in touch with us',
      layout: 'single',
      settings: { submitButtonText: 'Send Message', successMessage: 'Thank you for reaching out! We will get back to you soon.' },
      sections: [{
        title: 'Contact Details',
        fields: [
          { type: 'text', label: 'Full Name', name: 'full_name', width: 'full', validation: { required: true } },
          { type: 'email', label: 'Email Address', name: 'email', width: 'half', validation: { required: true } },
          { type: 'phone', label: 'Phone Number', name: 'phone', width: 'half' },
          { type: 'select', label: 'Subject', name: 'subject', width: 'full', options: [
            { label: 'General Inquiry', value: 'general' },
            { label: 'Support', value: 'support' },
            { label: 'Feedback', value: 'feedback' },
            { label: 'Partnership', value: 'partnership' },
          ]},
          { type: 'textarea', label: 'Message', name: 'message', validation: { required: true, minLength: 10 } },
        ],
      }],
    },
  },
  {
    name: 'Employee Onboarding',
    category: 'hr',
    icon: '👤',
    description: 'New hire information collection form',
    snapshot: {
      name: 'Employee Onboarding',
      description: 'Welcome! Please fill in your details for HR records.',
      layout: 'single',
      settings: { submitButtonText: 'Submit', wizardMode: true, showProgressBar: true },
      sections: [
        {
          title: 'Personal Information',
          fields: [
            { type: 'text', label: 'First Name', name: 'first_name', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Last Name', name: 'last_name', width: 'half', validation: { required: true } },
            { type: 'email', label: 'Personal Email', name: 'personal_email', width: 'half', validation: { required: true } },
            { type: 'phone', label: 'Phone', name: 'phone', width: 'half', validation: { required: true } },
            { type: 'date', label: 'Date of Birth', name: 'dob', width: 'half', validation: { required: true } },
            { type: 'select', label: 'Gender', name: 'gender', width: 'half', options: [
              { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' },
            ]},
          ],
        },
        {
          title: 'Employment Details',
          fields: [
            { type: 'text', label: 'Department', name: 'department', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Designation', name: 'designation', width: 'half', validation: { required: true } },
            { type: 'date', label: 'Joining Date', name: 'joining_date', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Reporting Manager', name: 'manager', width: 'half' },
          ],
        },
        {
          title: 'Documents',
          fields: [
            { type: 'file', label: 'Resume / CV', name: 'resume', validation: { required: true } },
            { type: 'image', label: 'Passport Photo', name: 'photo', validation: { required: true } },
            { type: 'file', label: 'ID Proof', name: 'id_proof' },
            { type: 'signature', label: 'Signature', name: 'signature', validation: { required: true } },
          ],
        },
      ],
    },
  },
  {
    name: 'Customer Feedback',
    category: 'general',
    icon: '⭐',
    description: 'Collect customer satisfaction ratings and feedback',
    snapshot: {
      name: 'Customer Feedback',
      description: 'We value your feedback! Please rate your experience.',
      layout: 'single',
      settings: { submitButtonText: 'Submit Feedback', successMessage: 'Thank you for your feedback!' },
      sections: [{
        title: 'Your Experience',
        fields: [
          { type: 'text', label: 'Your Name', name: 'name', width: 'half' },
          { type: 'email', label: 'Email (optional)', name: 'email', width: 'half' },
          { type: 'rating', label: 'Overall Satisfaction', name: 'overall_rating', validation: { required: true, max: 5 } },
          { type: 'rating', label: 'Product Quality', name: 'quality_rating', validation: { max: 5 } },
          { type: 'rating', label: 'Customer Service', name: 'service_rating', validation: { max: 5 } },
          { type: 'select', label: 'How did you find us?', name: 'source', options: [
            { label: 'Search Engine', value: 'search' },
            { label: 'Social Media', value: 'social' },
            { label: 'Word of Mouth', value: 'referral' },
            { label: 'Advertisement', value: 'ad' },
          ]},
          { type: 'textarea', label: 'Additional Comments', name: 'comments', placeholder: 'Tell us more about your experience...' },
          { type: 'checkbox', label: 'I would recommend this to others', name: 'recommend' },
        ],
      }],
    },
  },
  {
    name: 'Purchase Order',
    category: 'business',
    icon: '📦',
    description: 'Standard purchase order request form',
    snapshot: {
      name: 'Purchase Order Request',
      description: 'Submit a purchase order for approval',
      layout: 'single',
      settings: { submitButtonText: 'Submit PO', requireAuth: true },
      sections: [
        {
          title: 'Order Information',
          fields: [
            { type: 'text', label: 'PO Number', name: 'po_number', width: 'half', validation: { required: true } },
            { type: 'date', label: 'Order Date', name: 'order_date', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Vendor Name', name: 'vendor', width: 'half', validation: { required: true } },
            { type: 'date', label: 'Required By', name: 'required_date', width: 'half' },
          ],
        },
        {
          title: 'Items',
          fields: [
            { type: 'text', label: 'Item Description', name: 'item_desc', validation: { required: true } },
            { type: 'number', label: 'Quantity', name: 'qty', width: 'third', validation: { required: true, min: 1 } },
            { type: 'number', label: 'Unit Price', name: 'unit_price', width: 'third', validation: { required: true, min: 0 } },
            { type: 'calculated', label: 'Line Total', name: 'line_total', width: 'third', readOnly: true, calculated: { formula: '{qty} * {unit_price}', outputFormat: 'currency', precision: 2 } },
            { type: 'textarea', label: 'Notes / Special Instructions', name: 'notes' },
          ],
        },
      ],
    },
  },
  {
    name: 'Event Registration',
    category: 'general',
    icon: '🎫',
    description: 'Event signup with scheduling and limits',
    snapshot: {
      name: 'Event Registration',
      description: 'Register for the upcoming event',
      layout: 'single',
      settings: { submitButtonText: 'Register', maxSubmissions: 100 },
      sections: [{
        title: 'Registration',
        fields: [
          { type: 'text', label: 'Full Name', name: 'name', validation: { required: true } },
          { type: 'email', label: 'Email', name: 'email', width: 'half', validation: { required: true } },
          { type: 'phone', label: 'Phone', name: 'phone', width: 'half' },
          { type: 'text', label: 'Organization', name: 'org', width: 'half' },
          { type: 'select', label: 'Ticket Type', name: 'ticket', width: 'half', options: [
            { label: 'General Admission', value: 'general' },
            { label: 'VIP', value: 'vip' },
            { label: 'Student', value: 'student' },
          ], validation: { required: true } },
          { type: 'textarea', label: 'Dietary Requirements', name: 'dietary' },
          { type: 'checkbox', label: 'I agree to the terms and conditions', name: 'agree_terms', validation: { required: true } },
        ],
      }],
    },
  },
  // ── Apparel Industry Templates ──────────────────────────
  {
    name: 'Fabric Master',
    category: 'apparel',
    icon: '🧵',
    description: 'Master record for fabric types with composition, GSM, and width',
    snapshot: {
      name: 'Fabric Master',
      description: 'Register or update fabric details for production',
      layout: 'single',
      settings: { submitButtonText: 'Save Fabric', requireAuth: true },
      sections: [
        {
          title: 'Fabric Details',
          fields: [
            { type: 'text', label: 'Fabric Code', name: 'fabric_code', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Fabric Name', name: 'fabric_name', width: 'half', validation: { required: true } },
            { type: 'select', label: 'Fabric Type', name: 'fabric_type', width: 'half', options: [
              { label: 'Woven', value: 'woven' }, { label: 'Knit', value: 'knit' },
              { label: 'Non-Woven', value: 'non_woven' }, { label: 'Denim', value: 'denim' },
            ], validation: { required: true } },
            { type: 'text', label: 'Composition', name: 'composition', width: 'half', placeholder: 'e.g. 60% Cotton 40% Polyester' },
            { type: 'number', label: 'GSM', name: 'gsm', width: 'third', validation: { required: true, min: 50, max: 600 } },
            { type: 'number', label: 'Width (inches)', name: 'width_inches', width: 'third', validation: { min: 36, max: 120 } },
            { type: 'number', label: 'Weight/Meter (gm)', name: 'weight_per_meter', width: 'third' },
            { type: 'text', label: 'Construction', name: 'construction', placeholder: 'e.g. 40x40 / 133x72' },
            { type: 'text', label: 'Finish Type', name: 'finish_type', width: 'half', placeholder: 'e.g. Enzyme Wash, Peach Finish' },
            { type: 'text', label: 'Supplier / Mill', name: 'supplier_mill', width: 'half' },
            { type: 'textarea', label: 'Remarks', name: 'remarks' },
          ],
        },
      ],
    },
  },
  {
    name: 'Trim / Accessory Master',
    category: 'apparel',
    icon: '🪡',
    description: 'Record trims and accessories — buttons, zippers, labels, threads, etc.',
    snapshot: {
      name: 'Trim / Accessory Master',
      description: 'Register trims and accessories for BOM costing',
      layout: 'single',
      settings: { submitButtonText: 'Save Trim', requireAuth: true },
      sections: [
        {
          title: 'Trim Details',
          fields: [
            { type: 'text', label: 'Trim Code', name: 'trim_code', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Trim Name', name: 'trim_name', width: 'half', validation: { required: true } },
            { type: 'select', label: 'Category', name: 'trim_category', width: 'half', options: [
              { label: 'Button', value: 'button' }, { label: 'Zipper', value: 'zipper' },
              { label: 'Label', value: 'label' }, { label: 'Thread', value: 'thread' },
              { label: 'Interlining', value: 'interlining' }, { label: 'Elastic', value: 'elastic' },
              { label: 'Tape', value: 'tape' }, { label: 'Hanger', value: 'hanger' },
              { label: 'Polybag', value: 'polybag' }, { label: 'Carton', value: 'carton' },
              { label: 'Other', value: 'other' },
            ], validation: { required: true } },
            { type: 'select', label: 'UOM', name: 'uom', width: 'half', options: [
              { label: 'Pieces', value: 'pcs' }, { label: 'Meters', value: 'mtr' },
              { label: 'Yards', value: 'yds' }, { label: 'Kilograms', value: 'kg' },
              { label: 'Gross', value: 'gross' }, { label: 'Dozen', value: 'doz' },
            ] },
            { type: 'text', label: 'Size / Specification', name: 'size_spec', width: 'half' },
            { type: 'text', label: 'Color', name: 'color', width: 'half' },
            { type: 'number', label: 'Rate / Unit', name: 'rate_per_unit', width: 'half' },
            { type: 'text', label: 'Supplier', name: 'supplier', width: 'half' },
            { type: 'textarea', label: 'Remarks', name: 'remarks' },
          ],
        },
      ],
    },
  },
  {
    name: 'Fabric Inspection (4-Point)',
    category: 'apparel',
    icon: '🔍',
    description: '4-point fabric inspection form with defect logging and pass/fail',
    snapshot: {
      name: 'Fabric Inspection Report',
      description: 'Inspect incoming fabric lots using the 4-point system',
      layout: 'single',
      settings: { submitButtonText: 'Submit Inspection', requireAuth: true },
      sections: [
        {
          title: 'Lot Information',
          fields: [
            { type: 'text', label: 'Inspection No.', name: 'inspection_no', width: 'half', validation: { required: true } },
            { type: 'date', label: 'Inspection Date', name: 'inspection_date', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Fabric Code', name: 'fabric_code', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Supplier / Mill', name: 'supplier', width: 'half' },
            { type: 'text', label: 'Lot / Roll No.', name: 'lot_no', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Order Reference', name: 'order_ref', width: 'half' },
            { type: 'number', label: 'Total Length (m)', name: 'total_length', width: 'third', validation: { required: true } },
            { type: 'number', label: 'Width (inches)', name: 'width', width: 'third' },
            { type: 'number', label: 'No. of Rolls', name: 'roll_count', width: 'third' },
          ],
        },
        {
          title: 'Defect Points',
          fields: [
            { type: 'number', label: '1-Point Defects (≤3")', name: 'points_1', width: 'half', validation: { min: 0 } },
            { type: 'number', label: '2-Point Defects (3"–6")', name: 'points_2', width: 'half', validation: { min: 0 } },
            { type: 'number', label: '3-Point Defects (6"–9")', name: 'points_3', width: 'half', validation: { min: 0 } },
            { type: 'number', label: '4-Point Defects (>9")', name: 'points_4', width: 'half', validation: { min: 0 } },
            { type: 'calculated', label: 'Total Points', name: 'total_points', readOnly: true, calculated: { formula: '({points_1}*1) + ({points_2}*2) + ({points_3}*3) + ({points_4}*4)', outputFormat: 'number', precision: 0 } },
            { type: 'calculated', label: 'Points/100 sq yd', name: 'points_per_100', readOnly: true, calculated: { formula: '({total_points} * 3600) / ({total_length} * {width})', outputFormat: 'number', precision: 2 } },
          ],
        },
        {
          title: 'Verdict',
          fields: [
            { type: 'select', label: 'Result', name: 'result', width: 'half', options: [
              { label: 'Pass (≤40 pts/100 sq yd)', value: 'pass' },
              { label: 'Fail', value: 'fail' },
              { label: 'Conditional Accept', value: 'conditional' },
            ], validation: { required: true } },
            { type: 'textarea', label: 'Inspector Remarks', name: 'inspector_remarks' },
            { type: 'signature', label: 'Inspector Signature', name: 'inspector_sign', validation: { required: true } },
          ],
        },
      ],
    },
  },
  {
    name: 'Garment Measurement Sheet',
    category: 'apparel',
    icon: '📏',
    description: 'Record garment measurements against tolerance for QC',
    snapshot: {
      name: 'Measurement Sheet',
      description: 'Verify garment measurements against buyer specs',
      layout: 'single',
      settings: { submitButtonText: 'Save Measurements', requireAuth: true },
      sections: [
        {
          title: 'Order Details',
          fields: [
            { type: 'text', label: 'Style No.', name: 'style_no', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Buyer', name: 'buyer', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Size', name: 'size', width: 'third', validation: { required: true } },
            { type: 'text', label: 'Color', name: 'color', width: 'third' },
            { type: 'date', label: 'Check Date', name: 'check_date', width: 'third', validation: { required: true } },
          ],
        },
        {
          title: 'Measurements (cm)',
          fields: [
            { type: 'number', label: 'Chest', name: 'chest_actual', width: 'third', validation: { required: true } },
            { type: 'number', label: 'Chest Spec', name: 'chest_spec', width: 'third' },
            { type: 'calculated', label: 'Chest Diff', name: 'chest_diff', width: 'third', readOnly: true, calculated: { formula: '{chest_actual} - {chest_spec}', outputFormat: 'number', precision: 1 } },
            { type: 'number', label: 'Body Length', name: 'body_length_actual', width: 'third', validation: { required: true } },
            { type: 'number', label: 'Body Length Spec', name: 'body_length_spec', width: 'third' },
            { type: 'calculated', label: 'Length Diff', name: 'body_length_diff', width: 'third', readOnly: true, calculated: { formula: '{body_length_actual} - {body_length_spec}', outputFormat: 'number', precision: 1 } },
            { type: 'number', label: 'Sleeve Length', name: 'sleeve_actual', width: 'third' },
            { type: 'number', label: 'Sleeve Spec', name: 'sleeve_spec', width: 'third' },
            { type: 'calculated', label: 'Sleeve Diff', name: 'sleeve_diff', width: 'third', readOnly: true, calculated: { formula: '{sleeve_actual} - {sleeve_spec}', outputFormat: 'number', precision: 1 } },
            { type: 'number', label: 'Shoulder', name: 'shoulder_actual', width: 'third' },
            { type: 'number', label: 'Shoulder Spec', name: 'shoulder_spec', width: 'third' },
            { type: 'calculated', label: 'Shoulder Diff', name: 'shoulder_diff', width: 'third', readOnly: true, calculated: { formula: '{shoulder_actual} - {shoulder_spec}', outputFormat: 'number', precision: 1 } },
          ],
        },
        {
          title: 'Verdict',
          fields: [
            { type: 'select', label: 'Status', name: 'status', width: 'half', options: [
              { label: 'Within Tolerance', value: 'pass' },
              { label: 'Out of Tolerance', value: 'fail' },
              { label: 'Rework', value: 'rework' },
            ], validation: { required: true } },
            { type: 'textarea', label: 'Remarks', name: 'remarks' },
            { type: 'signature', label: 'QC Signature', name: 'qc_sign' },
          ],
        },
      ],
    },
  },
  {
    name: 'Wash Care / Lab Test Request',
    category: 'apparel',
    icon: '🧪',
    description: 'Submit fabric/garment samples for lab testing and wash care approval',
    snapshot: {
      name: 'Lab Test Request',
      description: 'Submit sample for lab testing and wash care certification',
      layout: 'single',
      settings: { submitButtonText: 'Submit Request', requireAuth: true },
      sections: [
        {
          title: 'Sample Info',
          fields: [
            { type: 'text', label: 'Request No.', name: 'request_no', width: 'half', validation: { required: true } },
            { type: 'date', label: 'Request Date', name: 'request_date', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Style / Article', name: 'style_article', width: 'half', validation: { required: true } },
            { type: 'text', label: 'Buyer', name: 'buyer', width: 'half' },
            { type: 'text', label: 'Fabric Code', name: 'fabric_code', width: 'half' },
            { type: 'text', label: 'Color', name: 'color', width: 'half' },
          ],
        },
        {
          title: 'Tests Required',
          fields: [
            { type: 'checkbox', label: 'Shrinkage Test', name: 'test_shrinkage' },
            { type: 'checkbox', label: 'Color Fastness – Washing', name: 'test_cf_wash' },
            { type: 'checkbox', label: 'Color Fastness – Rubbing (Wet/Dry)', name: 'test_cf_rub' },
            { type: 'checkbox', label: 'Color Fastness – Light', name: 'test_cf_light' },
            { type: 'checkbox', label: 'Tensile Strength', name: 'test_tensile' },
            { type: 'checkbox', label: 'Pilling Resistance', name: 'test_pilling' },
            { type: 'checkbox', label: 'GSM Verification', name: 'test_gsm' },
            { type: 'checkbox', label: 'pH Test', name: 'test_ph' },
            { type: 'checkbox', label: 'Formaldehyde Content', name: 'test_formaldehyde' },
            { type: 'checkbox', label: 'AZO Dye (Restricted Substances)', name: 'test_azo' },
          ],
        },
        {
          title: 'Additional',
          fields: [
            { type: 'text', label: 'Lab Name', name: 'lab_name', width: 'half' },
            { type: 'date', label: 'Expected Report Date', name: 'expected_date', width: 'half' },
            { type: 'file', label: 'Attach Reference Docs', name: 'reference_docs' },
            { type: 'textarea', label: 'Special Instructions', name: 'instructions' },
          ],
        },
      ],
    },
  },
];

// ─── Categories ──────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'All Templates' },
  { value: 'apparel', label: '👔 Apparel' },
  { value: 'general', label: '📋 General' },
  { value: 'hr', label: '👤 HR' },
  { value: 'business', label: '💼 Business' },
  { value: 'custom', label: '⭐ My Templates' },
];

// ─── Component ───────────────────────────────────────────────

interface TemplateLibraryProps {
  onClose: () => void;
  onFormCreated?: () => void;
}

export default function TemplateLibrary({ onClose, onFormCreated }: TemplateLibraryProps) {
  const { activeForm } = useFormBuilderStore();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [creating, setCreating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const apiTemplates = await fetchTemplates();
      setTemplates(apiTemplates);
    } catch {
      setTemplates([]);
    }
    setLoading(false);
  };

  const handleUseTemplate = async (template: FormTemplate) => {
    setCreating(template.id);
    try {
      await applyTemplate(template.id);
      toast.success(`Form created from "${template.name}" template!`);
      onFormCreated?.();
      onClose();
    } catch {
      toast.error('Failed to create form from template');
    }
    setCreating(null);
  };

  const handleUseBuiltin = async (builtin: typeof BUILTIN_TEMPLATES[0]) => {
    setCreating(builtin.name);
    try {
      // Import directly as a new form
      const { importFormJson } = await import('../../api/formBuilderApi');
      await importFormJson(builtin.snapshot as Record<string, unknown>);
      toast.success(`Form created from "${builtin.name}" template!`);
      onFormCreated?.();
      onClose();
    } catch {
      toast.error('Failed to create form from template');
    }
    setCreating(null);
  };

  const handleSaveAsTemplate = async () => {
    if (!activeForm) return;
    setSaving(true);
    try {
      await saveFormAsTemplate(activeForm);
      toast.success('Form saved as template!');
      await loadTemplates();
    } catch {
      toast.error('Failed to save template');
    }
    setSaving(false);
  };

  const handleDeleteTemplate = (id: string) => {
    toast.warning('Delete this template? This cannot be undone.', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteTemplate(id);
            toast.success('Template deleted');
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          } catch {
            toast.error('Failed to delete template');
          }
        },
      },
      duration: 8000,
    });
  };

  // Combine built-in templates + API templates
  const filteredBuiltins = BUILTIN_TEMPLATES.filter(
    (b) => category === 'all' || b.category === category,
  );
  const filteredApi = templates.filter(
    (t) => category === 'all' || t.category === category || (category === 'custom' && !t.isSystem),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Template library">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">📚 Template Library</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Start with a pre-built template or save your forms as reusable templates
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeForm && (
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={saving}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {saving ? 'Saving…' : '💾 Save Current as Template'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 border-b border-gray-200 px-6 py-3 dark:border-gray-700 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                category === cat.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-gray-400">Loading templates…</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Built-in templates */}
              {filteredBuiltins.map((bt) => (
                <div
                  key={bt.name}
                  className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">{bt.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{bt.name}</h3>
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {bt.category}
                      </span>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {bt.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleUseBuiltin(bt)}
                    disabled={creating === bt.name}
                    className="w-full rounded-lg bg-blue-50 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                  >
                    {creating === bt.name ? 'Creating…' : 'Use Template'}
                  </button>
                </div>
              ))}

              {/* API (user/system) templates */}
              {filteredApi.map((t) => (
                <div
                  key={t.id}
                  className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{t.name}</h3>
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        {t.isSystem ? 'system' : 'custom'}
                      </span>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {t.description || 'Custom template'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(t)}
                      disabled={creating === t.id}
                      className="flex-1 rounded-lg bg-blue-50 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      {creating === t.id ? 'Creating…' : 'Use Template'}
                    </button>
                    {!t.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                        title="Delete template"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filteredBuiltins.length === 0 && filteredApi.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-400 dark:text-gray-500">
                  No templates in this category
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
