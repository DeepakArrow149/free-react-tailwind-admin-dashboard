/**
 * Settings Page
 */

import { useState } from 'react';
import { PageMeta, PageHeader, ComponentCard } from '@/components/common';
import { Button } from '@/components/ui';
import { Input, Label, Switch, Select, TextArea } from '@/components/form';

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    appName: 'Enterprise Admin',
    contactEmail: 'admin@enterprise.com',
    language: 'en',
    timezone: 'UTC',
    description: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReport: true,
    securityAlerts: true,
  });

  const handleProfileChange = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfile((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <>
      <PageMeta title="Settings" />
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Settings' }]}
      />

      <div className="space-y-6">
        {/* General Settings */}
        <ComponentCard title="General Settings">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label>Application Name</Label>
              <Input
                value={profile.appName}
                onChange={handleProfileChange('appName')}
                placeholder="Your app name"
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={profile.contactEmail}
                onChange={handleProfileChange('contactEmail')}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label>Language</Label>
              <Select
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'de', label: 'German' },
                  { value: 'ja', label: 'Japanese' },
                ]}
                value={profile.language}
                onChange={(e) => setProfile((prev) => ({ ...prev, language: e.target.value }))}
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select
                options={[
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'Eastern Time (ET)' },
                  { value: 'America/Chicago', label: 'Central Time (CT)' },
                  { value: 'America/Denver', label: 'Mountain Time (MT)' },
                  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                  { value: 'Asia/Colombo', label: 'Sri Lanka (IST)' },
                ]}
                value={profile.timezone}
                onChange={(e) => setProfile((prev) => ({ ...prev, timezone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Application Description</Label>
              <TextArea
                value={profile.description}
                onChange={(e) => setProfile((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your application"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </ComponentCard>

        {/* Notification Settings */}
        <ComponentCard title="Notification Preferences">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 dark:text-white/90">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive email updates about account activity</p>
              </div>
              <Switch
                checked={notifications.emailNotifications}
                onChange={() => setNotifications((p) => ({ ...p, emailNotifications: !p.emailNotifications }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 dark:text-white/90">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
              </div>
              <Switch
                checked={notifications.pushNotifications}
                onChange={() => setNotifications((p) => ({ ...p, pushNotifications: !p.pushNotifications }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 dark:text-white/90">Weekly Report</p>
                <p className="text-sm text-gray-500">Get a weekly summary email of your activity</p>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onChange={() => setNotifications((p) => ({ ...p, weeklyReport: !p.weeklyReport }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 dark:text-white/90">Security Alerts</p>
                <p className="text-sm text-gray-500">Important alerts about your account security</p>
              </div>
              <Switch
                checked={notifications.securityAlerts}
                onChange={() => setNotifications((p) => ({ ...p, securityAlerts: !p.securityAlerts }))}
              />
            </div>
          </div>
        </ComponentCard>

        {/* Danger Zone */}
        <ComponentCard title="Danger Zone">
          <div className="flex items-center justify-between rounded-lg border border-error-300 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
            <div>
              <p className="font-medium text-error-600 dark:text-error-400">Delete Account</p>
              <p className="text-sm text-error-500">Once deleted, all data will be permanently removed.</p>
            </div>
            <Button variant="danger" size="sm">
              Delete Account
            </Button>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
