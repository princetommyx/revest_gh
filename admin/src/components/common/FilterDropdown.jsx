import { Filter } from 'lucide-react';

export default function FilterDropdown({ label, value, options, onChange, placeholder = 'All' }) {
    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                >
                    <option value="" className="dark:bg-gray-700">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value} className="dark:bg-gray-700">
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <Filter className="h-4 w-4" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}
