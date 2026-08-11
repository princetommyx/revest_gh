import { useState } from 'react';
import { Settings as SettingsIcon, Bell, Mail, Lock, Globe, Shield, Save } from 'lucide-react';

export default function SettingsPage() {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    const handleSave = () => {
        // TODO: Implement save settings API call
        alert('Settings saved successfully!');
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage your dashboard preferences and system settings
                </p>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Choose how you receive notifications</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-200">Email Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive email alerts for important events</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={emailNotifications}
                                onChange={(e) => setEmailNotifications(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-200">Push Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Show browser notifications for updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={pushNotifications}
                                onChange={(e) => setPushNotifications(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-200">Email Alerts for New Users</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when new users register</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={emailAlerts}
                                onChange={(e) => setEmailAlerts(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* System Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Settings</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure system-wide settings</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-200">Maintenance Mode</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Put the platform in maintenance mode</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={maintenanceMode}
                                onChange={(e) => setMaintenanceMode(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-red-500 peer-checked:to-pink-600"></div>
                        </label>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Time Zone
                        </label>
                        <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                            <option>UTC (GMT+0:00)</option>
                            <option>EST (GMT-5:00)</option>
                            <option selected>PST (GMT-8:00)</option>
                            <option>CET (GMT+1:00)</option>
                        </select>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Date Format
                        </label>
                        <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                            <option selected>MM/DD/YYYY</option>
                            <option>DD/MM/YYYY</option>
                            <option>YYYY-MM-DD</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage security and privacy settings</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Session Timeout (minutes)
                        </label>
                        <input
                            type="number"
                            defaultValue={30}
                            min={5}
                            max={120}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Auto-logout after inactivity</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password Expiry (days)
                        </label>
                        <input
                            type="number"
                            defaultValue={90}
                            min={30}
                            max={365}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Force password change after this period</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all hover-scale shadow-lg shadow-purple-500/25"
                >
                    <Save className="w-5 h-5 mr-2" />
                    Save Settings
                </button>
            </div>
        </div>
    );
}
