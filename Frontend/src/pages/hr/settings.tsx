// src/pages/hr/settings.tsx
import AccountSettings from '../../components/common/AccountSettings';
import HRNotificationCenter from './HRNotificationCenter';

export default function HRSettingsPage() {
  return <AccountSettings role="hr" headerAction={<HRNotificationCenter />} />;
}
