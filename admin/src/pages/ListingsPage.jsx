import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { listingsApi } from '../api/listings';
import { Loader2, Package, MapPin } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import FilterDropdown from '../components/common/FilterDropdown';

const LISTINGS_PER_PAGE = 12;

const materialTypeOptions = [
    { value: 'Plastics', label: 'Plastics' },
    { value: 'Metals', label: 'Metals' },
    { value: 'Paper', label: 'Paper' },
    { value: 'Glass', label: 'Glass' },
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Organic', label: 'Organic' },
];

export default function ListingsPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [materialFilter, setMaterialFilter] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['listings', currentPage, searchTerm, materialFilter],
        queryFn: () => listingsApi.getListings({
            page: currentPage,
            page_size: LISTINGS_PER_PAGE,
            search: searchTerm,
            material_type: materialFilter,
        }),
        keepPreviousData: true,
    });

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    const handleMaterialFilter = (material) => {
        setMaterialFilter(material);
        setCurrentPage(1);
    };

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    Error loading listings. Please try again.
                </div>
            </div>
        );
    }

    const listings = data?.results || data || [];
    const totalPages = data?.count ? Math.ceil(data.count / LISTINGS_PER_PAGE) : 1;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketplace Listings</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {data?.count ? `Total: ${data.count} listings` : `${listings.length} listings`}
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 self-end sm:self-auto">
                    <Package className="w-6 h-6" />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <SearchBar
                            placeholder="Search by title or description..."
                            onSearch={handleSearch}
                        />
                    </div>
                    <div>
                        <FilterDropdown
                            label="Material Type"
                            value={materialFilter}
                            options={materialTypeOptions}
                            onChange={handleMaterialFilter}
                            placeholder="All Materials"
                        />
                    </div>
                </div>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.length === 0 ? (
                    <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                        <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500">No listings found</p>
                    </div>
                ) : (
                    listings.map((listing) => (
                        <div key={listing.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            {/* Image */}
                            <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {listing.image ? (
                                    <img
                                        src={listing.image}
                                        alt={listing.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-16 h-16 text-gray-300" />
                                    </div>
                                )}
                                {listing.is_free && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                        FREE
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                                    {listing.title}
                                </h3>

                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                            {listing.material_type}
                                        </span>
                                        <span className="mx-2">•</span>
                                        <span>{listing.quantity}</span>
                                    </div>

                                    {listing.location && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            {listing.location}
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {listing.description}
                                </p>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div>
                                        {listing.is_free ? (
                                            <span className="text-lg font-bold text-green-600">FREE</span>
                                        ) : (
                                            <span className="text-lg font-bold text-gray-900">
                                                {formatCurrency(listing.price)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatDate(listing.created_at)}
                                    </div>
                                </div>

                                {listing.seller && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-gray-500">
                                            Seller: <span className="font-medium text-gray-700">
                                                {listing.seller.first_name} {listing.seller.last_name}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}

            {/* Loading overlay */}
            {isLoading && data && (
                <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            )}
        </div>
    );
}
