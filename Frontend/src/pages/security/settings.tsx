// src/pages/security/settings.tsx
import AccountSettings from '../../components/common/AccountSettings';
import SecurityNotificationCenter from './SecurityNotificationCenter';

export default function SecuritySettingsPage() {
  return <AccountSettings role="security" headerAction={<SecurityNotificationCenter />} />;
}
