/**
 * Context Inspector — form builder.
 * Pill that reveals the exact form snapshot the AI receives with each
 * message. The popover wrapper is the shared <InspectorPopover>; this
 * file owns the trigger summary and the form-specific body content.
 */

import React from 'react';
import type { FormDefinition } from '../types';
import { InspectorPopover } from '../../../ai/shared/InspectorPopover';

interface ContextInspectorProps {
  form: FormDefinition;
}

export const ContextInspector: React.FC<ContextInspectorProps> = ({ form }) => {
  const fieldCount = form.sections.reduce((acc, s) => acc + s.fields.length, 0);

  // Mirror the keys that AiChatDrawer.handleSend actually puts in `settings`.
  const settingsSent: string[] = [];
  if (form.settings?.layout) settingsSent.push('layout');
  if (form.settings?.submitAction) settingsSent.push('submitAction');
  if (form.settings?.wizardMode != null) settingsSent.push('wizardMode');
  if (form.settings?.requireAuth != null) settingsSent.push('requireAuth');

  return (
    <InspectorPopover
      title="See exactly what the AI receives with each message"
      dialogLabel="AI context snapshot"
      label={
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>
            Context sent: <strong className="font-semibold">{fieldCount}</strong>&nbsp;field{fieldCount === 1 ? '' : 's'}
          </span>
        </>
      }
    >
      <div className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-200 font-semibold truncate">
          {form.name || '(unnamed form)'}
        </p>
        {form.description && (
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {form.description}
          </p>
        )}
        {settingsSent.length > 0 && (
          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="font-semibold">Settings:</span> {settingsSent.join(', ')}
          </p>
        )}
      </div>

      {form.sections.length === 0 ? (
        <p className="text-gray-400 italic">No sections yet — the AI will create them.</p>
      ) : (
        <div className="space-y-2">
          {form.sections.map((sec) => (
            <div key={sec.id}>
              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-0.5">
                {sec.title || '(untitled section)'}
                <span className="ml-1 font-normal text-gray-400">· {sec.fields.length}</span>
              </p>
              {sec.fields.length === 0 ? (
                <p className="ml-3 text-[10px] text-gray-400 italic">empty</p>
              ) : (
                <ul className="ml-3 space-y-0.5">
                  {sec.fields.map((f) => {
                    const hasValidation = !!f.validation && Object.keys(f.validation).length > 0;
                    const hasOptions = !!f.options && f.options.length > 0;
                    return (
                      <li key={f.id} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300">
                          {f.name || '?'}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">· {f.type}</span>
                        {f.label && f.label !== f.name && (
                          <span className="text-gray-400 dark:text-gray-500 italic truncate max-w-40">
                            "{f.label}"
                          </span>
                        )}
                        {hasValidation && (
                          <span className="ml-auto px-1 rounded text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            val
                          </span>
                        )}
                        {hasOptions && (
                          <span className={`${hasValidation ? '' : 'ml-auto'} px-1 rounded text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>
                            opts
                          </span>
                        )}
                        {f.readOnly && (
                          <span className={`${hasValidation || hasOptions ? '' : 'ml-auto'} px-1 rounded text-[9px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400`}>
                            ro
                          </span>
                        )}
                        {f.lookupConfig && (
                          <span className={`${hasValidation || hasOptions || f.readOnly ? '' : 'ml-auto'} px-1 rounded text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}>
                            lookup
                          </span>
                        )}
                        {f.calculated && (
                          <span className={`${hasValidation || hasOptions || f.readOnly || f.lookupConfig ? '' : 'ml-auto'} px-1 rounded text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300`}>
                            calc
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400">
        Snapshot sent with every message. Fields without a name aren't sent.
      </p>
    </InspectorPopover>
  );
};
